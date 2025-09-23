
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GeneratedImage, Tool } from '../types';

interface CanvasViewProps {
  activeTool: Tool;
  activeImage: GeneratedImage | null;
  onClearCanvas: () => void;
  brushSize: number;
  onMaskChange: (mask: string) => void;
  undoTrigger: number;
  redoTrigger: number;
  clearMaskTrigger: number;
  onHistoryChange: (canUndo: boolean, canRedo: boolean) => void;
  onMaskDirty: () => void;
  onMaskCleared: () => void;
}

export const CanvasView: React.FC<CanvasViewProps> = (props) => {
  const { 
    activeTool, activeImage, onClearCanvas, brushSize, onMaskChange, 
    undoTrigger, redoTrigger, clearMaskTrigger, onHistoryChange,
    onMaskDirty, onMaskCleared
  } = props;
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const transformGroupRef = useRef<HTMLDivElement>(null);

  const isPanning = useRef(false);
  const lastPanPoint = useRef({ x: 0, y: 0 });
  const lastPoint = useRef<{ x: number; y: number } | null>(null);


  const [transform, setTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isMaskVisible, setIsMaskVisible] = useState(false);

  const getCanvasContext = () => canvasRef.current?.getContext('2d', { willReadFrequently: true });

  const resetCanvasState = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCanvasContext();
    if (canvas && ctx) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const initialImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialImageData]);
      setHistoryIndex(0);
      onMaskChange(canvas.toDataURL('image/png'));
      setIsMaskVisible(false);
      onMaskCleared();
    }
  }, [onMaskChange, onMaskCleared]);
  
  const setupCanvasFromImage = useCallback(() => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (img && canvas) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      resetCanvasState();
    }
  }, [resetCanvasState]);


  useEffect(() => {
    if (activeImage) {
      setTransform({ scale: 1, offsetX: 0, offsetY: 0 });
    }
  }, [activeImage]);

  useEffect(() => {
    onHistoryChange(historyIndex > 0, historyIndex < history.length - 1);
  }, [historyIndex, history.length, onHistoryChange]);

  useEffect(() => { if (undoTrigger > 0) handleUndo(); }, [undoTrigger]);
  useEffect(() => { if (redoTrigger > 0) handleRedo(); }, [redoTrigger]);
  useEffect(() => { if (clearMaskTrigger > 0) resetCanvasState(); }, [clearMaskTrigger]);

  const saveToHistory = useCallback(() => {
    const ctx = getCanvasContext();
    if (!ctx || !canvasRef.current) return;
    const currentImageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentImageData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const ctx = getCanvasContext();
      if(ctx) ctx.putImageData(history[newIndex], 0, 0);
      if (canvasRef.current) onMaskChange(canvasRef.current.toDataURL('image/png'));
    }
  }, [history, historyIndex, onMaskChange]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const ctx = getCanvasContext();
      if(ctx) ctx.putImageData(history[newIndex], 0, 0);
      if (canvasRef.current) onMaskChange(canvasRef.current.toDataURL('image/png'));
    }
  }, [history, historyIndex, onMaskChange]);

  const getCoords = (e: React.MouseEvent | React.PointerEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    return {
      x: x * (canvas.width / rect.width),
      y: y * (canvas.height / rect.height),
    };
  };
  
  const startDrawing = (e: React.PointerEvent) => {
    const coords = getCoords(e);
    if (!coords) return;
    setIsDrawing(true);
    setIsMaskVisible(true);
    onMaskDirty();
    const ctx = getCanvasContext();
    if (!ctx) return;
    
    lastPoint.current = coords;

    // Draw a dot for single clicks for better user experience
    ctx.beginPath();
    ctx.fillStyle = 'white';
    ctx.arc(coords.x, coords.y, brushSize / 2, 0, 2 * Math.PI);
    ctx.fill();
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const coords = getCoords(e);
    // We need lastPoint to draw a line from it.
    if (!coords || !lastPoint.current) return;
    
    const ctx = getCanvasContext();
    if (!ctx) return;

    // Draw a line from the last point to the current point
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(coords.x, coords.y);
    
    // Style the line
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'white';

    ctx.stroke();
    
    // Update the last point
    lastPoint.current = coords;
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPoint.current = null; // Reset for the next stroke

    // Save the final state of the drawing action to history
    saveToHistory();
    if (canvasRef.current) {
        onMaskChange(canvasRef.current.toDataURL('image/png'));
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
      if (activeTool !== Tool.EDIT || !activeImage) return;
      e.preventDefault();
      const scaleAmount = e.deltaY * -0.001;
      setTransform(prev => ({ ...prev, scale: Math.min(Math.max(0.2, prev.scale + scaleAmount), 10) }));
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (activeTool !== Tool.EDIT) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    if (e.button === 1) {
        e.preventDefault();
        isPanning.current = true;
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
    } else if (e.button === 0) {
        startDrawing(e);
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning.current) {
        const dx = e.clientX - lastPanPoint.current.x;
        const dy = e.clientY - lastPanPoint.current.y;
        setTransform(prev => ({
            ...prev,
            offsetX: prev.offsetX + dx,
            offsetY: prev.offsetY + dy
        }));
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
    } else {
        draw(e);
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning.current) {
        isPanning.current = false;
    } else {
        stopDrawing();
    }
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  const handleDownload = () => {
    if (!activeImage) return;
    const link = document.createElement('a');
    link.href = activeImage.url;
    link.download = `nano-banana-${activeImage.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const showMask = activeTool === Tool.EDIT && activeImage;
  const isEditMode = activeTool === Tool.EDIT;

  return (
    <main className="flex-1 bg-slate-900/50 flex items-center justify-center p-4 md:p-8 overflow-hidden" onWheel={isEditMode ? handleWheel : undefined}>
        {activeImage ? (
          <>
            <div 
              className="relative w-full h-full flex items-center justify-center"
            >
              <div
                ref={transformGroupRef}
                className="relative transition-transform duration-100 ease-linear"
                style={{
                  transform: `scale(${transform.scale}) translate(${transform.offsetX}px, ${transform.offsetY}px)`,
                  touchAction: isEditMode ? 'none' : 'auto',
                }}
              >
                <img
                  ref={imageRef}
                  src={activeImage.url}
                  alt="Active content"
                  className="max-w-full max-h-full block object-contain"
                  onLoad={setupCanvasFromImage}
                />
                {showMask && (
                   <canvas
                    ref={canvasRef}
                    className={`absolute top-0 left-0 w-full h-full ${isMaskVisible ? 'opacity-60' : 'opacity-0'}`}
                    style={{ cursor: 'crosshair' }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                  />
                )}
              </div>
            </div>
             <div className="absolute top-2 right-2 flex space-x-2 z-20">
                <button
                    onClick={handleDownload}
                    className="bg-black bg-opacity-50 text-white rounded-full p-1.5 hover:bg-opacity-75 transition-opacity"
                    aria-label="Download image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
                <button
                    onClick={onClearCanvas}
                    className="bg-black bg-opacity-50 text-white rounded-full p-1.5 hover:bg-opacity-75 transition-opacity"
                    aria-label="Clear image from canvas"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
             </div>
              {isEditMode && (
                 <div className="absolute bottom-2 left-2 bg-slate-900/50 text-white text-xs rounded-md px-2 py-1 backdrop-blur-sm z-20">
                    Zoom: {(transform.scale * 100).toFixed(0)}%
                </div>
              )}
          </>
        ) : (
          <div className="text-center text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-white">Nano Banana Studio</h3>
            <p className="mt-1 text-sm text-slate-400">Generate your first image to begin.</p>
          </div>
        )}
    </main>
  );
};
