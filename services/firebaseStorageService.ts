import { ref, uploadBytes, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB aligned with storage.rules

export type StorageFolder = 'avatars' | 'banners' | 'creator';

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-]/g, '_').slice(0, 80) || `asset_${Date.now()}.png`;
}

export const firebaseStorageService = {
  /**
   * Uploads an image File or Blob to Firebase Storage under users/{userId}/{folder}/{fileName}
   * and returns the public download URL.
   */
  async uploadImageFile(
    userId: string,
    folder: StorageFolder,
    file: File | Blob,
    preferredName?: string
  ): Promise<string> {
    if (!userId) {
      throw new Error('Authentication required for Storage upload.');
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error('Image exceeds the 5MB upload limit.');
    }
    const contentType = file.type || 'image/png';
    if (!contentType.startsWith('image/')) {
      throw new Error('Only image files are permitted.');
    }

    const rawName = preferredName || (file instanceof File ? file.name : `upload_${Date.now()}.png`);
    const fileId = `${Date.now()}_${sanitizeFileName(rawName)}`;
    const storagePath = `users/${userId}/${folder}/${fileId}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, file, { contentType });
    return await getDownloadURL(storageRef);
  },

  /**
   * Uploads a base64 data URL (e.g., generated AI image or DataURL crop) to Firebase Storage.
   * Returns an HTTP(S) download URL so Firestore documents stay small and performant.
   */
  async uploadDataUrl(
    userId: string,
    folder: StorageFolder,
    dataUrl: string,
    filePrefix = 'nexora_asset'
  ): Promise<string> {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      return dataUrl;
    }
    if (!userId) {
      throw new Error('Authentication required for Storage upload.');
    }

    const mimeMatch = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.\-]+);base64,/);
    const contentType = mimeMatch ? mimeMatch[1] : 'image/png';
    const ext = contentType.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'png';
    const fileId = `${filePrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const storagePath = `users/${userId}/${folder}/${fileId}`;
    const storageRef = ref(storage, storagePath);

    await uploadString(storageRef, dataUrl, 'data_url', { contentType });
    return await getDownloadURL(storageRef);
  },

  async deleteStorageUrl(downloadUrl: string): Promise<void> {
    if (!downloadUrl || !downloadUrl.includes('firebasestorage')) return;
    try {
      const storageRef = ref(storage, downloadUrl);
      await deleteObject(storageRef);
    } catch (err) {
      console.warn('Non-fatal error deleting storage object:', err);
    }
  }
};
