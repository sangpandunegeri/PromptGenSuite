

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Upload, Wand2, Download, Trash2, Video, Edit, RefreshCw } from 'lucide-react';
import { generateVideo } from '../services/geminiService';
import TextAreaField from './ui/TextAreaField';
import SelectField from './ui/SelectField';

const loadingMessages = [
    "Menginisialisasi VEO...",
    "Menganalisis prompt Anda...",
    "Menyusun narasi visual...",
    "Proses ini bisa memakan waktu beberapa menit, harap tunggu.",
    "Merender frame awal...",
    "Menambahkan detail gerakan...",
    "Hampir selesai, menggabungkan audio visual...",
    "Masih bekerja keras, terima kasih atas kesabaran Anda.",
];

interface VideoGeneratorPageProps {
    apiKey: string;
    promptToLoad: string | null;
    onLoadComplete: () => void;
}

const VideoGeneratorPage: React.FC<VideoGeneratorPageProps> = ({ apiKey, promptToLoad, onLoadComplete }) => {
    const [prompt, setPrompt] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
    const [generatedVideoUrls, setGeneratedVideoUrls] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [numberOfVideos, setNumberOfVideos] = useState(1);
    const [quality, setQuality] = useState('1080p');
    const [model, setModel] = useState('veo-3.0-generate-preview');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (promptToLoad) {
            setPrompt(promptToLoad);
            showMessage("Prompt berhasil dimuat dari halaman sebelumnya!", "success");
            onLoadComplete();
        }
    }, [promptToLoad, onLoadComplete]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isLoading) {
            let messageIndex = 0;
            interval = setInterval(() => {
                messageIndex = (messageIndex + 1) % loadingMessages.length;
                setLoadingMessage(loadingMessages[messageIndex]);
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [isLoading]);

    const showMessage = (msg: string, type: 'success' | 'error' | 'info') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => setMessage(''), 5000);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) { // 4MB limit
                showMessage('Ukuran file tidak boleh melebihi 4MB.', 'error');
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    const handleReset = () => {
        setPrompt('');
        removeImage();
        setAspectRatio('16:9');
        setQuality('1080p');
        setNumberOfVideos(1);
        setGeneratedVideoUrls([]);
        showMessage("Formulir telah direset.", "info");
    };

    const handleGenerateVideo = async () => {
        if (!apiKey) {
            showMessage("Kunci API Gemini belum diatur. Silakan atur di halaman 'Pengaturan'.", 'error');
            return;
        }
        if (!prompt.trim()) {
            showMessage('Prompt tidak boleh kosong.', 'error');
            return;
        }

        setIsLoading(true);
        setGeneratedVideoUrls([]);
        setLoadingMessage(loadingMessages[0]);
        showMessage('Memulai pembuatan video... Ini akan memakan waktu beberapa menit.', 'info');

        try {
            const downloadLinks = await generateVideo(prompt, imageFile, numberOfVideos, model, aspectRatio, apiKey);
            
            const fetchedUrls = await Promise.all(
                downloadLinks.map(async (link) => {
                    const response = await fetch(`${link}&key=${apiKey}`);
                    if (!response.ok) {
                        throw new Error(`Gagal mengunduh video: ${response.statusText}`);
                    }
                    const videoBlob = await response.blob();
                    return URL.createObjectURL(videoBlob);
                })
            );

            setGeneratedVideoUrls(fetchedUrls);
            showMessage(`Video berhasil dibuat! (${fetchedUrls.length} hasil)`, 'success');

        } catch (error) {
            console.error(error);
            showMessage(`Gagal membuat video: ${(error as Error).message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleContinueStory = (videoUrl: string) => {
        const videoElement = document.createElement('video');
        videoElement.src = videoUrl;
        videoElement.crossOrigin = "anonymous";

        videoElement.onloadedmetadata = () => {
            videoElement.currentTime = videoElement.duration;
        };

        videoElement.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], 'last_frame.png', { type: 'image/png' });
                        setImageFile(file);
                        setImagePreview(canvas.toDataURL('image/png'));
                        setGeneratedVideoUrls([]); // Clear previous results
                        setPrompt(''); // Clear previous prompt
                        showMessage("Frame terakhir siap digunakan untuk melanjutkan cerita. Tulis prompt baru Anda!", "success");
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                }, 'image/png', 1.0);
            }
        };
    };

    const getMessageBgColor = () => {
        if (messageType === 'success') return 'bg-green-500';
        if (messageType === 'error') return 'bg-red-500';
        return 'bg-blue-500';
    };

    return (
        <div className="p-6 bg-gray-800 rounded-xl shadow-lg">
            <h2 className="text-3xl font-bold text-blue-400 mb-6">Video Generator 🎥</h2>
            {message && <div className={`p-3 mb-4 rounded-md ${getMessageBgColor()} text-white`}>{message}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Section */}
                <div className="bg-gray-700 p-6 rounded-lg shadow-inner space-y-6">
                    <h3 className="text-2xl font-bold text-white -mb-2">Setting</h3>
                    
                    <div className="relative">
                        <TextAreaField
                            label="Masukkan Prompt"
                            name="videoPrompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={5}
                            placeholder="Potret sinematik seekor harimau berjalan di hutan bersalju..."
                            required
                            className="pr-10"
                        />
                        <Edit className="absolute top-9 right-3 text-yellow-400 w-5 h-5 pointer-events-none" />
                    </div>
                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-1">
                            Upload gambar (opsional, hanya gambar pertama yg digunakan)
                        </label>
                        <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/jpeg, image/png, image/jpg" />
                        
                        {imagePreview ? (
                             <div className="mt-2 relative w-full">
                                <img src={imagePreview} alt="Pratinjau" className="w-full h-auto max-h-48 object-contain rounded-lg shadow-md border border-gray-600 bg-gray-800"/>
                                <button onClick={removeImage} className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-700 text-white p-2 rounded-full" title="Hapus Gambar">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                        ) : (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-2 w-full border-2 border-dashed border-gray-500 hover:border-blue-400 text-gray-400 hover:text-blue-400 font-bold py-4 px-4 rounded-lg flex flex-col items-center justify-center gap-2 transition-colors duration-200 cursor-pointer"
                            >
                                <Upload className="w-8 h-8" />
                                <span className="text-blue-400">Drag and drop files here</span>
                                <span className="text-xs">Limit 4MB per file • JPG, JPEG, PNG</span>
                                <button type="button" className="mt-2 bg-gray-600 hover:bg-gray-500 text-white text-sm py-1 px-4 rounded-lg">Browse files</button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-1">
                            Model
                        </label>
                        <div className="relative group">
                            <p className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-gray-400 font-mono">
                                veo-3.0-generate-preview
                            </p>
                             <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 text-xs text-white bg-gray-900 border border-gray-700 rounded-md shadow-lg invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-300 z-50 pointer-events-none">
                                Model pembuatan video telah diatur ke versi stabil yang didukung secara resmi.
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <SelectField 
                            label="Aspect Ratio"
                            name="aspectRatio"
                            value={aspectRatio}
                            options={[
                                {value: '16:9', label: '16:9 (Landscape)'},
                                {value: '9:16', label: '9:16 (Portrait)'},
                                {value: '1:1', label: '1:1 (Square)'},
                                {value: '4:3', label: '4:3 (Classic TV)'},
                                {value: '3:4', label: '3:4 (Classic Portrait)'},
                            ]}
                            onChange={(e) => setAspectRatio(e.target.value)}
                            tooltip="Pilih rasio aspek untuk video Anda. Dukungan mungkin bervariasi tergantung model."
                        />
                         <SelectField 
                            label="Kualitas"
                            name="quality"
                            value={quality}
                            options={[
                                {value: '720p', label: '720p (HD)'},
                                {value: '1080p', label: '1080p (FHD)'},
                                {value: '4k', label: '4K (UHD)'}
                            ]}
                            onChange={(e) => setQuality(e.target.value)}
                            tooltip="Pilih kualitas output video. Ketersediaan mungkin bergantung pada model yang dipilih."
                        />
                    </div>
                    
                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-1">Number of results (per prompt)</label>
                        <div className="flex items-center border border-gray-600 rounded-lg p-1 bg-gray-800 w-min">
                            <button type="button" onClick={() => setNumberOfVideos(v => Math.max(1, v - 1))} className="text-gray-300 hover:bg-gray-700 rounded-md p-2 h-8 w-8 flex items-center justify-center text-2xl">-</button>
                            <input 
                                type="number"
                                value={numberOfVideos}
                                readOnly
                                className="text-center w-16 bg-transparent border-x border-gray-600 text-white focus:outline-none [appearance:textfield]"
                            />
                            <button type="button" onClick={() => setNumberOfVideos(v => Math.min(4, v + 1))} className="text-gray-300 hover:bg-gray-700 rounded-md p-2 h-8 w-8 flex items-center justify-center text-2xl">+</button>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <button
                            onClick={handleGenerateVideo}
                            disabled={isLoading || !prompt.trim()}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                            {isLoading ? 'Menghasilkan...' : 'Hasilkan Video'}
                        </button>
                        <button
                            onClick={handleReset}
                            disabled={isLoading}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 shadow-md disabled:opacity-50"
                            title="Reset Form"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>

                </div>

                {/* Output Section */}
                <div className="bg-gray-700 p-6 rounded-lg shadow-inner flex items-center justify-center min-h-[400px]">
                    {isLoading ? (
                        <div className="text-center">
                            <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto" />
                            <p className="mt-4 text-white text-lg font-semibold">{loadingMessage}</p>
                            <p className="mt-2 text-gray-400 text-sm">Harap tetap di halaman ini hingga proses selesai.</p>
                        </div>
                    ) : generatedVideoUrls.length > 0 ? (
                        <div className="w-full">
                             <h3 className="text-xl font-semibold text-white mb-4 text-center">Video Berhasil Dibuat!</h3>
                             <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                                {generatedVideoUrls.map((url, index) => (
                                    <div key={index} className="text-center bg-gray-800 p-4 rounded-lg">
                                         <video
                                             src={url}
                                             controls
                                             loop
                                             autoPlay={index === 0}
                                             playsInline
                                             className="w-full rounded-lg shadow-lg border border-gray-600 mb-4 bg-black"
                                         />
                                         <div className="flex flex-wrap justify-center gap-4">
                                            <a
                                                href={url}
                                                download={`promptgen-video-${index + 1}-${Date.now()}.mp4`}
                                                className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg items-center justify-center gap-2 transition-colors duration-200 shadow-md"
                                            >
                                                <Download className="w-5 h-5 inline-block mr-2" /> Unduh
                                            </a>
                                            <button
                                                onClick={() => handleContinueStory(url)}
                                                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg items-center justify-center gap-2 transition-colors duration-200 shadow-md"
                                            >
                                                <Video className="w-5 h-5 inline-block mr-2" /> Lanjutkan Cerita
                                            </button>
                                         </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-400">
                            <Video className="w-16 h-16 mx-auto mb-4"/>
                            <h3 className="text-xl font-semibold">Hasil Video Akan Tampil di Sini</h3>
                            <p className="mt-2 text-sm">Isi prompt di sebelah kiri dan klik 'Hasilkan Video' untuk memulai.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoGeneratorPage;