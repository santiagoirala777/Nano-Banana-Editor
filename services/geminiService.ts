
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { ReferenceImages, EditParams, OutpaintDirection, OutpaintAspectRatio, ReferenceSection } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export const generateImageFromReferences = async (references: ReferenceImages, prompt: string, seed?: number): Promise<string> => {
    console.log("Generating image from references and prompt...", { references, prompt, seed });

    let instruction = `Generate a new, photorealistic image by combining the following visual elements.`;
    if (prompt) {
        instruction += ` The main goal is to follow this instruction: "${prompt}".\nUse the visual references to guide the final output.`
    }
    instruction += `\nFollow these instructions carefully:
    - Use the 'Subject' image as the primary reference for the person's face, body, and identity. Maintain their likeness.
    - Use the 'Outfit' image for the clothing. Dress the subject in this attire.
    - Use the 'Pose' image for the body's posture and position.
    - Use the 'Environment' image as the background and setting.
    - Apply the overall aesthetic, lighting, color palette, and mood from the 'Style' image.
    - Incorporate the items from the 'Accessories' image onto the subject where appropriate.
    - If an 'Insert Object' image is provided, seamlessly integrate this object into the scene, paying attention to scale, lighting, and shadows.
    - Seamlessly blend all elements into a single, coherent, high-quality photograph. The final output must be only the generated image.`;

    const parts: any[] = [{ text: instruction }];

    for (const [section, base64] of Object.entries(references)) {
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
    });

    return handleApiResponse(response);
};


export const editImage = async (params: EditParams): Promise<string> => {
    console.log("Editing image with params:", params);
    const { baseImage, maskImage, inpaintPrompt, references } = params;

    const baseImagePart = base64ToInlineData(baseImage);
    const maskImagePart = base64ToInlineData(maskImage);
    
    let instruction = `You are a world-class digital artist specializing in photorealistic inpainting. Your task is to modify the 'Base Image' with extreme precision, following these strict rules:
1.  You are ONLY permitted to make changes within the white areas of the accompanying 'Mask Image'.
2.  The black areas of the 'Mask Image' are SACROSANCT. They MUST be preserved with ZERO alterations. The final output's black-masked regions must be pixel-for-pixel identical to the 'Base Image'.
3.  Your primary instruction is: "${inpaintPrompt}". Apply this change ONLY to the white masked area.`;
    
    if (references && Object.keys(references).length > 0) {
        instruction += `\n4. Additionally, use the following visual references to guide the changes ONLY within the white masked area:`;
        for (const [section, base64] of Object.entries(references)) {
            if (base64) {
                const sectionLower = (section as ReferenceSection).toLowerCase();
                instruction += `\n   - For the ${sectionLower}, refer to the '${section as ReferenceSection}' reference image.`;
            }
        }
    }
    
    instruction += `\n5. The final result must be a single, seamless, photorealistic image that perfectly blends the edited area with the untouched original. The output MUST be only the final image.`;
    
    const parts: any[] = [ 
        { text: instruction },
        { text: "Base Image:" }, 
        baseImagePart, 
        { text: "Mask Image:" }, 
        maskImagePart 
    ];

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
    });
    
    return handleApiResponse(response);
};

export const enhanceImage = (baseImage: string): Promise<string> => {
    const prompt = `Perform a high-impact, professional-grade enhancement on this image. Your task is to produce a dramatically improved version.
1.  **Upscale to 4K:** Intelligently increase the resolution to 4K, adding fine, realistic details.
2.  **Cinematic Retouching:** Perform a magazine-quality skin retouch. Smooth blemishes and imperfections while preserving natural skin texture. Enhance the eyes and hair, making them sharp and vibrant.
3.  **Advanced Color & Light:** Apply cinematic color grading. Expand the dynamic range for deeper blacks and brighter highlights. Correct any color cast and enhance the overall color harmony. Optimize the lighting to add depth and drama.
4.  **Final Polish:** Add micro-contrast for a crisp, detailed look. The final image should be ready for a high-fashion social media campaign. Do not change the subject or composition. The output must be only the enhanced image.`;
    
    const parts = [ base64ToInlineData(baseImage), { text: prompt } ];
    
    return ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
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
    });

    return handleApiResponse(response);
};

export const outpaintImage = async (
    baseImage: string, 
    prompt: string, 
    directions: OutpaintDirection[], 
    aspectRatio: OutpaintAspectRatio,
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

    const instruction = `You are an expert at outpainting. Expand the provided image to fit ${targetDimensionText}. The original image content must be perfectly preserved at its center. Fill the new areas (in the specified directions: ${directions.join(', ')}) with content that logically and stylistically continues the original image. The final image should be a seamless, single composition. Use this creative prompt for the new areas: "${prompt}".`;
    
    const parts = [ { text: instruction }, base64ToInlineData(baseImage) ];

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });

    return handleApiResponse(response);
}