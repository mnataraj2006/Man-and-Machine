import React, { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^(https?:|blob:|data:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/uploads/')) return `${BACKEND_ORIGIN}${trimmed}`;
  return trimmed;
}

export function getInitials(name) {
  if (!name || typeof name !== 'string') return 'TR';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TR';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

const SIZE_CLASSES = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-20 h-20 text-2xl',
};

export default function TrainerAvatar({
  trainer,
  src,
  name,
  size = 'md',
  rounded = 'rounded-xl',
  className = '',
  lazy = true,
}) {
  const displayName = name || trainer?.name || 'Trainer';
  const rawUrl =
    src ||
    trainer?.profilePhoto?.url ||
    trainer?.profileImage ||
    trainer?.image ||
    '';
  const resolvedUrl = resolveMediaUrl(rawUrl);

  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [resolvedUrl]);

  const sizeCls = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const initials = getInitials(displayName);

  if (resolvedUrl && !imgFailed) {
    return (
      <div
        className={`${sizeCls} ${rounded} aspect-square overflow-hidden bg-[#181818] border border-[#303030] shrink-0 ${className}`}
      >
        <img
          src={resolvedUrl}
          alt={displayName}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover object-top"
        />
      </div>
    );
  }

  return (
    <div
      aria-label={displayName}
      title={displayName}
      className={`${sizeCls} ${rounded} aspect-square bg-[#1E1E1E] border border-[#303030] text-[#F5F5F5] font-bold flex items-center justify-center shrink-0 select-none ${className}`}
    >
      {initials}
    </div>
  );
}
