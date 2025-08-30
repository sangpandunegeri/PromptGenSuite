
import React from 'react';
import { FilmIcon } from './icons/FilmIcon';

export const Header: React.FC = () => {
  return (
    <header className="w-full max-w-4xl text-center">
      <div className="flex items-center justify-center gap-4">
        <FilmIcon className="w-12 h-12 text-brand-primary" />
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">
          SPN VEO-3 Video Generator 
        </h1>
      </div>
      <p className="mt-4 text-lg text-on-surface-dark-secondary">
        Bring your ideas to life with AI-powered video creation.
      </p>
    </header>
  );
};
