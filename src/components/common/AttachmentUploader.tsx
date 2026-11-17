import React, { useRef, useState } from 'react';
import { Attachment } from '../../types';
import {
  processFileToAttachment,
  formatFileSize,
  removeAttachmentData,
} from '../../services/attachmentStorage';
import {
  Camera,
  FolderOpen,
  X,
  FileText,
  AlertCircle,
  Loader2,
  Paperclip,
  ZoomIn,
} from 'lucide-react';

interface AttachmentUploaderProps {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  maxFiles?: number;
  label?: string;
  onPreviewClick?: (attachment: Attachment) => void;
}

export const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  attachments,
  onChange,
  maxFiles = 5,
  label = 'Bills, Invoices & Payment Proofs',
  onPreviewClick,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > maxFiles) {
      setErrorMessage(`You can upload up to ${maxFiles} attachments per transaction.`);
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const newAttachments: Attachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const attachment = await processFileToAttachment(file);
          newAttachments.push(attachment);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to process file';
          setErrorMessage(message);
        }
      }

      if (newAttachments.length > 0) {
        onChange([...attachments, ...newAttachments]);
      }
    } finally {
      setIsLoading(false);
      // Reset input values so same file can be re-selected if removed
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async (indexToRemove: number) => {
    const item = attachments[indexToRemove];
    if (item) {
      try {
        await removeAttachmentData(item.id);
      } catch (err) {
        console.warn('Failed to delete attachment from local storage', err);
      }
    }
    const updated = attachments.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {/* Hidden File Inputs */}
      {/* 1. Camera Input (Mobile capture) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* 2. File Manager / Gallery Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Header and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-slate-400" />
          <span>{label}</span>
          <span className="text-[10px] text-slate-400">
            ({attachments.length}/{maxFiles})
          </span>
        </label>

        {/* Buttons: Take Photo & Choose Files */}
        <div className="flex items-center gap-2">
          {/* Take Photo Button */}
          <button
            type="button"
            disabled={isLoading || attachments.length >= maxFiles}
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200/80 dark:border-slate-700"
          >
            <Camera className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>Take Photo</span>
          </button>

          {/* Choose Files Button */}
          <button
            type="button"
            disabled={isLoading || attachments.length >= maxFiles}
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/70 dark:hover:bg-brand-900/80 text-brand-700 dark:text-brand-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-brand-200/80 dark:border-brand-800"
          >
            <FolderOpen className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>Choose Files</span>
          </button>
        </div>
      </div>

      {/* Loading state indicator */}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-brand-600 dark:text-brand-400 p-2 bg-brand-50/50 dark:bg-brand-950/30 rounded-xl">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Processing attachment...</span>
        </div>
      )}

      {/* Validation Error Message */}
      {errorMessage && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-0.5 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Selected Attachments Previews */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          {attachments.map((item, idx) => {
            const isImage = item.fileType.startsWith('image/');
            const isPdf = item.fileType.includes('pdf') || item.fileName.toLowerCase().endsWith('.pdf');

            return (
              <div
                key={item.id}
                className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-2 overflow-hidden flex flex-col justify-between"
              >
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-slate-900/70 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-sm"
                  title="Remove attachment"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>

                {/* Preview Thumbnail */}
                <div
                  className="cursor-pointer"
                  onClick={() => onPreviewClick && onPreviewClick(item)}
                >
                  {isImage && item.dataUrl ? (
                    <div className="relative h-24 w-full rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                      <img
                        src={item.dataUrl}
                        alt={item.fileName}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                        <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                      </div>
                    </div>
                  ) : isPdf ? (
                    <div className="h-24 w-full rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex flex-col items-center justify-center p-2 text-center group-hover:bg-rose-100/50 transition-colors">
                      <FileText className="w-8 h-8 text-rose-500 mb-1" />
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                        PDF Document
                      </span>
                    </div>
                  ) : (
                    <div className="h-24 w-full rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                  )}

                  {/* Metadata labels */}
                  <div className="mt-1.5">
                    <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate" title={item.fileName}>
                      {item.fileName}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {formatFileSize(item.fileSize)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Helpful Hint */}
      <p className="text-[10px] text-slate-400 dark:text-slate-500">
        Supports JPG, PNG, WEBP and PDF up to 10 MB per file.
      </p>
    </div>
  );
};
