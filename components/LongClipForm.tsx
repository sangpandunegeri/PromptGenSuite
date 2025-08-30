
import React, { useState, useCallback, ChangeEvent } from 'react';
import type { LongVideoConfig, ImageInput } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';

interface LongClipFormProps {
  onSubmit: (config: Omit<LongVideoConfig, 'apiKey'>) => void;
  isGenerating: boolean;
}

const fileToBas64 = (file: File): Promise<{ base64: string, dataUrl: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve({ base64, dataUrl });
    };
    reader.onerror = error => reject(error);
  });
};

const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="relative flex items-center group">
        {children}
        <div className="absolute left-full ml-4 w-64 p-2 bg-gray-900 text-white text-sm rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
            {text}
        </div>
    </div>
);


export const LongClipForm: React.FC<LongClipFormProps> = ({ onSubmit, isGenerating }) => {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<{ dataUrl: string } & ImageInput | null>(null);
  const [segmentCount, setSegmentCount] = useState(3);
  const [autoVariations, setAutoVariations] = useState(true);
  const [variationMode, setVariationMode] = useState<'Sederhana' | 'Gemini'>('Sederhana');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [quality, setQuality] = useState<'1080p' | '720p'>('1080p');
  const [model, setModel] = useState('veo-3.0-generate-preview');
  const [error, setError] = useState('');

  const handleImageUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        setError('Ukuran file harus kurang dari 4MB.');
        return;
      }
      setError('');
      const { base64, dataUrl } = await fileToBas64(file);
      setImage({ base64, mimeType: file.type, dataUrl });
    }
  }, []);

  const removeImage = useCallback(() => {
    setImage(null);
    const fileInput = document.getElementById('image-upload-long') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('Prompt tidak boleh kosong.');
      return;
    }
    setError('');
    onSubmit({
      prompt,
      image: image ? { base64: image.base64, mimeType: image.mimeType } : undefined,
      segmentCount,
      autoVariations,
      variationMode,
      aspectRatio,
      quality,
      model,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
      {error && <div className="p-3 bg-red-900/50 text-brand-danger border border-brand-danger rounded-md">{error}</div>}
      
      <div>
        <label htmlFor="long-prompt" className="block text-base font-medium text-on-surface-dark-secondary mb-1">
          Prompt untuk clip panjang
        </label>
        <textarea
          id="long-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Jelaskan ide video Anda secara rinci di sini..."
          className="w-full h-24 p-2 bg-surface-dark border border-gray-600 rounded-md focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-all text-on-surface-dark placeholder:text-gray-500"
          disabled={isGenerating}
        />
      </div>

      <div>
        <label className="block text-base font-medium text-on-surface-dark-secondary mb-1">
          Satu gambar referensi (opsional)
        </label>
        <div className="mt-1 flex justify-center p-4 border-2 border-gray-600 border-dashed rounded-md">
           {image ? (
            <div className="relative group">
              <img src={image.dataUrl} alt="Preview" className="h-32 w-auto rounded-md object-contain" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove image"
                disabled={isGenerating}
              >
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="space-y-1 text-center">
                <UploadIcon className="mx-auto h-8 w-8 text-gray-400" />
                <div className="flex text-sm text-gray-500">
                    <label
                    htmlFor="image-upload-long"
                    className="relative cursor-pointer bg-surface-dark rounded-md font-medium text-brand-primary hover:text-blue-400"
                    >
                    <span>Pilih file</span>
                    <input id="image-upload-long" name="image-upload-long" type="file" className="sr-only" onChange={handleImageUpload} accept="image/png, image/jpeg, image/webp" disabled={isGenerating} />
                    </label>
                </div>
                <p className="text-xs text-gray-500">Maks 4MB</p>
            </div>
          )}
        </div>
      </div>
      
       <div className="space-y-4">
        <div>
            <label htmlFor="model-select-long" className="block text-base font-medium text-on-surface-dark-secondary mb-1">Pilih Model</label>
            <select id="model-select-long" value={model} onChange={e => setModel(e.target.value)} disabled={isGenerating} className="w-full p-2 bg-surface-dark border border-gray-600 rounded-md focus:ring-1 focus:ring-brand-primary focus:border-brand-primary">
                <option value="veo-3.0-generate-preview">veo-3.0-generate-preview</option>
                <option value="veo-3.0-fast-generate-preview">veo-3.0-fast-generate-preview</option>
                <option value="veo-2.0-generate-001">veo-2.0-generate-001</option>
            </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div>
                <label htmlFor="aspect-ratio-long" className="block text-base font-medium text-on-surface-dark-secondary mb-1">Aspect Ratio</label>
                <select id="aspect-ratio-long" value={aspectRatio} onChange={e => setAspectRatio(e.target.value as '16:9' | '9:16')} disabled={isGenerating} className="w-full p-2 bg-surface-dark border border-gray-600 rounded-md focus:ring-1 focus:ring-brand-primary focus:border-brand-primary">
                    <option value="16:9">16:9 (Lanskap)</option>
                    <option value="9:16">9:16 (Potret)</option>
                </select>
            </div>
            <div>
                <label htmlFor="quality-select-long" className="block text-base font-medium text-on-surface-dark-secondary mb-1">Kualitas</label>
                <select id="quality-select-long" value={quality} onChange={e => setQuality(e.target.value as '1080p' | '720p')} disabled={isGenerating} className="w-full p-2 bg-surface-dark border border-gray-600 rounded-md focus:ring-1 focus:ring-brand-primary focus:border-brand-primary">
                    <option value="1080p">1080p (FHD)</option>
                    <option value="720p">720p (HD)</option>
                </select>
            </div>
        </div>
        <div>
            <label htmlFor="segment-count" className="flex items-center gap-2 text-base font-medium text-on-surface-dark-secondary mb-1">
                Jumlah segmen
                <Tooltip text="Jumlah klip video pendek yang akan dibuat.">
                    <QuestionMarkCircleIcon className="w-4 h-4 text-gray-400" />
                </Tooltip>
            </label>
            <div className="flex items-center gap-2">
                <input 
                    type="number"
                    id="segment-count"
                    value={segmentCount}
                    onChange={e => setSegmentCount(parseInt(e.target.value, 10))}
                    min="2"
                    max="10"
                    className="w-full text-center p-2 bg-surface-dark border border-gray-600 rounded-md"
                    disabled={isGenerating}
                />
            </div>
        </div>
      </div>

       <div className="space-y-3">
            <div className="flex items-center gap-2">
                <input
                    id="auto-variation"
                    type="checkbox"
                    checked={autoVariations}
                    onChange={() => setAutoVariations(!autoVariations)}
                    disabled={isGenerating}
                    className="h-4 w-4 rounded bg-surface-dark border-gray-500 text-brand-primary focus:ring-brand-primary"
                />
                <label htmlFor="auto-variation" className="text-base font-medium text-on-surface-dark-secondary">
                    Auto-variasi prompt per segmen
                </label>
            </div>
            {autoVariations && (
                 <div className="pl-6">
                    <label className="flex items-center gap-2 text-sm font-medium text-on-surface-dark-secondary mb-2">
                        Mode variasi
                        <Tooltip text="Sederhana: Menambahkan ', bagian x' pada prompt. Gemini: Menggunakan AI untuk membuat variasi prompt yang lebih kreatif.">
                            <QuestionMarkCircleIcon className="w-4 h-4 text-gray-400" />
                        </Tooltip>
                    </label>
                    <div className="flex items-center gap-4">
                        {(['Sederhana', 'Gemini'] as const).map(mode => (
                            <div key={mode} className="flex items-center gap-2">
                                <input
                                    id={`variation-${mode}`}
                                    type="radio"
                                    name="variationMode"
                                    value={mode}
                                    checked={variationMode === mode}
                                    onChange={() => setVariationMode(mode)}
                                    disabled={isGenerating}
                                    className="h-4 w-4 bg-surface-dark border-gray-500 text-brand-primary focus:ring-brand-primary"
                                />
                                <label htmlFor={`variation-${mode}`} className="text-on-surface-dark text-sm">{mode}</label>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>


      <div className="pt-2">
        <button
          type="submit"
          disabled={isGenerating || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-6 bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <SparklesIcon className="w-5 h-5" />
          {isGenerating ? 'Membuat...' : 'Generate Clip Panjang'}
        </button>
      </div>
    </form>
  );
};
