import { GoogleGenAI, Type, Part } from "@google/genai";
import type { VideoConfig, LongVideoConfig, ImageTransitionConfig } from '../types';

const getAiClient = (apiKey?: string): GoogleGenAI => {
    const keyToUse = apiKey || process.env.API_KEY;
    if (!keyToUse) {
        throw new Error("API Key not found. Please provide one in the input field or set the API_KEY environment variable.");
    }
    return new GoogleGenAI({ apiKey: keyToUse });
};

const parseApiError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return 'Terjadi kesalahan tidak diketahui.';
  }

  const errorMessage = error.message;
  // Regex to find a JSON object within the error string, robustly
  const jsonMatch = errorMessage.match(/{.*}/s);

  if (jsonMatch && jsonMatch[0]) {
    try {
      const errorObj = JSON.parse(jsonMatch[0]);
      if (errorObj.error && errorObj.error.message) {
        if (errorObj.error.status === 'RESOURCE_EXHAUSTED' || errorObj.error.code === 429) {
          return 'Anda telah melebihi kuota API Anda. Silakan periksa paket dan detail penagihan Anda di Google Cloud Console.';
        }
        // Return a cleaner message for other API errors
        return `Terjadi kesalahan API: ${errorObj.error.message}`;
      }
    } catch (e) {
      // If JSON parsing fails, fall through to return the original message
    }
  }

  // If no JSON is found or parsing fails, return the original, full error message for debugging.
  return errorMessage;
};


export const enchantPrompt = async (prompt: string, apiKey: string): Promise<string> => {
    if (!prompt.trim()) {
        return prompt;
    }
    const ai = getAiClient(apiKey);
    try {
        const systemInstruction = `You are an expert prompt engineer for the VEO-3 video generation model. Your task is to take a user's basic prompt and enhance it to create a visually stunning, cinematic result.
        Follow these rules:
        1.  Add vivid details about the subject, action, and environment.
        2.  Specify cinematic terms like "cinematic shot," "drone footage," "wide-angle," "close-up," etc.
        3.  Describe the lighting conditions, e.g., "golden hour," "dramatic lighting," "moonlit."
        4.  Incorporate high-quality descriptors like "photorealistic," "highly detailed," "4K," "hyperrealistic."
        5.  Keep the language concise and descriptive. The output must be a single, enhanced prompt string, without any conversational text or explanations.
        
        Example Input: "a car driving"
        Example Output: "Cinematic drone footage of a sleek, red sports car driving at high speed along a winding coastal road at sunset, photorealistic, highly detailed, 4K resolution."`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
            },
        });
        
        return response.text.trim();

    } catch (error) {
        console.error("Error enchanting prompt:", error);
        throw new Error(parseApiError(error));
    }
};


const loadingMessages = [
    "Contacting the creative AI...",
    "Gathering digital stardust...",
    "Briefing the virtual director...",
    "Rendering the first few frames...",
    "AI is composing the scene...",
    "This is taking a bit longer than usual, but good things are worth the wait!",
    "Polishing the pixels...",
    "Finalizing the video stream...",
    "Almost there, applying finishing touches...",
];

async function pollVideoOperation(operation: any, ai: GoogleGenAI): Promise<any> {
    let currentOperation = operation;
    while (!currentOperation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
        currentOperation = await ai.operations.getVideosOperation({ operation: currentOperation });
    }
    return currentOperation;
}

async function fetchVideoBlob(uri: string, apiKey: string): Promise<Blob> {
    if (!apiKey) {
         throw new Error("API Key is required to download the video.");
    }
    const videoResponse = await fetch(`${uri}&key=${apiKey}`);
    if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }
    return await videoResponse.blob();
}

