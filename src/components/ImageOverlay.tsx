import React, { useState } from 'react';
import {
  Volume2,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { TextBlock } from '../types';
import { speakText } from '../utils/audio';

interface ImageOverlayProps {
  imageSrc: string;
  blocks: TextBlock[];
  targetLanguage: string;
  detectedLanguage: string;
  onSelectBlock?: (block: TextBlock | null) => void;
}

/**
 * Calculates density-aware adaptive font metrics for translated text blocks
 * to ensure text stays legible, neatly aligned, and never overflows tight spaces.
 */
function getAdaptiveTextMetrics(translated: string, widthPct: number, heightPct: number) {
  const cleanText = translated.trim();
  const charCount = cleanText.length;
  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
  const aspectRatio = widthPct / Math.max(0.01, heightPct);
  const area = widthPct * heightPct;

  let fontSizePx = 12;
  let lineHeight = 1.15;
  let paddingY = 2; // px
  let paddingX = 4; // px
  let textAlign: 'center' | 'left' = 'center';
  let lineClamp = 3;

  if (charCount <= 8 && heightPct >= 3.5) {
    // Short punchy headline (e.g. "EXIT", "MILK", "DANGER", "WATER", "CAUTION")
    fontSizePx = Math.min(18, Math.max(12, Math.round(heightPct * 2.2)));
    lineClamp = 1;
    textAlign = 'center';
    lineHeight = 1.1;
  } else if (charCount <= 22) {
    // Short sentence or product title (e.g. "Whole Pasteurized Milk", "No Smoking Area")
    const estimatedSize = Math.sqrt(area / (charCount * 0.75));
    fontSizePx = Math.min(15, Math.max(10, Math.round(estimatedSize)));
    lineClamp = 2;
    textAlign = aspectRatio > 2.8 ? 'center' : 'left';
    lineHeight = 1.15;
  } else if (charCount <= 55) {
    // Medium multi-line text (e.g. directions, descriptions, sign subtitles)
    const estimatedSize = Math.sqrt(area / (charCount * 0.85));
    fontSizePx = Math.min(12.5, Math.max(8.5, Math.round(estimatedSize)));
    lineClamp = 3;
    textAlign = 'left';
    lineHeight = 1.15;
    paddingX = 3;
    paddingY = 1.5;
  } else {
    // Dense paragraph or tight labels (e.g. nutrition facts, ingredients on milk carton)
    const estimatedSize = Math.sqrt(area / (charCount * 1.05));
    fontSizePx = Math.min(10.5, Math.max(7.5, Math.round(estimatedSize)));
    lineClamp = 4;
    textAlign = 'left';
    lineHeight = 1.1;
    paddingX = 2.5;
    paddingY = 1;
  }

  return {
    fontSizePx,
    lineHeight,
    paddingY,
    paddingX,
    textAlign,
    lineClamp,
    charCount,
    wordCount,
  };
}

export const ImageOverlay: React.FC<ImageOverlayProps> = ({
  imageSrc,
  blocks,
  targetLanguage,
  detectedLanguage,
}) => {
  const [showOriginal, setShowOriginal] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'overlay' | 'list'>('overlay');

  const selectedBlock = selectedIndex !== null ? blocks[selectedIndex] : null;

  const handleSelectBlock = (idx: number) => {
    setSelectedIndex((prev) => (prev === idx ? null : idx));
  };

  const handleNextBlock = () => {
    if (blocks.length === 0) return;
    setSelectedIndex((prev) => (prev === null ? 0 : (prev + 1) % blocks.length));
  };

  const handlePrevBlock = () => {
    if (blocks.length === 0) return;
    setSelectedIndex((prev) => (prev === null ? blocks.length - 1 : (prev - 1 + blocks.length) % blocks.length));
  };

  return (
    <div className="flex flex-col w-full">
      {/* View controls */}
      <div className="flex items-center justify-between gap-2 p-2 bg-slate-100 rounded-xl mb-3 border border-slate-200">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('overlay')}
            className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'overlay'
                ? 'bg-blue-950 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Photo Overlay</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'list'
                ? 'bg-blue-950 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Text Cards ({blocks.length})</span>
          </button>
        </div>

        {viewMode === 'overlay' && (
          <button
            onMouseDown={() => setShowOriginal(true)}
            onMouseUp={() => setShowOriginal(false)}
            onTouchStart={() => setShowOriginal(true)}
            onTouchEnd={() => setShowOriginal(false)}
            className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 border transition-all ${
              showOriginal
                ? 'bg-amber-100 border-amber-400 text-amber-900'
                : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
            }`}
            title="Press and hold to see original photo"
          >
            {showOriginal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showOriginal ? 'Showing Original' : 'Hold for Original'}</span>
          </button>
        )}
      </div>

      {viewMode === 'overlay' ? (
        <div className="relative w-full overflow-hidden rounded-2xl bg-black border-2 border-slate-300 shadow-md">
          {/* Main Photo */}
          <img
            src={imageSrc}
            alt="Source for translation"
            className="w-full h-auto max-h-[62vh] object-contain block mx-auto select-none"
          />

          {/* In-place Translated Overlays with Dynamic Scaling */}
          {!showOriginal &&
            blocks.map((block, idx) => {
              const [ymin, xmin, ymax, xmax] = block.box2d;

              // Normalized coordinates 0-1000 converted to percentage
              const top = Math.max(0, Math.min(100, ymin / 10));
              const left = Math.max(0, Math.min(100, xmin / 10));
              const width = Math.max(8, Math.min(100 - left, (xmax - xmin) / 10));
              const height = Math.max(3.5, Math.min(100 - top, (ymax - ymin) / 10));

              const isSelected = selectedIndex === idx;
              const metrics = getAdaptiveTextMetrics(block.translated, width, height);

              return (
                <div
                  key={idx}
                  onClick={() => handleSelectBlock(idx)}
                  style={{
                    top: `${top}%`,
                    left: `${left}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                    minHeight: '20px',
                    minWidth: '28px',
                  }}
                  className={`absolute z-20 flex items-center justify-center cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'ring-3 ring-amber-400 scale-[1.03] z-30 shadow-2xl'
                      : 'hover:scale-[1.01]'
                  }`}
                  title="Tap to read and listen to full translation"
                >
                  <div
                    style={{
                      paddingTop: `${metrics.paddingY}px`,
                      paddingBottom: `${metrics.paddingY}px`,
                      paddingLeft: `${metrics.paddingX}px`,
                      paddingRight: `${metrics.paddingX}px`,
                    }}
                    className={`w-full h-full bg-blue-950/95 text-white border-1.5 rounded-md shadow-md flex items-center justify-center overflow-hidden backdrop-blur-xs select-none transition-colors ${
                      isSelected
                        ? 'border-amber-400 bg-blue-950 ring-1 ring-amber-300'
                        : 'border-white/95'
                    }`}
                  >
                    <span
                      style={{
                        fontSize: `${metrics.fontSizePx}px`,
                        lineHeight: metrics.lineHeight,
                        textAlign: metrics.textAlign,
                        WebkitLineClamp: metrics.lineClamp,
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                      }}
                      className="font-extrabold text-white tracking-tight drop-shadow-xs overflow-hidden break-words hyphens-auto w-full"
                    >
                      {block.translated}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        /* List Mode: Clean side-by-side cards for easy reading */
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {blocks.length === 0 ? (
            <p className="p-4 bg-slate-50 text-slate-600 rounded-xl text-center">
              No distinct text blocks found.
            </p>
          ) : (
            blocks.map((block, idx) => (
              <div
                key={idx}
                className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-xs flex flex-col gap-2 hover:border-blue-900 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-1">
                      {detectedLanguage} (Original)
                    </div>
                    <div className="text-base text-slate-700 font-medium">
                      {block.original}
                    </div>
                  </div>

                  <button
                    onClick={() => speakText(block.translated, targetLanguage)}
                    className="p-2.5 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-950 transition-colors"
                    aria-label={`Read ${block.translated} aloud`}
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="text-xs uppercase tracking-wider font-bold text-blue-950 mb-0.5">
                    {targetLanguage} (Translation)
                  </div>
                  <div className="text-xl font-extrabold text-slate-900">
                    {block.translated}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Selected Block Inspector Drawer (when an overlay badge is tapped) */}
      {selectedBlock && viewMode === 'overlay' && (
        <div className="mt-3 p-4 bg-blue-950 text-white rounded-2xl shadow-xl border-2 border-blue-900 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between border-b border-blue-900/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-900 text-blue-200 rounded-md text-xs font-bold uppercase tracking-wider">
                Block {selectedIndex! + 1} of {blocks.length}
              </span>
              <span className="text-xs text-blue-300 font-medium">
                Detected: {detectedLanguage}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevBlock}
                className="p-1 rounded-lg hover:bg-blue-900 text-blue-300 hover:text-white transition-colors"
                title="Previous text block"
                aria-label="Previous text block"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextBlock}
                className="p-1 rounded-lg hover:bg-blue-900 text-blue-300 hover:text-white transition-colors"
                title="Next text block"
                aria-label="Next text block"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setSelectedIndex(null)}
                className="p-1 rounded-lg hover:bg-blue-900 text-blue-300 hover:text-white transition-colors ml-1"
                title="Close text inspector"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">
                Translation ({targetLanguage})
              </div>
              <p className="text-xl sm:text-2xl font-black text-white leading-snug">
                {selectedBlock.translated}
              </p>
              <div className="text-sm text-blue-200 mt-2 italic font-medium">
                Original: &ldquo;{selectedBlock.original}&rdquo;
              </div>
            </div>

            <button
              onClick={() => speakText(selectedBlock.translated, targetLanguage)}
              className="px-4 py-2.5 bg-white text-blue-950 hover:bg-blue-50 font-bold rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all text-sm shrink-0 self-start mt-1"
              aria-label="Listen to translation"
            >
              <Volume2 className="w-4 h-4" />
              <span>Listen</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
