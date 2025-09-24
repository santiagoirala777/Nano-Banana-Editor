import { GoogleGenAI, GenerateContentResponse, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { ReferenceImages, EditParams, OutpaintDirection, OutpaintAspectRatio, ReferenceSection } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    // Expanded safety settings to be more permissive and address IMAGE_SAFETY errors.
    {
        category: HarmCategory.HARM_CATEGORY_SEXUAL,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
];

const base64ToInlineData = (base64: string) => {
    const [header, data] = base64.split(',');
    if (!header || !data) throw new Error("Invalid base64 string for image");
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
    return { inlineData: { data, mimeType } };
};

const handleApiResponse = (response: GenerateContentResponse): string => {
    const responseParts = response?.candidates?.[0]?.content?.parts;
    if (responseParts) {
        for (const part of responseParts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }

    const blockReason = response?.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason;
    if (blockReason) {
        throw new Error(`API call failed due to: ${blockReason}`);
    }
    
    throw new Error("API call failed. No image returned from the API.");
}

export const generateImageFromReferences = async (references: ReferenceImages, prompt: string, negativePrompt?: string, seed?: number): Promise<string> => {
    console.log("Generating image with adaptive prompt...", { references, prompt, negativePrompt, seed });

    let instruction = `
    Unless the user explicitly requests a different artistic style, your default output is always professional, hyperrealistic photography. You MUST automatically include a mix of the following keywords to achieve this:
    General Quality: hyperrealistic, photorealistic, 8K, RAW photo, ultra-detailed, sharp focus, professional photography.
    Professional Gear Emulation: To emulate high-end cameras, use terms like shot on Hasselblad X1D II 50C, Canon EOS R5, shot with a Zeiss Planar T* 50mm f/1.4 lens, 85mm f/1.2 lens.
    Do not mention the style or gear, only use it to influence the image generation.
    `;

    const hasSubject = !!references[ReferenceSection.SUBJECT];
    const providedReferences = Object.entries(references).filter(([, base64]) => !!base64);

    if (hasSubject) {
        // --- VIRTUAL MODEL MODE ---
        instruction += `\nGenerate a new, photorealistic image of a person by combining the following visual elements. The primary instruction is: "${prompt || 'Create a photorealistic portrait based on the references.'}".\n`;
        instruction += `\nFollow these instructions carefully:\n`;

        const referenceInstructions: { [key in ReferenceSection]?: string } = {
            [ReferenceSection.SUBJECT]: "- Use the 'Subject' image as the primary reference for the person's face, body, and identity. Maintain their likeness.",
            [ReferenceSection.OUTFIT]: "- Use the 'Outfit' image for the clothing. Dress the subject in this attire.",
            [ReferenceSection.POSE]: "- Use the 'Pose' image for the body's posture and position.",
            [ReferenceSection.ENVIRONMENT]: "- Use the 'Environment' image as the background and setting.",
            [ReferenceSection.STYLE]: "- Apply the overall aesthetic, lighting, color palette, and mood from the 'Style' image.",
            [ReferenceSection.ACCESSORIES]: "- Incorporate the items from the 'Accessories' image onto the subject where appropriate.",
            [ReferenceSection.INSERT_OBJECT]: "- If an 'Insert Object' image is provided, seamlessly integrate this object into the scene, paying attention to scale, lighting, and shadows."
        };

        for (const [section] of providedReferences) {
            if (referenceInstructions[section as ReferenceSection]) {
                instruction += `${referenceInstructions[section as ReferenceSection]}\n`;
            }
        }
        instruction += "- Seamlessly blend all elements into a single, coherent, high-quality photograph. The final output must be only the generated image.";

    } else {
        // --- CREATIVE MODE ---
        instruction += `\nGenerate a photorealistic image based on the following primary instruction: "${prompt}".\n`;
        if (providedReferences.length > 0) {
            instruction += `Use the provided reference images (${providedReferences.map(([section]) => section).join(', ')}) as visual inspiration to guide the final result, but the primary instruction is paramount.\n`;
        }
    }
    
    if (negativePrompt) {
        instruction += `\n- CRITICAL: Avoid the following elements at all costs: "${negativePrompt}". Do not include them in the image.`;
    }

    const parts: any[] = [{ text: instruction }];

    for (const [section, base64] of providedReferences) {
        if (base64) {
            parts.push({ text: `${section as ReferenceSection}:` });
            parts.push(base64ToInlineData(base64));
        }
    }
    
    if (parts.length <= 1 && !prompt) {
        throw new Error("A text prompt or at least one reference image is required.");
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
            ...(seed && { seed: seed })
        },
        safetySettings,
    });

    return handleApiResponse(response);
};


