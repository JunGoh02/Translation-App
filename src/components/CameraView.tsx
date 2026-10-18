import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  AlertCircle,
  Upload,
  Smartphone,
  Maximize2,
  Sparkles,
} from 'lucide-react';

interface CameraViewProps {
  onCapture: (imageDataUrl: string) => void;
  onClose: () => void;
}

export type CameraOrientation = 'portrait' | 'landscape';

export const CameraView: React.FC<CameraViewProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [isFlashing, setIsFlashing] = useState(false);

  // Orientation State: auto-detected with manual override capability
  const [orientation, setOrientation] = useState<CameraOrientation>('portrait');
  const [isManualOverride, setIsManualOverride] = useState(false);

  // Auto-detect device orientation from screen & window dimensions
  const detectOrientation = useCallback((): CameraOrientation => {
    if (typeof window !== 'undefined') {
      if (window.screen?.orientation?.type) {
        return window.screen.orientation.type.includes('landscape') ? 'landscape' : 'portrait';
      }
      return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }
    return 'portrait';
  }, []);

  // Initialize orientation and listen to hardware rotation events
  useEffect(() => {
    if (!isManualOverride) {
      setOrientation(detectOrientation());
    }

    const handleScreenChange = () => {
      if (!isManualOverride) {
        setOrientation(detectOrientation());
      }
    };

    const handleResize = () => {
      if (!isManualOverride) {
        setOrientation(detectOrientation());
      }
    };

    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', handleScreenChange);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', handleScreenChange);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [detectOrientation, isManualOverride]);

  // Toggle orientation manually between portrait and landscape
  const handleToggleOrientation = () => {
    setIsManualOverride(true);
    setOrientation((prev) => (prev === 'portrait' ? 'landscape' : 'portrait'));
  };

  // Re-enable auto-detection
  const handleResetToAuto = () => {
    setIsManualOverride(false);
    setOrientation(detectOrientation());
  };

  // Initialize camera stream with aspect preferences for orientation
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    async function startCamera() {
      setIsStarting(true);
      setPermissionError(null);

      // Stop previous stream if any
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera is not supported on this device/browser.');
        }

        const isLandscape = orientation === 'landscape';

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: isLandscape ? 1920 : 1080 },
            height: { ideal: isLandscape ? 1080 : 1920 },
          },
          audio: false,
        });

        currentStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play();
        }
      } catch (err: any) {
        console.warn('Camera error:', err);
        setPermissionError(
          'Camera access is needed to take a photo. Please allow camera access in your device settings, or upload a photo directly.'
        );
      } finally {
        setIsStarting(false);
      }
    }

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, orientation]);

  // Capture photo from video frame
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Trigger visual shutter flash and haptic vibration
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 150);

    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } catch {}

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    // Stop camera tracks cleanly
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }

    onCapture(dataUrl);
  };

  // Flip front / back camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Handle fallback file upload
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          if (stream) {
            stream.getTracks().forEach((t) => t.stop());
          }
          onCapture(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const isLandscape = orientation === 'landscape';

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none">
      {/* Visual Shutter Flash Effect */}
      {isFlashing && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-out fade-out duration-150" />
      )}

      {/* Top Header Bar */}
      <div className="p-4 flex items-center justify-between z-20 bg-linear-to-b from-black/80 via-black/40 to-transparent">
        <button
          onClick={onClose}
          className="w-11 h-11 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-md active:bg-white/40 transition-colors"
          aria-label="Back to main screen"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Orientation Toggle Button */}
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-md">
          <button
            onClick={handleToggleOrientation}
            className="flex items-center gap-1.5 text-white text-xs font-bold hover:text-amber-300 transition-colors"
            title="Toggle between Portrait and Landscape camera framing"
            aria-label="Toggle camera orientation"
          >
            {isLandscape ? (
              <Maximize2 className="w-4 h-4 text-amber-400" />
            ) : (
              <Smartphone className="w-4 h-4 text-blue-400" />
            )}
            <span>{isLandscape ? 'Landscape (Wide)' : 'Portrait (Tall)'}</span>
          </button>

          {isManualOverride && (
            <button
              onClick={handleResetToAuto}
              className="text-[10px] uppercase font-bold text-slate-300 hover:text-white px-1.5 py-0.5 rounded-sm bg-white/10 ml-0.5 transition-colors"
              title="Reset orientation to automatic device sensor"
            >
              Auto
            </button>
          )}
        </div>

        {/* Flip camera front/back */}
        <button
          onClick={toggleFacingMode}
          className="w-11 h-11 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-md active:bg-white/40 transition-colors"
          aria-label="Flip camera"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Viewfinder Area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {permissionError ? (
          <div className="p-6 m-4 bg-white rounded-3xl text-slate-900 max-w-sm text-center shadow-2xl flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <p className="text-lg font-semibold leading-snug">{permissionError}</p>
            <div className="w-full flex flex-col gap-2 pt-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 bg-blue-950 text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-lg active:scale-98 shadow-md"
              >
                <Upload className="w-5 h-5" />
                <span>Upload a Photo Instead</span>
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 bg-slate-100 text-slate-800 font-bold rounded-2xl"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full ${
                isLandscape ? 'object-contain' : 'object-cover'
              } transition-all duration-300`}
            />

            {/* Visual Guideline Frame - Adapts shape and guidelines to orientation */}
            <div
              className={`absolute border-2 border-white/70 rounded-3xl pointer-events-none flex flex-col justify-between p-4 transition-all duration-300 shadow-2xl ${
                isLandscape
                  ? 'inset-x-4 inset-y-12 sm:inset-x-12 sm:inset-y-16 max-w-2xl mx-auto aspect-16/9'
                  : 'inset-6 sm:inset-12 max-w-sm mx-auto aspect-3/4'
              }`}
            >
              {/* Top Corners */}
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl shadow-xs" />
                <div className="w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl shadow-xs" />
              </div>

              {/* Guidance Badge */}
              <div className="bg-black/70 backdrop-blur-xs text-white text-center py-2 px-4 rounded-full mx-auto font-bold text-xs sm:text-sm border border-white/20 shadow-lg flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {isLandscape
                    ? 'Center wide sign, menu, or label in box'
                    : 'Center text inside the box'}
                </span>
              </div>

              {/* Bottom Corners */}
              <div className="flex justify-between items-end">
                <div className="w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl shadow-xs" />
                <div className="w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl shadow-xs" />
              </div>
            </div>

            {isStarting && (
              <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-white gap-3">
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
                <p className="text-lg font-bold">Opening camera...</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Shutter & Gallery Controls */}
      <div className="p-6 bg-linear-to-t from-black/90 via-black/50 to-transparent flex items-center justify-around z-20">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-1 text-white text-xs font-semibold active:opacity-75 transition-opacity"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
            <Upload className="w-6 h-6" />
          </div>
          <span>From Gallery</span>
        </button>

        {/* Oversized High-Contrast Shutter Button */}
        <button
          onClick={takePhoto}
          disabled={Boolean(permissionError) || isStarting}
          className="w-20 h-20 rounded-full border-4 border-white bg-blue-600 active:bg-blue-400 p-1 flex items-center justify-center shadow-2xl active:scale-90 transition-transform disabled:opacity-50"
          aria-label="Capture photo for translation"
        >
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
            <Camera className="w-8 h-8 text-blue-950" />
          </div>
        </button>

        {/* Quick Orientation Switcher Shortcut in Footer */}
        <button
          onClick={handleToggleOrientation}
          className="flex flex-col items-center gap-1 text-white text-xs font-semibold active:opacity-75 transition-opacity"
          aria-label={`Switch to ${isLandscape ? 'Portrait' : 'Landscape'}`}
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
            {isLandscape ? (
              <Smartphone className="w-6 h-6 text-blue-300" />
            ) : (
              <Maximize2 className="w-6 h-6 text-amber-300" />
            )}
          </div>
          <span>{isLandscape ? 'To Portrait' : 'To Landscape'}</span>
        </button>
      </div>

      {/* Hidden Canvas & File Input */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture={isLandscape ? undefined : 'environment'}
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
};
