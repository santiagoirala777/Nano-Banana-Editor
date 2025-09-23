
export enum Tool {
  GENERATE = 'GENERATE',
  EDIT = 'EDIT',
  ENHANCE = 'ENHANCE',
  BACKGROUND = 'BACKGROUND',
  OUTPAINT = 'OUTPAINT',
  EXPORT = 'EXPORT',
}

export enum GenerationType {
  GENERATED = 'GENERATED',
  EDITED = 'EDITED',
  ENHANCED = 'ENHANCED',
  BACKGROUND = 'BACKGROUND',
  OUTPAINTED = 'OUTPAINTED',
  UPLOADED = 'UPLOADED',
}

export enum ImageStyle {
  FASHION = 'High-fashion, editorial style',
  CASUAL = 'Casual, everyday streetwear',
  LUXURY = 'Luxury lifestyle, opulent setting',
  FITNESS = 'Fitness and activewear',
  LINGERIE = 'Lingerie and boudoir style',
  URBAN = 'Urban, gritty, neon-lit city vibe',
  MINIMALIST = 'Minimalist, a clean background',
  VINTAGE = 'Vintage, retro film look',
}

export enum ReferenceSection {
  SUBJECT = 'Subject',
  STYLE = 'Style',
  ENVIRONMENT = 'Environment',
  OUTFIT = 'Outfit',
  POSE = 'Pose',
  ACCESSORIES = 'Accessories',
  INSERT_OBJECT = 'Insert Object',
}

export enum OutpaintAspectRatio {
    FREEFORM = 'Freeform',
    CUSTOM = 'Custom',
    SQUARE_1_1 = '1:1',
    LANDSCAPE_4_3 = '4:3',
    LANDSCAPE_16_9 = '16:9',
    PORTRAIT_3_4 = '3:4',
    PORTRAIT_9_16 = '9:16',
    PORTRAIT_4_5 = '4:5',
}

export enum OutpaintDirection {
    UP = 'up',
    DOWN = 'down',
    LEFT = 'left',
    RIGHT = 'right',
}

export type ReferenceImages = {
  [key in ReferenceSection]?: string; // base64 data URL
};

export interface GeneratedImage {
  id: string;
  url: string; // base64 data URL
  prompt?: string;
  type: GenerationType;
  createdAt: Date;
  seed?: number;
  references?: ReferenceImages;
}

export interface EditParams {
    baseImage: string;
    maskImage: string;
    inpaintPrompt: string;
    references?: ReferenceImages;
}