export const generateVideo = async (
    config: VideoConfig, 
    onProgress: (message: string) => void
): Promise<Blob[]> => {
    const ai = getAiClient(config.apiKey);
    const apiKey = config.apiKey || process.env.API_KEY;
    if (!apiKey) throw new Error("API Key is missing.");

    const modelParams: any = {
        model: config.model,
        prompt: config.prompt,
        config: {
            numberOfVideos: config.numberOfResults,
            aspectRatio: config.aspectRatio,
        }
    };

    if (config.images && config.images.length > 0) {
        // The current API might only support one image, so we use the first.
        modelParams.image = {
            imageBytes: config.images[0].base64,
            mimeType: config.images[0].mimeType
        };
    }

    onProgress(loadingMessages[0]);
    let messageIndex = 1;
    const messageInterval = setInterval(() => {
        onProgress(loadingMessages[messageIndex % loadingMessages.length]);
        messageIndex++;
    }, 8000);

    try {
        let operation = await ai.models.generateVideos(modelParams);
        operation = await pollVideoOperation(operation, ai);
        
        clearInterval(messageInterval);

        const generatedVideos = operation.response?.generatedVideos;
        if (!generatedVideos || generatedVideos.length === 0) {
            throw new Error('Video generation succeeded, but no video URI was returned.');
        }

        const blobs: Blob[] = [];
        for (let i = 0; i < generatedVideos.length; i++) {
            const videoInfo = generatedVideos[i];
            if (videoInfo.video?.uri) {
                onProgress(`Downloading video ${i + 1} of ${generatedVideos.length}...`);
                const blob = await fetchVideoBlob(videoInfo.video.uri, apiKey);
                blobs.push(blob);
            }
        }
        
        onProgress("Download complete!");
        return blobs;

    } catch (error) {
        clearInterval(messageInterval);
        console.error("Error in generateVideo service:", error);
        throw new Error(parseApiError(error));
    }
};

