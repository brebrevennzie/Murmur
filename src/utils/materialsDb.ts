// IndexedDB utility for storing materials (Images, PDFs, Text files) reliably without localStorage size limits

export interface MaterialItem {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'text' | 'other';
  dataUrl?: string; // Base64 or Blob Data URL
  textContent?: string; // Plain text content for text items
  size?: number; // File size in bytes
  folderId?: string | null;
  mimeType?: string;
  createdAt: number;
}

export interface MaterialFolder {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

const DB_NAME = 'tutor_materials_db';
const DB_VERSION = 1;
const STORE_MATERIALS = 'materials';
const STORE_FOLDERS = 'folders';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_MATERIALS)) {
        db.createObjectStore(STORE_MATERIALS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
        db.createObjectStore(STORE_FOLDERS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Materials CRUD
export async function getAllMaterials(): Promise<MaterialItem[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MATERIALS, 'readonly');
      const store = tx.objectStore(STORE_MATERIALS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to load materials from IndexedDB', e);
    // Fallback to localStorage
    const saved = localStorage.getItem('tutor_materials_v1');
    return saved ? JSON.parse(saved) : [];
  }
}

export async function saveMaterial(item: MaterialItem): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MATERIALS, 'readwrite');
      const store = tx.objectStore(STORE_MATERIALS);
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to save material to IndexedDB', e);
  }
}

export async function deleteMaterial(id: string): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MATERIALS, 'readwrite');
      const store = tx.objectStore(STORE_MATERIALS);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to delete material from IndexedDB', e);
  }
}

// Folders CRUD
export async function getAllFolders(): Promise<MaterialFolder[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FOLDERS, 'readonly');
      const store = tx.objectStore(STORE_FOLDERS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to load folders from IndexedDB', e);
    const saved = localStorage.getItem('tutor_material_folders_v1');
    return saved ? JSON.parse(saved) : [];
  }
}

export async function saveFolder(folder: MaterialFolder): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FOLDERS, 'readwrite');
      const store = tx.objectStore(STORE_FOLDERS);
      const request = store.put(folder);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to save folder to IndexedDB', e);
  }
}

export async function deleteFolderInDb(id: string): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FOLDERS, 'readwrite');
      const store = tx.objectStore(STORE_FOLDERS);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to delete folder from IndexedDB', e);
  }
}
