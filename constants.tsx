
import React from 'react';
import { Tool, ReferenceSection, OutpaintAspectRatio, GenerationType } from './types';

export const ICONS: { [key in Tool]: JSX.Element } = {
  [Tool.GENERATE]: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 S11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  [Tool.EDIT]: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
    </svg>
  ),
  [Tool.ENHANCE]: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293c.39.39.39 1.023 0 1.414L10 16l-4 4v-4l7.707-7.707c.39-.39 1.023-.39 1.414 0z" />
    </svg>
  ),
  [Tool.BACKGROUND]: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  [Tool.OUTPAINT]: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4h4m12 4V4h-4M4 16v4h4m12-4v4h-4" />
    </svg>
  ),
  [Tool.EXPORT]: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
};

export const TOOL_NAMES: { [key in Tool]: string } = {
  [Tool.GENERATE]: 'Generate',
  [Tool.EDIT]: 'Edit & Inpaint',
  [Tool.ENHANCE]: 'Enhance',
  [Tool.BACKGROUND]: 'Background',
  [Tool.OUTPAINT]: 'Outpaint',
  [Tool.EXPORT]: 'Session Gallery',
};

export const REFERENCE_SECTIONS: { id: ReferenceSection; label: string; description: string }[] = [
    { id: ReferenceSection.SUBJECT, label: "Subject", description: "Base face/body of the model." },
    { id: ReferenceSection.STYLE, label: "Style", description: "Lighting, makeup, color reference." },
    { id: ReferenceSection.ENVIRONMENT, label: "Environment", description: "Background or scene." },
    { id: ReferenceSection.OUTFIT, label: "Outfit", description: "Specific clothing or garments." },
    { id: ReferenceSection.POSE, label: "Pose", description: "Posture or silhouette reference." },
    { id: ReferenceSection.ACCESSORIES, label: "Accessories", description: "Jewelry, glasses, tattoos, etc." },
    { id: ReferenceSection.INSERT_OBJECT, label: "Insert Object", description: "An object to realistically place in the scene." },
];

export const OUTPAINT_ASPECT_RATIO_OPTIONS = Object.entries(OutpaintAspectRatio).map(([key, value]) => ({ value, label: `${key.replace(/_/g, ' ')} (${value})` }));

export const GALLERY_FILTERS: { id: GenerationType | 'ALL'; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: GenerationType.GENERATED, label: 'Generated' },
    { id: GenerationType.EDITED, label: 'Edited' },
    { id: GenerationType.BACKGROUND, label: 'Backgrounds' },
    { id: GenerationType.ENHANCED, label: 'Enhanced' },
    { id: GenerationType.OUTPAINTED, label: 'Outpainted' },
    { id: GenerationType.UPLOADED, label: 'Uploaded' },
];

export const LOADING_MESSAGES = [
    "Summoning digital muses...",
    "Painting with pixels and probability...",
    "Warming up the creativity core...",
    "Asking the AI for a masterpiece...",
    "Generating photorealistic details...",
    "This might take a moment, great art needs patience...",
    "Finalizing light and shadows..."
];
