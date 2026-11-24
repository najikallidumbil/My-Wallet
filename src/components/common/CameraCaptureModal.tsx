import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, VideoOff } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [cameraState, setCameraState] = useState<'idle' | 'requesting' | 'live' | 'captured' | 'denied' | 'unsupported'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Stop camera tracks cleanly
  const stopStream = (mediaStream: MediaStream | null) => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }
  };

  // Start camera stream
  const startCamera = async () => {
    setErrorMessage(null);
    setCapturedDataUrl(null);
    setCapturedBlob(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('unsupported');
      setErrorMessage('Camera access is not supported by this browser.');
      return;
    }

    setCameraState('requesting');

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      setCameraState('live');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraState('denied');
        setErrorMessage('Camera permission was denied. Please allow camera access in your browser address bar.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setCameraState('unsupported');
        setErrorMessage('No camera device was detected on your system.');
      } else {
        setCameraState('unsupported');
        setErrorMessage(error.message || 'Unable to access the camera.');
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopStream(stream);
      setStream(null);
      setCapturedDataUrl(null);
      setCapturedBlob(null);
      setCameraState('idle');
    }
    return () => {
      stopStream(stream);
    };
  }, [isOpen]);

  // Ensure video element plays stream when ready
  useEffect(() => {
    if (cameraState === 'live' && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((e) => console.warn('Video play interrupted', e));
    }
  }, [cameraState, stream]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedDataUrl(dataUrl);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
        }
      },
      'image/jpeg',
      0.92
    );

    setCameraState('captured');
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
    setCapturedBlob(null);
    setCameraState('live');
  };

  const handleUsePhoto = () => {
    if (!capturedBlob && !capturedDataUrl) return;

    const timestamp = Date.now();
    const filename = `photo_receipt_${timestamp}.jpg`;

    let file: File;
    if (capturedBlob) {
      file = new File([capturedBlob], filename, { type: 'image/jpeg' });
    } else if (capturedDataUrl) {
      // Fallback: convert dataUrl to Blob
      const byteString = atob(capturedDataUrl.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      file = new File([ab], filename, { type: 'image/jpeg' });
    } else {
      return;
    }

    onCapture(file);
    handleClose();
  };

  const handleClose = () => {
    stopStream(stream);
    setStream(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-lg bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">Live Camera Capture</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport / Preview */}
        <div className="relative bg-black flex items-center justify-center min-h-[300px] sm:min-h-[380px] overflow-hidden">
          {cameraState === 'live' && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full max-h-[55vh] object-cover"
            />
          )}

          {cameraState === 'captured' && capturedDataUrl && (
            <img
              src={capturedDataUrl}
              alt="Captured preview"
              className="w-full h-full max-h-[55vh] object-contain"
            />
          )}

          {cameraState === 'requesting' && (
            <div className="flex flex-col items-center gap-3 p-6 text-center text-slate-400 text-sm">
              <RefreshCw className="w-8 h-8 animate-spin text-brand-400" />
              <p>Requesting camera permissions...</p>
            </div>
          )}

          {(cameraState === 'denied' || cameraState === 'unsupported') && (
            <div className="flex flex-col items-center gap-3 p-8 text-center max-w-sm">
              <div className="w-12 h-12 rounded-2xl bg-rose-950/70 border border-rose-800 flex items-center justify-center text-rose-400">
                <VideoOff className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-rose-300">
                {cameraState === 'denied' ? 'Camera Permission Denied' : 'Camera Unavailable'}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={startCamera}
                className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-white transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer Toolbar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-colors"
          >
            Cancel
          </button>

          {cameraState === 'live' && (
            <button
              type="button"
              onClick={handleCapture}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/30 flex items-center gap-2 active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Capture Photo</span>
            </button>
          )}

          {cameraState === 'captured' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetake}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>

              <button
                type="button"
                onClick={handleUsePhoto}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Use Photo</span>
              </button>
            </div>
          )}

          {(cameraState === 'denied' || cameraState === 'unsupported' || cameraState === 'requesting') && (
            <div />
          )}
        </div>
      </div>
    </div>
  );
};