export const editImage = async (params: EditParams): Promise<string> => {
    console.log("Editing image with params:", params);
    const { baseImage, maskImage, inpaintPrompt, references, isGlobalEdit } = params;

    const baseImagePart = base64ToInlineData(baseImage);
    const parts: any[] = [];
    let instruction = "";

    if (isGlobalEdit) {
        instruction = `You are a world-class digital artist. Your task is to apply a global transformation to the entire 'Base Image' based on the following instruction: "${inpaintPrompt}".`;
        if (references && Object.keys(references).length > 0) {
            instruction += `\nUse the provided reference images to guide the transformation.`;
        }
        instruction += `\nApply the changes to the whole image to create a seamless, high-quality new version. The output MUST be only the final image.`;
        parts.push({ text: instruction }, { text: "Base Image:" }, baseImagePart);
    } else {
        const maskImagePart = base64ToInlineData(maskImage);
        instruction = `# MISSION: Photorealistic Inpainting

You are an expert digital artist. Your task is to modify the 'Base Image'. You will be given a 'Mask Image' to guide your work.

## NON-NEGOTIABLE RULES:
1.  **DIMENSIONS ARE SACRED:** The output image MUST have the **EXACT SAME** dimensions (width and height) as the 'Base Image'. Do NOT crop, stretch, resize, or alter the aspect ratio in any way. This is your most important rule.
2.  **PRESERVE THE BLACK:** Any area that is **BLACK** on the 'Mask Image' is a **NO-TOUCH ZONE**. These pixels MUST be preserved perfectly from the 'Base Image'. Do not alter them.
3.  **EDIT THE WHITE:** Your creative work happens ONLY in the **WHITE** area of the 'Mask Image'.
4.  **SEAMLESS INTEGRATION:** Blend your edits in the white area seamlessly with the original, untouched black areas. The final result must look like a single, coherent photograph.

## INSTRUCTIONS FOR THE WHITE AREA:
- **Primary Goal:** ${inpaintPrompt}
`;
        
        if (references && Object.keys(references).length > 0) {
            instruction += `- **Visual References:** Use the provided reference images to guide the changes:\n`;
            for (const [section, base64] of Object.entries(references)) {
                if (base64) {
                    const sectionLower = (section as ReferenceSection).toLowerCase();
                    instruction += `  - For the ${sectionLower}, refer to the '${section as ReferenceSection}' reference image.\n`;
                }
            }
        }
        
        instruction += `
## FINAL OUTPUT:
- You MUST output ONLY the final, modified image. No text, no explanations.
`;
        parts.push({ text: instruction }, { text: "Base Image:" }, baseImagePart, { text: "Mask Image:" }, maskImagePart);
    }
    
    if (references) {
        for (const [section, base64] of Object.entries(references)) {
            if (base64) {
                parts.push({ text: `${section as ReferenceSection} reference:` });
                parts.push(base64ToInlineData(base64));
            }
        }
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        safetySettings,
    });
    
    return handleApiResponse(response);
};

