
import React from 'react';

interface ImageUploaderProps {
  label: string;
  description: string;
  imageSrc?: string;
  onImageUpload: (file: File) => void;
  onImageRemove: () => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ label, description, imageSrc, onImageUpload, onImageRemove }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
    // Reset input to allow re-uploading the same file
    if (inputRef.current) {
        inputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    inputRef.current?.click();
  };

  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-300">{label}</h4>
      <p className="text-xs text-slate-500 mb-2">{description}</p>
      <div
        className="relative w-full aspect-square bg-slate-700 rounded-md border-2 border-dashed border-slate-600 flex items-center justify-center cursor-pointer hover:border-banana-500 transition-colors"
        onClick={handleUploadClick}
      >
        <input
          type="file"
          ref={inputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/png, image/jpeg, image/webp"
        />
        {imageSrc ? (
          <>
            <img src={imageSrc} alt={`${label} preview`} className="w-full h-full object-cover rounded-md" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onImageRemove();
              }}
              className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-75"
              aria-label={`Remove ${label} image`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        ) : (
          <div className="text-center text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-1 text-xs">Click to upload</p>
          </div>
        )}
      </div>
    </div>
  );
};
