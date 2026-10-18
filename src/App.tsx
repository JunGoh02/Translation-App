import React, { useState, useEffect } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { CameraView } from './components/CameraView';
import { ImageResultScreen } from './components/ImageResultScreen';
import { SpeechScreen } from './components/SpeechScreen';
import { ConversationScreen } from './components/ConversationScreen';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ActiveScreen, ImageTranslationResult } from './types';
import { DEFAULT_TARGET_LANGUAGE } from './types/languages';
import { AlertCircle, X } from 'lucide-react';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('home');
  const [targetLanguage, setTargetLanguage] = useState<string>(() => {
    return localStorage.getItem('wdts_target_lang') || DEFAULT_TARGET_LANGUAGE;
  });

  const [activeImageSrc, setActiveImageSrc] = useState<string | null>(null);
  const [imageResult, setImageResult] = useState<ImageTranslationResult | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<'image' | 'speech'>('image');
  const [isReTranslating, setIsReTranslating] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  // Persist target language in local storage
  const handleTargetLanguageChange = (newLang: string) => {
    setTargetLanguage(newLang);
    localStorage.setItem('wdts_target_lang', newLang);
  };

  // Process image using Gemini Vision endpoint
  const processImageForTranslation = async (imageDataUrl: string, targetLang: string) => {
    setIsLoading(true);
    setLoadingType('image');
    setAppError(null);

    try {
      const res = await fetch('/api/translate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageDataUrl,
          targetLanguage: targetLang,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || 'Failed to process image. Please try taking a clearer photo.'
        );
      }

      const result: ImageTranslationResult = await res.json();
      result.imageSrc = imageDataUrl;

      setActiveImageSrc(imageDataUrl);
      setImageResult(result);
      setActiveScreen('image-result');
    } catch (err: any) {
      console.error('Image translation error:', err);
      setAppError(
        err.message || 'Something went wrong while analysing the photo. Please try again with a clearer image.'
      );
      // Stay on home if failed from home
      if (activeScreen === 'camera') {
        setActiveScreen('home');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Re-translate current photo into a new language without retaking
  const handleReTranslatePhoto = async (newTargetLang: string) => {
    if (!activeImageSrc) return;

    handleTargetLanguageChange(newTargetLang);
    setIsReTranslating(true);
    setAppError(null);

    try {
      const res = await fetch('/api/translate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: activeImageSrc,
          targetLanguage: newTargetLang,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update translation language.');
      }

      const updatedResult: ImageTranslationResult = await res.json();
      updatedResult.imageSrc = activeImageSrc;
      setImageResult(updatedResult);
    } catch (err: any) {
      console.error('Re-translation error:', err);
      setAppError('Could not update translation language. Please try again.');
    } finally {
      setIsReTranslating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center text-slate-900 font-sans antialiased">
      {/* Responsive mobile/tablet container boundary */}
      <div className={`w-full ${activeScreen === 'image-result' ? 'max-w-2xl' : 'max-w-md'} bg-white min-h-screen shadow-2xl flex flex-col relative overflow-x-hidden transition-all duration-200`}>
        {/* Friendly Error Banner */}
        {appError && (
          <div className="sticky top-0 z-50 p-4 bg-amber-50 border-b-2 border-amber-300 text-amber-950 flex items-start justify-between gap-3 shadow-md animate-in slide-in-from-top duration-150">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-base font-bold leading-snug">{appError}</p>
            </div>
            <button
              onClick={() => setAppError(null)}
              className="p-1 rounded-lg hover:bg-amber-100 text-amber-800"
              aria-label="Dismiss message"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Screen Routing */}
        {activeScreen === 'home' && (
          <HomeScreen
            targetLanguage={targetLanguage}
            onTargetLanguageChange={handleTargetLanguageChange}
            onOpenTakeCamera={() => setActiveScreen('camera')}
            onSelectImage={(dataUrl) => processImageForTranslation(dataUrl, targetLanguage)}
            onOpenSpeech={() => setActiveScreen('speech')}
            onOpenConversation={() => setActiveScreen('conversation')}
          />
        )}

        {activeScreen === 'camera' && (
          <CameraView
            onCapture={(dataUrl) => {
              setActiveScreen('home'); // transition to home during loading
              processImageForTranslation(dataUrl, targetLanguage);
            }}
            onClose={() => setActiveScreen('home')}
          />
        )}

        {activeScreen === 'image-result' && imageResult && activeImageSrc && (
          <ImageResultScreen
            result={imageResult}
            imageSrc={activeImageSrc}
            onRetake={() => setActiveScreen('camera')}
            onUploadNew={() => {
              // Trigger upload from home
              setActiveScreen('home');
            }}
            onBackHome={() => setActiveScreen('home')}
            onChangeTargetLanguage={handleReTranslatePhoto}
            isReTranslating={isReTranslating}
          />
        )}

        {activeScreen === 'speech' && (
          <SpeechScreen
            targetLanguage={targetLanguage}
            onBackHome={() => setActiveScreen('home')}
            onTargetLanguageChange={handleTargetLanguageChange}
          />
        )}

        {activeScreen === 'conversation' && (
          <ConversationScreen
            onBackHome={() => setActiveScreen('home')}
            defaultPracticeLang="Mandarin Chinese"
            defaultResponseLang={targetLanguage}
          />
        )}

        {/* Visual Loading Overlay with step-by-step progress */}
        <LoadingOverlay
          isOpen={isLoading}
          type={loadingType}
          targetLanguage={targetLanguage}
        />
      </div>
    </div>
  );
}
