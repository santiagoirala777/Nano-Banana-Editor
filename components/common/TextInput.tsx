
import React from 'react';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const TextInput: React.FC<TextInputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-400 mb-1">{label}</label>
      <input
        type="text"
        className={`w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-banana-500 focus:border-banana-500 text-sm ${className}`}
        {...props}
      />
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, className = '', ...props }) => {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-slate-400 mb-1">{label}</label>
        <textarea
          className={`w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-banana-500 focus:border-banana-500 text-sm resize-none ${className}`}
          {...props}
        />
      </div>
    );
};