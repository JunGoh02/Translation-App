import React, { useState, useMemo } from 'react';
import { X, Search, Check, Globe } from 'lucide-react';
import { Language, SUPPORTED_LANGUAGES } from '../types/languages';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: string;
  onSelectLanguage: (languageName: string) => void;
  title?: string;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedLanguage,
  onSelectLanguage,
  title = 'Translate to which language?',
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLanguages = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return SUPPORTED_LANGUAGES;
    return SUPPORTED_LANGUAGES.filter(
      (lang) =>
        lang.name.toLowerCase().includes(q) ||
        lang.nativeName.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-modal-title"
    >
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-blue-950 text-white flex items-center justify-center font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 id="language-modal-title" className="text-xl font-bold text-slate-900 leading-tight">
                {title}
              </h2>
              <p className="text-sm text-slate-600">Choose your preferred language</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-700 transition-colors"
            aria-label="Close language selector"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search input for accessibility */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search language (e.g. English, Chinese)..."
              className="w-full pl-11 pr-4 py-3 bg-slate-100 rounded-xl text-lg text-slate-900 border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-900 focus:bg-white placeholder-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Language List */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
          {filteredLanguages.length === 0 ? (
            <div className="p-8 text-center text-slate-600">
              <p className="text-lg font-medium">No language found for &ldquo;{searchQuery}&rdquo;</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 px-4 py-2 bg-blue-900 text-white rounded-xl text-sm font-semibold"
              >
                Show all languages
              </button>
            </div>
          ) : (
            filteredLanguages.map((lang: Language) => {
              const isSelected = selectedLanguage.toLowerCase() === lang.name.toLowerCase();
              return (
                <button
                  key={lang.code}
                  onClick={() => {
                    onSelectLanguage(lang.name);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-blue-950 text-white font-bold shadow-md'
                      : 'hover:bg-blue-50 text-slate-900 active:bg-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-2xl" role="img" aria-label={lang.name}>
                      {lang.flag}
                    </span>
                    <div>
                      <div className="text-lg font-bold leading-snug">{lang.name}</div>
                      <div className={`text-sm ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                        {lang.nativeName}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-8 h-8 rounded-full bg-white text-blue-950 flex items-center justify-center font-bold">
                      <Check className="w-5 h-5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-lg font-bold rounded-xl"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
