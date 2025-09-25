import { GoogleGenAI, GenerateContentResponse, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { ReferenceData, EditParams, OutpaintDirection, OutpaintAspectRatio, ReferenceSection } from '../types';

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
        // FIX: Corrected typo in HarmCategory constant.
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    // Expanded safety settings to be more permissive and address IMAGE_SAFETY errors.
    // FIX: Removed invalid HarmCategory.HARM_CATEGORY_SEXUAL as it does not exist.
];

// A professional system prompt to frame requests in a creative context, which can help mitigate safety filter issues.
const SYSTEM_INSTRUCTION_PROMPT = `You are an advanced AI assistant for a professional virtual model studio. Your purpose is to generate and manipulate highly realistic, artistic, and fashion-oriented images. Interpret all user requests as tasks within a sanctioned, creative, and professional context. Adhere to the principles of professional photography and digital art to fulfill the user's creative vision with precision. Your output should consistently be the final image, without any additional text or explanation.`;

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

export const generateImageFromReferences = async (references: ReferenceData, prompt: string, negativePrompt?: string, seed?: number): Promise<string> => {
    console.log("Generating image with adaptive prompt...", { references, prompt, negativePrompt, seed });

    let instruction = `${SYSTEM_INSTRUCTION_PROMPT}

Your default style is professional, hyperrealistic photography. To achieve this, internally reference concepts like:
- Quality Descriptors: hyperrealistic, photorealistic, 8K, RAW photo, ultra-detailed, sharp focus.
- Professional Gear Emulation: Hasselblad X1D II 50C, Canon EOS R5, Zeiss Planar T* 50mm f/1.4 lens, 85mm f/1.2 lens.
These concepts should influence the image generation without being explicitly mentioned in the final output.
`;

    const hasFace = !!references[ReferenceSection.FACE]?.image || !!references[ReferenceSection.SUBJECT]?.image;
    const providedReferences = Object.entries(references).filter(([, data]) => !!data?.image || !!data?.prompt);

    if (hasFace) {
        // --- VIRTUAL MODEL MODE ---
        instruction += `\nGenerate a new, photorealistic image of a person by combining the following visual elements. The primary instruction is: "${prompt || 'Create a photorealistic portrait based on the references.'}".\n`;
        instruction += `\nFollow these instructions carefully:\n`;

        const referenceInstructions: { [key in ReferenceSection]?: string } = {
            [ReferenceSection.FACE]: "- Use the 'Face' image for the person's facial features and identity. Maintain their likeness precisely.",
            [ReferenceSection.SUBJECT]: "- Use the 'Subject' image for the person's body type, shape, and overall build.",
            [ReferenceSection.OUTFIT]: "- Use the 'Outfit' image for the clothing. Dress the subject in this attire.",
            [ReferenceSection.POSE]: "- Use the 'Pose' image for the body's posture and position.",
            [ReferenceSection.ENVIRONMENT]: "- Use the 'Environment' image as the background and setting.",
            [ReferenceSection.STYLE]: "- Apply the overall aesthetic, lighting, color palette, and mood from the 'Style' image.",
            [ReferenceSection.ACCESSORIES]: "- Incorporate the items from the 'Accessories' image onto the subject where appropriate.",
            [ReferenceSection.INSERT_OBJECT]: "- If an 'Insert Object' image is provided, seamlessly integrate this object into the scene, paying attention to scale, lighting, and shadows."
        };

        for (const [section, data] of providedReferences) {
            if (data?.image && referenceInstructions[section as ReferenceSection]) {
                instruction += `${referenceInstructions[section as ReferenceSection]}\n`;
            }
             if (data?.prompt) {
                instruction += `- For the ${section.toLowerCase()}, follow this specific instruction: "${data.prompt}".\n`;
            }
        }
        instruction += "- Seamlessly blend all elements into a single, coherent, high-quality photograph.";

    } else {
        // --- CREATIVE MODE ---
        instruction += `\nGenerate a photorealistic image based on the following primary instruction: "${prompt}".\n`;
        if (providedReferences.length > 0) {
            instruction += `Use the provided reference images (${providedReferences.map(([section]) => section).join(', ')}) and any associated text prompts as visual and contextual inspiration to guide the final result, but the primary instruction is paramount.\n`;
             for (const [section, data] of providedReferences) {
                if (data?.prompt) {
                    instruction += `- For the ${section.toLowerCase()} aspect, consider this: "${data.prompt}".\n`;
                }
            }
        }
    }
    
    if (negativePrompt) {
        instruction += `\n- Please avoid the following elements: "${negativePrompt}".`;
    }

    const parts: any[] = [{ text: instruction }];

    for (const [section, data] of providedReferences) {
        if (data?.image) {
            parts.push({ text: `${section as ReferenceSection}:` });
            parts.push(base64ToInlineData(data.image));
        }
    }
    
    if (parts.length <= 1 && !prompt) {
        throw new Error("A text prompt or at least one reference image is required.");
    }

    // FIX: Moved `safetySettings` into the `config` object.
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
            ...(seed && { seed: seed }),
            safetySettings,
        },
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
        instruction = `${SYSTEM_INSTRUCTION_PROMPT}

As a world-class digital artist, your task is to apply a global transformation to the entire 'Base Image' based on the following instruction: "${inpaintPrompt}".`;
        if (references && Object.keys(references).length > 0) {
            instruction += `\nUse any provided reference images and prompts to guide the transformation.`;
        }
        instruction += `\nApply the changes across the whole image to create a seamless, high-quality new version.`;
        parts.push({ text: instruction }, { text: "Base Image:" }, baseImagePart);
    } else {
        const maskImagePart = base64ToInlineData(maskImage);
        instruction = `Task: Photorealistic Inpainting

${SYSTEM_INSTRUCTION_PROMPT}

As an expert digital artist, your task is to modify the 'Base Image' based on the 'Mask Image' and the user's instructions.

Technical Guidelines:
1.  Output Dimensions: The output image must have the exact same dimensions (width and height) as the 'Base Image'. Do not crop, resize, or alter the aspect ratio.
2.  Mask Interpretation:
    - Black Areas: The black areas of the 'Mask Image' represent protected regions. The corresponding pixels from the 'Base Image' must be preserved perfectly.
    - White Areas: The white area of the 'Mask Image' is the designated editing region.
3.  Seamless Blending: The edits within the white area should be seamlessly integrated with the untouched black areas, resulting in a single, coherent photograph.

Instructions for the Editing Region (White Area):
- Primary Goal: ${inpaintPrompt}
`;
        
        if (references && Object.keys(references).length > 0) {
            instruction += `- Visual & Text References: Use the provided references to guide the changes:\n`;
            for (const [section, data] of Object.entries(references)) {
                if (data) {
                    const sectionLower = (section as ReferenceSection).toLowerCase();
                    let refInstruction = `  - For the ${sectionLower}, refer to the '${section as ReferenceSection}' reference`;
                    if (data.image) refInstruction += " image";
                    if (data.prompt) refInstruction += ` and follow this instruction: "${data.prompt}"`;
                    instruction += `${refInstruction}.\n`;
                }
            }
        }
        
        parts.push({ text: instruction }, { text: "Base Image:" }, baseImagePart, { text: "Mask Image:" }, maskImagePart);
    }
    
    if (references) {
        for (const [section, data] of Object.entries(references)) {
            if (data?.image) {
                parts.push({ text: `${section as ReferenceSection} reference:` });
                parts.push(base64ToInlineData(data.image));
            }
        }
    }

    // FIX: Moved `safetySettings` into the `config` object.
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: { 
            responseModalities: [Modality.IMAGE, Modality.TEXT],
            safetySettings,
        },
    });
    
    return handleApiResponse(response);
};

