import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, FolderPlus, Upload, FileText, Image as ImageIcon, 
  File, Copy, Download, Trash2, Edit3, Share2, Search, X, 
  Plus, Check, Eye, ChevronRight, Layers, ExternalLink, 
  Sparkles, Radio, CheckSquare, Square, CornerDownRight, ArrowLeft, Heart
} from 'lucide-react';
import { 
  MaterialItem, MaterialFolder, 
  getAllMaterials, saveMaterial, deleteMaterial, 
  getAllFolders, saveFolder, deleteFolderInDb 
} from '../utils/materialsDb';

export const MaterialsVault: React.FC = () => {
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [folders, setFolders] = useState<MaterialFolder[]>([]);
  const [loading, setLoading] = useState(true);

  // Active navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'image' | 'pdf' | 'text'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & UI states
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [showTextModal, setShowTextModal] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [editingTextItem, setEditingTextItem] = useState<MaterialItem | null>(null);

  // Rename modal
  const [renamingItem, setRenamingItem] = useState<MaterialItem | MaterialFolder | null>(null);
  const [isFolderRename, setIsFolderRename] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Preview modals
  const [previewImageItem, setPreviewImageItem] = useState<MaterialItem | null>(null);
  const [previewTextItem, setPreviewTextItem] = useState<MaterialItem | null>(null);
  const [previewPdfItem, setPreviewPdfItem] = useState<MaterialItem | null>(null);

  // AirDrop / Share modal
  const [shareItem, setShareItem] = useState<MaterialItem | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Multi-select mode
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null>(null);

  // Toast / Copy notification
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // Drag and drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [mats, flds] = await Promise.all([getAllMaterials(), getAllFolders()]);
      setItems(mats);
      setFolders(flds);
      setLoading(false);
    }
    loadData();
  }, []);

  // Helper Toast
  const triggerToast = (msg: string) => {
    setCopyToast(msg);
    setTimeout(() => setCopyToast(null), 2500);
  };

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Handle File Upload
  const handleFileUpload = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    let addedCount = 0;
    for (const file of fileList) {
      let type: 'image' | 'pdf' | 'text' | 'other' = 'other';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) type = 'pdf';
      else if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) type = 'text';

      let dataUrl = '';
      let textContent = '';

      if (type === 'text') {
        textContent = await file.text();
        dataUrl = await fileToBase64(file);
      } else {
        dataUrl = await fileToBase64(file);
      }

      const newItem: MaterialItem = {
        id: `mat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: file.name,
        type,
        dataUrl,
        textContent,
        size: file.size,
        folderId: currentFolderId,
        mimeType: file.type || (type === 'pdf' ? 'application/pdf' : 'text/plain'),
        createdAt: Date.now()
      };

      await saveMaterial(newItem);
      setItems(prev => [newItem, ...prev]);
      addedCount++;
    }

    triggerToast(`Загружено файлов: ${addedCount}`);
  };

  // Drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Create Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const newFolder: MaterialFolder = {
      id: `fld-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: newFolderName.trim(),
      createdAt: Date.now()
    };

    await saveFolder(newFolder);
    setFolders(prev => [newFolder, ...prev]);
    setNewFolderName('');
    setShowFolderModal(false);
    triggerToast(`Папка "${newFolder.name}" создана`);
  };

  // Create or Update Text Item
  const handleSaveTextItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textTitle.trim() || !textContent.trim()) return;

    if (editingTextItem) {
      const updated: MaterialItem = {
        ...editingTextItem,
        name: textTitle.trim().endsWith('.txt') ? textTitle.trim() : `${textTitle.trim()}.txt`,
        textContent: textContent.trim(),
        size: new Blob([textContent.trim()]).size
      };
      await saveMaterial(updated);
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      triggerToast('Заметка обновлена');
    } else {
      const newItem: MaterialItem = {
        id: `mat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: textTitle.trim().endsWith('.txt') ? textTitle.trim() : `${textTitle.trim()}.txt`,
        type: 'text',
        textContent: textContent.trim(),
        size: new Blob([textContent.trim()]).size,
        folderId: currentFolderId,
        mimeType: 'text/plain',
        createdAt: Date.now()
      };
      await saveMaterial(newItem);
      setItems(prev => [newItem, ...prev]);
      triggerToast('Текстовый файл добавлен');
    }

    setTextTitle('');
    setTextContent('');
    setEditingTextItem(null);
    setShowTextModal(false);
  };

  // Delete Material Item
  const handleDeleteItem = async (id: string, name: string) => {
    if (confirm(`Удалить файл "${name}"?`)) {
      await deleteMaterial(id);
      setItems(prev => prev.filter(i => i.id !== id));
      setSelectedItemIds(prev => prev.filter(x => x !== id));
      triggerToast('Файл удален');
    }
  };

  // Delete Folder
  const handleDeleteFolder = async (folder: MaterialFolder) => {
    if (confirm(`Удалить папку "${folder.name}"? Находящиеся в ней файлы переместятся в корень.`)) {
      await deleteFolderInDb(folder.id);
      // Move items in this folder to root
      const affectedItems = items.filter(i => i.folderId === folder.id);
      for (const item of affectedItems) {
        const updated = { ...item, folderId: null };
        await saveMaterial(updated);
      }
      setItems(prev => prev.map(i => i.folderId === folder.id ? { ...i, folderId: null } : i));
      setFolders(prev => prev.filter(f => f.id !== folder.id));
      if (currentFolderId === folder.id) setCurrentFolderId(null);
      triggerToast(`Папка "${folder.name}" удалена`);
    }
  };

  // Rename save
  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingItem || !renameValue.trim()) return;

    if (isFolderRename) {
      const updatedFolder = { ...(renamingItem as MaterialFolder), name: renameValue.trim() };
      await saveFolder(updatedFolder);
      setFolders(prev => prev.map(f => f.id === updatedFolder.id ? updatedFolder : f));
      triggerToast('Папка переименована');
    } else {
      const updatedItem = { ...(renamingItem as MaterialItem), name: renameValue.trim() };
      await saveMaterial(updatedItem);
      setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
      triggerToast('Файл переименован');
    }

    setRenamingItem(null);
  };

  // Copy Content / Link
  const handleCopyItem = (item: MaterialItem) => {
    if (item.type === 'text' && item.textContent) {
      navigator.clipboard.writeText(item.textContent).then(() => {
        triggerToast('Текст скопирован в буфер!');
      });
    } else if (item.dataUrl) {
      navigator.clipboard.writeText(item.dataUrl).then(() => {
        triggerToast('Ссылка/Данные файла скопированы!');
      });
    } else {
      navigator.clipboard.writeText(item.name).then(() => {
        triggerToast('Имя файла скопировано!');
      });
    }
  };

  // Download Item
  const handleDownloadItem = (item: MaterialItem) => {
    let url = item.dataUrl;
    if (!url && item.textContent) {
      const blob = new Blob([item.textContent], { type: 'text/plain;charset=utf-8' });
      url = URL.createObjectURL(blob);
    }

    if (!url) {
      triggerToast('Невозможно скачать этот файл');
      return;
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    triggerToast(`Скачивание: ${item.name}`);
  };

  // AirDrop / Web Share Handler
  const handleAirDropShare = async (item: MaterialItem) => {
    setShareItem(item);
    setShareSuccess(false);

    if (navigator.share) {
      try {
        let fileToShare: File | null = null;
        if (item.dataUrl) {
          const res = await fetch(item.dataUrl);
          const blob = await res.blob();
          fileToShare = new File([blob], item.name, { type: item.mimeType || blob.type });
        } else if (item.textContent) {
          const blob = new Blob([item.textContent], { type: 'text/plain' });
          fileToShare = new File([blob], item.name, { type: 'text/plain' });
        }

        if (fileToShare && navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
          await navigator.share({
            title: item.name,
            files: [fileToShare]
          });
          setShareSuccess(true);
          triggerToast('Отправлено через AirDrop!');
          return;
        } else {
          await navigator.share({
            title: item.name,
            text: item.textContent || item.name
          });
          setShareSuccess(true);
          triggerToast('Отправлено!');
          return;
        }
      } catch (e) {
        console.log('Share canceled or not supported directly', e);
      }
    }
  };

  // Batch move items to folder
  const handleBatchMove = async () => {
    for (const id of selectedItemIds) {
      const item = items.find(i => i.id === id);
      if (item) {
        const updated = { ...item, folderId: moveTargetFolderId };
        await saveMaterial(updated);
      }
    }
    setItems(prev => prev.map(i => selectedItemIds.includes(i.id) ? { ...i, folderId: moveTargetFolderId } : i));
    triggerToast(`Перемещено элементов: ${selectedItemIds.length}`);
    setSelectedItemIds([]);
    setShowMoveModal(false);
  };

  // Batch delete items
  const handleBatchDelete = async () => {
    if (confirm(`Удалить выбранные элементы (${selectedItemIds.length})?`)) {
      for (const id of selectedItemIds) {
        await deleteMaterial(id);
      }
      setItems(prev => prev.filter(i => !selectedItemIds.includes(i.id)));
      triggerToast(`Удалено элементов: ${selectedItemIds.length}`);
      setSelectedItemIds([]);
    }
  };

  // Filter items
  const activeFolder = folders.find(f => f.id === currentFolderId);
  const filteredItems = items.filter(item => {
    const matchesFolder = item.folderId === currentFolderId;
    const matchesType = activeFilter === 'all' || item.type === activeFilter;
    const matchesSearch = !searchQuery.trim() || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.textContent && item.textContent.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesFolder && matchesType && matchesSearch;
  });

  // Size formatter
  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeIn">
      
      {/* Toast alert */}
      {copyToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#F4B5CD] text-[#12131a] px-4 py-2.5 rounded-2xl font-bold text-xs shadow-[0_0_20px_rgba(244,181,205,0.4)] flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>{copyToast}</span>
        </div>
      )}

      {/* HEADER BANNER & ACTION BAR */}
      <div className="bg-gradient-to-r from-[#12131a]/80 via-[#25171e]/60 to-[#12131a]/80 border border-[#F4B5CD]/20 rounded-3xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Heart className="w-64 h-64 text-[#F4B5CD] fill-[#F4B5CD]" />
        </div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          
          {/* Title and stats */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F4B5CD]/10 border border-[#F4B5CD]/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(244,181,205,0.15)]">
              <Heart className="w-8 h-8 text-[#F4B5CD] fill-[#F4B5CD]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white tracking-wide">Хранилище материалов</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F4B5CD]/20 text-[#F4B5CD] text-[10px] uppercase font-bold tracking-widest border border-[#F4B5CD]/30">
                  {items.length} файлов
                </span>
              </div>
              <p className="text-xs text-white/50 mt-1">
                Картинки, тексты, конспекты и PDF-документы. Быстрое копирование, скачивание и пересылка по AirDrop.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            
            {/* Create Folder */}
            <button
              onClick={() => setShowFolderModal(true)}
              className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#F4B5CD]/40 text-white text-xs font-semibold rounded-xl transition duration-200 flex items-center gap-2 cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-[#F4B5CD]" />
              <span>Папка</span>
            </button>

            {/* Create Text note */}
            <button
              onClick={() => {
                setEditingTextItem(null);
                setTextTitle('');
                setTextContent('');
                setShowTextModal(true);
              }}
              className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#F4B5CD]/40 text-white text-xs font-semibold rounded-xl transition duration-200 flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#F4B5CD]" />
              <span>Текст / Заметка</span>
            </button>

            {/* File Upload Trigger */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-[#F4B5CD] text-[#12131a] hover:bg-[#ffc5dd] text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all duration-200 shadow-[0_0_15px_rgba(244,181,205,0.3)] flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Загрузить файлы</span>
            </button>

            <input 
              ref={fileInputRef}
              type="file" 
              multiple 
              accept="image/*,application/pdf,text/*,.txt,.md,.doc,.docx" 
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden" 
            />
          </div>
        </div>
      </div>

      {/* DRAG AND DROP ZONE / BREADCRUMBS & FILTERS BAR */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-4 transition-all duration-200 ${
          isDraggingOver 
            ? 'border-[#F4B5CD] bg-[#F4B5CD]/10 scale-[1.01]' 
            : 'border-white/10 bg-[#12131a]/30'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Breadcrumbs Navigation */}
          <div className="flex items-center gap-2 text-xs font-bold text-white/80">
            <button
              onClick={() => setCurrentFolderId(null)}
              className={`hover:text-[#F4B5CD] transition cursor-pointer flex items-center gap-1.5 ${
                currentFolderId === null ? 'text-[#F4B5CD] font-extrabold' : 'text-white/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Все материалы</span>
            </button>

            {activeFolder && (
              <>
                <ChevronRight className="w-4 h-4 text-white/30" />
                <span className="text-[#F4B5CD] bg-[#F4B5CD]/10 px-2.5 py-1 rounded-lg border border-[#F4B5CD]/20 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 fill-[#F4B5CD]/20" />
                  {activeFolder.name}
                </span>
                <button
                  onClick={() => setCurrentFolderId(null)}
                  className="p-1 hover:bg-white/10 text-white/40 hover:text-white rounded-md transition cursor-pointer"
                  title="Выйти из папки"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Type Filters & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-white/30" />
              <input
                type="text"
                placeholder="Поиск по материалам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.06] focus:bg-[#12131a] border border-white/10 focus:border-[#F4B5CD]/50 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none transition"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5">
              {[
                { id: 'all', label: 'Все' },
                { id: 'image', label: 'Картинки' },
                { id: 'pdf', label: 'PDF' },
                { id: 'text', label: 'Тексты' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
                    activeFilter === f.id
                      ? 'bg-[#F4B5CD] text-[#12131a] shadow-[0_0_10px_rgba(244,181,205,0.3)]'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Drag Over Hint */}
        {isDraggingOver && (
          <div className="text-center py-6 text-[#F4B5CD] font-bold text-xs uppercase tracking-widest animate-pulse">
            ✨ Перетащите файлы сюда для моментальной загрузки!
          </div>
        )}
      </div>

      {/* FOLDERS GRID (Visible when in Root view or showing available folders) */}
      {currentFolderId === null && folders.length > 0 && !searchQuery && (
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-white/40 flex items-center gap-2">
            <Folder className="w-3.5 h-3.5 text-[#F4B5CD]" />
            <span>Папки ({folders.length})</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {folders.map(folder => {
              const count = items.filter(i => i.folderId === folder.id).length;
              return (
                <div
                  key={folder.id}
                  onClick={() => setCurrentFolderId(folder.id)}
                  className="group bg-[#12131a]/60 hover:bg-[#12131a] border border-white/5 hover:border-[#F4B5CD]/50 p-3.5 rounded-2xl transition duration-200 cursor-pointer flex flex-col justify-between gap-3 relative shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <Folder className="w-6 h-6 text-[#F4B5CD] fill-[#F4B5CD]/20 group-hover:scale-110 transition duration-200" />
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-150">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingItem(folder);
                          setIsFolderRename(true);
                          setRenameValue(folder.name);
                        }}
                        className="p-1 text-white/40 hover:text-white rounded hover:bg-white/10"
                        title="Переименовать папку"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder);
                        }}
                        className="p-1 text-white/40 hover:text-rose-400 rounded hover:bg-rose-500/10"
                        title="Удалить папку"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white truncate">{folder.name}</h4>
                    <span className="text-[9px] text-white/40">{count} файлов</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BATCH SELECTION TOOLBAR (If items are selected) */}
      {selectedItemIds.length > 0 && (
        <div className="bg-[#F4B5CD]/10 border border-[#F4B5CD]/30 p-3 rounded-2xl flex items-center justify-between gap-4 animate-fadeIn">
          <span className="text-xs font-bold text-[#F4B5CD]">
            Выбрано элементов: {selectedItemIds.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMoveModal(true)}
              className="px-3 py-1.5 bg-[#F4B5CD]/20 hover:bg-[#F4B5CD]/30 text-[#F4B5CD] text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Переместить в папку</span>
            </button>
            <button
              onClick={handleBatchDelete}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Удалить выбранное</span>
            </button>
            <button
              onClick={() => setSelectedItemIds([])}
              className="px-2.5 py-1.5 text-white/40 hover:text-white text-xs"
            >
              Снять выбор
            </button>
          </div>
        </div>
      )}

      {/* MATERIALS ITEMS GRID */}
      {loading ? (
        <div className="text-center py-16 text-white/30 text-xs">Загрузка материалов...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-3xl space-y-3 bg-[#12131a]/20">
          <Heart className="w-10 h-10 mx-auto text-[#F4B5CD] fill-[#F4B5CD] opacity-30" />
          <p className="text-xs text-white/40 font-medium">
            {searchQuery ? 'Ничего не найдено по вашему запросу.' : 'В этой папке пока нет материалов.'}
          </p>
          <p className="text-[10px] text-white/20">
            Загрузите картинки, тексты или PDF перетаскиванием или через кнопку "Загрузить файлы"
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map(item => {
            const isSelected = selectedItemIds.includes(item.id);

            return (
              <div
                key={item.id}
                className={`group bg-[#12131a]/60 hover:bg-[#12131a] border rounded-2xl overflow-hidden transition-all duration-200 flex flex-col justify-between shadow-lg relative ${
                  isSelected 
                    ? 'border-[#F4B5CD] ring-1 ring-[#F4B5CD]/50 bg-[#F4B5CD]/[0.05]' 
                    : 'border-white/5 hover:border-[#F4B5CD]/30'
                }`}
              >
                {/* Select Checkbox */}
                <div className="absolute top-2.5 left-2.5 z-20">
                  <button
                    onClick={() => {
                      setSelectedItemIds(prev => 
                        prev.includes(item.id) ? prev.filter(x => x !== item.id) : [...prev, item.id]
                      );
                    }}
                    className="p-1 rounded-lg bg-black/50 text-white/70 hover:text-[#F4B5CD] transition cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#F4B5CD]" />
                    ) : (
                      <Square className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                    )}
                  </button>
                </div>

                {/* Content Preview Block */}
                <div className="p-3 bg-black/20 flex-1 flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden group/prev">
                  {item.type === 'image' && item.dataUrl ? (
                    <div 
                      onClick={() => setPreviewImageItem(item)}
                      className="w-full h-36 rounded-xl overflow-hidden cursor-pointer relative"
                    >
                      <img 
                        src={item.dataUrl} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover/prev:scale-105 transition duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/prev:opacity-100 transition duration-200 flex items-center justify-center">
                        <Eye className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ) : item.type === 'text' ? (
                    <div 
                      onClick={() => setPreviewTextItem(item)}
                      className="w-full h-36 p-3 bg-white/[0.02] border border-white/5 rounded-xl font-mono text-[10px] text-white/70 overflow-hidden text-left leading-relaxed cursor-pointer hover:border-[#F4B5CD]/30 transition"
                    >
                      <div className="flex items-center gap-1.5 text-[#F4B5CD] text-[9px] uppercase font-bold mb-1 border-b border-white/5 pb-1">
                        <FileText className="w-3 h-3" />
                        <span>Текстовый документ</span>
                      </div>
                      <p className="line-clamp-5 whitespace-pre-wrap">{item.textContent || 'Пусто'}</p>
                    </div>
                  ) : item.type === 'pdf' ? (
                    <div 
                      onClick={() => setPreviewPdfItem(item)}
                      className="w-full h-36 bg-gradient-to-br from-rose-950/20 to-black/40 border border-rose-500/20 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-rose-500/40 transition"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300 font-extrabold text-xs tracking-wider">
                        PDF
                      </div>
                      <span className="text-[10px] text-rose-200/60 font-mono">Документ PDF</span>
                    </div>
                  ) : (
                    <div className="w-full h-36 bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center gap-2">
                      <File className="w-10 h-10 text-white/30" />
                      <span className="text-[10px] text-white/40">Файл</span>
                    </div>
                  )}
                </div>

                {/* Card Info & Actions */}
                <div className="p-3.5 space-y-2 border-t border-white/5 bg-[#12131a]/40">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate" title={item.name}>{item.name}</h4>
                      <span className="text-[9px] text-white/40 font-mono">
                        {formatSize(item.size)}
                      </span>
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setRenamingItem(item);
                          setIsFolderRename(false);
                          setRenameValue(item.name);
                        }}
                        className="p-1 text-white/30 hover:text-white rounded hover:bg-white/10 transition cursor-pointer"
                        title="Переименовать"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="p-1 text-white/30 hover:text-rose-400 rounded hover:bg-rose-500/10 transition cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Action Toolbar */}
                  <div className="grid grid-cols-3 gap-1 pt-1 border-t border-white/5">
                    {/* Copy */}
                    <button
                      onClick={() => handleCopyItem(item)}
                      className="py-1 px-1 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg text-[9px] font-bold uppercase transition cursor-pointer flex items-center justify-center gap-1"
                      title="Скопировать содержимое / ссылку"
                    >
                      <Copy className="w-3 h-3 text-[#F4B5CD]" />
                      <span>Копия</span>
                    </button>

                    {/* Download */}
                    <button
                      onClick={() => handleDownloadItem(item)}
                      className="py-1 px-1 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg text-[9px] font-bold uppercase transition cursor-pointer flex items-center justify-center gap-1"
                      title="Скачать файл"
                    >
                      <Download className="w-3 h-3 text-[#F4B5CD]" />
                      <span>Скачать</span>
                    </button>

                    {/* AirDrop */}
                    <button
                      onClick={() => handleAirDropShare(item)}
                      className="py-1 px-1 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/20 text-[#F4B5CD] rounded-lg text-[9px] font-bold uppercase transition cursor-pointer flex items-center justify-center gap-1"
                      title="Передать по AirDrop / Поделиться"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>AirDrop</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* -------------------- MODAL: CREATE FOLDER -------------------- */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <form onSubmit={handleCreateFolder} className="bg-[#12131a] border border-[#F4B5CD]/30 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-[#F4B5CD] uppercase tracking-wider flex items-center gap-2">
                <FolderPlus className="w-4 h-4" />
                <span>Новая папка</span>
              </h3>
              <button type="button" onClick={() => setShowFolderModal(false)} className="text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono text-white/40 mb-1 block">Название папки</label>
              <input
                type="text"
                placeholder="Например: Домашки, Картинки к уроку..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                required
                className="w-full bg-white/[0.03] border border-white/10 focus:border-[#F4B5CD]/50 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                className="px-4 py-2 bg-white/5 text-white/70 rounded-xl text-xs font-bold uppercase"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#F4B5CD] text-[#12131a] font-bold text-xs uppercase rounded-xl hover:bg-[#ffc5dd] transition"
              >
                Создать
              </button>
            </div>
          </form>
        </div>
      )}

      {/* -------------------- MODAL: CREATE / EDIT TEXT -------------------- */}
      {showTextModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <form onSubmit={handleSaveTextItem} className="bg-[#12131a] border border-[#F4B5CD]/30 w-full max-w-2xl rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-[#F4B5CD] uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>{editingTextItem ? 'Редактировать текст' : 'Новый текстовый материал'}</span>
              </h3>
              <button type="button" onClick={() => setShowTextModal(false)} className="text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono text-white/40 mb-1 block">Заголовок / Название файла</label>
              <input
                type="text"
                placeholder="Например: Шпора по Биологии, Формулы..."
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                required
                className="w-full bg-white/[0.03] border border-white/10 focus:border-[#F4B5CD]/50 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono text-white/40 mb-1 block">Текст материала</label>
              <textarea
                placeholder="Вставьте или напишите текст здесь..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                required
                rows={10}
                className="w-full bg-white/[0.03] border border-white/10 focus:border-[#F4B5CD]/50 p-3 rounded-xl text-xs text-white font-mono leading-relaxed focus:outline-none resize-y"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTextModal(false)}
                className="px-4 py-2 bg-white/5 text-white/70 rounded-xl text-xs font-bold uppercase"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#F4B5CD] text-[#12131a] font-bold text-xs uppercase rounded-xl hover:bg-[#ffc5dd] transition"
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}

      {/* -------------------- MODAL: RENAME -------------------- */}
      {renamingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <form onSubmit={handleSaveRename} className="bg-[#12131a] border border-[#F4B5CD]/30 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-[#F4B5CD] uppercase tracking-wider flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                <span>Переименовать</span>
              </h3>
              <button type="button" onClick={() => setRenamingItem(null)} className="text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono text-white/40 mb-1 block">Новое имя</label>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                required
                className="w-full bg-white/[0.03] border border-white/10 focus:border-[#F4B5CD]/50 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRenamingItem(null)}
                className="px-4 py-2 bg-white/5 text-white/70 rounded-xl text-xs font-bold uppercase"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#F4B5CD] text-[#12131a] font-bold text-xs uppercase rounded-xl hover:bg-[#ffc5dd] transition"
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}

      {/* -------------------- MODAL: IMAGE PREVIEW -------------------- */}
      {previewImageItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center space-y-4 relative">
            <button
              onClick={() => setPreviewImageItem(null)}
              className="absolute top-0 right-0 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <img 
              src={previewImageItem.dataUrl} 
              alt={previewImageItem.name} 
              className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain border border-white/10 shadow-2xl"
              referrerPolicy="no-referrer"
            />

            <div className="flex items-center gap-3 bg-[#12131a] px-6 py-3 rounded-2xl border border-white/10">
              <span className="text-xs text-white font-bold">{previewImageItem.name}</span>
              <button
                onClick={() => handleDownloadItem(previewImageItem)}
                className="px-3 py-1.5 bg-[#F4B5CD] text-[#12131a] rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Скачать</span>
              </button>
              <button
                onClick={() => handleAirDropShare(previewImageItem)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>AirDrop</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: TEXT READ / EDIT PREVIEW -------------------- */}
      {previewTextItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#12131a] border border-[#F4B5CD]/30 w-full max-w-3xl rounded-3xl p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#F4B5CD]" />
                <span>{previewTextItem.name}</span>
              </h3>
              <button onClick={() => setPreviewTextItem(null)} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-black/30 border border-white/5 rounded-2xl p-4 font-mono text-xs text-white/80 leading-relaxed whitespace-pre-wrap select-text">
              {previewTextItem.textContent}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => {
                  setEditingTextItem(previewTextItem);
                  setTextTitle(previewTextItem.name);
                  setTextContent(previewTextItem.textContent || '');
                  setPreviewTextItem(null);
                  setShowTextModal(true);
                }}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Редактировать</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyItem(previewTextItem)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-[#F4B5CD]" />
                  <span>Скопировать весь текст</span>
                </button>

                <button
                  onClick={() => handleAirDropShare(previewTextItem)}
                  className="px-4 py-2 bg-[#F4B5CD] text-[#12131a] rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>AirDrop</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: PDF PREVIEW & ACTIONS -------------------- */}
      {previewPdfItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#12131a] border border-rose-500/30 w-full max-w-xl rounded-3xl p-6 space-y-6 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-300 font-extrabold text-sm tracking-wider">
              PDF
            </div>

            <div>
              <h3 className="text-base font-bold text-white">{previewPdfItem.name}</h3>
              <p className="text-xs text-white/40 mt-1 font-mono">{formatSize(previewPdfItem.size)}</p>
            </div>

            {/* Embedded PDF iframe viewer if dataUrl present */}
            {previewPdfItem.dataUrl && (
              <div className="w-full h-64 bg-black/40 rounded-2xl overflow-hidden border border-white/10">
                <iframe 
                  src={previewPdfItem.dataUrl} 
                  title={previewPdfItem.name}
                  className="w-full h-full border-0"
                />
              </div>
            )}

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => handleDownloadItem(previewPdfItem)}
                className="px-5 py-2.5 bg-[#F4B5CD] text-[#12131a] font-bold text-xs uppercase rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Скачать PDF</span>
              </button>

              <button
                onClick={() => handleAirDropShare(previewPdfItem)}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>AirDrop</span>
              </button>

              <button
                onClick={() => setPreviewPdfItem(null)}
                className="px-4 py-2.5 bg-white/5 text-white/50 hover:text-white rounded-xl text-xs"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: AIRDROP / SHARE DIALOG -------------------- */}
      {shareItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#12131a] border border-[#F4B5CD]/40 w-full max-w-md rounded-3xl p-6 text-center space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShareItem(null)}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Pulsing AirDrop Wave animation */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#F4B5CD]/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-[#F4B5CD]/30 animate-pulse" />
              <div className="w-14 h-14 rounded-full bg-[#F4B5CD] text-[#12131a] flex items-center justify-center z-10 shadow-[0_0_20px_rgba(244,181,205,0.6)]">
                <Radio className="w-8 h-8" />
              </div>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-white">Пересылка по AirDrop</h3>
              <p className="text-xs text-white/50 mt-1 font-mono truncate px-4">{shareItem.name}</p>
            </div>

            <p className="text-xs text-white/70 bg-white/[0.03] border border-white/5 p-3 rounded-2xl leading-relaxed">
              {shareSuccess ? (
                <span className="text-[#F4B5CD] font-bold">✨ Файл отправлен на устройство!</span>
              ) : (
                'Нажмите кнопку ниже, чтобы открыть стандартное меню Apple AirDrop / Поделиться на вашем устройстве.'
              )}
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleAirDropShare(shareItem)}
                className="w-full py-3 bg-[#F4B5CD] text-[#12131a] font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(244,181,205,0.3)] transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Открыть меню AirDrop / Поделиться</span>
              </button>

              <button
                onClick={() => handleDownloadItem(shareItem)}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white/80 font-bold text-xs uppercase rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Скачать напрямую</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: BATCH MOVE TO FOLDER -------------------- */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#12131a] border border-[#F4B5CD]/30 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-[#F4B5CD] uppercase tracking-wider flex items-center gap-2">
                <Folder className="w-4 h-4" />
                <span>Выберите папку назначения</span>
              </h3>
              <button onClick={() => setShowMoveModal(false)} className="text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              <button
                onClick={() => setMoveTargetFolderId(null)}
                className={`w-full p-3 rounded-xl border text-left text-xs font-bold transition flex items-center gap-2 ${
                  moveTargetFolderId === null 
                    ? 'bg-[#F4B5CD]/20 border-[#F4B5CD] text-[#F4B5CD]' 
                    : 'bg-white/5 border-white/5 text-white hover:bg-white/10'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Корень (Без папки)</span>
              </button>

              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => setMoveTargetFolderId(folder.id)}
                  className={`w-full p-3 rounded-xl border text-left text-xs font-bold transition flex items-center gap-2 ${
                    moveTargetFolderId === folder.id 
                      ? 'bg-[#F4B5CD]/20 border-[#F4B5CD] text-[#F4B5CD]' 
                      : 'bg-white/5 border-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  <Folder className="w-4 h-4 fill-[#F4B5CD]/20 text-[#F4B5CD]" />
                  <span>{folder.name}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowMoveModal(false)}
                className="px-4 py-2 bg-white/5 text-white/70 rounded-xl text-xs font-bold uppercase"
              >
                Отмена
              </button>
              <button
                onClick={handleBatchMove}
                className="px-4 py-2 bg-[#F4B5CD] text-[#12131a] font-bold text-xs uppercase rounded-xl hover:bg-[#ffc5dd] transition"
              >
                Переместить
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
