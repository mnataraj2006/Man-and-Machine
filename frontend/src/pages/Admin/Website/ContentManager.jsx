import React, { useState, useEffect } from 'react';
import { Save, Upload, CheckCircle2, AlertCircle, Globe } from 'lucide-react';
import websiteService from '../../../services/websiteService.js';
import { resolveMediaUrl } from '../../../components/UI/TrainerAvatar.jsx';

const SECTIONS = [
  { key: 'hero', label: 'Hero', hasImage: true, imageKey: 'backgroundImageUrl' },
  { key: 'about', label: 'About', hasImage: true, imageKey: 'imageUrl' },
  { key: 'facilities', label: 'Facilities', hasImage: true, imageKey: 'imageUrl' },
  { key: 'community', label: 'Community', hasImage: true, imageKey: 'imageUrl' },
  { key: 'gallerySection', label: 'Gallery Header', hasImage: false },
  { key: 'trainersSection', label: 'Trainers Header', hasImage: false },
  { key: 'membershipSection', label: 'Membership Header', hasImage: false },
  { key: 'cta', label: 'Final CTA', hasImage: true, imageKey: 'backgroundImageUrl' },
  { key: 'footer', label: 'Footer', hasImage: false },
];

export default function ContentManager() {
  const [content, setContent] = useState(null);
  const [activeTab, setActiveTab] = useState('hero');
  const [formState, setFormState] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await websiteService.getAdminContent();
        setContent(res.content);
        setFormState(res.content?.[activeTab] || {});
      } catch (err) {
        setFeedback({ type: 'error', message: err.message || 'Failed to load website content.' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (content) {
      setFormState(content[activeTab] || {});
      setImageFile(null);
      setPreviewUrl('');
    }
  }, [activeTab, content]);

  const activeMeta = SECTIONS.find((s) => s.key === activeTab) || SECTIONS[0];

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setFeedback(null);
      const res = await websiteService.updateContentSection(activeTab, formState, imageFile);
      setContent(res.content);
      setImageFile(null);
      setPreviewUrl('');
      setFeedback({ type: 'success', message: `${activeMeta.label} section saved and published.` });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save section.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-xs text-[#858585]">Loading Website Content Management...</div>;
  }

  const currentImage =
    previewUrl || (activeMeta.imageKey ? resolveMediaUrl(formState[activeMeta.imageKey]) : '');

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
          WEBSITE / CONTENT MANAGEMENT
        </span>
        <h1
          className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight"
          style={{ fontFamily: "'Oswald', sans-serif" }}
        >
          WEBSITE CONTENT MANAGER.
        </h1>
        <p className="text-xs text-[#B8B8B8]">
          Edit public website headlines, copy, CTAs, and section images without redeploying code.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2 bg-[#111111] p-3 rounded-2xl border border-[#252525]">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setActiveTab(s.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === s.key
                ? 'bg-[#EB3E2E] text-white'
                : 'bg-[#181818] text-[#B8B8B8] hover:text-white border border-[#303030]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="p-6 rounded-2xl bg-[#111111] border border-[#252525] space-y-5 text-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-[#252525]">
          <Globe className="w-4 h-4 text-[#EB3E2E]" />
          <h2 className="text-sm font-bold uppercase text-white">{activeMeta.label} Section</h2>
        </div>

        {activeMeta.hasImage && (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase text-[#B8B8B8]">Section Image</label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-[#181818] border border-[#303030]">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={activeMeta.label}
                  className="w-36 h-24 object-cover rounded-lg border border-[#303030]"
                />
              ) : (
                <div className="w-36 h-24 rounded-lg bg-[#111111] border border-[#303030] flex items-center justify-center text-[#666]">
                  No image
                </div>
              )}
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#252525] hover:bg-[#303030] border border-[#3A3A3A] text-white font-semibold cursor-pointer self-start">
                <Upload className="w-4 h-4 text-[#EB3E2E]" />
                <span>Replace Section Image</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setImageFile(f);
                    setPreviewUrl(URL.createObjectURL(f));
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(formState)
            .filter(([k]) => !k.endsWith('StorageKey') && !k.endsWith('ImageUrl') && k !== 'imageUrl')
            .map(([k, val]) => (
              <div key={k} className={String(val || '').length > 60 ? 'sm:col-span-2' : ''}>
                <label className="block text-[11px] font-bold uppercase text-[#B8B8B8] mb-1">
                  {k.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                {String(val || '').length > 60 ? (
                  <textarea
                    rows={3}
                    value={val || ''}
                    onChange={(e) => setFormState({ ...formState, [k]: e.target.value })}
                    className="mm-input w-full"
                  />
                ) : (
                  <input
                    type="text"
                    value={val || ''}
                    onChange={(e) => setFormState({ ...formState, [k]: e.target.value })}
                    className="mm-input w-full"
                  />
                )}
              </div>
            ))}
        </div>

        <div className="flex justify-end pt-3 border-t border-[#252525]">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white font-bold uppercase tracking-wider"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : `Publish ${activeMeta.label}`}
          </button>
        </div>
      </form>
    </div>
  );
}
