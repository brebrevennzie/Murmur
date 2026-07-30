import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, Unlock, Key, Plus, Trash2, Copy, Check, 
  Edit3, Search, Calendar, X, Eye, EyeOff, 
  Image as ImageIcon, Folder, Upload, Download, Tag, Layers,
  Notebook, Flower2, Sparkles
} from 'lucide-react';
import { FanficDesk } from './FanficDesk';

interface SecretNote {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  color: 'pink' | 'purple' | 'amber' | 'emerald' | 'blue';
}

interface VaultImage {
  id: string;
  name: string;
  dataUrl: string; // Base64 data Url
  createdAt: number;
  group: string; // group tag
}

const COLOR_PRESETS = [
  { key: 'pink', bg: 'from-rose-500/10 to-rose-950/20', border: 'border-rose-500/30 hover:border-rose-500/60', text: 'text-rose-400', shadow: 'shadow-rose-500/5', dot: 'bg-rose-400' },
  { key: 'purple', bg: 'from-violet-500/10 to-violet-950/20', border: 'border-violet-500/30 hover:border-violet-500/60', text: 'text-violet-400', shadow: 'shadow-violet-500/5', dot: 'bg-violet-400' },
  { key: 'amber', bg: 'from-amber-500/10 to-amber-950/20', border: 'border-amber-500/30 hover:border-amber-500/60', text: 'text-amber-400', shadow: 'shadow-amber-500/5', dot: 'bg-amber-400' },
  { key: 'emerald', bg: 'from-emerald-500/10 to-emerald-950/20', border: 'border-emerald-500/30 hover:border-emerald-500/60', text: 'text-emerald-400', shadow: 'shadow-emerald-500/5', dot: 'bg-emerald-400' },
  { key: 'blue', bg: 'from-blue-500/10 to-blue-950/20', border: 'border-blue-500/30 hover:border-blue-500/60', text: 'text-blue-400', shadow: 'shadow-blue-500/5', dot: 'bg-blue-400' },
] as const;

// Smart case-insensitive stemming word search
const smartMatch = (text: string, query: string): boolean => {
  if (!query.trim()) return true;
  
  const clean = (s: string) => s.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .trim();
  
  const queryWords = clean(query).split(/\s+/).filter(Boolean);
  if (queryWords.length === 0) return true;
  
  const targetTextClean = clean(text);
  
  // Custom Russian stemming to strip common suffixes/endings
  const stem = (word: string) => {
    if (word.length <= 3) return word;
    return word
      .replace(/(?:иями?|иям|ия|ие|ий|ый|ое|ая|ых|их|ами|ями|ом|ем|ой|ей|а|я|о|е|и|ы|у|ю|ть|ся|нах|ов)$/g, '');
  };

  const targetWords = targetTextClean.split(/\s+/).filter(Boolean).map(stem);
  const queryStems = queryWords.map(stem);
  
  return queryStems.every(qStem => {
    return targetWords.some(tw => tw.includes(qStem) || qStem.includes(tw));
  });
};

const highlightText = (text: string, highlight: string) => {
  if (!highlight.trim()) {
    return <span>{text}</span>;
  }
  const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-rose-500/35 text-white font-semibold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

// Helper to encrypt notes in localStorage (Base64 obfuscation for privacy)
const encryptNotes = (notes: SecretNote[]): string => {
  try {
    const json = JSON.stringify(notes);
    return btoa(encodeURIComponent(json));
  } catch (e) {
    return JSON.stringify(notes);
  }
};

const decryptNotes = (encrypted: string | null): SecretNote[] => {
  if (!encrypted) return [];
  try {
    if (encrypted.startsWith('[')) {
      return JSON.parse(encrypted);
    }
    return JSON.parse(decodeURIComponent(atob(encrypted)));
  } catch (e) {
    return [];
  }
};

// --- INDEXEDDB CONFIG FOR IMAGES VAULT ---
const DB_NAME = 'secret_vault_images_db';
const STORE_NAME = 'images';
const DB_VERSION = 1;

function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllImagesFromDB(): Promise<VaultImage[]> {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  });
}

