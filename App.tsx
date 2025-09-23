
import React, { useState, useEffect, useCallback } from 'react';
import { Tool, GeneratedImage, ReferenceImages, ReferenceSection, OutpaintDirection, OutpaintAspectRatio, GenerationType } from './types';
import Sidebar from './components/Sidebar';
import { ControlPanel } from './components/ControlPanel';
import { CanvasView } from './components/CanvasView';
import { Gallery } from './components/Gallery';
import { Loader } from './components/common/Loader';
import * as geminiService from './services/geminiService';
import { LOADING_MESSAGES } from './constants';

declare const JSZip: any;

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool>(Tool.GENERATE);
  const [referenceImages, setReferenceImages] = useState<ReferenceImages>({});
  
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [activeImage, setActiveImage] = useState<GeneratedImage | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>(LOADING_MESSAGES[0]);

  // Generation State
  const [seed, setSeed] = useState('');
  const [isSeedLocked, setIsSeedLocked] = useState(false);

  // Editing states
  const [maskImage, setMaskImage] = useState<string>('');
  const [brushSize, setBrushSize] = useState(40);
  const [undoTrigger, setUndoTrigger] = useState(0);
  const [redoTrigger, setRedoTrigger] = useState(0);
  const [clearMaskTrigger, setClearMaskTrigger] = useState(0);
  const [canMaskUndo, setCanMaskUndo] = useState(false);
  const [canMaskRedo, setCanMaskRedo] = useState(false);
  
  // Gallery/Export states
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  
  // Global history
  const [imageHistory, setImageHistory] = useState<GeneratedImage[]>([]);
  const [historyPointer, setHistoryPointer] = useState(-1);


  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
      }, 2500);
    }
    return () => {
      if(interval) clearInterval(interval);
    };
  }, [isLoading]);
  
  const handleSetActiveImage = useCallback((image: GeneratedImage) => {
    const newHistory = imageHistory.slice(0, historyPointer + 1);
    const updatedHistory = [...newHistory, image];
    setImageHistory(updatedHistory);
    setHistoryPointer(updatedHistory.length - 1);
    setActiveImage(image);
  }, [imageHistory, historyPointer]);

  const addNewImage = (url: string, type: GenerationType, prompt?: string, generationSeed?: number, refs?: ReferenceImages) => {
    const newImage: GeneratedImage = { 
        url, 
        type, 
        prompt, 
        id: `${Date.now()}-${Math.random()}`, 
        createdAt: new Date(), 
        seed: generationSeed,
        references: refs,
    };
    setImages(prev => [newImage, ...prev]);
    handleSetActiveImage(newImage);
  }

  const handleImageUpload = (section: ReferenceSection, file: File | null) => {
    if (!file) {
      setReferenceImages(prev => {
        const next = {...prev};
        delete next[section];
        return next;
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const resultUrl = e.target?.result as string;
      if (resultUrl) {
        setReferenceImages(prev => ({...prev, [section]: resultUrl}));
      }
    };
    reader.readAsDataURL(file);
  };
  
  const handleDirectImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const resultUrl = e.target?.result as string;
      if (resultUrl) {
        addNewImage(resultUrl, GenerationType.UPLOADED, "Uploaded for editing");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApiCall = async (apiFunc: () => Promise<string>, type: GenerationType, promptText?: string, generationSeed?: number, refs?: ReferenceImages) => {
    setIsLoading(true);
    setLoadingMessage(LOADING_MESSAGES[0]);
    try {
        const resultUrl = await apiFunc();
        addNewImage(resultUrl, type, promptText, generationSeed, refs);
    } catch (error) {
        console.error("API call failed:", error);
        alert(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleUndo = () => {
    if (historyPointer > 0) {
      const newPointer = historyPointer - 1;
      setHistoryPointer(newPointer);
      setActiveImage(imageHistory[newPointer]);
    }
  };

  const handleRedo = () => {
    if (historyPointer < imageHistory.length - 1) {
      const newPointer = historyPointer + 1;
      setHistoryPointer(newPointer);
      setActiveImage(imageHistory[newPointer]);
    }
  };

  const handleGenerate = useCallback((prompt: string, numericSeed?: number) => {
    handleApiCall(
        () => geminiService.generateImageFromReferences(referenceImages, prompt, numericSeed),
        GenerationType.GENERATED,
        prompt || "Generated from image references",
        numericSeed,
        referenceImages
    );
  }, [referenceImages]);

  const handleEdit = useCallback(async (params: { inpaintPrompt: string, references?: ReferenceImages }) => {
    if (!activeImage) return;
    if (!maskImage) {
        alert("Please draw a mask on the image to specify the area to edit.");
        return;
    }
    const promptText = `Edited: ${params.inpaintPrompt}`;
    handleApiCall(
      () => geminiService.editImage({ baseImage: activeImage.url, maskImage, inpaintPrompt: params.inpaintPrompt, references: params.references }),
      GenerationType.EDITED,
      promptText
    );
  }, [activeImage, maskImage]);

  const handleEnhance = useCallback(() => {
    if (!activeImage) return;
    handleApiCall(() => geminiService.enhanceImage(activeImage.url), GenerationType.ENHANCED, "Enhanced Image");
  }, [activeImage]);

  const handleReplaceBg = useCallback(async (prompt?: string, imageFile?: File | null) => {
    if (!activeImage) return;
    let backgroundImageBase64: string | undefined;
    if (imageFile) {
        backgroundImageBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
        });
    }
    const promptText = `Background: ${prompt || 'custom image'}`;
    handleApiCall(() => geminiService.replaceBackground(activeImage.url, prompt, backgroundImageBase64), GenerationType.BACKGROUND, promptText);
  }, [activeImage]);

  const handleOutpaint = useCallback((prompt: string, directions: OutpaintDirection[], aspectRatio: OutpaintAspectRatio, width?: number, height?: number) => {
    if (!activeImage) return;
    const promptText = `Outpainted (${directions.join(', ')}): ${prompt}`;
    handleApiCall(() => geminiService.outpaintImage(activeImage.url, prompt, directions, aspectRatio, width, height), GenerationType.OUTPAINTED, promptText);
  }, [activeImage]);

  const handleClearCanvas = () => {
    setActiveImage(null);
    setImageHistory([]);
    setHistoryPointer(-1);
  };
  
  const handleSelectionToggle = (idToToggle: string) => {
    setSelectedImageIds(prev => 
        prev.includes(idToToggle) 
            ? prev.filter(id => id !== idToToggle)
            : [...prev, idToToggle]
    );
  }
  
  const handleDownloadSelected = async () => {
    if (typeof JSZip === 'undefined') {
        alert('Could not start download. JSZip library is missing.');
        return;
    }
    const zip = new JSZip();

    for (const id of selectedImageIds) {
        const image = images.find(img => img.id === id);
        if (!image) continue;

        const date = image.createdAt;
        const dateFolder = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        const typeFolder = image.type;

        try {
            const response = await fetch(image.url);
            const blob = await response.blob();
            zip.file(`${dateFolder}/${typeFolder}/${image.id}.png`, blob);

            let txtContent = `Generation Details for ${image.id}\r\n`;
            txtContent += `------------------------------------\r\n`;
            txtContent += `Timestamp: ${image.createdAt.toISOString()}\r\n`;
            txtContent += `Type: ${image.type}\r\n`;
            if (image.prompt) txtContent += `Prompt: ${image.prompt}\r\n`;
            if (image.seed) txtContent += `Seed: ${image.seed}\r\n`;
            if (image.references && Object.keys(image.references).length > 0) {
                txtContent += `Reference Images Used: ${Object.keys(image.references).join(', ')}\r\n`;
            }
            zip.file(`${dateFolder}/${typeFolder}/${image.id}.txt`, txtContent);
        } catch (error) {
            console.error(`Failed to process image ${image.id}:`, error);
        }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = `nano-banana-session-${new Date().toISOString().slice(0,10)}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
  
  const handleDownloadImagesOnly = async () => {
    if (typeof JSZip === 'undefined') {
        alert('Could not start download. JSZip library is missing.');
        return;
    }
    const zip = new JSZip();

    for (const id of selectedImageIds) {
        const image = images.find(img => img.id === id);
        if (!image) continue;
        try {
            const response = await fetch(image.url);
            const blob = await response.blob();
            zip.file(`${image.id}.png`, blob);
        } catch (error) {
            console.error(`Failed to process image ${image.id}:`, error);
        }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = `nano-banana-images-${new Date().toISOString().slice(0,10)}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedImageIds.length} image(s) from this session?`)) {
        const newImages = images.filter(img => !selectedImageIds.includes(img.id));
        setImages(newImages);
        if (activeImage && selectedImageIds.includes(activeImage.id)) {
            setActiveImage(newImages[0] || null);
        }
        setSelectedImageIds([]);
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 overflow-hidden">
      {isLoading && <Loader message={loadingMessage} />}
      <div className="flex flex-1 min-h-0">
        <Sidebar activeTool={activeTool} onToolChange={setActiveTool} />
        <div className="flex-1 flex flex-col min-w-0">
          <CanvasView 
            activeTool={activeTool}
            activeImage={activeImage} 
            onClearCanvas={handleClearCanvas}
            brushSize={brushSize}
            onMaskChange={setMaskImage}
            undoTrigger={undoTrigger}
            redoTrigger={redoTrigger}
            clearMaskTrigger={clearMaskTrigger}
            onHistoryChange={(can, canR) => { setCanMaskUndo(can); setCanMaskRedo(canR); }}
          />
          <Gallery images={images} activeImageId={activeImage?.id || null} onImageSelect={handleSetActiveImage} />
        </div>
        <ControlPanel
            activeTool={activeTool}
            referenceImages={referenceImages}
            onReferenceImageChange={handleImageUpload}
            isLoading={isLoading}
            activeImage={activeImage}
            onGenerate={handleGenerate}
            onEdit={handleEdit}
            onEnhance={handleEnhance}
            onReplaceBg={handleReplaceBg}
            onOutpaint={handleOutpaint}
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            onMaskUndo={() => setUndoTrigger(c => c + 1)}
            onMaskRedo={() => setRedoTrigger(c => c + 1)}
            onClearMask={() => setClearMaskTrigger(c => c + 1)}
            canMaskUndo={canMaskUndo}
            canMaskRedo={canMaskRedo}
            // Global History
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyPointer > 0}
            canRedo={historyPointer < imageHistory.length - 1}
            // Seed
            seed={seed}
            setSeed={setSeed}
            isSeedLocked={isSeedLocked}
            setIsSeedLocked={setIsSeedLocked}
            // Gallery props
            images={images}
            selectedImageIds={selectedImageIds}
            onSelectionToggle={handleSelectionToggle}
            onDownloadSelected={handleDownloadSelected}
            onDownloadImagesOnly={handleDownloadImagesOnly}
            onDeleteSelected={handleDeleteSelected}
            onDirectImageUpload={handleDirectImageUpload}
        />
      </div>
    </div>
  );
};

export default App;