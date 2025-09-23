import React, { useState } from 'react';
import { Tool, GeneratedImage, ReferenceImages, ReferenceSection, OutpaintDirection, OutpaintAspectRatio, GenerationType } from '../types';
import { TOOL_NAMES, REFERENCE_SECTIONS, OUTPAINT_ASPECT_RATIO_OPTIONS, GALLERY_FILTERS } from '../constants';
import { Button } from './common/Button';
import { Select } from './common/Select';
import { TextInput, TextArea } from './common/TextInput';
import { ImageUploader } from './common/ImageUploader';
import { Slider } from './common/Slider';
import { SeedInput } from './common/SeedInput';

interface ControlPanelProps {
  activeTool: Tool;
  referenceImages: ReferenceImages;
  onReferenceImageChange: (section: ReferenceSection, file: File | null) => void;
  isLoading: boolean;
  activeImage: GeneratedImage | null;
  onGenerate: (prompt: string, negativePrompt: string, seed?: number) => void;
  onEdit: (params: { inpaintPrompt: string, references?: ReferenceImages, isGlobal: boolean }) => void;
  onEnhance: (type: 'x2' | 'x4' | 'general') => void;
  onReplaceBg: (prompt?: string, image?: File | null) => void;
  onOutpaint: (prompt: string, directions: OutpaintDirection[], aspectRatio: OutpaintAspectRatio, width?: number, height?: number) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  onMaskUndo: () => void;
  onMaskRedo: () => void;
  onClearMask: () => void;
  canMaskUndo: boolean;
  canMaskRedo: boolean;
  isMaskDrawn: boolean;

  seed: string;
  setSeed: (seed: string) => void;
  isSeedLocked: boolean;
  setIsSeedLocked: (isLocked: boolean) => void;

  // Global History
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Export/Gallery props
  images: GeneratedImage[];
  selectedImageIds: string[];
  onSelectionToggle: (id: string) => void;
  onDownloadSelected: () => void;
  onDownloadImagesOnly: () => void;
  onDeleteSelected: () => void;
  onDirectImageUpload: (file: File) => void;
}

const ActionHistory: React.FC<Pick<ControlPanelProps, 'onUndo' | 'onRedo' | 'canUndo' | 'canRedo'>> = ({ onUndo, onRedo, canUndo, canRedo }) => {
    return (
        <div className="flex items-center space-x-2 pb-3 mb-3 border-b border-slate-700">
            <h3 className="text-sm font-medium text-slate-300 flex-grow">History</h3>
            <Button variant="icon" onClick={onUndo} disabled={!canUndo} aria-label="Undo Action">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
            </Button>
            <Button variant="icon" onClick={onRedo} disabled={!canRedo} aria-label="Redo Action">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </Button>
        </div>
    );
};

const GeneratorPanel: React.FC<Pick<ControlPanelProps, 'referenceImages' | 'onReferenceImageChange' | 'isLoading' | 'onGenerate' | 'seed' | 'setSeed' | 'isSeedLocked' | 'setIsSeedLocked'>> = 
({ referenceImages, onReferenceImageChange, isLoading, onGenerate, seed, setSeed, isSeedLocked, setIsSeedLocked }) => {
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const hasAnyImage = Object.values(referenceImages).some(img => !!img);

    const handleGenerateClick = () => {
        const numericSeed = seed ? parseInt(seed, 10) : undefined;
        onGenerate(prompt, negativePrompt, numericSeed);
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                <TextArea label="Main Prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="e.g., A model on a beach at sunset, hyperrealistic..." />
                <TextArea label="Negative Prompt" value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} rows={2} placeholder="e.g., extra limbs, poor quality, text" />
                <SeedInput seed={seed} setSeed={setSeed} isLocked={isSeedLocked} setIsLocked={setIsSeedLocked} />
                <p className="text-xs text-slate-500 -mt-2">Combine a text prompt with visual references for precise control.</p>
                {REFERENCE_SECTIONS.map(({ id, label, description }) => (
                    <ImageUploader key={id} label={label} description={description} imageSrc={referenceImages[id]} onImageUpload={(file) => onReferenceImageChange(id, file)} onImageRemove={() => onReferenceImageChange(id, null)} />
                ))}
            </div>
            <div className="pt-4 mt-auto border-t border-slate-700">
                <Button onClick={handleGenerateClick} isLoading={isLoading} disabled={!hasAnyImage && !prompt} className="w-full">
                    Generate
                </Button>
            </div>
        </div>
    );
}

