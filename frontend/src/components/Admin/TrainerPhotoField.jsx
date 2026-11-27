import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, Trash2, AlertCircle } from 'lucide-react';
import TrainerAvatar, { resolveMediaUrl } from '../UI/TrainerAvatar.jsx';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export default function TrainerPhotoField({
  trainerName = '',
  existingUrl = '',
  pendingFile = null,
  removeExisting = false,
  onSelectFile,
  onRemove,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(pendingFile);
    setPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [pendingFile]);

  const effectiveUrl = previewUrl || (!removeExisting ? resolveMediaUrl(existingUrl) : '');
  const hasPhoto = Boolean(effectiveUrl);

  const handleFileChange = (e) => {
    setLocalError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const mime = String(file.type || '').toLowerCase();
    if (!ALLOWED_TYPES.includes(mime)) {
      setLocalError('Unsupported format. Please select a JPG, PNG, or WEBP image.');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setLocalError('Image is too large. Maximum allowed size is 5 MB.');
      e.target.value = '';
      return;
    }

    onSelectFile?.(file);
    e.target.value = '';
  };

  const handleRemoveClick = () => {
    setLocalError('');
    if (inputRef.current) inputRef.current.value = '';
    onRemove?.();
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-bold text-[#B8B8B8] uppercase tracking-wider">
        Profile Photo
      </label>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-3.5 rounded-xl bg-[#181818] border border-[#303030]">
        <div className="relative shrink-0 self-start sm:self-center">
          <TrainerAvatar
            src={effectiveUrl}
            name={trainerName || 'Trainer'}
            size="lg"
            rounded="rounded-2xl"
            lazy={false}
          />
          {!hasPhoto && (
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#EB3E2E] text-white flex items-center justify-center border-2 border-[#181818]">
              <Camera className="w-3 h-3" />
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <p className="text-xs text-[#B8B8B8]">
            JPG, PNG or WEBP up to 5 MB. Automatically cropped and optimized to 400×400 WebP.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              disabled={disabled}
              className="hidden"
            />

            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#252525] hover:bg-[#303030] border border-[#3A3A3A] text-xs font-semibold text-white transition-colors disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5 text-[#EB3E2E]" />
              {hasPhoto ? 'Replace Photo' : 'Upload Photo'}
            </button>

            {hasPhoto && (
              <button
                type="button"
                disabled={disabled}
                onClick={handleRemoveClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-300 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            )}
          </div>

          {pendingFile && (
            <span className="text-[11px] text-emerald-400 truncate">
              Selected: {pendingFile.name} ({(pendingFile.size / 1024).toFixed(0)} KB)
            </span>
          )}
        </div>
      </div>

      {localError && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{localError}</span>
        </div>
      )}
    </div>
  );
}
