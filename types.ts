
export enum Status {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export type GenerationStatus = Status;

export interface ImageInput {
  base64: string;
  mimeType: string;
}

export interface VideoConfig {
  apiKey: string;
  prompt: string; // This will be the full string from the textarea, including newlines
  images?: ImageInput[];
  model: string;
  aspectRatio: '16:9' | '9:16';
  quality: '1080p' | '720p';
  numberOfResults: number;
}

export interface LongVideoConfig {
  apiKey: string;
  prompt: string;
  image?: ImageInput;
  segmentCount: number;
  autoVariations: boolean;
  variationMode: 'Sederhana' | 'Gemini';
  aspectRatio: '16:9' | '9:16';
  quality: '1080p' | '720p';
  model: string;
}

export interface ImageTransitionConfig {
  apiKey: string;
  prompt: string;
  startImage: ImageInput;
  endImage: ImageInput;
  segmentCount: number; // The number of intermediate steps
  aspectRatio: '16:9' | '9:16';
  quality: '1080p' | '720p';
  model: string;
}

export interface ContinuationData {
    videoUrl: string;
    originalPrompt: string;
}