function saveImageToDB(image: VaultImage): Promise<void> {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(image);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

function deleteImageFromDB(id: string): Promise<void> {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

interface SecretNotesProps {
  onLockChange?: (unlocked: boolean) => void;
}

export const SecretNotes: React.FC<SecretNotesProps> = ({ onLockChange }) => {
  const [unlocked, setUnlocked] = useState(() => {
    return sessionStorage.getItem('secret_notes_session_unlocked') === 'true';
  });
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [shake, setShake] = useState(false);

  // Sub-tab selection (Text notes vs Images Vault vs Fanfic desk)
  const [subTab, setSubTab] = useState<'text' | 'images' | 'fanfic'>('text');

  // Notes state
  const [notes, setNotes] = useState<SecretNote[]>(() => {
    const saved = localStorage.getItem('secret_notes_data');
    return decryptNotes(saved);
  });

  useEffect(() => {
    const handleSync = () => {
      const saved = localStorage.getItem('secret_notes_data');
      if (saved) {
        setNotes(decryptNotes(saved));
      }
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('app_cloud_synced', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('app_cloud_synced', handleSync);
    };
  }, []);

  // Images state
  const [images, setImages] = useState<VaultImage[]>([]);
  const [activeGroup, setActiveGroup] = useState<string>('Все');
  const [selectedImage, setSelectedImage] = useState<VaultImage | null>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [imageEditGroup, setImageEditGroup] = useState<string>('');
  const [imageEditName, setImageEditName] = useState<string>('');

  // Editor and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState<SecretNote['color']>('pink');
  
  // New note fields (inline quick add)
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newColor, setNewColor] = useState<SecretNote['color']>('pink');

  // Copy states for notifications
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  const [copiedImageId, setCopiedImageId] = useState<string | null>(null);

  // Hidden password visibility toggle for testing/accessibility
  const [showPinRaw, setShowPinRaw] = useState(false);

  // Custom delete confirmation states (avoids blocked window.confirm in iframe)
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  // Load images when unlocked
  useEffect(() => {
    if (unlocked) {
      getAllImagesFromDB()
        .then(res => setImages(res))
        .catch(err => console.error('Failed to load images from IndexedDB', err));
    }
  }, [unlocked]);

  // Keyboard listener for PIN entry
  useEffect(() => {
    if (unlocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 4) {
          setPin(prev => prev + e.key);
        }
      } else if (e.key === 'Backspace') {
        setPin(prev => prev.slice(0, -1));
      } else if (e.key === 'Escape') {
        setPin('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, unlocked]);

  // Check PIN when it reaches 4 digits
  useEffect(() => {
    if (pin.length === 4) {
      if (pin === '2364') {
        setUnlocked(true);
        sessionStorage.setItem('secret_notes_session_unlocked', 'true');
        if (onLockChange) onLockChange(true);
        setPinError(false);
      } else {
        setPinError(true);
        setShake(true);
        const timer = setTimeout(() => {
          setPin('');
          setShake(false);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [pin, onLockChange]);

  // Handle manual lock
  const handleLock = () => {
    setUnlocked(false);
    setPin('');
    sessionStorage.removeItem('secret_notes_session_unlocked');
    if (onLockChange) onLockChange(false);
  };

  // Paste handler for pasting images from clipboard
  useEffect(() => {
    if (!unlocked || subTab !== 'images') return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            processImageFile(file);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [unlocked, subTab, images]);

  // Persist notes
  const saveNotesList = (updatedNotes: SecretNote[]) => {
    setNotes(updatedNotes);
    localStorage.setItem('secret_notes_data', encryptNotes(updatedNotes));
  };

  // Add Note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const newNote: SecretNote = {
      id: Math.random().toString(36).substring(2, 9),
      title: newTitle.trim() || 'Без названия',
      content: newContent,
      createdAt: Date.now(),
      color: newColor
    };

    const updated = [newNote, ...notes];
    saveNotesList(updated);

    // Reset form
    setNewTitle('');
    setNewContent('');
    setNewColor('pink');
    setShowAddForm(false);
  };

  // Start Editing Note
  const startEditing = (note: SecretNote) => {
    setEditingNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditColor(note.color);
  };

  // Save Edit Note
  const handleSaveEdit = (id: string) => {
    const updated = notes.map(n => {
      if (n.id === id) {
        return {
          ...n,
          title: editTitle.trim() || 'Без названия',
          content: editContent,
          color: editColor
        };
      }
      return n;
    });
    saveNotesList(updated);
    setEditingNoteId(null);
  };

  // Delete Note
  const handleDeleteNote = (id: string) => {
    setNoteToDelete(id);
  };

  // Copy Note text to clipboard
  const handleCopyNote = (note: SecretNote) => {
    const textToCopy = `${note.title}\n\n${note.content}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedNoteId(note.id);
      setTimeout(() => {
        setCopiedNoteId(null);
      }, 2000);
    });
  };

  // --- IMAGE MANAGEMENT ACTIONS ---

  // Helper to read and save image file
  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result && typeof event.target.result === 'string') {
        const newImg: VaultImage = {
          id: 'img_' + Math.random().toString(36).substring(2, 9),
          name: file.name || `Изображение от ${new Date().toLocaleDateString()}`,
          dataUrl: event.target.result,
          createdAt: Date.now(),
          group: 'Общие'
        };

        saveImageToDB(newImg)
          .then(() => {
            setImages(prev => [newImg, ...prev]);
          })
          .catch(err => alert('Превышен лимит памяти хранилища для этого файла!'));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file: any) => {
        processImageFile(file);
      });
    }
  };

  const handleDeleteImage = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setImageToDelete(id);
  };

  const copyImageToClipboard = async (base64: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const response = await fetch(base64);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      setCopiedImageId(id);
      setTimeout(() => setCopiedImageId(null), 2000);
    } catch (err) {
      // Fallback: Copy Base64 raw text to clipboard
      try {
        await navigator.clipboard.writeText(base64);
        setCopiedImageId(id);
        setTimeout(() => setCopiedImageId(null), 2000);
      } catch (e) {
        alert('Не удалось скопировать. Возможно, браузер ограничивает доступ из iframe.');
      }
    }
  };

  // Start Editing Image Info
  const startEditingImage = (img: VaultImage, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingImageId(img.id);
    setImageEditName(img.name);
    setImageEditGroup(img.group || 'Общие');
  };

  // Save Editing Image Info
  const saveImageInfo = (id: string) => {
    const updatedImages = images.map(img => {
      if (img.id === id) {
        const modified = {
          ...img,
          name: imageEditName.trim() || 'Без названия',
          group: imageEditGroup.trim() || 'Общие'
        };
        saveImageToDB(modified).catch(err => console.error('Save error', err));
        return modified;
      }
      return img;
    });
    setImages(updatedImages);
    setEditingImageId(null);
  };

  // Numeric pad click handler
  const handleNumClick = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  // Clear or Backspace click handler
  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  // Filter notes/images with Smart Stem Search
  const filteredNotes = notes.filter(n => 
    smartMatch(n.title + ' ' + n.content, searchQuery)
  );

  const filteredImages = images.filter(img => {
    const matchesSearch = smartMatch(img.name + ' ' + (img.group || 'Общие'), searchQuery);
    if (activeGroup === 'Все') return matchesSearch;
    return img.group === activeGroup && matchesSearch;
  });

  // Dynamic list of groups
  const groupsList = ['Все', 'Общие', ...Array.from(new Set(images.map(img => img.group || 'Общие'))).map(g => g as string).filter(g => g !== 'Все' && g !== 'Общие' && g.trim() !== '')];

  // RENDER LOCKED SCREEN
  if (!unlocked) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center py-10 px-4">
        <div className={`w-full max-w-sm bg-[#12131a]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center transition-all duration-300 ${shake ? 'animate-shake border-rose-500/30' : ''}`}>
          
          <div className="relative mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border transition-all duration-300 ${pinError ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-[#F4B5CD]/10 border-[#F4B5CD]/20 text-[#F4B5CD] shadow-[0_0_15px_rgba(244,181,205,0.15)] animate-pulse'}`}>
              <Lock className="w-6 h-6" />
            </div>
            <div className="absolute -top-1 -right-1 bg-[#12131a] border border-white/10 text-[9px] uppercase font-mono tracking-wider text-white/50 px-1.5 py-0.5 rounded-md">
              PIN
            </div>
          </div>

          <h2 className="font-serif text-[#F4B5CD] text-xl font-bold tracking-widest uppercase mb-8">
            {pinError ? 'Неверный код!' : 'пароли'}
          </h2>

          {/* Dots Indicator */}
          <div className="flex gap-4 mb-8">
            {[0, 1, 2, 3].map((index) => {
              const active = pin.length > index;
              return (
                <div 
                  key={index}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-200 border ${
                    active 
                      ? pinError
                        ? 'bg-rose-500 border-rose-400 shadow-[0_0_8px_rgba(239,68,68,0.5)] scale-110'
                        : 'bg-[#F4B5CD] border-[#F4B5CD] shadow-[0_0_10px_rgba(244,181,205,0.6)] scale-110'
                      : 'bg-[#12131a] border-white/20 scale-100'
                  }`}
                />
              );
            })}
          </div>

          {/* Numeric Touchpad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[240px] mb-6">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumClick(num)}
                className="w-14 h-14 rounded-full bg-white/[0.02] hover:bg-white/[0.08] active:bg-white/[0.15] border border-white/5 hover:border-white/10 text-white font-mono text-lg font-bold flex items-center justify-center transition duration-150 cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowPinRaw(!showPinRaw)}
              className="w-14 h-14 rounded-full text-white/30 hover:text-white/60 flex items-center justify-center transition cursor-pointer text-xs uppercase font-mono"
              title="Показать ввод"
            >
              {showPinRaw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => handleNumClick('0')}
              className="w-14 h-14 rounded-full bg-white/[0.02] hover:bg-white/[0.08] active:bg-white/[0.15] border border-white/5 hover:border-white/10 text-white font-mono text-lg font-bold flex items-center justify-center transition duration-150 cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="w-14 h-14 rounded-full text-white/40 hover:text-rose-400 active:scale-90 flex items-center justify-center transition cursor-pointer text-xs font-mono font-bold"
              title="Стереть"
            >
              ⌫
            </button>
          </div>

          {showPinRaw && pin && (
            <div className="text-white/30 font-mono text-[10px] bg-white/5 px-2.5 py-1 rounded-md animate-fadeIn">
              Ввод: {pin}
            </div>
          )}
        </div>
      </div>
    );
  }

  // RENDER UNLOCKED SECRET NOTES & IMAGES WORKSPACE
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Sub-tab switcher with search bar & Manual Lock */}
      <div className="bg-[#12131a]/40 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Beautiful Sub-tab Switchers - Replaced "Личные заметки" label completely */}
        <div className="flex bg-white/[0.02] border border-white/5 p-1 rounded-xl shrink-0 gap-1">
          <button
            onClick={() => {
              setSubTab('text');
              setSearchQuery('');
            }}
            className={`p-2.5 rounded-lg transition duration-200 flex items-center justify-center cursor-pointer ${
              subTab === 'text'
                ? 'bg-[#F4B5CD] text-[#12131a] shadow-[0_0_12px_rgba(244,181,205,0.4)]'
                : 'text-white/60 hover:text-white hover:bg-white/[0.03]'
            }`}
            title="Заметки (Тетрадь)"
          >
            <Notebook className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setSubTab('images');
              setSearchQuery('');
            }}
            className={`p-2.5 rounded-lg transition duration-200 flex items-center justify-center cursor-pointer ${
              subTab === 'images'
                ? 'bg-[#F4B5CD] text-[#12131a] shadow-[0_0_12px_rgba(244,181,205,0.4)]'
                : 'text-white/60 hover:text-white hover:bg-white/[0.03]'
            }`}
            title="Сейф картинок (Цветок)"
          >
            <Flower2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setSubTab('fanfic');
              setSearchQuery('');
            }}
            className={`p-2.5 rounded-lg transition duration-200 flex items-center justify-center cursor-pointer ${
              subTab === 'fanfic'
                ? 'bg-[#F4B5CD] text-[#12131a] shadow-[0_0_12px_rgba(244,181,205,0.4)]'
                : 'text-white/60 hover:text-white hover:bg-white/[0.03]'
            }`}
            title="Конструктор Персонажей & Лора (Перо)"
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Search & Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Smart Stem Search */}
          <div className="relative flex-1 md:flex-initial min-w-[220px]">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/30" />
            <input
              type="text"
              placeholder={subTab === 'text' ? "Поиск по тексту заметки..." : subTab === 'images' ? "Поиск по названию/группе..." : "Поиск по героям или лору..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] focus:bg-[#12131a] border border-white/10 hover:border-white/20 focus:border-[#F4B5CD]/50 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none transition duration-150"
            />
          </div>

          {subTab === 'text' ? (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/18 border border-[#F4B5CD]/35 hover:border-[#F4B5CD]/50 text-[#F4B5CD] text-[10px] uppercase tracking-widest font-extrabold rounded-xl transition duration-150 flex items-center gap-1.5 cursor-pointer"
            >
              {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{showAddForm ? 'Закрыть' : 'Добавить'}</span>
            </button>
          ) : subTab === 'images' ? (
            <label className="px-4 py-2 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/18 border border-[#F4B5CD]/35 hover:border-[#F4B5CD]/50 text-[#F4B5CD] text-[10px] uppercase tracking-widest font-extrabold rounded-xl transition duration-150 flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Загрузить</span>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                onChange={handleImageUpload} 
                className="hidden" 
              />
            </label>
          ) : null}

          <button
            onClick={handleLock}
            className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/18 border border-rose-500/25 hover:border-rose-500/40 text-rose-300 text-[10px] uppercase tracking-widest font-extrabold rounded-xl transition duration-150 flex items-center gap-1.5 cursor-pointer"
            title="Заблокировать сейф"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Закрыть сейф</span>
          </button>
        </div>
      </div>

      {/* -------------------- TEXT NOTES WORKSPACE -------------------- */}
      {subTab === 'text' && (
        <div className="space-y-6">
          {/* Inline Quick Add Form */}
          {showAddForm && (
            <form onSubmit={handleAddNote} className="bg-[#12131a]/60 border border-[#F4B5CD]/20 p-5 rounded-2xl space-y-4 shadow-xl animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="text-xs uppercase tracking-wider font-extrabold text-[#F4B5CD] flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  Новая зашифрованная заметка
                </h3>

                {/* Color picker */}
                <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-lg border border-white/5">
                  <span className="text-[9px] uppercase tracking-wider text-white/40 font-mono mr-1">Палитра:</span>
                  <div className="flex gap-1.5">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => setNewColor(preset.key)}
                        className={`w-4 h-4 rounded-full ${preset.dot} transition-transform duration-150 cursor-pointer ${
                          newColor === preset.key ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#12131a]' : 'opacity-60 hover:opacity-100'
                        }`}
                        title={preset.key}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Заголовок заметки..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/5 hover:border-white/10 focus:border-[#F4B5CD]/40 p-3 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none transition duration-150 font-semibold"
                />
                <textarea
                  placeholder="Введите неограниченный секретный текст здесь... Можно свободно копировать, редактировать и удалять. Все заметки сохраняются в браузере."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  required
                  rows={5}
                  className="w-full bg-white/[0.02] border border-white/5 hover:border-white/10 focus:border-[#F4B5CD]/40 p-3 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none transition duration-150 leading-relaxed resize-y font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-xl text-[10px] uppercase tracking-wider font-extrabold transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/20 border border-[#F4B5CD]/40 text-[#F4B5CD] hover:text-[#F4B5CD] rounded-xl text-[10px] uppercase tracking-wider font-extrabold transition cursor-pointer"
                >
                  Добавить в сейф
                </button>
              </div>
            </form>
          )}

          {/* Notes Grid */}
          {filteredNotes.length === 0 ? (
            <div className="bg-[#12131a]/20 border border-white/5 rounded-2xl p-12 text-center text-white/30 space-y-3">
              <Key className="w-8 h-8 text-white/15 mx-auto animate-bounce" />
              <p className="text-xs">
                {searchQuery ? 'Заметки с таким текстом не найдены.' : 'Ни одной заметки в сейфе нет.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-3.5 py-1.5 bg-[#F4B5CD]/5 hover:bg-[#F4B5CD]/10 border border-[#F4B5CD]/20 text-[#F4B5CD] text-[9px] uppercase tracking-widest font-bold rounded-lg transition duration-200 cursor-pointer"
                >
                  Создать первую заметку
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredNotes.map((note) => {
                const isEditing = editingNoteId === note.id;
                const preset = COLOR_PRESETS.find(p => p.key === note.color) || COLOR_PRESETS[0];

                return (
                  <div 
                    key={note.id}
                    className={`bg-gradient-to-br ${preset.bg} border ${preset.border} p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all duration-300 hover:shadow-lg ${preset.shadow}`}
                  >
                    {isEditing ? (
                      /* EDITING MODE */
                      <div className="space-y-3 flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-white/50">Редактирование</span>
                          <div className="flex gap-1">
                            {COLOR_PRESETS.map((p) => (
                              <button
                                key={p.key}
                                type="button"
                                onClick={() => setEditColor(p.key)}
                                className={`w-3.5 h-3.5 rounded-full ${p.dot} transition-all cursor-pointer ${
                                  editColor === p.key ? 'scale-110 ring-1 ring-white' : 'opacity-40 hover:opacity-100'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-[#12131a] border border-white/10 p-2 rounded-lg text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#F4B5CD]/50 font-semibold"
                        />
                        
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={5}
                          className="w-full bg-[#12131a] border border-white/10 p-2 rounded-lg text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#F4B5CD]/50 leading-relaxed font-mono"
                        />

                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingNoteId(null)}
                            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg text-[9px] uppercase tracking-wider font-extrabold transition cursor-pointer"
                          >
                            Отмена
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(note.id)}
                            className="px-3 py-1 bg-[#F4B5CD]/15 hover:bg-[#F4B5CD]/25 text-[#F4B5CD] rounded-lg text-[9px] uppercase tracking-wider font-extrabold transition cursor-pointer"
                          >
                            Сохранить
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* VIEWING MODE */
                      <div className="flex flex-col justify-between h-full space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-serif text-sm font-semibold tracking-wide leading-snug break-words flex-1 text-white">
                              {highlightText(note.title, searchQuery)}
                            </h3>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleCopyNote(note)}
                                className="p-1.5 bg-white/[0.03] hover:bg-white/[0.08] text-white/50 hover:text-white rounded-lg transition cursor-pointer"
                                title="Копировать в буфер"
                              >
                                {copiedNoteId === note.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => startEditing(note)}
                                className="p-1.5 bg-white/[0.03] hover:bg-white/[0.08] text-white/50 hover:text-white rounded-lg transition cursor-pointer"
                                title="Редактировать"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="p-1.5 bg-white/[0.03] hover:bg-white/[0.08] text-white/40 hover:text-rose-400 rounded-lg transition cursor-pointer"
                                title="Удалить заметку"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-[11px] text-white/80 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto no-scrollbar break-words font-medium">
                            {highlightText(note.content, searchQuery)}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[8px] font-mono text-white/30 border-t border-white/5 pt-2.5">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            <span>{new Date(note.createdAt).toLocaleDateString('ru-RU')}</span>
                            <span>{new Date(note.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <span className="uppercase tracking-widest text-[7px] text-white/20 font-bold">ЗАШИФРОВАНО</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* -------------------- IMAGES VAULT WORKSPACE -------------------- */}
      {subTab === 'images' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Paste notice & Drag Drop Zone */}
          <div className="border border-dashed border-[#F4B5CD]/30 bg-white/[0.01] hover:bg-white/[0.03] p-8 rounded-2xl text-center space-y-3 transition duration-150 relative group">
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              onChange={handleImageUpload} 
              className="absolute inset-0 opacity-0 cursor-pointer" 
            />
            <div className="w-12 h-12 rounded-full bg-[#F4B5CD]/10 text-[#F4B5CD] flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(244,181,205,0.15)] group-hover:scale-110 transition duration-200">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-white/85 font-semibold">
                Перетащите сюда картинки или нажмите для выбора на устройстве
              </p>
              <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider font-mono">
                Также работает прямая вставка через буфер обмена (CTRL + V) в любом месте!
              </p>
            </div>
          </div>

          {/* Group Filter Tabs (Сгруппировать) */}
          <div className="flex flex-wrap gap-2 items-center pb-2 border-b border-white/5">
            <span className="text-[9px] uppercase tracking-wider font-extrabold font-mono text-white/30 flex items-center gap-1.5 mr-2">
              <Layers className="w-3.5 h-3.5" /> Группы:
            </span>
            {groupsList.map(group => {
              const count = group === 'Все' 
                ? images.length 
                : images.filter(i => (i.group || 'Общие') === group).length;

              return (
                <button
                  key={group}
                  onClick={() => setActiveGroup(group)}
                  className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-extrabold rounded-lg border transition duration-150 cursor-pointer flex items-center gap-1.5 ${
                    activeGroup === group
                      ? 'bg-[#F4B5CD]/15 border-[#F4B5CD]/50 text-[#F4B5CD] shadow-[0_0_10px_rgba(244,181,205,0.1)]'
                      : 'bg-white/[0.02] border-white/5 text-white/50 hover:text-white hover:border-white/10'
                  }`}
                >
                  <Folder className="w-3 h-3" />
                  <span>{group}</span>
                  <span className="px-1.5 py-0.2 bg-white/10 text-white/80 rounded-full text-[8px] font-mono">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Images Grid */}
          {filteredImages.length === 0 ? (
            <div className="bg-[#12131a]/20 border border-white/5 rounded-2xl p-12 text-center text-white/30 space-y-3">
              <ImageIcon className="w-8 h-8 text-white/15 mx-auto animate-pulse" />
              <p className="text-xs">
                {searchQuery ? 'Изображения с такими ключевыми словами не найдены.' : 'Сейф картинок пуст.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredImages.map((img) => {
                const isEditingInfo = editingImageId === img.id;

                return (
                  <div 
                    key={img.id}
                    onClick={() => setSelectedImage(img)}
                    className="group bg-[#12131a]/60 border border-white/5 hover:border-[#F4B5CD]/40 p-3 rounded-2xl flex flex-col justify-between gap-3 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-[#F4B5CD]/5 relative"
                  >
                    {/* Image Preview Container */}
                    <div className="aspect-square w-full rounded-xl overflow-hidden bg-black/40 border border-white/5 relative flex items-center justify-center">
                      <img 
                        src={img.dataUrl} 
                        alt={img.name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      
                      {/* Floating Category/Group badge */}
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-md border border-white/10 text-[8px] font-mono font-bold uppercase tracking-widest text-[#F4B5CD] rounded-md">
                        {img.group || 'Общие'}
                      </span>
                    </div>

                    {/* Meta info & Action Controls */}
                    <div className="space-y-2 text-left" onClick={e => e.stopPropagation()}>
                      {isEditingInfo ? (
                        /* Image Editing Form */
                        <div className="space-y-2 p-1.5 bg-white/[0.02] border border-white/5 rounded-lg">
                          <input 
                            type="text"
                            value={imageEditName}
                            onChange={(e) => setImageEditName(e.target.value)}
                            className="w-full bg-[#12131a] border border-white/10 p-1.5 rounded-lg text-[10px] text-white focus:outline-none focus:border-[#F4B5CD]/50"
                            placeholder="Название..."
                          />
                          <div className="flex gap-1.5">
                            <input 
                              type="text"
                              value={imageEditGroup}
                              onChange={(e) => setImageEditGroup(e.target.value)}
                              className="w-full bg-[#12131a] border border-white/10 p-1.5 rounded-lg text-[10px] text-white focus:outline-none focus:border-[#F4B5CD]/50"
                              placeholder="Группа (например: Личное)..."
                            />
                            <button 
                              onClick={() => saveImageInfo(img.id)}
                              className="px-2 py-1 bg-[#F4B5CD] text-[#12131a] text-[9px] uppercase font-bold rounded hover:bg-[#ffc5dd] transition cursor-pointer"
                            >
                              ОК
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start gap-1">
                          <div className="truncate flex-1">
                            <p className="text-[11px] font-semibold text-white truncate" title={img.name}>
                              {highlightText(img.name, searchQuery)}
                            </p>
                            <p className="text-[8px] font-mono text-white/30">
                              {new Date(img.createdAt).toLocaleDateString('ru-RU')}
                            </p>
                          </div>

                          {/* Quick Edit Group Tag button */}
                          <button
                            onClick={(e) => startEditingImage(img, e)}
                            className="p-1 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded transition cursor-pointer"
                            title="Сгруппировать / Переименовать"
                          >
                            <Tag className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}

                      {/* View & Copy & Delete row */}
                      <div className="flex items-center justify-between gap-1 border-t border-white/5 pt-2">
                        <button
                          onClick={() => setSelectedImage(img)}
                          className="text-[9px] uppercase tracking-wider font-extrabold text-[#F4B5CD]/70 hover:text-[#F4B5CD] transition cursor-pointer"
                        >
                          Открыть
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => copyImageToClipboard(img.dataUrl, img.id, e)}
                            className="p-1.5 bg-white/[0.03] hover:bg-white/[0.08] text-white/50 hover:text-white rounded-lg transition cursor-pointer"
                            title="Копировать картинку в буфер"
                          >
                            {copiedImageId === img.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={(e) => handleDeleteImage(img.id, e)}
                            className="p-1.5 bg-white/[0.03] hover:bg-white/[0.08] text-white/40 hover:text-rose-400 rounded-lg transition cursor-pointer"
                            title="Удалить"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* -------------------- FULLSCREEN ZOOM MODAL WITH DETAILS -------------------- */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="bg-[#12131a] border border-white/10 rounded-3xl p-5 max-w-4xl w-full max-h-[90vh] flex flex-col justify-between gap-4 shadow-2xl relative animate-scaleIn"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white font-serif">{selectedImage.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-[#F4B5CD]/10 border border-[#F4B5CD]/20 text-[9px] font-mono text-[#F4B5CD] rounded uppercase tracking-widest">
                    Группа: {selectedImage.group || 'Общие'}
                  </span>
                  <span className="text-[10px] text-white/30 font-mono">
                    {new Date(selectedImage.createdAt).toLocaleDateString('ru-RU')} {new Date(selectedImage.createdAt).toLocaleTimeString('ru-RU')}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => setSelectedImage(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Large Image preview */}
            <div className="flex-1 overflow-auto flex items-center justify-center rounded-2xl bg-black/40 border border-white/5 p-2 max-h-[60vh]">
              <img 
                src={selectedImage.dataUrl} 
                alt={selectedImage.name} 
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[55vh] object-contain rounded-lg shadow-lg"
              />
            </div>

            {/* Modal Footer Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedImage.dataUrl;
                    link.download = selectedImage.name || 'secret_image';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-xl transition flex items-center gap-2 cursor-pointer border border-white/5"
                >
                  <Download className="w-4 h-4 text-[#F4B5CD]" />
                  <span>Скачать</span>
                </button>
                <button
                  onClick={() => copyImageToClipboard(selectedImage.dataUrl, selectedImage.id)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-xl transition flex items-center gap-2 cursor-pointer border border-white/5"
                >
                  {copiedImageId === selectedImage.id ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Скопировано!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#F4B5CD]" />
                      <span>Копировать</span>
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={() => handleDeleteImage(selectedImage.id)}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/35 hover:border-rose-500/50 text-rose-300 text-xs font-semibold rounded-xl transition flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Удалить изображение</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- FANFICTION WORKSPACE -------------------- */}
      {subTab === 'fanfic' && (
        <FanficDesk />
      )}

      {/* -------------------- CUSTOM DELETE CONFIRMATION MODAL -------------------- */}
      {(noteToDelete || imageToDelete) && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#12131a] border border-rose-400/25 p-6 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl relative">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-serif">Удалить безвозвратно?</h4>
              <p className="text-xs text-white/60 mt-2 leading-relaxed">
                {noteToDelete ? 'Эта секретная заметка будет удалена навсегда.' : 'Это изображение будет удалено безвозвратно из сейфа.'}
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setNoteToDelete(null);
                  setImageToDelete(null);
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white rounded-xl text-[10px] uppercase tracking-wider font-extrabold transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  if (noteToDelete) {
                    const updated = notes.filter(n => n.id !== noteToDelete);
                    saveNotesList(updated);
                    if (editingNoteId === noteToDelete) {
                      setEditingNoteId(null);
                    }
                    setNoteToDelete(null);
                  } else if (imageToDelete) {
                    deleteImageFromDB(imageToDelete)
                      .then(() => {
                        setImages(prev => prev.filter(img => img.id !== imageToDelete));
                        if (selectedImage?.id === imageToDelete) {
                          setSelectedImage(null);
                        }
                        setImageToDelete(null);
                      })
                      .catch(err => console.error('Delete error', err));
                  }
                }}
                className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-300 rounded-xl text-[10px] uppercase tracking-wider font-extrabold transition cursor-pointer"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
