
import React from 'react';
import { GeneratedImage, GenerationType } from '../types';

interface GalleryProps {
  images: GeneratedImage[];
  activeImageId: string | null;
  onImageSelect: (image: GeneratedImage) => void;
}

export const Gallery: React.FC<GalleryProps> = ({ images, activeImageId, onImageSelect }) => {
  const recentGeneratedImages = images
    .filter(image => image.type !== GenerationType.UPLOADED)
    .slice(0, 5);

  return (
    <footer className="h-32 bg-gray-800 border-t border-gray-700 p-2">
      <div className="h-full w-full overflow-x-auto overflow-y-hidden custom-scrollbar flex items-center space-x-2">
        {recentGeneratedImages.length === 0 && (
            <div className="flex items-center justify-center w-full h-full text-gray-500">
                <p>Your 5 most recent generations will appear here.</p>
            </div>
        )}
        {recentGeneratedImages.map((image) => (
          <div
            key={image.id}
            onClick={() => onImageSelect(image)}
            className={`flex-shrink-0 w-24 h-24 rounded-md overflow-hidden cursor-pointer transition-all duration-200 transform hover:scale-105 ${
              activeImageId === image.id ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-800' : 'ring-1 ring-gray-600'
            }`}
          >
            <img src={image.url} alt={image.prompt} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </footer>
  );
};