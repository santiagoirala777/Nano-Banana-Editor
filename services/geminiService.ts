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

const SYSTEM_INSTRUCTION_PROMPT = `You are an AI photo generator specializing in creating authentic, high-quality, casual images for a social media influencer's Instagram feed. Your goal is to produce photos that look like they were taken by the model herself or a friend using a high-end smartphone, like the latest iPhone.

**Core Directives:**
1.  **Aesthetic:** The vibe is candid, authentic, and effortlessly cool. Avoid stiff, professional studio poses. Think selfies, "photo dumps," golden hour shots, and everyday moments captured beautifully.
2.  **Photo Quality:** Emulate the signature look of a new iPhone camera:
    - **Sharpness & Clarity:** Images should be crisp and detailed.
    - **Colors:** Vibrant, true-to-life colors that pop.
    - **Lighting:** Prioritize natural light. Use flash only if it looks intentional and stylish (e.g., a nighttime selfie with flash).
    - **Depth:** Create a natural-looking depth of field (Portrait Mode effect) where appropriate.
3.  **Artistic Context:** Interpret all requests within the context of creating content for a personal social media brand. The goal is relatable beauty and lifestyle photography, not high-fashion editorials.
4.  **Output Format:** Your ONLY output should be the final image. Do not include any text, explanations, or markdown.
5.  **Negative Prompt Foundation:** Unless overridden by the user, implicitly avoid common AI artifacts and anything that looks overly staged or fake. Think: "worst quality, low quality, corporate, stock photo, unnatural pose, plastic skin, watermark, signature, text, jpeg artifacts."`;

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
        // --- VIRTUAL MODEL MODE (CONTENT PLAN) ---
        instruction += `\n\n**Content Plan: Instagram Photoshoot**\n
**Primary Goal:** "${prompt || 'Create a photorealistic, candid portrait based on the provided visual references.'}"
**Shot Breakdown:** Construct a new, high-quality, authentic-looking photo of a person by combining these elements. Visual consistency is key.

**Detailed Shot List:**
`;

        const referenceInstructions: { [key in ReferenceSection]?: string } = {
            [ReferenceSection.FACE]: "- **Likeness:** The subject's face and features must be an exact match to the 'Face' reference.",
            [ReferenceSection.SUBJECT]: "- **Physique:** The subject's body type and build must match the 'Subject' reference.",
            [ReferenceSection.OUTFIT]: "- **Outfit:** The subject must be dressed in the attire shown in the 'Outfit' reference.",
            [ReferenceSection.POSE]: "- **Pose:** The subject's body posture and position must replicate the 'Pose' reference.",
            [ReferenceSection.ENVIRONMENT]: "- **Vibe/Location:** The background and scene must be taken from the 'Environment' reference.",
            [ReferenceSection.STYLE]: "- **Aesthetics:** The final image's overall mood, lighting, and color style must emulate the 'Style' reference.",
            [ReferenceSection.ACCESSORIES]: "- **Details:** Add items from the 'Accessories' reference onto the subject naturally.",
            [ReferenceSection.INSERT_OBJECT]: "- **Props:** Seamlessly integrate the object from the 'Insert Object' reference into the scene."
        };

        for (const [section, data] of providedReferences) {
            if (data?.image && referenceInstructions[section as ReferenceSection]) {
                instruction += `${referenceInstructions[section as ReferenceSection]}\n`;
            }
             if (data?.prompt) {
                instruction += `- **Special Note for ${section}:** "${data.prompt}".\n`;
            }
        }
        instruction += "\n**Final Look:** Blend all elements into a single, coherent, and flawless photo. It should look like a real, candid moment, not a collage.";

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
        instruction = `**Task: Photorealistic Inpainting**\n\n${SYSTEM_INSTRUCTION_PROMPT}\n\nAs an expert photo editor, your task is to seamlessly modify the 'Base Image' within the masked area.

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
            prompt += `Task: 2x AI Upscaling (iPhone Quality). Upscale the image to double its resolution. Add fine, realistic details and textures consistent with a high-end smartphone camera.`;
            break;
        case 'x4':
            prompt += `Task: 4x AI Upscaling (iPhone Quality). Upscale the image to quadruple its resolution. Generate photorealistic details for a crystal-clear result, as if zoomed in on an iPhone photo.`;
            break;
        case 'general':
        default:
            prompt += `**Task: 'Glow Up' - Natural Instagram-Ready Enhancement**\nApply a beautiful, natural enhancement to this photo, making it look like a perfectly captured candid moment ready for Instagram.

**Enhancement Checklist:**
1.  **Clarity Boost:** Sharpen the image to iPhone quality, bringing out details in hair, eyes, and clothing without looking artificial. Emulate the effect of iPhone's Deep Fusion or Photonic Engine.
2.  **Natural Skin Retouch:** Smooth skin subtly, removing minor temporary blemishes but keeping natural texture. The goal is healthy, glowing skin, not an airbrushed effect.
3.  **Vibrant Colors:** Enhance colors to make them pop, just like an iPhone's image processing. Boost saturation and contrast for a lively, engaging look, but keep them true-to-life.
4.  **Lighting Optimization:** Brighten the subject and add a subtle "glow." Even out the lighting slightly, enhance natural highlights, and ensure catchlights in the eyes are bright and clear.

**Constraint:** The subject's identity, pose, and the overall composition must remain unchanged. The goal is enhancement, not alteration.`;
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