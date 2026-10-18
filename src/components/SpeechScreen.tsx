import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Mic,
  Square,
  Volume2,
  RefreshCw,
  AlertCircle,
  Globe,
  Sparkles,
} from 'lucide-react';
import { SpeechTranslationResult } from '../types';
import { LanguageSelectorModal } from './LanguageSelectorModal';
import { speakText, blobToBase64 } from '../utils/audio';

interface SpeechScreenProps {
  targetLanguage: string;
  onBackHome: () => void;
  onTargetLanguageChange: (lang: string) => void;
}

const SAMPLE_SPEECH_PHRASES = [
  { text: 'Hola, ¿dónde está el hospital más cercano?', lang: 'Spanish', flag: '🇪🇸', label: 'Spanish: Where is the hospital?' },
  { text: '你好，请问去火车站怎么走？', lang: 'Mandarin Chinese', flag: '🇨🇳', label: 'Chinese: Way to train station?' },
  { text: 'Pouvez-vous m\'aider, s\'il vous plaît ?', lang: 'French', flag: '🇫🇷', label: 'French: Can you help me please?' },
  { text: 'すみません、トイレはどこですか？', lang: 'Japanese', flag: '🇯🇵', label: 'Japanese: Where is the restroom?' },
];

export const SpeechScreen: React.FC<SpeechScreenProps> = ({
  targetLanguage,
  onBackHome,
  onTargetLanguageChange,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<SpeechTranslationResult | null>(null);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const currentTranscriptRef = useRef<string>('');

  // Clean up timer and recorder on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  const startRecording = async () => {
    setErrorMessage(null);
    setResult(null);
    setLiveTranscript('');
    currentTranscriptRef.current = '';
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    // 1. Try to start browser speech recognition if supported for live feedback
    if (typeof window !== 'undefined') {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const rec = new SpeechRec();
          rec.continuous = true;
          rec.interimResults = true;
          rec.onresult = (event: any) => {
            let fullText = '';
            for (let i = 0; i < event.results.length; i++) {
              fullText += event.results[i][0].transcript;
            }
            if (fullText) {
              setLiveTranscript(fullText);
              currentTranscriptRef.current = fullText;
            }
          };
          rec.onerror = () => {};
          rec.start();
          recognitionRef.current = rec;
        } catch (recErr) {
          console.warn('Speech recognition not started:', recErr);
        }
      }
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported by your browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine best audio mime type supported
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          mimeType = '';
        }
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
        clearInterval(timerRef.current);

        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch {}
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        const capturedTranscript = currentTranscriptRef.current;

        if (audioBlob.size < 500 && !capturedTranscript) {
          setErrorMessage('No audio was detected. Please hold the microphone close and speak clearly.');
          setIsProcessing(false);
          return;
        }

        await processAudio(audioBlob, recorder.mimeType || 'audio/webm', capturedTranscript);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250); // Slice data every 250ms
      setIsRecording(true);

      // Start elapsed timer
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone permission denied or error:', err);
      setErrorMessage(
        'Microphone access is needed for speech translation. Please allow microphone access in your device settings and try again.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setIsProcessing(true);
      setIsRecording(false);
      mediaRecorderRef.current.stop();
    }
  };

  const processAudio = async (blob: Blob, mimeType: string, clientTranscript?: string) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      let base64Audio = '';
      if (blob && blob.size > 0) {
        base64Audio = await blobToBase64(blob);
      }

      const res = await fetch('/api/translate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType,
          targetLanguage,
          clientTranscript: clientTranscript || liveTranscript,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to process speech.');
      }

      const data: SpeechTranslationResult = await res.json();
      setResult(data);

      // Automatically speak translation for elderly convenience
      if (data.translation) {
        speakText(data.translation, targetLanguage);
      }
    } catch (err: any) {
      console.error('Speech translation failed:', err);
      setErrorMessage(
        err.message || 'Something went wrong with the speech translation. Please try speaking again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Test an instant spoken phrase directly
  const handleTestPhrase = async (phraseText: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setLiveTranscript(phraseText);

    try {
      const res = await fetch('/api/translate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: '',
          mimeType: 'audio/webm',
          targetLanguage,
          clientTranscript: phraseText,
        }),
      });

      if (!res.ok) throw new Error('Failed to translate phrase');
      const data: SpeechTranslationResult = await res.json();
      setResult(data);
      if (data.translation) {
        speakText(data.translation, targetLanguage);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not translate phrase. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Allow re-translating the last transcription to another language
  const handleRetranslateTranscription = async (newTargetLang: string) => {
    if (!result?.transcription) return;

    onTargetLanguageChange(newTargetLang);
    setIsProcessing(true);

    try {
      const res = await fetch('/api/translate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: '',
          mimeType: 'audio/webm',
          targetLanguage: newTargetLang,
          clientTranscript: result.transcription,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        if (data.translation) {
          speakText(data.translation, newTargetLang);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between pb-10">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-xs flex items-center justify-between">
        <button
          onClick={onBackHome}
          className="flex items-center gap-1.5 py-2 px-3 rounded-xl hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-bold text-base transition-colors"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          <span>Home</span>
        </button>

        <h1 className="text-lg font-black text-blue-950 tracking-tight">Speech Translation</h1>

        <button
          onClick={() => setIsLangModalOpen(true)}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-blue-100 text-blue-950 font-bold text-sm hover:bg-blue-200 active:scale-95 transition-all"
        >
          <Globe className="w-4 h-4" />
          <span>{targetLanguage}</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 sm:p-5 flex flex-col items-center justify-center">
        {/* Prominent instructions */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-950 rounded-full font-bold text-xs uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Automatic Language Detection
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
            Hear &amp; Understand Speech
          </h2>
          <p className="text-base text-slate-600 mt-1 max-w-sm mx-auto">
            Speak in any language. We will detect what is said and translate it into{' '}
            <strong className="text-blue-950">{targetLanguage}</strong>.
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="w-full mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-900 flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-base font-bold">{errorMessage}</p>
              <button
                onClick={() => setErrorMessage(null)}
                className="mt-2 text-sm font-bold text-amber-900 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Translation Results (When Available) */}
        {result && (
          <div className="w-full mb-6 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
            {!result.hasSpeech ? (
              <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 flex flex-col gap-2">
                <div className="flex items-center gap-2 font-bold text-lg text-amber-900">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                  <span>No clear speech heard</span>
                </div>
                <p className="text-sm text-amber-800">
                  We couldn&rsquo;t hear any clear words. Please hold the microphone close and speak clearly, or tap one of the sample phrases below.
                </p>
              </div>
            ) : (
              <>
                {/* Detected Spoken Language & Original Text */}
                <div className="p-5 bg-white border-2 border-slate-200 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs uppercase tracking-wider font-bold text-slate-500">
                      Detected: {result.detectedLanguage}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">You said</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800 leading-snug">
                    &ldquo;{result.transcription}&rdquo;
                  </p>
                </div>

                {/* Translated Result Card */}
                <div className="p-6 bg-blue-950 text-white rounded-3xl shadow-xl border-2 border-blue-900 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-bold text-blue-300">
                      Translation ({targetLanguage})
                    </span>
                    <button
                      onClick={() => speakText(result.translation, targetLanguage)}
                      className="px-3.5 py-1.5 bg-white text-blue-950 hover:bg-blue-100 rounded-full font-bold text-sm flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      aria-label="Play translated audio"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>Listen</span>
                    </button>
                  </div>

                  <p className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    {result.translation}
                  </p>

                  {result.pronunciationGuide && (
                    <div className="text-sm text-blue-200 font-medium italic pt-1">
                      Pronunciation: {result.pronunciationGuide}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Large Central Microphone Control */}
        <div className="my-auto py-6 flex flex-col items-center">
          {isProcessing ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-28 h-28 rounded-full bg-blue-100 border-4 border-blue-900 flex items-center justify-center animate-pulse">
                <RefreshCw className="w-12 h-12 text-blue-950 animate-spin" />
              </div>
              <div className="text-center">
                <div className="text-xl font-black text-slate-900">Translating speech...</div>
                <div className="text-sm text-slate-500 mt-0.5">Detecting language and meaning</div>
              </div>
            </div>
          ) : isRecording ? (
            <div className="flex flex-col items-center gap-4">
              {/* Pulsating recording button */}
              <button
                onClick={stopRecording}
                className="relative w-32 h-32 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
                aria-label="Stop recording"
              >
                <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
                <Square className="w-12 h-12 fill-white stroke-none" />
              </button>

              <div className="text-center max-w-sm">
                <div className="text-2xl font-black text-red-600 animate-pulse">
                  Listening... ({recordingSeconds}s)
                </div>
                {liveTranscript ? (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-2xl text-slate-900 font-bold text-base shadow-xs animate-in fade-in">
                    Hearing: &ldquo;{liveTranscript}&rdquo;
                  </div>
                ) : (
                  <p className="text-base text-slate-700 font-medium mt-1">
                    Tap the red square when you finish speaking
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              {/* Oversized Tap to Speak Button */}
              <button
                onClick={startRecording}
                className="w-32 h-32 rounded-full bg-blue-950 hover:bg-blue-900 active:bg-blue-950 text-white flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
                aria-label="Start speaking"
              >
                <Mic className="w-16 h-16 stroke-[2.2]" />
              </button>

              <div className="text-center">
                <div className="text-2xl font-black text-blue-950">Tap to Speak</div>
                <p className="text-base text-slate-600 font-medium mt-1">
                  {result ? 'Tap again to translate another sentence' : 'Press the microphone and talk'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quick test phrases for instant demo and silent testing */}
        {!isRecording && !isProcessing && (
          <div className="w-full mt-4 pt-4 border-t border-slate-200">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 text-center">
              Or tap a sample sentence to translate instantly:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SAMPLE_SPEECH_PHRASES.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleTestPhrase(item.text)}
                  className="p-3 bg-white hover:bg-blue-50 active:bg-blue-100 border border-slate-200 hover:border-blue-900 rounded-xl text-left transition-all flex items-center gap-2.5 group"
                >
                  <span className="text-xl shrink-0">{item.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {item.text}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {item.label}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Language Selector Modal */}
      <LanguageSelectorModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        selectedLanguage={targetLanguage}
        onSelectLanguage={(lang) => {
          onTargetLanguageChange(lang);
          if (result) {
            handleRetranslateTranscription(lang);
          }
        }}
        title="Translate spoken speech to:"
      />
    </div>
  );
};
