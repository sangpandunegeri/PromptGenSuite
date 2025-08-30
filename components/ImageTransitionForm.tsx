
import React, { useState, useCallback, ChangeEvent } from 'react';
import type { ImageTransitionConfig, ImageInput } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';

interface ImageTransitionFormProps {
  onSubmit: (config: Omit<ImageTransitionConfig, 'apiKey'>) => void;
  isGenerating: boolean;
}

const fileToImageInput = (file: File): Promise<ImageInput & { dataUrl: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve({ base64, mimeType: file.type, dataUrl });
    };
    reader.onerror = error => reject(error);
  });
};

const ImageUploadBox: React.FC<{
    image: (ImageInput & { dataUrl: string }) | null;
    onImageChange: (image: (ImageInput & { dataUrl: string }) | null) => void;
    title: string;
    id: string;
    isGenerating: boolean;
}> = ({ image, onImageChange, title, id, isGenerating }) => {
    const [error, setError] = useState('');

    const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) { // 4MB limit
                setError('Ukuran file maks 4MB.');
                return;
            }
            setError('');
            const imageData = await fileToImageInput(file);
            onImageChange(imageData);
        }
    };

    const removeImage = () => {
        onImageChange(null);
        const fileInput = document.getElementById(id) as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    }

    return (
        <div>
            <label className="block text-base font-medium text-on-surface-dark-secondary mb-1">{title}</label>
            <div className="mt-1 flex flex-col items-center justify-center p-4 border-2 border-gray-600 border-dashed rounded-md bg-black/20 h-40">
                {image ? (
                     <div className="relative group w-full h-full">
                        <img src={image.dataUrl} alt="Preview" className="h-full w-full object-contain rounded-md"/>
                        <button
                            type="button"
                            onClick={removeImage}
                            className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Remove image"
                            disabled={isGenerating}
                        >
                            <XCircleIcon className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <>
                        <UploadIcon className="h-8 w-8 text-gray-500" />
                        <label htmlFor={id} className="mt-2 text-xs relative cursor-pointer rounded-md font-medium text-brand-primary hover:text-blue-400">
                            <span>Pilih file</span>
                            <input id={id} name={id} type="file" className="sr-only" onChange={handleUpload} accept="image/png, image/jpeg, image/webp" disabled={isGenerating} />
                        </label>
                         <p className="text-xs text-gray-600 mt-1">Maks 4MB</p>
                    </>
                )}
            </div>
             {error && <p className="text-xs text-brand-danger mt-1">{error}</p>}
        </div>
    );
};


export const ImageTransitionForm: React.FC<ImageTransitionFormProps> = ({ onSubmit, isGenerating }) => {
  const [prompt, setPrompt] = useState('');
  const [startImage, setStartImage] = useState<(ImageInput & { dataUrl: string }) | null>(null);
  const [endImage, setEndImage] = useState<(ImageInput & { dataUrl: string }) | null>(null);
  const [segmentCount, setSegmentCount] = useState(2); // Intermediate segments
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [quality, setQuality] = useState<'1080p' | '720p'>('1080p');
  const [model, setModel] = useState('veo-3.0-generate-preview');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('Prompt tidak boleh kosong.');
      return;
    }
    if (!startImage) {
        setError('Gambar awal harus diunggah.');
        return;
    }
    if (!endImage) {
        setError('Gambar akhir harus diunggah.');
        return;
    }
    setError('');
    onSubmit({
      prompt,
      startImage,
      endImage,
      segmentCount,
      aspectRatio,
      quality,
      model,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in text-sm">
      <h2 className="text-xl font-bold text-on-surface-dark">Setting Transisi Gambar</h2>
      {error && <div className="p-3 bg-red-900/50 text-brand-danger border border-brand-danger rounded-md text-xs">{error}</div>}
      
      <div className="grid grid-cols-2 gap-4">
        <ImageUploadBox image={startImage} onImageChange={setStartImage} title="Gambar Awal" id="start-image-upload" isGenerating={isGenerating} />
        <ImageUploadBox image={endImage} onImageChange={setEndImage} title="Gambar Akhir" id="end-image-upload" isGenerating={isGenerating} />
      </div>

      <div>
        <label htmlFor="transition-prompt" className="block text-base font-medium text-on-surface-dark-secondary mb-1">
          Jelaskan Transisi
        </label>
        <textarea
          id="transition-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Contoh: seekor kucing berubah menjadi harimau"
          className="w-full h-24 p-2 bg-surface-dark border border-gray-600 rounded-md focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-all text-on-surface-dark placeholder:text-gray-500"
          disabled={isGenerating}
        />
      </div>
       <div>
            <label htmlFor="model-select-transition" className="block text-base font-medium text-on-surface-dark-secondary mb-1">Pilih Model</label>
            <select id="model-select-transition" value={model} onChange={e => setModel(e.target.value)} disabled={isGenerating} className="w-full p-2 bg-surface-dark border border-gray-600 rounded-md focus:ring-1 focus:ring-brand-primary focus:border-brand-primary">
                <option value="veo-3.0-generate-preview">veo-3.0-generate-preview</option>
                <option value="veo-3.0-fast-generate-preview">veo-3.0-fast-generate-preview</option>
                <option value="veo-2.0-generate-001">veo-2.0-generate-001</option>
            </select>
        </div>

       <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="aspect-ratio-transition" className="block text-base font-medium text-on-surface-dark-secondary mb-1">Pilih Aspect Ratio</label>
                <select id="aspect-ratio-transition" value={aspectRatio} onChange={e => setAspectRatio(e.target.value as '16:9' | '9:16')} disabled={isGenerating} className="w-full p-2 bg-surface-dark border border-gray-600 rounded-md focus:ring-1 focus:ring-brand-primary focus:border-brand-primary">
                    <option value="16:9">16:9 (Lanskap)</option>
                    <option value="9:16">9:16 (Potret)</option>
                </select>
            </div>
            <div>
                <label htmlFor="quality-select-transition" className="block text-base font-medium text-on-surface-dark-secondary mb-1">Kualitas</label>
                <select id="quality-select-transition" value={quality} onChange={e => setQuality(e.target.value as '1080p' | '720p')} disabled={isGenerating} className="w-full p-2 bg-surface-dark border border-gray-600 rounded-md focus:ring-1 focus:ring-brand-primary focus:border-brand-primary">
                    <option value="1080p">1080p (FHD)</option>
                    <option value="720p">720p (HD)</option>
                </select>
            </div>
        </div>
      
      <div>
        <label htmlFor="segment-count" className="block text-base font-medium text-on-surface-dark-secondary mb-1">
            Jumlah Langkah Transisi ({segmentCount})
        </label>
        <input
            type="range"
            id="segment-count"
            min="1"
            max="4"
            value={segmentCount}
            onChange={e => setSegmentCount(parseInt(e.target.value, 10))}
            disabled={isGenerating}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-400 px-1">
            <span>Lebih Cepat</span>
            <span>Lebih Halus</span>
        </div>
      </div>
      
      <div className="pt-2">
        <button
          type="submit"
          disabled={isGenerating || !prompt.trim() || !startImage || !endImage}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-6 bg-gradient-to-r from-brand-primary to-brand-accent text-white font-bold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <SparklesIcon className="w-5 h-5" />
          <span>{isGenerating ? 'Menciptakan Transisi...' : 'Generate Transisi'}</span>
        </button>
      </div>
    </form>
  );
};