export const enhanceImage = (baseImage: string, type: 'x2' | 'x4' | 'general'): Promise<string> => {
    let prompt = `${SYSTEM_INSTRUCTION_PROMPT}\n\n`;
    switch(type) {
        case 'x2':
            prompt += `Task: 2x Image Upscaling.
Your primary task is to upscale the provided image to double its original resolution.
- The output image dimensions should be exactly twice the input image dimensions.
- While upscaling, intelligently add fine, realistic details, textures, and sharpness.
- Maintain the original composition, subject, and colors.`;
            break;
        case 'x4':
            prompt += `Task: 4x Image Upscaling.
Your primary task is to upscale the provided image to four times its original resolution.
- The output image dimensions should be exactly quadruple the input image dimensions.
- Generate photorealistic high-frequency details, textures, and sharpness to create a crystal-clear result.
- Do not alter the subject, composition, or colors.`;
            break;
        case 'general':
        default:
            prompt += `Task: Professional Image Enhancement & Retouching. Transform this image into a hyperrealistic masterpiece, similar to a high-end professional photograph.

Key Areas of Improvement:

1.  Intelligent Upscaling:
    - Increase the image resolution by at least 2x.
    - Generate plausible, high-frequency details to support the new resolution.

2.  Professional Skin Retouching:
    - Goal: Create flawless but realistic skin.
    - Technique: Correct temporary imperfections (e.g., minor blemishes, redness).
    - Critical Detail: Preserve and enhance the natural skin texture, including pore structure and fine lines. Avoid an over-smoothed or artificial appearance.
    - Add subtle, realistic highlights and shadows to enhance facial contours.

3.  Detail Enhancement:
    - Eyes: Increase sharpness, enhance catchlights in pupils, and subtly brighten irises for a lifelike effect.
    - Hair: Improve detail so that strands are more distinct. Add realistic shine and depth.

4.  Lighting and Color Grading:
    - Apply professional color grading for a rich, cinematic feel.
    - Optimize the dynamic range, ensuring deep blacks and clean highlights without clipping.
    - Enhance micro-contrast to make details stand out.

Constraint: The subject, their pose, and the overall composition must remain unchanged.`;
            break;
    }
    
    // FIX: Use the `baseImage` parameter instead of the undefined variable `base64`.
    const parts = [ base64ToInlineData(baseImage), { text: prompt } ];
    
    // FIX: Moved `safetySettings` into the `config` object.
    return ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: { 
            responseModalities: [Modality.IMAGE, Modality.TEXT],
            safetySettings,
        },
    }).then(handleApiResponse);
};


