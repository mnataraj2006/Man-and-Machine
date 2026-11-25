import React from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  className = '',
  ...props
}) {
  const sizes = {
    sm: 'px-3.5 py-2 text-[11px]',
    md: 'px-5 py-2.5 text-xs',
    lg: 'px-6 py-3.5 text-xs',
  };

  const variants = {
    primary:
      'bg-[#EB3E2E] hover:bg-[#FF493B] text-white border border-transparent shadow-sm hover:-translate-y-0.5',
    secondary:
      'bg-[#181818] hover:bg-[#202020] text-[#F5F5F5] border border-[#303030] hover:border-[#EB3E2E] hover:-translate-y-0.5',
    danger:
      'bg-red-950/60 hover:bg-[#EB3E2E] text-red-200 hover:text-white border border-red-500/40',
    ghost:
      'bg-transparent hover:bg-[#181818] text-[#B8B8B8] hover:text-[#F5F5F5] border border-transparent',
  };

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 font-bold uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#EB3E2E]/40 ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, elevated = false, className = '', ...props }) {
  return (
    <div
      {...props}
      className={`rounded-xl border border-[#303030] ${
        elevated ? 'bg-[#202020]' : 'bg-[#181818]'
      } transition-colors duration-200 ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions, className = '' }) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#252525] ${className}`}
    >
      <div className="flex flex-col gap-1.5">
        {eyebrow && (
          <span className="font-label text-[#EB3E2E]">{eyebrow}</span>
        )}
        <h1 className="mm-page-title text-2xl sm:text-3xl">{title}</h1>
        {subtitle && (
          <p className="text-sm text-[#B8B8B8]">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-[#B8B8B8]">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`mm-input ${error ? 'border-[#EB3E2E]' : ''} ${className}`}
      />
      {error && <span className="text-xs text-[#EB3E2E]">{error}</span>}
    </div>
  );
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-[#B8B8B8]">
          {label}
        </label>
      )}
      <select
        {...props}
        className={`mm-select ${error ? 'border-[#EB3E2E]' : ''} ${className}`}
      >
        {children}
      </select>
      {error && <span className="text-xs text-[#EB3E2E]">{error}</span>}
    </div>
  );
}

export function Badge({ children, tone = 'neutral', className = '' }) {
  const tones = {
    red: 'bg-[#EB3E2E]/15 text-[#EB3E2E] border-[#EB3E2E]/40',
    neutral: 'bg-[#202020] text-[#B8B8B8] border-[#303030]',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    danger: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-lg' }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} bg-[#181818] border border-[#303030] rounded-xl shadow-2xl overflow-hidden mm-page-enter`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 bg-[#111111] border-b border-[#252525] flex items-center justify-between gap-4">
          <div>
            <h3 className="mm-page-title text-lg sm:text-xl">{title}</h3>
            {subtitle && <p className="text-xs text-[#858585] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white border border-[#303030] cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="bg-[#181818] border border-[#303030] rounded-xl p-10 flex flex-col items-center justify-center text-center gap-3">
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-[#202020] border border-[#303030] flex items-center justify-center text-[#EB3E2E]">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="mm-page-title text-lg">{title}</h3>
      {description && <p className="text-sm text-[#B8B8B8] max-w-md">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function LoadingSkeleton({ rows = 3, height = 'h-20' }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className={`w-full ${height} rounded-xl bg-[#181818] border border-[#252525] animate-pulse`}
        />
      ))}
    </div>
  );
}

export function Pagination({ page, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#252525]">
      <span className="text-xs text-[#858585]">
        Page <strong className="text-[#F5F5F5]">{page}</strong> of {totalPages}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="p-2 rounded-lg bg-[#181818] border border-[#303030] text-[#B8B8B8] hover:text-white disabled:opacity-40 cursor-pointer"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-3 py-1.5 rounded-lg bg-[#EB3E2E] text-white text-xs font-bold">
          {page}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="p-2 rounded-lg bg-[#181818] border border-[#303030] text-[#B8B8B8] hover:text-white disabled:opacity-40 cursor-pointer"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
