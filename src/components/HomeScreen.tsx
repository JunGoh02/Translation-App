import React, { useRef, useState } from 'react';
import {
  Camera,
  Upload,
  Mic,
  MessageSquare,
  Globe,
  ChevronDown,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { LanguageSelectorModal } from './LanguageSelectorModal';
import { SAMPLE_IMAGES, SampleImage } from '../utils/sampleImages';

interface HomeScreenProps {
  targetLanguage: string;
  onTargetLanguageChange: (lang: string) => void;
  onOpenTakeCamera: () => void;
  onSelectImage: (imageDataUrl: string) => void;
  onOpenSpeech: () => void;
  onOpenConversation: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  targetLanguage,
  onTargetLanguageChange,
  onOpenTakeCamera,
  onSelectImage,
  onOpenSpeech,
  onOpenConversation,
}) => {
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizeToJpeg = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      if (dataUrl.startsWith('data:image/jpeg;base64,')) {
        resolve(dataUrl);
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          const normalized = await normalizeToJpeg(reader.result);
          onSelectImage(normalized);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectSample = async (sampleDataUrl: string) => {
    const normalized = await normalizeToJpeg(sampleDataUrl);
    onSelectImage(normalized);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between selection:bg-blue-100">
      {/* Accessible Header & Global Language Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-xl mx-auto px-4 py-3 sm:py-4 flex flex-col gap-2.5">
          {/* Brand & Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-950 text-white flex items-center justify-center font-black text-sm">
                AI
              </div>
              <span className="font-extrabold text-blue-950 tracking-tight text-lg">
                Language Helper
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Easy &amp; Private</span>
            </div>
          </div>

          {/* Prominent Global Target Language Selector */}
          <div className="w-full">
            <button
              onClick={() => setIsLangModalOpen(true)}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 active:bg-blue-50 border-2 border-slate-300 hover:border-blue-950 rounded-2xl flex items-center justify-between transition-all group"
              aria-label="Select target translation language"
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-5 h-5 text-blue-950" />
                <span className="text-sm font-semibold text-slate-600">Translate to:</span>
                <span className="text-lg font-black text-blue-950 underline decoration-blue-500 decoration-2">
                  {targetLanguage}
                </span>
              </div>
              <div className="flex items-center gap-1 text-blue-950 font-bold text-sm bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs group-hover:bg-blue-950 group-hover:text-white transition-colors">
                <span>Change</span>
                <ChevronDown className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-5 flex flex-col justify-center gap-6">
        {/* Main Heading for Elderly Users */}
        <div className="text-center sm:text-left pt-1">
          <h1 className="text-3xl sm:text-4xl font-black text-blue-950 tracking-tight leading-tight">
            What does this say?
          </h1>
          <p className="text-lg sm:text-xl text-slate-700 font-medium mt-1.5 leading-snug">
            Point your camera, upload a photo, or speak to translate signs, menus, labels, and voices.
          </p>
        </div>

        {/* 4 Main Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* 1. Take a Photo */}
          <button
            onClick={onOpenTakeCamera}
            className="w-full p-5 bg-blue-950 hover:bg-blue-900 active:bg-blue-950 text-white rounded-3xl shadow-lg flex flex-col justify-between text-left group transition-all duration-150 active:scale-98 min-h-[140px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                <Camera className="w-8 h-8 stroke-[2.2]" />
              </div>
              <span className="text-xs uppercase font-extrabold tracking-wider bg-white/20 px-2.5 py-1 rounded-full text-blue-100">
                Core Feature
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white flex items-center gap-2">
                <span>Take a Photo</span>
                <ArrowRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-sm text-blue-200 mt-1 font-medium">
                Use camera on signs, menus &amp; labels
              </p>
            </div>
          </button>

          {/* 2. Upload a Photo */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-5 bg-white hover:bg-slate-50 active:bg-slate-100 text-blue-950 border-2 border-slate-300 hover:border-blue-950 rounded-3xl shadow-sm flex flex-col justify-between text-left group transition-all duration-150 active:scale-98 min-h-[140px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-950 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Upload className="w-8 h-8 stroke-[2.2]" />
              </div>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                Gallery
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-blue-950 flex items-center gap-2">
                <span>Upload a Photo</span>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-sm text-slate-600 mt-1 font-medium">
                Choose an image from your device
              </p>
            </div>
          </button>

          {/* 3. Translate Speech */}
          <button
            onClick={onOpenSpeech}
            className="w-full p-5 bg-white hover:bg-slate-50 active:bg-slate-100 text-blue-950 border-2 border-slate-300 hover:border-blue-950 rounded-3xl shadow-sm flex flex-col justify-between text-left group transition-all duration-150 active:scale-98 min-h-[140px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-950 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Mic className="w-8 h-8 stroke-[2.2]" />
              </div>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                Audio
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-blue-950 flex items-center gap-2">
                <span>Translate Speech</span>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-sm text-slate-600 mt-1 font-medium">
                Listen and translate spoken words
              </p>
            </div>
          </button>

          {/* 4. Practise Conversation */}
          <button
            onClick={onOpenConversation}
            className="w-full p-5 bg-white hover:bg-slate-50 active:bg-slate-100 text-blue-950 border-2 border-slate-300 hover:border-blue-950 rounded-3xl shadow-sm flex flex-col justify-between text-left group transition-all duration-150 active:scale-98 min-h-[140px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-950 flex items-center justify-center group-hover:scale-105 transition-transform">
                <MessageSquare className="w-8 h-8 stroke-[2.2]" />
              </div>
              <span className="text-xs uppercase font-bold tracking-wider text-blue-900 bg-blue-100 px-2 py-1 rounded-full">
                Practice
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-blue-950 flex items-center gap-2">
                <span>Practise Speaking</span>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-sm text-slate-600 mt-1 font-medium">
                Talk to friendly AI language partner
              </p>
            </div>
          </button>
        </div>

        {/* Instant Sample Test Photos for easy demo & testing */}
        <section className="mt-2 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Or try a sample foreign sign instantly:</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {SAMPLE_IMAGES.map((sample: SampleImage) => (
              <button
                key={sample.id}
                onClick={() => handleSelectSample(sample.dataUrl)}
                className="p-2.5 bg-slate-50 hover:bg-blue-50 active:bg-blue-100 border border-slate-200 hover:border-blue-900 rounded-2xl text-left transition-all flex flex-col gap-1.5 group"
              >
                <div className="w-full h-14 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
                  <img
                    src={sample.dataUrl}
                    alt={sample.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {sample.title}
                  </div>
                  <div className="text-2xs text-blue-950 font-semibold">{sample.language}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Accessible Footer */}
      <footer className="p-4 border-t border-slate-100 text-center text-xs text-slate-500 max-w-xl mx-auto w-full">
        Designed for clear reading, high contrast, and simple touch interaction.
      </footer>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Global Language Selector Modal */}
      <LanguageSelectorModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        selectedLanguage={targetLanguage}
        onSelectLanguage={onTargetLanguageChange}
        title="Translate all text to:"
      />
    </div>
  );
};