export const generateLongVideo = async (
    config: LongVideoConfig,
    onProgress: (message: string) => void
): Promise<Blob[]> => {
    const ai = getAiClient(config.apiKey);
    const apiKey = config.apiKey || process.env.API_KEY;
    if (!apiKey) throw new Error("API Key is missing.");

    let prompts: string[] = [];

    onProgress('Menyiapkan prompt...');
    if (config.autoVariations) {
        if (config.variationMode === 'Gemini') {
            onProgress('Membuat variasi prompt dengan Gemini...');
            try {
                const schema = {
                    type: Type.OBJECT,
                    properties: {
                        prompts: {
                            type: Type.ARRAY,
                            description: `List of ${config.segmentCount} prompts.`,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["prompts"]
                };
                
                const result = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Based on the following video idea, create ${config.segmentCount} distinct but sequentially related prompts for short video clips that can be joined together to form a longer story. The original idea is: "${config.prompt}".`,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: schema,
                    }
                });
                
                const jsonResponse = JSON.parse(result.text);
                prompts = jsonResponse.prompts;
                if (!prompts || prompts.length !== config.segmentCount) {
                    throw new Error('Gemini did not return the expected number of prompts. Falling back to simple variations.');
                }

            } catch(e) {
                console.error("Gemini prompt variation failed, falling back to simple.", e);
                // Fallback to simple mode if Gemini fails
                onProgress('Variasi Gemini gagal, menggunakan mode Sederhana.');
                prompts = Array.from({ length: config.segmentCount }, (_, i) => `${config.prompt}, bagian ${i + 1}`);
            }
        } else { // Sederhana
            prompts = Array.from({ length: config.segmentCount }, (_, i) => `${config.prompt}, bagian ${i + 1}`);
        }
    } else {
        prompts = Array(config.segmentCount).fill(config.prompt);
    }
    
    const videoBlobs: Blob[] = [];
    for (let i = 0; i < prompts.length; i++) {
        const currentPrompt = prompts[i];
        onProgress(`Membuat segmen ${i + 1} dari ${prompts.length}...`);
        
        try {
            const modelParams: any = {
                model: 'veo-3.0-generate-preview',
                prompt: currentPrompt,
                config: { 
                    numberOfVideos: 1,
                    aspectRatio: config.aspectRatio,
                }
            };

            if (config.image) {
                modelParams.image = {
                    imageBytes: config.image.base64,
                    mimeType: config.image.mimeType
                };
            }

            let operation = await ai.models.generateVideos(modelParams);
            operation = await pollVideoOperation(operation, ai);

            if (!operation.response?.generatedVideos?.[0]?.video?.uri) {
                throw new Error(`Segmen ${i+1} berhasil dibuat, tapi tidak ada URI video yang diterima.`);
            }

            const downloadLink = operation.response.generatedVideos[0].video.uri;
            onProgress(`Mengunduh segmen ${i + 1} dari ${prompts.length}...`);
            const blob = await fetchVideoBlob(downloadLink, apiKey);
            videoBlobs.push(blob);

        } catch (error) {
            console.error(`Error generating segment ${i + 1}:`, error);
            throw new Error(`Gagal membuat segmen ${i + 1}: ${parseApiError(error)}`);
        }
    }

    onProgress('Semua segmen telah selesai dibuat!');
    return videoBlobs;
};


export const generateImageTransitionVideo = async (
    config: ImageTransitionConfig,
    onProgress: (message: string) => void
): Promise<Blob[]> => {
    const ai = getAiClient(config.apiKey);
    const apiKey = config.apiKey || process.env.API_KEY;
    if (!apiKey) throw new Error("API Key is missing.");

    // 1. Generate intermediate prompts using Gemini
    onProgress('Membuat prompt transisi dengan Gemini...');
    let prompts: string[] = [];
    try {
        const schema = {
            type: Type.OBJECT,
            properties: {
                prompts: {
                    type: Type.ARRAY,
                    description: `A list of exactly ${config.segmentCount + 2} prompts to transition from a start image to an end image.`,
                    items: { type: Type.STRING }
                }
            },
            required: ["prompts"]
        };
        
        const textPrompt = `I have two images. 
        - The START image shows: [Image 1 description - AI will infer this].
        - The END image shows: [Image 2 description - AI will infer this].
        My goal is to create a video that smoothly transitions from the start image to the end image. The overarching theme is: "${config.prompt}".
        
        Please generate a sequence of exactly ${config.segmentCount + 2} short, descriptive prompts for video clips.
        - The first prompt should describe the start image.
        - The last prompt should describe the end image.
        - The ${config.segmentCount} prompts in between should describe the visual transition step-by-step.`;

        const imagePart1: Part = { inlineData: { mimeType: config.startImage.mimeType, data: config.startImage.base64 } };
        const imagePart2: Part = { inlineData: { mimeType: config.endImage.mimeType, data: config.endImage.base64 } };
        const textPart: Part = { text: textPrompt };

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, imagePart1, imagePart2] },
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });

        const jsonResponse = JSON.parse(result.text);
        prompts = jsonResponse.prompts;
        if (!prompts || prompts.length !== config.segmentCount + 2) {
            throw new Error(`Gemini did not return the expected number of prompts. Expected ${config.segmentCount + 2}, got ${prompts?.length || 0}.`);
        }
    } catch (e) {
        console.error("Gemini prompt generation for transition failed:", e);
        throw new Error(`Gagal membuat prompt transisi dengan AI: ${parseApiError(e)}`);
    }

    // 2. Generate video segments
    const videoBlobs: Blob[] = [];
    for (let i = 0; i < prompts.length; i++) {
        const currentPrompt = prompts[i];
        onProgress(`Membuat segmen transisi ${i + 1} dari ${prompts.length}...`);
        
        try {
            const modelParams: any = {
                model: 'veo-3.0-generate-preview',
                prompt: currentPrompt,
                config: { 
                    numberOfVideos: 1,
                    aspectRatio: config.aspectRatio,
                }
            };

            // Use start image for the first segment, end image for the last
            if (i === 0) {
                modelParams.image = { imageBytes: config.startImage.base64, mimeType: config.startImage.mimeType };
            } else if (i === prompts.length - 1) {
                modelParams.image = { imageBytes: config.endImage.base64, mimeType: config.endImage.mimeType };
            }

            let operation = await ai.models.generateVideos(modelParams);
            operation = await pollVideoOperation(operation, ai);

            if (!operation.response?.generatedVideos?.[0]?.video?.uri) {
                throw new Error(`Segmen ${i+1} berhasil dibuat, tapi tidak ada URI video yang diterima.`);
            }

            const downloadLink = operation.response.generatedVideos[0].video.uri;
            onProgress(`Mengunduh segmen ${i + 1} dari ${prompts.length}...`);
            const blob = await fetchVideoBlob(downloadLink, apiKey);
            videoBlobs.push(blob);

        } catch (error) {
            console.error(`Error generating segment ${i + 1}:`, error);
            throw new Error(`Gagal membuat segmen transisi ${i + 1}: ${parseApiError(error)}`);
        }
    }

    onProgress('Semua segmen transisi telah selesai dibuat!');
    return videoBlobs;
};