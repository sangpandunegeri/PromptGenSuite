
import React from 'react';

interface LoadingIndicatorProps {
  message: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-surface-dark rounded-lg shadow-xl animate-fade-in">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 border-4 border-brand-primary rounded-full animate-pulse"></div>
        <div className="absolute inset-2 border-4 border-brand-secondary rounded-full animate-pulse-slow animation-delay-300"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-16 h-16 text-brand-accent animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
      </div>
      <h2 className="mt-8 text-2xl font-semibold text-on-surface-dark">Generation in Progress</h2>
      <p className="mt-2 text-on-surface-dark-secondary text-center transition-all duration-500">{message}</p>
      <p className="mt-6 text-sm text-gray-500">This may take a few minutes. Please don't close this window.</p>
    </div>
  );
};