const EditorPanel: React.FC<Pick<ControlPanelProps, 'onEdit' | 'isLoading' | 'brushSize' | 'setBrushSize' | 'onMaskUndo' | 'onMaskRedo' | 'canMaskUndo' | 'canMaskRedo' | 'onClearMask' | 'isMaskDrawn' | 'onUndo' | 'onRedo' | 'canUndo' | 'canRedo'>> = (props) => {
  const { onEdit, isLoading, brushSize, setBrushSize, onMaskUndo, onMaskRedo, canMaskUndo, canMaskRedo, onClearMask, isMaskDrawn } = props;
  const [inpaintPrompt, setInpaintPrompt] = useState('');
  const [editReferenceImages, setEditReferenceImages] = useState<ReferenceImages>({});
  
  const editReferenceSections = REFERENCE_SECTIONS.filter(sec => sec.id !== ReferenceSection.ENVIRONMENT);

  const handleReferenceChange = (section: ReferenceSection, file: File | null) => {
    if (!file) {
      setEditReferenceImages(prev => {
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
        setEditReferenceImages(prev => ({...prev, [section]: resultUrl}));
      }
    };
    reader.readAsDataURL(file);
  };


  return (
    <div className="flex flex-col h-full">
        <ActionHistory {...props} />
        <div className="space-y-3 pb-4 border-b border-slate-700">
            <h3 className="text-sm font-medium text-slate-300">Masking Tools</h3>
            <Slider label="Brush Size" min={5} max={100} value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value, 10))} />
            <div className="flex space-x-2">
                 <Button variant="icon" onClick={onMaskUndo} disabled={!canMaskUndo} aria-label="Undo Stroke">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                </Button>
                <Button variant="icon" onClick={onMaskRedo} disabled={!canMaskRedo} aria-label="Redo Stroke">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </Button>
                <Button variant="secondary" onClick={onClearMask} className="flex-1 text-xs">Clear Mask</Button>
            </div>
        </div>
        <div className="flex-grow pt-4 space-y-4 overflow-y-auto custom-scrollbar pr-2">
            <TextArea label="Edit Prompt" value={inpaintPrompt} onChange={(e) => setInpaintPrompt(e.target.value)} rows={4} placeholder="e.g., change hair to blonde, add sunglasses, cinematic lighting" />
            <p className="text-xs text-slate-500 -mt-2">Optional: Add reference images to guide the edit.</p>
            {editReferenceSections.map(({ id, label, description }) => (
              <ImageUploader key={id} label={label} description={description} imageSrc={editReferenceImages[id]} onImageUpload={(file) => handleReferenceChange(id, file)} onImageRemove={() => handleReferenceChange(id, null)} />
            ))}
        </div>
        <div className="pt-4 mt-auto border-t border-slate-700 space-y-2">
            <Button onClick={() => onEdit({ inpaintPrompt, references: editReferenceImages, isGlobal: false })} isLoading={isLoading} disabled={!inpaintPrompt || !isMaskDrawn} className="w-full">Apply to Masked Area</Button>
            <Button onClick={() => onEdit({ inpaintPrompt, references: editReferenceImages, isGlobal: true })} isLoading={isLoading} disabled={!inpaintPrompt} variant="secondary" className="w-full">Apply as Global Edit</Button>
        </div>
    </div>
  );
};

const EnhancerPanel: React.FC<Pick<ControlPanelProps, 'onEnhance' | 'isLoading' | 'onUndo' | 'onRedo' | 'canUndo' | 'canRedo'>> = (props) => (
  <div className="flex flex-col h-full">
    <ActionHistory {...props} />
    <div className="flex-grow space-y-4">
        <p className="text-sm text-slate-400 mb-4">Apply professional-grade enhancements, including upscaling, skin retouching, and cinematic color grading.</p>
        <Button onClick={() => props.onEnhance('general')} isLoading={props.isLoading} className="w-full">
          ✨ General Enhancement
        </Button>
    </div>
  </div>
);

const BackgroundPanel: React.FC<Pick<ControlPanelProps, 'onReplaceBg' | 'isLoading' | 'onUndo' | 'onRedo' | 'canUndo' | 'canRedo'>> = (props) => {
    const { onReplaceBg, isLoading } = props;
    const [prompt, setPrompt] = useState('');
    const [bgImage, setBgImage] = useState<File|null>(null);
    const [bgImagePreview, setBgImagePreview] = useState<string|undefined>();

    const handleBgImage = (file: File | null) => {
        setBgImage(file);
        if(file) {
          const reader = new FileReader();
          reader.onloadend = () => setBgImagePreview(reader.result as string);
          reader.readAsDataURL(file);
        } else {
          setBgImagePreview(undefined);
        }
    }

    return <>
        <ActionHistory {...props} />
        <p className="text-sm text-slate-400 mb-4">Replace the background by describing it or uploading an image. The AI will adjust lighting on the subject.</p>
        <div className="space-y-4">
            <TextArea label="Custom Background Prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="e.g., a futuristic neon-lit city street at night" />
            <Button onClick={() => onReplaceBg(prompt, undefined)} isLoading={isLoading} disabled={!prompt} className="w-full">Generate Background</Button>
            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-600"></span></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-800 px-2 text-slate-500">Or</span></div>
            </div>
            <ImageUploader label="Upload Background" description="Use your own image as a background." imageSrc={bgImagePreview} onImageUpload={handleBgImage} onImageRemove={() => handleBgImage(null)}/>
            <Button onClick={() => onReplaceBg(undefined, bgImage)} isLoading={isLoading} disabled={!bgImage} className="w-full">Use Image as Background</Button>
        </div>
    </>
};

