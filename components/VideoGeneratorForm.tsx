
import React, { useState, useCallback, ChangeEvent, useEffect, useRef } from 'react';
import type { VideoConfig, ImageInput, ContinuationData } from '../types';
import { enchantPrompt } from '../services/geminiService';
import { UploadIcon } from './icons/UploadIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { MagicWandIcon } from './icons/MagicWandIcon';

interface VideoGeneratorFormProps {
  apiKey: string;
  onSubmit: (config: Omit<VideoConfig, 'apiKey'>) => void;
  isGenerating: boolean;
  onClearHistory: () => void;
  continuationData: ContinuationData | null;
  onContinuationClear: () => void;
}

const fileToBas64 = (file: File): Promise<{ base64: string, dataUrl: string, mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve({ base64, dataUrl, mimeType: file.type });
    };
    reader.onerror = error => reject(error);
  });
};

export const VideoGeneratorForm: React.FC<VideoGeneratorFormProps> = ({ apiKey, onSubmit, isGenerating, onClearHistory, continuationData, onContinuationClear }) => {
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<({ dataUrl: string } & ImageInput)[]>([]);
  const [model, setModel] = useState('veo-3.0-generate-preview');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [quality, setQuality] = useState<'1080p' | '720p'>('1080p');
  const [numberOfResults, setNumberOfResults] = useState(1);
  const [error, setError] = useState('');
  const [isEnchanting, setIsEnchanting] = useState(false);
  const [isCapturingFrame, setIsCapturingFrame] = useState(false);

  useEffect(() => {
    if (continuationData) {
      const captureLastFrame = async () => {
        setIsCapturingFrame(true);
        const video = document.createElement('video');
        video.src = continuationData.videoUrl;
        video.muted = true;
        video.crossOrigin = "anonymous"; // Important for canvas
  
        video.onloadedmetadata = () => {
          video.currentTime = video.duration;
        };
  
        video.onseeked = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/png'); // Use lossless PNG for better quality
            const base64 = dataUrl.split(',')[1];
            const newImage: ({ dataUrl: string } & ImageInput) = {
                base64,
                mimeType: 'image/png', // Update mimeType to PNG
                dataUrl,
            };
            setImages([newImage]);
            setPrompt(continuationData.originalPrompt);
            setIsCapturingFrame(false);
            onContinuationClear();
          } else {
             setError("Could not capture video frame.");
             setIsCapturingFrame(false);
             onContinuationClear();
          }
        };

        video.onerror = () => {
            setError("Failed to load video for frame capture. The URL may have expired.");
            setIsCapturingFrame(false);
            onContinuationClear();
        }
      };
  
      captureLastFrame();
    }
  }, [continuationData, onContinuationClear]);

  const handleImageUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setError('');
      const imagePromises = Array.from(files).map(file => {
          if (file.size > 4 * 1024 * 1024) { // 4MB limit per file
            setError(`File ${file.name} exceeds 4MB limit.`);
            return null;
          }
          return fileToBas64(file);
      });
      const newImages = (await Promise.all(imagePromises)).filter(Boolean) as ({ dataUrl: string } & ImageInput)[];
      setImages(prev => [...prev, ...newImages]);
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  const handleClearPrompt = () => {
      setPrompt('');
      setImages([]);
      setAspectRatio('16:9');
      setQuality('1080p');
      setNumberOfResults(1);
      setError('');
  };

  const handleEnchantPrompt = async () => {
    if (!prompt.trim() || !apiKey) {
        setError("Please enter a prompt and API key to use this feature.");
        return;
    }
    setIsEnchanting(true);
    setError('');
    try {
        const enchanted = await enchantPrompt(prompt, apiKey);
        setPrompt(enchanted);
    } catch(err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError("Gagal menyempurnakan prompt. Silakan coba lagi.");
        }
    } finally {
        setIsEnchanting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('Prompt cannot be empty.');
      return;
    }
    setError('');
    onSubmit({
      prompt,
      images,
      model,
      aspectRatio,
      quality,
      numberOfResults,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="relative space-y-6 animate-fade-in text-sm">
       {isCapturingFrame && (
            <div className="absolute inset-0 bg-surface-dark/80 flex flex-col items-center justify-center z-20 rounded-lg">
                <svg className="animate-spin h-8 w-8 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-4 text-on-surface-dark">Menyiapkan adegan selanjutnya...</p>
            </div>
       )}
      <h2 className="text-xl font-bold text-on-surface-dark">Setting</h2>
      {error && <div className="p-3 bg-red-900/50 text-brand-danger border border-brand-danger rounded-md text-xs">{error}</div>}
      
      <div>
        <label htmlFor="prompt" className="block text-base font-medium text-on-surface-dark-secondary mb-1">
          Masukkan Prompt
        </label>
        <div className="relative">
            <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Potret sinematik seekor harimau berjalan di hutan bersalju..."
                className="w-full h-28 p-2 pr-10 bg-surface-dark border border-gray-600 rounded-md focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-all text-on-surface-dark placeholder:text-gray-500"
                disabled={isGenerating || isEnchanting}
            />
            <button
                type="button"
                onClick={handleEnchantPrompt}
                disabled={isGenerating || isEnchanting || !prompt.trim()}
                className="absolute top-2 right-2 p-1.5 bg-gray-700/60 rounded-md text-yellow-400 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Enchant Prompt"
            >
                {isEnchanting ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : <MagicWandIcon className="w-5 h-5" />}
            </button>
        </div>
      </div>
      
      <hr className="border-gray-700" />

      {/* Image Upload */}
      <div>
        <label className="block text-base font-medium text-on-surface-dark-secondary mb-1">
          Upload gambar (opsional, hanya gambar pertama yg digunakan)
        </label>
        <div className="mt-1 flex flex-col items-center justify-center p-4 border-2 border-gray-600 border-dashed rounded-md bg-black/20">
            <UploadIcon className="h-8 w-8 text-gray-500" />
            <div className="flex text-xs text-gray-500 mt-2">
                <label
                  htmlFor="image-upload"
                  className="relative cursor-pointer rounded-md font-medium text-brand-primary hover:text-blue-400"
                >
                  <span>Drag and drop files here</span>
                  <input id="image-upload" name="image-upload" type="file" multiple className="sr-only" onChange={handleImageUpload} accept="image/png, image/jpeg, image/webp" disabled={isGenerating} />
                </label>
            </div>
             <p className="text-xs text-gray-600 mt-1">Limit 4MB per file • JPG, JPEG, PNG</p>
            <button type="button" onClick={() => document.getElementById('image-upload')?.click()} disabled={isGenerating} className="mt-2 text-xs py-1 px-3 bg-gray-700 hover:bg-gray-600 rounded-md">Browse files</button>
        </div>
        {images.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2">
                {images.map((img, i) => (
                    <div key={i} className="relative group aspect-square">
                        <img src={img.dataUrl} alt={`Preview ${i}`} className="h-full w-full object-cover rounded-md"/>
                         <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Remove image"
                            disabled={isGenerating}
                        >
                            <XCircleIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* Configuration Options */}
      <div className="space-y-4">
        <div>
            <label htmlFor="model-select" className="block text-base font-medium text-on-surface-dark-secondary mb-1">Pilih Model</label>
            <select id="model-select" value={model} onChange={e => setModel(e.target.value)} disabled={isGenerating} className="w-full p-2 bg-surface-dark border border-gray-600 rounded-md focus:ring-1 focus:ring-brand-primary focus:border-brand-primary">
                <option value="veo-3.0-generate-preview">veo-3.0-generate-preview</option>
                <option value="veo-3.0-fast-generate-preview">veo-3.0-fast-generate-preview</option>
                <option value="veo-2.0-generate-001">veo-2.0-generate-001</option>
            </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
             <div>
                <label htmlFor="aspect-ratio-select" className="block text-base font-medium text-on-surface-dark-secondary mb-1">Aspect Ratio</label>
                <select id="aspect-ratio-select" value={aspectRatio} onChange={e => setAspectRatio(e.target.value as '16:9' | '9:16')} disabled={isGenerating} className="w-full p-2 bg-surface-dark border border-gray-600 rounded-md focus:ring-1 focus:ring-brand-primary focus:border-brand-primary">
                    <option value="16:9">16:9</option>
                    <option value="9:16">9:16</option>
                </select>
            </div>
             <div>
                <label htmlFor="quality-select" className="block text-base font-medium text-on-surface-dark-secondary mb-1">Kualitas</label>
                <select id="quality-select" value={quality} onChange={e => setQuality(e.target.value as '1080p' | '720p')} disabled={isGenerating} className="w-full p-2 bg-surface-dark border border-gray-600 rounded-md focus:ring-1 focus:ring-brand-primary focus:border-brand-primary">
                    <option value="1080p">1080p (FHD)</option>
                    <option value="720p">720p (HD)</option>
                </select>
            </div>
        </div>
        <div>
            <label htmlFor="num-results" className="block text-base font-medium text-on-surface-dark-secondary mb-1">Number of results (per prompt)</label>
            <div className="flex items-center gap-2">
                <button type="button" onClick={() => setNumberOfResults(c => Math.max(1, c-1))} disabled={isGenerating} className="px-3 py-1 bg-gray-700/80 rounded-md hover:bg-gray-700">-</button>
                <input 
                    type="number" id="num-results" value={numberOfResults}
                    onChange={e => setNumberOfResults(parseInt(e.target.value, 10))}
                    min="1" max="8" disabled={isGenerating}
                    className="w-full text-center p-2 bg-surface-dark border border-gray-600 rounded-md"
                />
                <button type="button" onClick={() => setNumberOfResults(c => Math.min(8, c+1))} disabled={isGenerating} className="px-3 py-1 bg-gray-700/80 rounded-md hover:bg-gray-700">+</button>
            </div>
        </div>
      </div>
      
      <div className="space-y-2 pt-2">
        <div className="flex gap-2">
             <button type="button" onClick={handleClearPrompt} disabled={isGenerating} className="flex-1 py-2 px-4 bg-gray-700/50 text-on-surface-dark rounded-md hover:bg-gray-700 transition-colors border border-gray-600">Clear Prompt</button>
             <button type="button" onClick={onClearHistory} disabled={isGenerating} className="flex-1 py-2 px-4 bg-gray-700/50 text-on-surface-dark rounded-md hover:bg-gray-700 transition-colors border border-gray-600">Clear History</button>
        </div>
        <button
          type="submit"
          disabled={isGenerating || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-6 bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <SparklesIcon className="w-5 h-5" />
          <span>{isGenerating ? 'Generating...' : 'Generate'}</span>
        </button>
      </div>
    </form>
  );
};
