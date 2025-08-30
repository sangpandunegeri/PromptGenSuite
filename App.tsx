
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { VideoGeneratorForm } from './components/VideoGeneratorForm';
import { LongClipForm } from './components/LongClipForm';
import { ImageTransitionForm } from './components/ImageTransitionForm';
import { LoadingIndicator } from './components/LoadingIndicator';
import { VideoPlayer } from './components/VideoPlayer';
import { generateVideo, generateLongVideo, generateImageTransitionVideo } from './services/geminiService';
import type { VideoConfig, LongVideoConfig, ImageTransitionConfig, GenerationStatus, ContinuationData } from './types';
import { Status } from './types';
import { FilmIcon } from './components/icons/FilmIcon';
import { ClipIcon } from './components/icons/ClipIcon';
import { EyeIcon } from './components/icons/EyeIcon';
import { EyeSlashIcon } from './components/icons/EyeSlashIcon';
import { SwitchHorizontalIcon } from './components/icons/SwitchHorizontalIcon';


type Mode = 'single' | 'batch' | 'transition';

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('single');
  const [apiKey, setApiKey] = useState<string>('');
  const [isKeyVisible, setIsKeyVisible] = useState<boolean>(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>(Status.IDLE);
  const [generatedVideoUrls, setGeneratedVideoUrls] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('Initializing video generation...');
  const [resultType, setResultType] = useState<Mode>('single');
  const [lastPrompt, setLastPrompt] = useState<string>('');
  const [continuationData, setContinuationData] = useState<ContinuationData | null>(null);

  const isGenerating = generationStatus === Status.GENERATING;

  const handleGenerate = useCallback(async (config: Omit<VideoConfig, 'apiKey'>) => {
    setGenerationStatus(Status.GENERATING);
    setErrorMessage(null);
    setGeneratedVideoUrls([]);
    setResultType('single');
    setLastPrompt(config.prompt);

    if (config.prompt.trim() === '') {
        setErrorMessage("Prompt tidak boleh kosong.");
        setGenerationStatus(Status.ERROR);
        return;
    }

    setLoadingMessage('Memproses prompt Anda...');
    try {
        const videoBlobs = await generateVideo({ ...config, apiKey }, setLoadingMessage);
        
        if (videoBlobs.length > 0) {
          const urls = videoBlobs.map(blob => URL.createObjectURL(blob));
          setGeneratedVideoUrls(urls);
          setGenerationStatus(Status.SUCCESS);
        } else {
          setErrorMessage('Pembuatan video selesai, tetapi tidak ada video yang dihasilkan.');
          setGenerationStatus(Status.ERROR);
        }
    } catch (error) {
        console.error('Pembuatan video gagal:', error);
        const errorMsg = error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui.';
        setErrorMessage(errorMsg);
        setGenerationStatus(Status.ERROR);
    }
  }, [apiKey]);

  const handleGenerateLong = useCallback(async (config: Omit<LongVideoConfig, 'apiKey'>) => {
    setGenerationStatus(Status.GENERATING);
    setErrorMessage(null);
    setLoadingMessage('Starting long clip generation process...');
    setResultType('batch');

    try {
      const videoBlobs = await generateLongVideo({ ...config, apiKey }, setLoadingMessage);
      const urls = videoBlobs.map(blob => URL.createObjectURL(blob));
      setGeneratedVideoUrls(urls);
      setGenerationStatus(Status.SUCCESS);
    } catch (error) {
      console.error('Long video generation failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
      setGenerationStatus(Status.ERROR);
    }
  }, [apiKey]);

  const handleGenerateTransition = useCallback(async (config: Omit<ImageTransitionConfig, 'apiKey'>) => {
    setGenerationStatus(Status.GENERATING);
    setErrorMessage(null);
    setLoadingMessage('Starting image transition generation...');
    setResultType('transition');

    try {
      const videoBlobs = await generateImageTransitionVideo({ ...config, apiKey }, setLoadingMessage);
      // For transition, we expect one combined video blob
      const combinedVideoBlob = new Blob(videoBlobs, { type: 'video/mp4' });
      const url = URL.createObjectURL(combinedVideoBlob);
      setGeneratedVideoUrls([url]);
      setGenerationStatus(Status.SUCCESS);
    } catch (error) {
      console.error('Image transition generation failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
      setGenerationStatus(Status.ERROR);
    }
  }, [apiKey]);

  const handleReset = useCallback(() => {
    generatedVideoUrls.forEach(url => URL.revokeObjectURL(url));
    setGenerationStatus(Status.IDLE);
    setGeneratedVideoUrls([]);
    setErrorMessage(null);
    setContinuationData(null);
  }, [generatedVideoUrls]);

  const handleContinue = useCallback((videoUrl: string) => {
    // Set status to IDLE to switch the main view back to the form's welcome/initial state.
    setGenerationStatus(Status.IDLE);
    // Pass the necessary data to the form for frame capture.
    setContinuationData({ videoUrl, originalPrompt: lastPrompt });
    // Ensure the form sidebar is in the correct mode.
    setMode('single');
    // By not calling handleReset() or setGeneratedVideoUrls([]), we avoid triggering
    // the useEffect cleanup hook that would prematurely revoke the videoUrl.
    // The old URLs will be cleaned up automatically on the next generation.
  }, [lastPrompt]);

  useEffect(() => {
    return () => {
        generatedVideoUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [generatedVideoUrls]);

  const renderContent = () => {
    switch (generationStatus) {
      case Status.GENERATING:
        return <LoadingIndicator message={loadingMessage} />;
      case Status.SUCCESS:
        return generatedVideoUrls.length > 0 ? (
          <VideoPlayer videoUrls={generatedVideoUrls} onGenerateAnother={handleReset} resultType={resultType} onContinue={handleContinue} />
        ) : (
          <div className="text-center">
            <p className="text-brand-danger">Video generated, but URL is missing.</p>
            <button onClick={handleReset} className="mt-4 px-6 py-2 bg-brand-primary text-white rounded-md hover:bg-blue-600 transition-colors">
              Try Again
            </button>
          </div>
        );
      case Status.ERROR:
        return (
          <div className="text-center bg-surface-dark p-6 rounded-lg shadow-lg animate-fade-in">
            <h2 className="text-2xl font-bold text-brand-danger mb-4">Generation Failed</h2>
            <p className="text-on-surface-dark-secondary">{errorMessage}</p>
            <button onClick={handleReset} className="mt-6 px-6 py-2 bg-brand-primary text-white rounded-md hover:bg-blue-600 transition-colors">
              Try Again
            </button>
          </div>
        );
      case Status.IDLE:
      default:
        return (
          <div className="text-center text-on-surface-dark-secondary animate-fade-in">
             <div className="flex flex-col items-center justify-center gap-4">
                <div className="p-4 bg-gray-800/50 rounded-full">
                    <FilmIcon className="w-16 h-16 text-brand-primary" />
                </div>
                <h2 className="text-3xl font-bold mt-4 text-on-surface-dark">Welcome to VEO-3 Video Generator</h2>
                <p className="max-w-md">
                    Use the settings panel on the left to configure your video, then click generate to bring your ideas to life.
                </p>
             </div>
          </div>
        );
    }
  };
  
  const renderForm = () => {
      switch(mode) {
          case 'single':
              return <VideoGeneratorForm 
                        apiKey={apiKey}
                        onSubmit={handleGenerate} 
                        isGenerating={isGenerating} 
                        onClearHistory={handleReset}
                        continuationData={continuationData}
                        onContinuationClear={() => setContinuationData(null)}
                     />;
          case 'batch':
              return <LongClipForm onSubmit={handleGenerateLong} isGenerating={isGenerating} />;
          case 'transition':
              return <ImageTransitionForm onSubmit={handleGenerateTransition} isGenerating={isGenerating} />;
          default:
              return null;
      }
  }

  return (
    <div className="min-h-screen bg-base-dark font-sans flex text-on-surface-dark">
      <aside className="w-[380px] bg-surface-dark p-4 overflow-y-auto h-screen sticky top-0 border-r border-gray-800 flex flex-col shrink-0">
        <div className="mb-4">
          <label htmlFor="api-key" className="block text-base font-medium text-on-surface-dark-secondary mb-1">
            Masukkan Google API Key
          </label>
          <div className="relative">
            <input
              id="api-key"
              type={isKeyVisible ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API Key (opsional)"
              className="w-full p-2 pr-10 bg-black/30 border border-gray-600 rounded-md focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-all text-on-surface-dark placeholder:text-gray-500"
              disabled={isGenerating}
            />
            <button
              type="button"
              onClick={() => setIsKeyVisible(!isKeyVisible)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-white"
              aria-label={isKeyVisible ? 'Hide API Key' : 'Show API Key'}
            >
              {isKeyVisible ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="mb-4 border-b border-gray-700">
            <nav className="-mb-px flex space-x-2" aria-label="Tabs">
                <button
                    onClick={() => setMode('single')}
                    className={`${mode === 'single' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} group inline-flex items-center py-3 px-2 border-b-2 font-medium text-sm transition-colors`}
                >
                    <FilmIcon className="mr-2 h-5 w-5" />
                    <span>Single Clip</span>
                </button>
                <button
                    onClick={() => setMode('batch')}
                    className={`${mode === 'batch' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} group inline-flex items-center py-3 px-2 border-b-2 font-medium text-sm transition-colors`}
                >
                    <ClipIcon className="mr-2 h-5 w-5" />
                    <span>Clip Panjang</span>
                </button>
                <button
                    onClick={() => setMode('transition')}
                    className={`${mode === 'transition' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} group inline-flex items-center py-3 px-2 border-b-2 font-medium text-sm transition-colors`}
                >
                    <SwitchHorizontalIcon className="mr-2 h-5 w-5" />
                    <span>Transisi Gambar</span>
                </button>
            </nav>
        </div>
        <div className="flex-grow">
          {renderForm()}
        </div>
      </aside>
      <div className="flex-1 flex flex-col items-center p-4 sm:p-6 lg:p-8">
        <Header />
        <main className="w-full max-w-5xl mt-8 flex-grow flex items-center justify-center">
            {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
