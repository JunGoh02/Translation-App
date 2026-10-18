import React, { useEffect, useState } from 'react';
import { RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

interface LoadingOverlayProps {
  isOpen: boolean;
  type?: 'image' | 'speech' | 'conversation';
  targetLanguage?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isOpen,
  type = 'image',
  targetLanguage = 'English',
}) => {
  const [stepIndex, setStepIndex] = useState(0);

  const imageSteps = [
    { title: 'Analysing image...', desc: 'Scanning for foreign signs, labels, or notices' },
    { title: 'Detecting language...', desc: 'Reading characters and identifying writing system' },
    { title: `Translating into ${targetLanguage}...`, desc: 'Preserving meaning and matching sign layout' },
  ];

  const speechSteps = [
    { title: 'Processing audio...', desc: 'Listening to speech patterns' },
    { title: 'Detecting spoken language...', desc: 'Transcribing what was said' },
    { title: `Translating into ${targetLanguage}...`, desc: 'Preparing clear spoken and written translation' },
  ];

  const steps = type === 'speech' ? speechSteps : imageSteps;

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);

    return () => clearInterval(interval);
  }, [isOpen, steps.length]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="alertdialog"
      aria-busy="true"
    >
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-5 border-2 border-slate-200">
        {/* Animated Icon */}
        <div className="relative w-20 h-20 rounded-full bg-blue-50 border-4 border-blue-900 flex items-center justify-center">
          <RefreshCw className="w-10 h-10 text-blue-950 animate-spin" />
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-blue-950 flex items-center justify-center shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Current Step Title & Description */}
        <div>
          <h3 className="text-2xl font-black text-blue-950 leading-tight">
            {steps[stepIndex].title}
          </h3>
          <p className="text-sm font-medium text-slate-600 mt-1.5 leading-relaxed">
            {steps[stepIndex].desc}
          </p>
        </div>

        {/* Step Progress Checklist */}
        <div className="w-full bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col gap-2.5 text-left">
          {steps.map((step, idx) => {
            const isCompleted = idx < stepIndex;
            const isCurrent = idx === stepIndex;

            return (
              <div
                key={idx}
                className={`flex items-center gap-2.5 text-sm transition-opacity ${
                  isCurrent
                    ? 'font-black text-blue-950 opacity-100'
                    : isCompleted
                    ? 'font-semibold text-emerald-700 opacity-90'
                    : 'font-medium text-slate-400 opacity-60'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : isCurrent ? (
                  <div className="w-4 h-4 rounded-full border-2 border-blue-950 border-t-transparent animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                )}
                <span>{step.title}</span>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-600 font-medium">
          Please wait a moment while the AI reads the details.
        </p>
      </div>
    </div>
  );
};
