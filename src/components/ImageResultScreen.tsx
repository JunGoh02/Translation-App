import React, { useState } from 'react';
import {
  ArrowLeft,
  Volume2,
  RefreshCw,
  Camera,
  Upload,
  Globe,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { ImageTranslationResult } from '../types';
import { ImageOverlay } from './ImageOverlay';
import { LanguageSelectorModal } from './LanguageSelectorModal';
import { speakText } from '../utils/audio';

interface ImageResultScreenProps {
  result: ImageTranslationResult;
  imageSrc: string;
  onRetake: () => void;
  onUploadNew: () => void;
  onBackHome: () => void;
  onChangeTargetLanguage: (newLang: string) => Promise<void>;
  isReTranslating: boolean;
}

export const ImageResultScreen: React.FC<ImageResultScreenProps> = ({
  result,
  imageSrc,
  onRetake,
  onUploadNew,
  onBackHome,
  onChangeTargetLanguage,
  isReTranslating,
}) => {
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleReadAloud = async () => {
    setIsPlayingAudio(true);
    try {
      const textToRead = result.fullTranslatedText || result.summary;
      await speakText(textToRead, result.targetLanguage);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  const handleSelectNewLanguage = async (newLang: string) => {
    if (newLang !== result.targetLanguage) {
      await onChangeTargetLanguage(newLang);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between pb-10">
      {/* Top sticky navigation bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-xs flex items-center justify-between">
        <button
          onClick={onBackHome}
          className="flex items-center gap-1.5 py-2 px-3 rounded-xl hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-bold text-base transition-colors"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          <span>Home</span>
        </button>

        <h1 className="text-lg font-black text-blue-950 tracking-tight">Translation Result</h1>

        {/* Change language quick trigger */}
        <button
          onClick={() => setIsLangModalOpen(true)}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-blue-100 text-blue-950 font-bold text-sm hover:bg-blue-200 active:scale-95 transition-all"
        >
          <Globe className="w-4 h-4" />
          <span>{result.targetLanguage}</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-5 flex flex-col gap-4">
        {/* Language Detection Banner */}
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-xs flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs uppercase tracking-wider font-bold text-slate-500">
                Language Detected
              </span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-0.5">
              {result.detectedLanguage || 'Identified'}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs uppercase tracking-wider font-bold text-blue-900">
              Translated to
            </div>
            <button
              onClick={() => setIsLangModalOpen(true)}
              className="text-xl font-black text-blue-950 underline decoration-blue-400 decoration-2 hover:text-blue-800 flex items-center gap-1 ml-auto"
            >
              <span>{result.targetLanguage}</span>
              <RefreshCw className={`w-4 h-4 ${isReTranslating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Re-translating indicator */}
        {isReTranslating && (
          <div className="p-3 bg-blue-100 border border-blue-300 rounded-xl flex items-center justify-center gap-2 text-blue-950 font-bold text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Translating into {result.targetLanguage}...</span>
          </div>
        )}

        {/* If no text was found */}
        {!result.hasText && (
          <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-900 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-7 h-7 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold">No clear text found in this photo</h2>
              <p className="text-sm mt-1 text-amber-800">
                We couldn&rsquo;t find readable text in this image. Try holding the camera closer or taking a clearer photo with good lighting.
              </p>
            </div>
          </div>
        )}

        {/* In-place Image Translation Overlay Area */}
        <div className="bg-white p-3 sm:p-4 rounded-3xl border-2 border-slate-200 shadow-sm">
          <ImageOverlay
            imageSrc={imageSrc}
            blocks={result.blocks}
            targetLanguage={result.targetLanguage}
            detectedLanguage={result.detectedLanguage}
          />
        </div>

        {/* Plain Language Summary / Explanation Card */}
        {result.summary && (
          <div className="p-5 bg-blue-50 border-2 border-blue-200 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2 text-blue-950 font-bold text-sm mb-1.5">
              <Info className="w-5 h-5 text-blue-800" />
              <span>What This Says (Quick Summary)</span>
            </div>
            <p className="text-lg font-bold text-blue-950 leading-relaxed">
              {result.summary}
            </p>
          </div>
        )}

        {/* Full Translation Card with Audio Read-Aloud */}
        {result.fullTranslatedText && (
          <div className="p-5 bg-white border-2 border-slate-200 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-500">
                Full Translation ({result.targetLanguage})
              </span>
              <button
                onClick={handleReadAloud}
                className="px-3 py-1.5 rounded-full bg-blue-950 hover:bg-blue-900 text-white font-bold text-sm flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
              >
                <Volume2 className="w-4 h-4" />
                <span>{isPlayingAudio ? 'Reading...' : 'Read Aloud'}</span>
              </button>
            </div>
            <p className="text-xl font-extrabold text-slate-900 leading-snug">
              {result.fullTranslatedText}
            </p>

            {result.fullOriginalText && (
              <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-500">
                <span className="font-semibold text-slate-700">Original text: </span>
                {result.fullOriginalText}
              </div>
            )}
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="pt-2 flex flex-col gap-3">
          {/* Read aloud primary banner */}
          <button
            onClick={handleReadAloud}
            className="w-full py-4 px-6 bg-blue-950 hover:bg-blue-900 active:bg-blue-950 text-white rounded-2xl font-black text-xl shadow-lg flex items-center justify-center gap-3 transition-transform active:scale-98"
          >
            <Volume2 className="w-7 h-7 stroke-[2.5]" />
            <span>Read Translation Aloud</span>
          </button>

          {/* Change language button */}
          <button
            onClick={() => setIsLangModalOpen(true)}
            className="w-full py-3.5 px-6 bg-white hover:bg-slate-50 active:bg-slate-100 text-blue-950 border-2 border-blue-950 rounded-2xl font-bold text-lg flex items-center justify-center gap-2.5 transition-colors"
          >
            <RefreshCw className="w-5 h-5 stroke-[2.5]" />
            <span>Change Translation Language</span>
          </button>

          {/* Take another / Upload another row */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={onRetake}
              className="py-3.5 px-4 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-900 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-colors"
            >
              <Camera className="w-5 h-5" />
              <span>Take Another</span>
            </button>
            <button
              onClick={onUploadNew}
              className="py-3.5 px-4 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-900 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span>Upload New</span>
            </button>
          </div>
        </div>
      </main>

      {/* Target Language Selection Modal */}
      <LanguageSelectorModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        selectedLanguage={result.targetLanguage}
        onSelectLanguage={handleSelectNewLanguage}
        title="Translate this photo to:"
      />
    </div>
  );
};
