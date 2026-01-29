// Centralized file validation utilities: type and size rules
// Reads size limits from env vars with sensible defaults.

import { getAcceptAttribute, formatFileSize } from './fileFormatters';

const MB = 1024 * 1024;

const DEFAULT_LIMITS_MB = {
  Image: 25, // images up to 25 MB
  Video: 500, // videos up to 500 MB
  Audio: 100, // audio up to 100 MB
  Animation: 50, // animated images (gif/webp) up to 50 MB
};

// Resolve max size in bytes for a category using env override then default
export function getMaxBytesForCategory(category) {
  const key = `REACT_APP_MAX_${category.toUpperCase()}_MB`;
  const fromEnv = Number(process.env[key]);
  const mb = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_LIMITS_MB[category] ?? DEFAULT_LIMITS_MB.Image;
  return mb * MB;
}

// Detect logical category by extension/MIME
export function detectCategory(file) {
  const name = (file?.name || '').toLowerCase();
  const type = (file?.type || '').toLowerCase();

  // Expanded format lists matching getAcceptAttribute
  const isVideo = type.startsWith('video/') || /(\.)(mp4|mov|webm|avi|mkv|wmv|flv|m4v|mpeg|mpg)$/i.test(name);
  if (isVideo) return 'Video';
  
  const isAudio = type.startsWith('audio/') || /(\.)(mp3|wav|ogg|aac|m4a|flac|aiff|aif)$/i.test(name);
  if (isAudio) return 'Audio';
  
  // Check for animations (only GIF and APNG can be reliably detected by extension)
  // WebP should be treated as a regular image - animated WebP detection requires reading file contents
  const isAnim = /(\.)(gif|apng)$/i.test(name);
  if (isAnim) return 'Animation';
  
  // Expanded image formats including HEIC/HEIF
  const isImage = type.startsWith('image/') || /(\.)(jpg|jpeg|png|webp|svg|avif|bmp|heic|heif|tiff|tif)$/i.test(name);
  if (isImage) return 'Image';
  
  return null;
}

// NEW: detect category from URL by extension
export function detectCategoryFromUrl(url) {
  try {
    const clean = String(url).split('?')[0].toLowerCase();
    if (/\.(mp4|mov|webm|avi|mkv|wmv|flv|m4v|mpeg|mpg)$/.test(clean)) return 'Video';
    if (/\.(mp3|wav|ogg|aac|m4a|flac|aiff|aif)$/.test(clean)) return 'Audio';
    // Only GIF and APNG are animations by extension
    if (/\.(gif|apng)$/.test(clean)) return 'Animation';
    // WebP is treated as a regular image
    if (/\.(jpg|jpeg|png|webp|svg|avif|bmp|heic|heif|tiff|tif)$/.test(clean)) return 'Image';
  } catch {}
  return null;
}

function parseAcceptList(acceptString) {
  if (!acceptString) return [];
  return acceptString
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

function isTypeAllowedByAccept(file, acceptList) {
  if (!acceptList?.length) return true; // no restriction
  const name = (file?.name || '').toLowerCase();
  const type = (file?.type || '').toLowerCase();

  // 1) extension match (e.g. .png)
  if (acceptList.some(a => a.startsWith('.') && name.endsWith(a))) return true;

  // 2) mime group (e.g. image/*)
  if (acceptList.some(a => a.endsWith('/*') && type.startsWith(a.slice(0, -1)))) return true;

  // 3) exact mime (e.g. image/png)
  if (acceptList.some(a => a && !a.startsWith('.') && !a.endsWith('/*') && a === type)) return true;

  return false;
}

export function validateFile(file, activeTab = 'All') {
  if (!file) return { ok: false, code: 'no_file', reason: 'file not found' };

  // Determine allowed types for the current tab
  const acceptForTab = getAcceptAttribute(activeTab);
  const acceptForAll = getAcceptAttribute('All');
  const acceptListForTab = parseAcceptList(acceptForTab);
  const acceptListAll = parseAcceptList(acceptForAll);

  // Check type against tab rules
  const allowed = activeTab === 'All'
    ? isTypeAllowedByAccept(file, acceptListAll)
    : isTypeAllowedByAccept(file, acceptListForTab);

  if (!allowed) {
    return { ok: false, code: 'type_not_allowed', reason: `invalid type for tab "${activeTab}"` };
  }

  // Determine category and apply size limits
  let category = activeTab === 'All' ? detectCategory(file) : activeTab;
  
  // Special handling for Animation files - treat as valid media
  // Use Animation size limits but allow them in Image contexts
  if (category === 'Animation') {
    // Animation files are valid media files
    const maxBytes = getMaxBytesForCategory('Animation');
    if (Number.isFinite(file.size) && file.size > maxBytes) {
      return {
        ok: false,
        code: 'too_large',
        reason: `exceeds limit ${formatFileSize(maxBytes)}`,
      };
    }
    return { ok: true };
  }
  
  const maxBytes = getMaxBytesForCategory(category || 'Image');
  if (Number.isFinite(file.size) && file.size > maxBytes) {
    return {
      ok: false,
      code: 'too_large',
      reason: `exceeds limit ${formatFileSize(maxBytes)}`,
    };
  }

  return { ok: true };
}