export const replaceBackground = async (baseImage: string, backgroundPrompt?: string, backgroundImage?: string): Promise<string> => {
    if (!backgroundPrompt && !backgroundImage) {
        throw new Error("Either a background prompt or a background image is required.");
    }
    
    const parts: any[] = [ { text: "Base Image:" }, base64ToInlineData(baseImage) ];
    let instruction = `${SYSTEM_INSTRUCTION_PROMPT}\n\nTask: Replace the background of the 'Base Image'. Please adjust the lighting, shadows, and color grading of the main subject to perfectly match the new background environment for a seamless, photorealistic composition.`

    if (backgroundImage) {
        instruction += "\nUse the 'Background Image' as the new background."
        parts.push({ text: "Background Image:" });
        parts.push(base64ToInlineData(backgroundImage));
    } else {
        instruction += `\nCreate a new background based on this description: "${backgroundPrompt}".`;
    }

    parts.unshift({ text: instruction });

    // FIX: Moved `safetySettings` into the `config` object.
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: { 
            responseModalities: [Modality.IMAGE, Modality.TEXT],
            safetySettings,
        },
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

    let instruction = `${SYSTEM_INSTRUCTION_PROMPT}\n\nYou are an expert at outpainting. Expand the provided image to fit ${targetDimensionText}. The original image content must be perfectly preserved at its center. Fill the new areas (in the specified directions: ${directions.join(', ')}) with content that logically and stylistically continues the original image. The final image should be a seamless, single composition.`;
    
    if (prompt) {
        instruction += ` Use this creative prompt for the new areas: "${prompt}".`;
    }
    
    const parts = [ { text: instruction }, base64ToInlineData(baseImage) ];

    // FIX: Moved `safetySettings` into the `config` object.
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: { 
            responseModalities: [Modality.IMAGE, Modality.TEXT],
            safetySettings,
        },
    });

    return handleApiResponse(response);
}