const OutpaintPanel: React.FC<Pick<ControlPanelProps, 'onOutpaint' | 'isLoading' | 'onUndo' | 'onRedo' | 'canUndo' | 'canRedo'>> = (props) => {
    const { onOutpaint, isLoading } = props;
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<OutpaintAspectRatio>(OutpaintAspectRatio.LANDSCAPE_16_9);
    const [directions, setDirections] = useState<OutpaintDirection[]>([]);
    const [customWidth, setCustomWidth] = useState<number>(1920);
    const [customHeight, setCustomHeight] = useState<number>(1080);

    const handleDirectionToggle = (dir: OutpaintDirection) => {
        setDirections(prev => prev.includes(dir) ? prev.filter(d => d !== dir) : [...prev, dir]);
    }

    const handleExpand = () => {
        if (aspectRatio === OutpaintAspectRatio.CUSTOM) {
            onOutpaint(prompt, directions, aspectRatio, customWidth, customHeight);
        } else {
            onOutpaint(prompt, directions, aspectRatio);
        }
    }

    return (
        <div className="space-y-4">
            <ActionHistory {...props} />
            <p className="text-sm text-slate-400">Expand the canvas of your image. Describe what you want to see in the new areas.</p>
            <TextArea label="Outpainting Prompt (Optional)" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} placeholder="e.g., a sprawling mountain range, a busy city square..." />
            <Select label="Target Aspect Ratio" options={OUTPAINT_ASPECT_RATIO_OPTIONS} value={aspectRatio} onChange={e => setAspectRatio(e.target.value as OutpaintAspectRatio)} />
            
            {aspectRatio === OutpaintAspectRatio.CUSTOM && (
                <div className="flex space-x-2">
                    <TextInput label="Width (px)" type="number" value={customWidth} onChange={e => setCustomWidth(parseInt(e.target.value, 10) || 0)} />
                    <TextInput label="Height (px)" type="number" value={customHeight} onChange={e => setCustomHeight(parseInt(e.target.value, 10) || 0)} />
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Expand Directions</label>
                 <div className="grid grid-cols-3 gap-2 w-36 mx-auto">
                    <div />
                    <Button variant="secondary" onClick={() => handleDirectionToggle(OutpaintDirection.UP)} className={`aspect-square ${directions.includes(OutpaintDirection.UP) ? '!bg-banana-600' : ''}`}>↑</Button>
                    <div />
                    
                    <Button variant="secondary" onClick={() => handleDirectionToggle(OutpaintDirection.LEFT)} className={`aspect-square ${directions.includes(OutpaintDirection.LEFT) ? '!bg-banana-600' : ''}`}>←</Button>
                    <div className="aspect-square bg-slate-900 rounded-md flex items-center justify-center text-xs text-slate-500 border border-slate-700">Image</div>
                    <Button variant="secondary" onClick={() => handleDirectionToggle(OutpaintDirection.RIGHT)} className={`aspect-square ${directions.includes(OutpaintDirection.RIGHT) ? '!bg-banana-600' : ''}`}>→</Button>

                    <div />
                    <Button variant="secondary" onClick={() => handleDirectionToggle(OutpaintDirection.DOWN)} className={`aspect-square ${directions.includes(OutpaintDirection.DOWN) ? '!bg-banana-600' : ''}`}>↓</Button>
                    <div />
                </div>
            </div>
            <Button onClick={handleExpand} isLoading={isLoading} disabled={directions.length === 0} className="w-full">
                Expand Image
            </Button>
        </div>
    );
};

const ExportPanel: React.FC<Pick<ControlPanelProps, 'images' | 'selectedImageIds' | 'onSelectionToggle' | 'onDownloadSelected' | 'onDeleteSelected' | 'onDownloadImagesOnly'>> = (props) => {
    const { images, selectedImageIds, onSelectionToggle, onDownloadSelected, onDeleteSelected, onDownloadImagesOnly } = props;
    const [activeFilter, setActiveFilter] = useState<GenerationType | 'ALL'>('ALL');

    const imagesForGallery = images.filter(img => img.type !== GenerationType.UPLOADED);

    const filteredImages = imagesForGallery.filter(img => activeFilter === 'ALL' || img.type === activeFilter);
    const selectionCount = selectedImageIds.length;

    const groupedImages = filteredImages.reduce((acc, image) => {
        const dateKey = new Date(image.createdAt).toLocaleDateString('en-CA'); // YYYY-MM-DD format
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(image);
        return acc;
    }, {} as Record<string, GeneratedImage[]>);

    const sortedDates = Object.keys(groupedImages).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());


    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 mb-3">
                <label className="text-sm font-medium text-slate-400 mb-2 block">Filter by Type</label>
                <div className="flex flex-wrap gap-2">
                    {GALLERY_FILTERS.filter(f => f.id !== GenerationType.UPLOADED).map(filter => (
                        <Button key={filter.id} variant="secondary" className="text-xs !px-2 !py-1" isActive={activeFilter === filter.id} onClick={() => setActiveFilter(filter.id)}>{filter.label}</Button>
                    ))}
                </div>
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar border-t border-b border-slate-700 py-2 -mx-4 px-4">
                {filteredImages.length === 0 ? (
                    <div className="text-center text-slate-500 pt-10">No images to display.</div>
                ) : (
                    <div className="space-y-4">
                        {sortedDates.map(date => (
                            <div key={date}>
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                    {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {groupedImages[date].map(image => (
                                        <div key={image.id} className="relative aspect-square cursor-pointer group" onClick={() => onSelectionToggle(image.id)}>
                                            <img src={image.url} alt={image.prompt} className="w-full h-full object-cover rounded-md" />
                                            <div className={`absolute inset-0 rounded-md transition-all ${selectedImageIds.includes(image.id) ? 'ring-4 ring-banana-500 bg-black/30' : 'group-hover:bg-black/50'}`}></div>
                                            {selectedImageIds.includes(image.id) && (
                                                <div className="absolute top-1 right-1 bg-banana-600 rounded-full h-5 w-5 flex items-center justify-center text-white">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="pt-4 mt-auto flex-shrink-0">
                <p className="text-sm text-slate-400 mb-3">{selectionCount} image{selectionCount !== 1 ? 's' : ''} selected</p>
                <div className="space-y-2">
                    <Button onClick={onDownloadSelected} disabled={selectionCount === 0} className="w-full">Download Full Session (.zip)</Button>
                    <Button onClick={onDownloadImagesOnly} disabled={selectionCount === 0} variant="secondary" className="w-full">Download Images Only (.zip)</Button>
                    <Button onClick={onDeleteSelected} disabled={selectionCount === 0} variant="danger" className="w-full">Delete Selected</Button>
                </div>
            </div>
        </div>
    )
}


export const ControlPanel: React.FC<ControlPanelProps> = (props) => {
    const { activeTool, activeImage, onDirectImageUpload } = props;

    const PanelPlaceholder: React.FC<{ onUpload: (file: File) => void }> = ({ onUpload }) => {
        const inputRef = React.useRef<HTMLInputElement>(null);
    
        const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (file) {
                onUpload(file);
            }
        };
    
        const handleUploadClick = () => {
            inputRef.current?.click();
        };
    
        return (
            <div className="text-center text-slate-500 p-8 border-2 border-dashed border-slate-700 rounded-lg h-full flex flex-col justify-center items-center">
                <input
                    type="file"
                    ref={inputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/png, image/jpeg, image/webp"
                />
                <p className="mb-4">Please generate or select an image to use this tool.</p>
                <div className="relative my-4 w-full">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-600"></span></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-800 px-2 text-slate-500">Or</span></div>
                </div>
                <Button variant="secondary" onClick={handleUploadClick}>
                    Upload Image to Edit
                </Button>
            </div>
        )
    }

    const renderPanel = () => {
        switch (activeTool) {
            case Tool.GENERATE:
                return <GeneratorPanel {...props} />;
            case Tool.EDIT:
                return activeImage ? <EditorPanel {...props} /> : <PanelPlaceholder onUpload={onDirectImageUpload} />;
            case Tool.ENHANCE:
                return activeImage ? <EnhancerPanel {...props} /> : <PanelPlaceholder onUpload={onDirectImageUpload} />;
            case Tool.BACKGROUND:
                return activeImage ? <BackgroundPanel {...props} /> : <PanelPlaceholder onUpload={onDirectImageUpload} />;
            case Tool.OUTPAINT:
                return activeImage ? <OutpaintPanel {...props} /> : <PanelPlaceholder onUpload={onDirectImageUpload} />;
            case Tool.EXPORT:
                return <ExportPanel {...props} />;
            default:
                return null;
        }
    }

  return (
    <aside className="w-96 bg-slate-800 border-l border-slate-700 p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-slate-200">{TOOL_NAMES[activeTool]}</h2>
        <div className="flex-grow overflow-hidden">
            {renderPanel()}
        </div>
    </aside>
  );
};