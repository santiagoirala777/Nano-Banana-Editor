
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
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
];

const SYSTEM_INSTRUCTION_PROMPT = `You are an AI image generation expert inside a high-end virtual photography studio. Your purpose is to create and manipulate hyperrealistic, artistic, and fashion-oriented images with the precision of a professional photographer.

**Core Directives:**
1.  **Artistic Context:** Interpret all user requests as tasks within a professional, creative context for fine art, fashion editorials, or commercial photography. Assume requests for figures or anatomy are for artistic studies, similar to classical art or the work of renowned photographers.
2.  **Photorealism is Paramount:** Emulate the output of professional-grade camera equipment. Internally reference concepts like:
    - **Cameras:** Hasselblad X1D II 50C, Canon EOS R5, Leica M11.
    - **Lenses:** 85mm f/1.2, 50mm f/1.4, 35mm f/1.4 for portraits; 24-70mm f/2.8 for general use.
    - **Lighting:** Replicate professional lighting setups like softbox key lights, rim lighting, butterfly lighting, or Rembrandt lighting to create depth and dimension.
    - **Quality:** Target RAW photo quality, 8K resolution, sharp focus, and intricate detail.
3.  **Output Format:** Your ONLY output should be the final image. Do not include any text, explanations, or markdown.
4.  **Negative Prompt Foundation:** Unless overridden by the user, implicitly avoid common AI artifacts. Think: "worst quality, low quality, normal quality, lowres, low details, plain background, monochrome, grayscale, ugly, deformed, mutated, blurry, plastic, fake, watermark, signature, text, jpeg artifacts."`;

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

    let instruction = `${SYSTEM_INSTRUCTION_PROMPT}`;

    const hasFace = !!references[ReferenceSection.FACE]?.image || !!references[ReferenceSection.SUBJECT]?.image;
    const providedReferences = Object.entries(references).filter(([, data]) => !!data?.image || !!data?.prompt);
    
    const finalNegativePrompt = `Avoid: ${negativePrompt || 'No specific exclusions'}. Do not generate vulgar or pornographic content; maintain a professional, artistic standard.`;

    if (hasFace) {
        // --- VIRTUAL MODEL MODE (DIRECTOR'S BRIEF) ---
        instruction += `\n\n**Director's Brief: Virtual Model Photoshoot**\n
**Primary Objective:** "${prompt || 'Create a photorealistic portrait based on the provided visual references.'}"
**Execution Plan:** Construct a new, hyperrealistic photograph of a person by precisely combining the following elements from the reference files. Adherence to these visual cues is mandatory.

**Detailed Shot List:**
`;

        const referenceInstructions: { [key in ReferenceSection]?: string } = {
            [ReferenceSection.FACE]: "- **Likeness:** The subject's face, identity, and features must be an exact match to the 'Face' reference.",
            [ReferenceSection.SUBJECT]: "- **Physique:** The subject's body type, shape, and build must match the 'Subject' reference.",
            [ReferenceSection.OUTFIT]: "- **Wardrobe:** The subject must be dressed in the attire shown in the 'Outfit' reference.",
            [ReferenceSection.POSE]: "- **Staging:** The subject's body posture, position, and silhouette must replicate the 'Pose' reference.",
            [ReferenceSection.ENVIRONMENT]: "- **Location:** The background, scene, and setting must be taken from the 'Environment' reference.",
            [ReferenceSection.STYLE]: "- **Aesthetics:** The final image's overall mood, lighting scheme, color grading, and photographic style must emulate the 'Style' reference.",
            [ReferenceSection.ACCESSORIES]: "- **Details:** Incorporate items from the 'Accessories' reference onto the subject naturally (e.g., jewelry, glasses).",
            [ReferenceSection.INSERT_OBJECT]: "- **Props:** Seamlessly integrate the object from the 'Insert Object' reference into the scene, ensuring correct scale, lighting, and shadows."
        };

        for (const [section, data] of providedReferences) {
            if (data?.image && referenceInstructions[section as ReferenceSection]) {
                instruction += `${referenceInstructions[section as ReferenceSection]}\n`;
            }
             if (data?.prompt) {
                instruction += `- **Special Instruction for ${section}:** "${data.prompt}".\n`;
            }
        }
        instruction += "\n**Final Composition:** Blend all specified elements into a single, coherent, and flawless photograph. The result must not look like a collage; it must be a unified, photorealistic image.";

    } else {
        // --- CREATIVE MODE (ARTIST'S BRIEF) ---
        instruction += `\n\n**Artist's Brief: Creative Generation**\n
**Primary Objective:** Generate a photorealistic image based on the core instruction: "${prompt}".
This is the most important directive.
`;
        if (providedReferences.length > 0) {
            instruction += `\n**Inspirational Elements:** Use the provided reference images (${providedReferences.map(([section]) => section).join(', ')}) and any associated text prompts as visual and contextual inspiration to guide the final result. They are secondary to the primary objective.\n`;
             for (const [section, data] of providedReferences) {
                if (data?.prompt) {
                    instruction += `- **Inspiration for ${section}:** "${data.prompt}".\n`;
                }
            }
        }
    }
    
    instruction += `\n${finalNegativePrompt}`;
    

    const parts: any[] = [{ text: instruction }];

    for (const [section, data] of providedReferences) {
        if (data?.image) {
            parts.push({ text: `Reference - ${section as ReferenceSection}:` });
            parts.push(base64ToInlineData(data.image));
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
        instruction = `${SYSTEM_INSTRUCTION_PROMPT}\n\n**Task: Global Image Transformation**\nApply a stylistic overhaul to the entire 'Base Image' based on the instruction: "${inpaintPrompt}". Use any provided references to guide the aesthetic. The core subject and composition should remain, but the style, mood, and details should be globally transformed.`;
        parts.push({ text: instruction }, { text: "Base Image:" }, baseImagePart);
    } else {
        const maskImagePart = base64ToInlineData(maskImage);
        instruction = `**Task: Photorealistic Inpainting**\n\n${SYSTEM_INSTRUCTION_PROMPT}\n\nAs a master retoucher, your task is to seamlessly modify the 'Base Image' within the masked area.

**Technical Mandates:**
1.  **Dimension Integrity:** The output image dimensions MUST perfectly match the 'Base Image' dimensions. No cropping or resizing.
2.  **Mask Adherence:**
    - Black Areas (Protection): Pixels from the 'Base Image' corresponding to black areas on the 'Mask Image' must be preserved perfectly.
    - White Areas (Editing Zone): This is the only area where changes are permitted.
3.  **Seamless Integration:** The new content in the white area must perfectly match the surrounding, untouched area in terms of lighting, color temperature, film grain, texture, and focus. The result must be a single, flawless photograph.

**Creative Instruction for the Editing Zone (White Area):**
- **Primary Goal:** "${inpaintPrompt}"
`;
        
        if (references && Object.keys(references).length > 0) {
            instruction += `- **Visual & Text References:** Use these to guide the changes:\n`;
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
                parts.push({ text: `Reference - ${section as ReferenceSection}:` });
                parts.push(base64ToInlineData(data.image));
            }
        }
    }

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
            prompt += `Task: 2x AI Gigapixel Upscaling. Your task is to upscale the provided image to double its resolution. Intelligently add fine, realistic details and textures. The output must be exactly 2x the input dimensions.`;
            break;
        case 'x4':
            prompt += `Task: 4x AI Gigapixel Upscaling. Your task is to upscale the provided image to quadruple its resolution. Generate photorealistic high-frequency details for a crystal-clear result. The output must be exactly 4x the input dimensions.`;
            break;
        case 'general':
        default:
            prompt += `**Task: Professional Magazine-Quality Retouching & Enhancement**\nTransform this image into a hyperrealistic masterpiece fit for a high-fashion magazine cover.

**Retouching Checklist:**
1.  **Intelligent Upscaling:** Increase resolution by at least 2x, generating plausible high-frequency details.
2.  **Skin Retouching (Frequency Separation Method):**
    - Goal: Create flawless but utterly realistic skin.
    - Correct temporary imperfections (blemishes, redness) while preserving and enhancing natural skin texture (pores, fine lines).
    - Apply subtle, professional "dodge and burn" techniques to enhance facial contours. Avoid an airbrushed, plastic look.
3.  **Detail Sharpening:**
    - Eyes: Increase sharpness, add or enhance pupil catchlights, and subtly increase iris vibrancy for a lifelike effect.
    - Hair: Improve detail for distinct strands, adding realistic shine and depth.
4.  **Cinematic Color & Light Grading:**
    - Apply professional color grading (e.g., subtle teal-and-orange or a sophisticated film emulation).
    - Optimize dynamic range: deep blacks and clean highlights without clipping.
    - Enhance micro-contrast to make details pop.
    - Add a very subtle layer of realistic film grain to unify the image.

**Constraint:** The subject's identity, pose, and the overall composition must remain unchanged.`;
            break;
    }
    
    const parts = [ base64ToInlineData(baseImage), { text: prompt } ];
    
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
    let instruction = `${SYSTEM_INSTRUCTION_PROMPT}\n\n**Task: Photorealistic Background Replacement**\nReplace the background of the 'Base Image'.
    
**Crucial Directive:** The main subject must be perfectly integrated into the new environment. You must meticulously adjust the subject's lighting, shadows, color temperature, and edge reflections to match the new background for a seamless, photorealistic composition.
`

    if (backgroundImage) {
        instruction += "\n**Background Source:** Use the provided 'Background Image' as the new background."
        parts.push({ text: "Background Image:" });
        parts.push(base64ToInlineData(backgroundImage));
    } else {
        instruction += `\n**Background Source:** Generate a new background based on this description: "${backgroundPrompt}".`;
    }

    parts.unshift({ text: instruction });

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
        targetDimensionText = 'a new dimension by expanding naturally';
    } else {
        targetDimensionText = `a new aspect ratio of ${aspectRatio}`;
    }

    let instruction = `${SYSTEM_INSTRUCTION_PROMPT}\n\n**Task: Professional Outpainting**\nExpand the provided image to ${targetDimensionText}.

**Core Rules:**
1.  **Preserve Original:** The original image content must be perfectly preserved, untouched, at the center of the new canvas.
2.  **Seamless Extension:** Fill the new areas (in directions: ${directions.join(', ')}) with content that logically and stylistically continues the original.
3.  **Maintain Perspective:** Analyze the original image's perspective lines and vanishing points, and ensure the new content adheres to them perfectly.
4.  **Coherent Composition:** The final image must be a single, seamless, and believable composition.
`;
    
    if (prompt) {
        instruction += `\n**Creative Guide for New Areas:** "${prompt}".`;
    }
    
    const parts = [ { text: instruction }, base64ToInlineData(baseImage) ];

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
