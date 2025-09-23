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
}

export const CanvasView: React.FC<CanvasViewProps> = (props) => {
  const { activeTool, activeImage, onClearCanvas, brushSize, onMaskChange, undoTrigger, redoTrigger, clearMaskTrigger, onHistoryChange } = props;
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastPanPoint = useRef({ x: 0, y: 0 });

  const [transform, setTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [aspectRatio, setAspectRatio] = useState('1 / 1');
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

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
    }
  }, [onMaskChange]);

  useEffect(() => {
    if (activeImage) {
      const img = new Image();
      img.onload = () => {
          setAspectRatio(`${img.naturalWidth} / ${img.naturalHeight}`);
          const canvas = canvasRef.current;
          if (canvas) {
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              resetCanvasState();
          }
      };
      img.src = activeImage.url;
      setTransform({ scale: 1, offsetX: 0, offsetY: 0 });
    }
  }, [activeImage, resetCanvasState]);

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
    if (activeTool !== Tool.EDIT || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const coords = getCoords(e);
    if (!coords) return;
    setIsDrawing(true);
    const ctx = getCanvasContext();
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing || activeTool !== Tool.EDIT) return;
    const coords = getCoords(e);
    if (!coords) return;
    const ctx = getCanvasContext();
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'white';
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const ctx = getCanvasContext();
    if(ctx) ctx.closePath();
    setIsDrawing(false);
    saveToHistory();
    if (canvasRef.current) {
        onMaskChange(canvasRef.current.toDataURL('image/png'));
    }
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleWheel = (e: React.WheelEvent) => {
      if (activeTool !== Tool.EDIT || !activeImage) return;
      e.preventDefault();
      const scaleAmount = e.deltaY * -0.001;
      setTransform(prev => ({ ...prev, scale: Math.min(Math.max(0.2, prev.scale + scaleAmount), 10) }));
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1) { // Middle mouse button
        e.preventDefault();
        isPanning.current = true;
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
    } else {
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
        e.currentTarget.releasePointerCapture(e.pointerId);
    } else {
        stopDrawing(e);
    }
  }

  const showMask = activeTool === Tool.EDIT && activeImage;
  const isEditMode = activeTool === Tool.EDIT;

  return (
    <main className="flex-1 bg-gray-900 flex items-center justify-center p-4 md:p-8 overflow-hidden" onWheel={isEditMode ? handleWheel : undefined}>
      <div 
        ref={containerRef} 
        className="relative w-full h-full flex items-center justify-center"
      >
        {activeImage ? (
          <>
            <div 
              className="absolute transition-transform duration-100 ease-linear shadow-2xl"
              style={{ 
                  transform: `scale(${transform.scale}) translate(${transform.offsetX}px, ${transform.offsetY}px)`,
                  touchAction: isEditMode ? 'none' : 'auto',
                  aspectRatio,
                  backgroundImage: `url(${activeImage.url})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  width: '100%',
                  height: '100%',
              }}
            >
              {showMask && (
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-contain opacity-60"
                  style={{ cursor: 'crosshair', imageRendering: 'pixelated' }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                />
              )}
            </div>
             <button
                onClick={onClearCanvas}
                className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1.5 hover:bg-opacity-75 z-10 transition-opacity"
                aria-label="Clear image from canvas"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {isEditMode && (
                 <div className="absolute bottom-2 left-2 bg-gray-900/50 text-white text-xs rounded-md px-2 py-1 backdrop-blur-sm z-10">
                    Zoom: {(transform.scale * 100).toFixed(0)}%
                </div>
              )}
          </>
        ) : (
          <div className="text-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-white">Virtual Model Studio</h3>
            <p className="mt-1 text-sm text-gray-400">Generate your first image to begin.</p>
          </div>
        )}
      </div>
    </main>
  );
};