import React, { useState, useEffect, useRef } from 'react';
import { Play, X, Image as ImageIcon, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import websiteService from '../../services/websiteService.js';
import { useWebsiteContent } from '../../context/WebsiteContentContext.jsx';
import { resolveMediaUrl } from '../UI/TrainerAvatar.jsx';
import { Reveal } from '../Motion/ScrollMotion.jsx';

export function getVideoEmbedInfo(url) {
  if (!url || typeof url !== 'string') return { kind: 'none', src: '' };
  const trimmed = url.trim();

  // YouTube watch / share / shorts
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/
  );
  if (ytMatch) {
    return {
      kind: 'iframe',
      src: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0`,
    };
  }

  // Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return {
      kind: 'iframe',
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`,
    };
  }

  return { kind: 'video', src: resolveMediaUrl(trimmed) };
}

export default function GymGallerySection() {
  const { content } = useWebsiteContent();
  const galleryHeader = content?.gallerySection || {};

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(['ALL']);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [brokenIds, setBrokenIds] = useState(() => new Set());
  const videoRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const fetchGallery = async () => {
      try {
        setLoading(true);
        const res = await websiteService.getPublicGallery(activeCategory);
        if (!mounted) return;
        setItems(res.items || []);
        if (Array.isArray(res.categories) && res.categories.length > 0 && activeCategory === 'ALL') {
          setCategories(res.categories);
        }
      } catch (_err) {
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchGallery();
    return () => {
      mounted = false;
    };
  }, [activeCategory]);

  // Pause HTML5 video & support Escape / Left / Right in lightbox
  const closeLightbox = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setLightboxItem(null);
  };

  useEffect(() => {
    if (!lightboxItem) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const idx = items.findIndex((i) => i._id === lightboxItem._id);
        if (idx >= 0 && items.length > 1) {
          const nextIdx =
            e.key === 'ArrowRight'
              ? (idx + 1) % items.length
              : (idx - 1 + items.length) % items.length;
          if (videoRef.current) videoRef.current.pause();
          setLightboxItem(items[nextIdx]);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxItem, items]);

  const markBroken = (id) => {
    setBrokenIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const featuredItems = items.filter((i) => i.featured);
  const regularItems = items.filter((i) => !i.featured);
  const orderedItems = [...featuredItems, ...regularItems];

  return (
    <section
      id="progress"
      className="relative w-full max-w-[1440px] mx-auto px-6 md:px-14 py-16 sm:py-20 lg:py-[100px] scroll-mt-20"
    >
      <div className="flex flex-col items-start gap-8">
        {/* Header */}
        <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col items-start gap-4">
            <Reveal delay={0}>
              <p className="font-editorial-label text-[#EB3E2E]">
                {galleryHeader.sectionLabel || '08 / INSIDE THE GYM'}
              </p>
            </Reveal>
            <Reveal variant="mask" delay={80}>
              <h2
                className="font-editorial-display font-semibold uppercase text-[#F5F5F5]"
                style={{ fontSize: 'clamp(2.75rem, 5vw, 4.5rem)' }}
              >
                {galleryHeader.headline || 'GYM GALLERY.'}
              </h2>
            </Reveal>
            {galleryHeader.subheadline && (
              <p className="font-editorial-body text-[#B8B8B8] text-[15px] max-w-xl">
                {galleryHeader.subheadline}
              </p>
            )}
          </div>

          {/* Category Filter Pills */}
          {categories.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-[#EB3E2E] border-[#EB3E2E] text-white font-bold'
                      : 'bg-[#111111] border-[#303030] text-[#B8B8B8] hover:text-white hover:border-[#555]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className={`h-[320px] sm:h-[360px] bg-[#141414] border border-[#252525] animate-pulse ${
                  idx < 2 ? 'lg:col-span-1' : ''
                }`}
              />
            ))}
          </div>
        ) : orderedItems.length === 0 ? (
          <div className="w-full py-16 px-6 rounded-xl bg-[#111111] border border-[#252525] text-center flex flex-col items-center gap-3">
            <ImageIcon className="w-8 h-8 text-[#555555]" />
            <p className="text-sm text-[#B8B8B8]">No gallery media available in this category yet.</p>
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            {orderedItems.map((item, idx) => {
              const isFeaturedCard = item.featured && idx < 2;
              const colSpan = isFeaturedCard ? 'lg:col-span-6' : 'lg:col-span-4';
              const heightCls = isFeaturedCard
                ? 'h-[340px] sm:h-[400px] lg:h-[430px]'
                : 'h-[280px] sm:h-[320px]';
              const isVideo = item.type === 'VIDEO';
              const previewUrl = resolveMediaUrl(isVideo ? item.thumbnailUrl : item.mediaUrl);
              const isBroken = brokenIds.has(item._id);

              return (
                <div
                  key={item._id}
                  onClick={() => setLightboxItem(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setLightboxItem(item);
                    }
                  }}
                  className={`group relative w-full ${colSpan} ${heightCls} border border-[#303030]/70 bg-[#141414] overflow-hidden cursor-pointer flex flex-col justify-end p-5 transition-colors hover:border-[#EB3E2E]/60`}
                >
                  {previewUrl && !isBroken ? (
                    <img
                      src={previewUrl}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      onError={() => markBroken(item._id)}
                      className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#181818] text-[#666] gap-2">
                      {isVideo ? <Play className="w-10 h-10 text-[#EB3E2E]" /> : <ImageIcon className="w-10 h-10" />}
                      <span className="text-[11px] font-mono uppercase">{item.category}</span>
                    </div>
                  )}

                  {/* Contrast Gradient */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(11,11,11,0.12) 0%, rgba(11,11,11,0.45) 55%, rgba(11,11,11,0.92) 100%)',
                    }}
                  />

                  {/* Top Badges */}
                  <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 bg-[#0b0b0bcc] border border-[#303030] text-[10px] font-mono uppercase tracking-wider text-[#F5F5F5]">
                      {item.category}
                    </span>
                    {item.featured && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EB3E2E]/90 text-[10px] font-mono uppercase tracking-wider text-white font-bold">
                        <Sparkles className="w-3 h-3" />
                        FEATURED
                      </span>
                    )}
                  </div>

                  {/* Video Play Overlay */}
                  {isVideo && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                      <div className="w-14 h-14 rounded-full bg-[#EB3E2E]/90 group-hover:bg-[#EB3E2E] text-white flex items-center justify-center shadow-xl transition-transform duration-300 group-hover:scale-110">
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      </div>
                    </div>
                  )}

                  {/* Caption */}
                  <div className="relative z-10 flex flex-col gap-1">
                    <h3 className="font-editorial-display font-semibold text-xl sm:text-2xl text-[#F5F5F5] uppercase tracking-tight leading-tight">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-[#CCCCCC] line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Philosophy Footer Note */}
        <Reveal delay={180} className="max-w-[620px]">
          <p className="font-editorial-body text-[#B8B8B8] text-[15px] md:text-[16px]">
            {galleryHeader.footerNote ||
              'Not a before and after. A commitment to strength, confidence and the discipline to keep going.'}
          </p>
        </Reveal>
      </div>

      {/* Lightbox Modal */}
      {lightboxItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightboxItem.title}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          onClick={closeLightbox}
        >
          <div
            className="relative w-full max-w-4xl bg-[#111111] border border-[#303030] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#252525]">
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase text-[#EB3E2E] font-bold">
                  {lightboxItem.category} • {lightboxItem.type}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white uppercase truncate">
                  {lightboxItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeLightbox}
                aria-label="Close gallery preview"
                className="w-10 h-10 rounded-lg bg-[#181818] border border-[#303030] text-[#B8B8B8] hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-black flex items-center justify-center max-h-[72vh] min-h-[280px]">
              {lightboxItem.type === 'VIDEO' ? (
                (() => {
                  const embed = getVideoEmbedInfo(lightboxItem.mediaUrl);
                  if (embed.kind === 'iframe') {
                    return (
                      <iframe
                        src={embed.src}
                        title={lightboxItem.title}
                        className="w-full aspect-video max-h-[70vh]"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                      />
                    );
                  }
                  return (
                    <video
                      ref={videoRef}
                      src={embed.src}
                      poster={resolveMediaUrl(lightboxItem.thumbnailUrl)}
                      controls
                      playsInline
                      className="w-full max-h-[70vh] object-contain"
                    />
                  );
                })()
              ) : (
                <img
                  src={resolveMediaUrl(lightboxItem.mediaUrl)}
                  alt={lightboxItem.title}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              )}

              {items.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous media"
                    onClick={() => {
                      const idx = items.findIndex((i) => i._id === lightboxItem._id);
                      const prev = items[(idx - 1 + items.length) % items.length];
                      if (videoRef.current) videoRef.current.pause();
                      setLightboxItem(prev);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 border border-[#303030] text-white flex items-center justify-center hover:bg-[#EB3E2E] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next media"
                    onClick={() => {
                      const idx = items.findIndex((i) => i._id === lightboxItem._id);
                      const next = items[(idx + 1) % items.length];
                      if (videoRef.current) videoRef.current.pause();
                      setLightboxItem(next);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 border border-[#303030] text-white flex items-center justify-center hover:bg-[#EB3E2E] transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {lightboxItem.description && (
              <div className="px-5 py-3.5 border-t border-[#252525] text-xs text-[#CCCCCC]">
                {lightboxItem.description}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
