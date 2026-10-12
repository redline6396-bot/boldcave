import { api } from '@/lib/api';

export const MAX_PROMOTIONAL_IMAGE_BYTES = 5 * 1024 * 1024;
export const PROMOTIONAL_IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp';

const ALLOWED_TYPES = new Set(PROMOTIONAL_IMAGE_ACCEPT.split(','));

export function validatePromotionalImageFile(file) {
  if (!file) return 'Choose an image to upload.';
  if (!ALLOWED_TYPES.has(file.type)) return 'Use a JPG, PNG, or WebP image.';
  if (!file.size) return 'The selected image is empty.';
  if (file.size > MAX_PROMOTIONAL_IMAGE_BYTES) return 'Promotional images must be 5 MB or smaller.';
  return '';
}

export async function uploadPromotionalImage(file, onProgress) {
  const validationError = validatePromotionalImageFile(file);
  if (validationError) throw new Error(validationError);

  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/api/admin/promotional-images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      const total = event.total || file.size;
      const percent = total ? Math.min(95, Math.round((event.loaded / total) * 95)) : 0;
      onProgress?.(percent);
    },
  });
  onProgress?.(100);
  return response.data.data.image;
}

export async function deleteTemporaryPromotionalImage(publicId) {
  if (!publicId) return;
  await api.delete('/api/admin/promotional-images', { data: { publicId } });
}

export async function copyPromotionalImageToClipboard(imageUrl) {
  const response = await fetch(imageUrl, { mode: 'cors' });
  if (!response.ok) throw new Error('Unable to load the image for copying.');

  const sourceBlob = await response.blob();
  const bitmap = await window.createImageBitmap(sourceBlob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const pngBlob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Unable to prepare the image for copying.')),
      'image/png'
    );
  });

  if (!window.navigator?.clipboard?.write || !window.ClipboardItem) {
    throw new Error('Image copying is not supported in this browser.');
  }

  await window.navigator.clipboard.write([
    new window.ClipboardItem({ 'image/png': pngBlob }),
  ]);
}