export const enhanceImage = (baseImage: string, type: 'x2' | 'x4' | 'general'): Promise<string> => {
    let prompt = '';
    switch(type) {
        case 'x2':
            prompt = `Critically important: Your primary task is to upscale the provided image to double its original resolution (2x upscale). The output image dimensions MUST be twice the input image dimensions. While upscaling, intelligently add fine, realistic details, textures, and sharpness. Maintain the original composition, subject, and colors perfectly. The output must be only the enhanced, high-resolution image.`;
            break;
        case 'x4':
            prompt = `Critically important: Your primary task is to upscale the provided image to four times its original resolution (4x upscale). The output image dimensions MUST be quadruple the input image dimensions. This is a major resolution increase, so you must generate photorealistic high-frequency details, textures, and sharpness to create a crystal-clear result. Do not alter the subject, composition, or colors. The output must be only the final, ultra-high-resolution image.`;
            break;
        case 'general':
        default:
            prompt = `Perform a high-impact, professional-grade enhancement on this image. Your task is to produce a dramatically improved version.
1.  **Upscale & Sharpen:** Intelligently increase the resolution, adding fine, realistic details. The output resolution should be higher than the input.
2.  **Cinematic Retouching:** Perform a magazine-quality skin retouch. Smooth blemishes and imperfections while preserving natural skin texture. Enhance the eyes and hair, making them sharp and vibrant.
3.  **Advanced Color & Light:** Apply cinematic color grading. Expand the dynamic range for deeper blacks and brighter highlights. Correct any color cast and enhance the overall color harmony. Optimize the lighting to add depth and drama.
4.  **Final Polish:** Add micro-contrast for a crisp, detailed look. The final image should be ready for a high-fashion social media campaign. Do not change the subject or composition. The output must be only the enhanced image.`;
            break;
    }
    
    // FIX: Use the `baseImage` parameter instead of the undefined variable `base64`.
    const parts = [ base64ToInlineData(baseImage), { text: prompt } ];
    
    return ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        safetySettings,
    }).then(handleApiResponse);
};


export const replaceBackground = async (baseImage: string, backgroundPrompt?: string, backgroundImage?: string): Promise<string> => {
    if (!backgroundPrompt && !backgroundImage) {
        throw new Error("Either a background prompt or a background image is required.");
    }
    
    const parts: any[] = [ { text: "Base Image:" }, base64ToInlineData(baseImage) ];
    let instruction = "Replace the background of the 'Base Image'. It is crucial that you adjust the lighting, shadows, and color grading of the main subject to perfectly match the new background environment for a seamless, photorealistic composition."

    if (backgroundImage) {
        instruction += "\nUse the 'Background Image' as the new background."
        parts.push({ text: "Background Image:" });
        parts.push(base64ToInlineData(backgroundImage));
    } else {
        instruction += `\nCreate a new background based on this description: "${backgroundPrompt}".`;
    }

    parts.unshift({ text: instruction });

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        safetySettings,
    });

    return handleApiResponse(response);
};

export const outpaintImage = async (
    baseImage: string, 
    directions: OutpaintDirection[], 
    aspectRatio: OutpaintAspectRatio,
    prompt?: string,
    customWidth?: number,
    customHeight?: number
): Promise<string> => {
    let targetDimensionText: string;
    if (aspectRatio === OutpaintAspectRatio.CUSTOM && customWidth && customHeight) {
        targetDimensionText = `a custom dimension of ${customWidth}x${customHeight} pixels`;
    } else if (aspectRatio === OutpaintAspectRatio.FREEFORM) {
        targetDimensionText = 'a new dimension by expanding naturally without a fixed aspect ratio';
    } else {
        targetDimensionText = `a new aspect ratio of ${aspectRatio}`;
    }

    let instruction = `You are an expert at outpainting. Expand the provided image to fit ${targetDimensionText}. The original image content must be perfectly preserved at its center. Fill the new areas (in the specified directions: ${directions.join(', ')}) with content that logically and stylistically continues the original image. The final image should be a seamless, single composition.`;
    
    if (prompt) {
        instruction += ` Use this creative prompt for the new areas: "${prompt}".`;
    }
    
    const parts = [ { text: instruction }, base64ToInlineData(baseImage) ];

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        safetySettings,
    });

    return handleApiResponse(response);
}
