
import React from 'react';

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  min: number;
  max: number;
  value: number;
}

export const Slider: React.FC<SliderProps> = ({ label, min, max, value, className = '', ...props }) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-1">
        <label className="block text-sm font-medium text-slate-400">{label}</label>
        <span className="text-xs font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md">{value}px</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-banana-500"
        {...props}
      />
    </div>
  );
};