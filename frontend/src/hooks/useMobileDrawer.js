import { useEffect } from 'react';

/**
 * Shared mobile drawer behavior hook:
 * - Locks background page scroll (both <html> and <body>) while open and cleanly restores on close/unmount
 * - Closes on Escape key press
 * - Closes automatically when route changes or browser history navigation occurs
 * Safe under React Strict Mode.
 */
export function useMobileDrawer({ isOpen, onClose, currentPath }) {
  // 1. Body & root scroll lock while drawer is open
  useEffect(() => {
    if (!isOpen) return undefined;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyTouchAction = body.style.touchAction;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.touchAction = prevBodyTouchAction;
    };
  }, [isOpen]);

  // 2. Escape key listener
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 3. Auto-close when route path changes
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
    // Only trigger when currentPath changes, not when isOpen toggles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath]);

  // 4. Auto-close on browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      onClose();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onClose]);
}

export default useMobileDrawer;
