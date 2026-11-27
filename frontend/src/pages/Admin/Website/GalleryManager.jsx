import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Star,
  ArrowUp,
  ArrowDown,
  Save,
  Upload,
  Play,
  Image as ImageIcon,
  Film,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import websiteService from '../../../services/websiteService.js';
import { resolveMediaUrl } from '../../../components/UI/TrainerAvatar.jsx';
import { getVideoEmbedInfo } from '../../../components/Editorial/GymGallerySection.jsx';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const DEFAULT_CATEGORIES = ['GYM', 'EQUIPMENT', 'TRAINING', 'TRAINERS', 'EVENTS', 'CLASSES', 'OTHER'];

export default function GalleryManager() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);

  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [orderDirty, setOrderDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    type: 'PHOTO',
    title: '',
    description: '',
    category: 'GYM',
    displayOrder: 1,
    featured: false,
    active: true,
    mediaUrl: '',
    thumbnailUrl: '',
    durationSeconds: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [thumbFile, setThumbFile] = useState(null);
  const [fileMeta, setFileMeta] = useState(null); // { previewUrl, name, type, width, height, sizeBytes }

  // Preview & Delete Confirm
  const [previewItem, setPreviewItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const showNotice = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const fetchGallery = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await websiteService.getAdminGallery({
        category: filterCategory,
        type: filterType,
        status: filterStatus,
      });
      setItems(res.items || []);
      if (Array.isArray(res.categories) && res.categories.length > 0) {
        setCategories(res.categories);
      }
      setOrderDirty(false);
    } catch (err) {
      setError(err.message || 'Failed to load gallery media.');
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterType, filterStatus]);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  useEffect(() => {
    return () => {
      if (fileMeta?.previewUrl) URL.revokeObjectURL(fileMeta.previewUrl);
    };
  }, [fileMeta]);

  const handleImagePick = (file, target = 'image') => {
    setFormError('');
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(String(file.type || '').toLowerCase())) {
      setFormError('Unsupported image format. Please choose JPG, PNG, or WEBP.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFormError('Image exceeds the maximum allowed size of 10 MB.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      if (target === 'image') {
        setImageFile(file);
      } else {
        setThumbFile(file);
      }
      setFileMeta({
        previewUrl,
        name: file.name,
        type: file.type,
        width: img.naturalWidth,
        height: img.naturalHeight,
        sizeBytes: file.size,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      setFormError('Selected file could not be decoded as a valid image.');
    };
    img.src = previewUrl;
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormError('');
    setImageFile(null);
    setThumbFile(null);
    setFileMeta(null);
    setForm({
      type: 'PHOTO',
      title: '',
      description: '',
      category: 'GYM',
      displayOrder: items.length + 1,
      featured: false,
      active: true,
      mediaUrl: '',
      thumbnailUrl: '',
      durationSeconds: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormError('');
    setImageFile(null);
    setThumbFile(null);
    setFileMeta(null);
    setForm({
      type: item.type || 'PHOTO',
      title: item.title || '',
      description: item.description || '',
      category: item.category || 'GYM',
      displayOrder: item.displayOrder ?? 1,
      featured: Boolean(item.featured),
      active: item.active !== false,
      mediaUrl: item.mediaUrl || '',
      thumbnailUrl: item.thumbnailUrl || '',
      durationSeconds: item.durationSeconds || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (form.type === 'PHOTO' && !editingItem && !imageFile) {
      setFormError('Please upload a JPG, PNG, or WEBP image.');
      return;
    }
    if (form.type === 'VIDEO' && !form.mediaUrl.trim()) {
      setFormError('Please provide a valid Video URL.');
      return;
    }

    const fd = new FormData();
    fd.append('type', form.type);
    fd.append('title', form.title.trim());
    fd.append('description', form.description.trim());
    fd.append('category', form.category);
    fd.append('displayOrder', String(form.displayOrder || 1));
    fd.append('featured', String(Boolean(form.featured)));
    fd.append('active', String(Boolean(form.active)));
    if (form.type === 'VIDEO') {
      fd.append('mediaUrl', form.mediaUrl.trim());
      if (form.thumbnailUrl.trim()) fd.append('thumbnailUrl', form.thumbnailUrl.trim());
      if (form.durationSeconds) fd.append('durationSeconds', String(form.durationSeconds));
      if (thumbFile) fd.append('thumbnail', thumbFile);
    } else if (imageFile) {
      fd.append('image', imageFile);
    }

    try {
      setSubmitting(true);
      if (editingItem) {
        await websiteService.updateGalleryMedia(editingItem._id, fd);
        showNotice('success', 'Gallery item updated.');
      } else {
        await websiteService.createGalleryMedia(fd);
        showNotice('success', 'Media added to Gym Gallery.');
      }
      setModalOpen(false);
      await fetchGallery();
    } catch (err) {
      setFormError(err.message || 'Failed to save gallery media.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (item, field) => {
    try {
      await websiteService.toggleGalleryStatus(item._id, {
        [field]: !item[field],
      });
      await fetchGallery();
    } catch (err) {
      showNotice('error', err.message || 'Failed to update status.');
    }
  };

  const moveItem = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const copy = [...items];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setItems(copy.map((it, idx) => ({ ...it, displayOrder: idx + 1 })));
    setOrderDirty(true);
  };

  const handleSaveOrder = async () => {
    try {
      setSavingOrder(true);
      await websiteService.reorderGallery(items.map((i) => i._id));
      setOrderDirty(false);
      showNotice('success', 'Gallery display order saved.');
      await fetchGallery();
    } catch (err) {
      showNotice('error', err.message || 'Failed to save display order.');
    } finally {
      setSavingOrder(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await websiteService.deleteGalleryMedia(deleteTarget._id);
      setDeleteTarget(null);
      showNotice('success', 'Gallery item deleted.');
      await fetchGallery();
    } catch (err) {
      showNotice('error', err.message || 'Failed to delete gallery item.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono text-[#EB3E2E] uppercase tracking-wider font-bold">
            WEBSITE / GYM GALLERY
          </span>
          <h1
            className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            GYM GALLERY MANAGER.
          </h1>
          <p className="text-xs text-[#B8B8B8]">
            Add, reorder, feature, or hide gym photos and videos displayed on the public website.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {orderDirty && (
            <button
              type="button"
              disabled={savingOrder}
              onClick={handleSaveOrder}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider"
            >
              <Save className="w-4 h-4" />
              {savingOrder ? 'Saving...' : 'Save Order'}
            </button>
          )}
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(235,62,46,0.25)]"
          >
            <Plus className="w-4 h-4" />
            Add Media
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-[#111111] p-4 rounded-2xl border border-[#252525]">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="mm-select min-h-[40px] text-xs"
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="mm-select min-h-[40px] text-xs"
        >
          <option value="ALL">All Types</option>
          <option value="PHOTO">PHOTO</option>
          <option value="VIDEO">VIDEO</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="mm-select min-h-[40px] text-xs"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">HIDDEN</option>
        </select>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl bg-[#111111] border border-[#252525] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#858585]">Loading gallery items...</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center gap-2 text-xs text-[#858585]">
            <ImageIcon className="w-8 h-8 text-[#444]" />
            <span>No gallery media items found. Click "+ Add Media" to get started.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#252525] text-[10px] font-mono uppercase text-[#858585] bg-[#161616]">
                  <th className="py-3.5 px-4">Preview</th>
                  <th className="py-3.5 px-4">Title</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Order</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202020] text-xs">
                {items.map((item, idx) => {
                  const thumb = resolveMediaUrl(item.type === 'VIDEO' ? item.thumbnailUrl : item.mediaUrl);
                  return (
                    <tr key={item._id} className="hover:bg-[#161616] transition-colors">
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="relative w-16 h-11 rounded-lg overflow-hidden bg-[#181818] border border-[#303030] flex items-center justify-center group"
                        >
                          {thumb ? (
                            <img src={thumb} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <Film className="w-5 h-5 text-[#EB3E2E]" />
                          )}
                          {item.type === 'VIDEO' && (
                            <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Play className="w-4 h-4 text-white fill-current" />
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{item.title}</div>
                        {item.description && (
                          <div className="text-[11px] text-[#858585] max-w-xs truncate">{item.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#B8B8B8]">{item.type}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-[#202020] border border-[#303030] font-mono text-[10px] text-[#F5F5F5]">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggle(item, 'active')}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              item.active
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-[#202020] text-[#858585] border border-[#303030]'
                            }`}
                          >
                            {item.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {item.active ? 'ACTIVE' : 'HIDDEN'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggle(item, 'featured')}
                            title={item.featured ? 'Unfeature' : 'Set Featured'}
                            className={`p-1.5 rounded-lg border ${
                              item.featured
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                : 'bg-[#181818] border-[#303030] text-[#666] hover:text-white'
                            }`}
                          >
                            <Star className={`w-3.5 h-3.5 ${item.featured ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1">
                          <span className="font-mono text-white w-6 text-center">{item.displayOrder}</span>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveItem(idx, -1)}
                            className="p-1 rounded bg-[#181818] border border-[#303030] text-[#B8B8B8] hover:text-white disabled:opacity-30"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === items.length - 1}
                            onClick={() => moveItem(idx, 1)}
                            className="p-1 rounded bg-[#181818] border border-[#303030] text-[#B8B8B8] hover:text-white disabled:opacity-30"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-2 rounded-lg bg-[#181818] hover:bg-[#252525] border border-[#303030] text-[#B8B8B8] hover:text-white"
                            aria-label={`Edit ${item.title}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300"
                            aria-label={`Delete ${item.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#252525] flex items-center justify-between">
              <h3 className="text-base font-bold uppercase text-white">
                {editingItem ? 'Edit Gallery Media' : 'Add Gallery Media'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-[#858585] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {!editingItem && (
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#B8B8B8] mb-1.5">Media Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['PHOTO', 'VIDEO'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, type: t });
                          setFormError('');
                        }}
                        className={`py-2.5 rounded-xl border font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${
                          form.type === t
                            ? 'bg-[#EB3E2E] border-[#EB3E2E] text-white'
                            : 'bg-[#111111] border-[#303030] text-[#B8B8B8]'
                        }`}
                      >
                        {t === 'PHOTO' ? <ImageIcon className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {form.type === 'PHOTO' ? (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase text-[#B8B8B8]">
                    {editingItem ? 'Replace Image (Optional)' : 'Upload Image *'}
                  </label>
                  <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-[#111111] border border-dashed border-[#3A3A3A] hover:border-[#EB3E2E] cursor-pointer">
                    <Upload className="w-5 h-5 text-[#EB3E2E]" />
                    <span className="text-[#B8B8B8]">Choose JPG, PNG, or WEBP (max 10 MB)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => handleImagePick(e.target.files?.[0], 'image')}
                      className="hidden"
                    />
                  </label>
                  {fileMeta && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#111111] border border-[#252525]">
                      <img src={fileMeta.previewUrl} alt="Preview" className="w-16 h-12 object-cover rounded-lg" />
                      <div className="text-[11px] text-[#B8B8B8] space-y-0.5 min-w-0">
                        <div className="text-white font-semibold truncate">{fileMeta.name}</div>
                        <div>
                          {fileMeta.type} • {fileMeta.width} × {fileMeta.height} • {(fileMeta.sizeBytes / 1024).toFixed(0)} KB
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#B8B8B8] mb-1">
                      Video URL (YouTube, Vimeo, or MP4 URL) *
                    </label>
                    <input
                      type="url"
                      required
                      value={form.mediaUrl}
                      onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=... or https://.../video.mp4"
                      className="mm-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#B8B8B8] mb-1">
                      Poster / Thumbnail Image (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => handleImagePick(e.target.files?.[0], 'thumbnail')}
                      className="mm-input w-full py-2"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#B8B8B8] mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="mm-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#B8B8B8] mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="mm-select w-full"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#B8B8B8] mb-1">Short Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mm-input w-full"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 items-center">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#B8B8B8] mb-1">Display Order</label>
                  <input
                    type="number"
                    min={1}
                    value={form.displayOrder}
                    onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                    className="mm-input w-full"
                  />
                </div>
                <label className="flex items-center gap-2 pt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  />
                  <span className="text-[#F5F5F5] font-semibold">Featured</span>
                </label>
                <label className="flex items-center gap-2 pt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  />
                  <span className="text-[#F5F5F5] font-semibold">Active</span>
                </label>
              </div>

              {formError && <p className="text-xs text-rose-400">{formError}</p>}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#252525]">
                <button type="button" onClick={() => setModalOpen(false)} className="mm-btn-secondary rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="mm-btn-primary rounded-lg">
                  {submitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Media'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="max-w-3xl w-full bg-[#111111] border border-[#303030] rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[#252525] flex items-center justify-between">
              <span className="font-bold text-white text-sm">{previewItem.title}</span>
              <button type="button" onClick={() => setPreviewItem(null)} className="text-[#858585] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-black flex items-center justify-center max-h-[70vh]">
              {previewItem.type === 'VIDEO' ? (
                (() => {
                  const emb = getVideoEmbedInfo(previewItem.mediaUrl);
                  return emb.kind === 'iframe' ? (
                    <iframe src={emb.src} title={previewItem.title} className="w-full aspect-video" allowFullScreen />
                  ) : (
                    <video src={emb.src} controls className="max-h-[70vh] w-full" />
                  );
                })()
              ) : (
                <img src={resolveMediaUrl(previewItem.mediaUrl)} alt={previewItem.title} className="max-h-[70vh] object-contain" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="max-w-sm w-full bg-[#181818] border border-[#303030] rounded-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white uppercase">Delete Gallery Item?</h3>
            <p className="text-xs text-[#B8B8B8]">
              Are you sure you want to delete <strong className="text-white">{deleteTarget.title}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="mm-btn-secondary rounded-lg text-xs">
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
