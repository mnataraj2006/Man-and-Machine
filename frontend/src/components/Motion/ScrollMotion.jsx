import React, { useEffect, useRef, useState } from 'react';

export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Scroll-triggered visibility hook using IntersectionObserver.
 * Fires once when element enters the viewport.
 */
export function useInView(options = { threshold: 0.14, rootMargin: '0px 0px -40px 0px' }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setInView(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.unobserve(node);
      }
    }, options);

    observer.observe(node);
    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin]);

  return [ref, inView];
}

/**
 * Scroll-linked progress hook [0..1] as an element travels through the viewport.
 * Used for parallax, subtle image zoom, and scroll-driven horizontal storytelling.
 */
export function useScrollProgress(ref) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    let frameId = null;
    const update = () => {
      frameId = null;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const total = rect.height + vh;
      const current = vh - rect.top;
      const clamped = Math.max(0, Math.min(1, current / total));
      setProgress(clamped);
    };

    const onScroll = () => {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [ref]);

  return progress;
}

/**
 * Editorial scroll-triggered reveal wrapper matching Framer's exact curve:
 * duration: 0.6s, ease: [0.22, 1, 0.36, 1], translateY(18px) -> 0
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
  variant = 'up', // 'up' | 'mask' | 'fade' | 'image'
  as: Component = 'div',
  style = {},
}) {
  const [ref, inView] = useInView();

  if (variant === 'mask') {
    return (
      <Component ref={ref} className={`overflow-hidden ${className}`} style={style}>
        <div
          style={{
            transform: inView ? 'translateY(0)' : 'translateY(105%)',
            opacity: inView ? 1 : 0,
            transition: `transform 0.72s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
            willChange: 'transform, opacity',
          }}
        >
          {children}
        </div>
      </Component>
    );
  }

  if (variant === 'image') {
    return (
      <Component
        ref={ref}
        className={`overflow-hidden ${className}`}
        style={{
          ...style,
          clipPath: inView ? 'inset(0% 0% 0% 0%)' : 'inset(8% 0% 0% 0%)',
          opacity: inView ? 1 : 0,
          transition: `clip-path 0.85s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        }}
      >
        <div
          className="w-full h-full"
          style={{
            transform: inView ? 'scale(1)' : 'scale(1.06)',
            transition: `transform 1.05s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
            willChange: 'transform',
          }}
        >
          {children}
        </div>
      </Component>
    );
  }

  return (
    <Component
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: inView ? 1 : 0,
        transform: variant === 'fade' ? 'none' : inView ? 'translateY(0)' : 'translateY(18px)',
        transition: `opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </Component>
  );
}

/**
 * Eased Animated Counter triggered on viewport entry.
 */
export function AnimatedCounter({ target, suffix = '', duration = 1400, formatCommas = true }) {
  const [ref, inView] = useInView({ threshold: 0.2 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }

    let start = null;
    let rafId = null;

    const tick = (ts) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const t = Math.min(1, elapsed / duration);
      // easeOutQuart
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(Math.round(eased * target));
      if (t < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [inView, target, duration]);

  const formatted = formatCommas ? value.toLocaleString('en-IN') : String(value);

  return (
    <span ref={ref}>
      {formatted}
      {suffix}
    </span>
  );
}
