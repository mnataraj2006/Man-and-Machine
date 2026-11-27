import React, { createContext, useContext, useState, useEffect } from 'react';
import websiteService from '../services/websiteService.js';

const WebsiteContentContext = createContext({
  content: null,
  loading: false,
  refreshContent: () => {},
});

export function WebsiteContentProvider({ children }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadContent = async () => {
    try {
      setLoading(true);
      const res = await websiteService.getPublicContent();
      if (res?.content) {
        setContent(res.content);
      }
    } catch (_err) {
      // Components gracefully fall back to their default copy/assets
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  return (
    <WebsiteContentContext.Provider value={{ content, loading, refreshContent: loadContent }}>
      {children}
    </WebsiteContentContext.Provider>
  );
}

export function useWebsiteContent() {
  return useContext(WebsiteContentContext);
}
