
import React from 'react';
import { DownloadIcon } from './icons/DownloadIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';

interface VideoPlayerProps {
  videoUrls: string[];
  onGenerateAnother: () => void;
  resultType: 'single' | 'batch' | 'transition';
  onContinue: (videoUrl: string) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrls, onGenerateAnother, resultType, onContinue }) => {
  const isSingleRequest = videoUrls.length === 1;

  const getTitle = () => {
      switch(resultType) {
          case 'transition':
              return 'Video Transisi Anda Siap!';
          case 'batch':
              return 'Klip Video Anda Siap!';
          case 'single':
          default:
              return 'Video Anda Siap!';
      }
  }

  return (
    <div className="w-full text-center animate-fade-in">
      <h2 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-yellow-400">
        {getTitle()}
      </h2>
      
      <div className={`grid gap-8 ${isSingleRequest ? 'max-w-3xl mx-auto' : 'grid-cols-1 md:grid-cols-2'}`}>
        {videoUrls.map((videoUrl, index) => {
            const title = resultType === 'batch' ? `Segment ${index + 1}` : (resultType === 'transition' ? 'Video Transisi' : `Video ${index + 1}`);
            const downloadName = resultType === 'batch' 
                ? `veo-generated-segment-${index + 1}.mp4` 
                : (resultType === 'transition' ? `veo-generated-transition.mp4` : `veo-generated-video-${index + 1}.mp4`);

            return (
                <div key={index} className="flex flex-col items-center">
                    {!isSingleRequest && <h3 className="text-xl font-semibold mb-3 text-on-surface-dark">{title}</h3>}
                    <div className="relative w-full bg-black rounded-lg shadow-2xl overflow-hidden aspect-video">
                        <video src={videoUrl} controls autoPlay={index === 0} loop className="w-full h-full">
                        Your browser does not support the video tag.
                        </video>
                    </div>
                    <div className="flex items-center justify-center gap-3 mt-4 w-full sm:w-auto">
                        <a
                            href={videoUrl}
                            download={downloadName}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-brand-secondary text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
                        >
                            <DownloadIcon className="w-5 h-5" />
                            Download
                        </a>
                         {resultType === 'single' && (
                             <button
                                type="button"
                                onClick={() => onContinue(videoUrl)}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                                title="Lanjutkan cerita dari frame terakhir video ini"
                             >
                                 Lanjutkan Cerita
                                 <ArrowRightIcon className="w-5 h-5" />
                             </button>
                         )}
                    </div>
                </div>
            )
        })}
      </div>

      <div className="mt-10 flex items-center justify-center">
        <button
          onClick={onGenerateAnother}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
        >
          <RefreshIcon className="w-5 h-5" />
          Generate Another
        </button>
      </div>
    </div>
  );
};
