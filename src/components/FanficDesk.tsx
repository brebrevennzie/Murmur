import React, { useState, useEffect } from 'react';
import { 
  User, BookOpen, Heart, Sparkles, Plus, Trash2, 
  Copy, Check, Edit3, Layers, X, Compass, Info, Filter, PlusCircle
} from 'lucide-react';

export interface FanficCharacter {
  id: string;
  name: string;
  age?: string;
  traits?: string; // e.g. "гей, близнец"
  description: string; // Внешность, характер, особенности
  group: string; // Сгруппировать (e.g. "Элитный пансион (Берлин)")
  createdAt: number;
}

export interface FanficLore {
  id: string;
  title: string;
  content: string; // Описание лора или отношений
  group: string; // Ссылка на фэндом или общую группу
  createdAt: number;
}

const DEFAULT_CHARACTERS: FanficCharacter[] = [
  {
    id: 'char-1',
    name: 'Марк (Я)',
    age: '17',
    traits: 'гей, ласковый',
    description: 'Высокий, с длинными волосами и пирсингом в губе. По натуре — очень мягкий и ласковый, гей.',
    group: 'Элитный пансион (Берлин)',
    createdAt: Date.now()
  },
  {
    id: 'char-2',
    name: 'Габриэль (Бри, Джи)',
    age: '18',
    traits: 'гей, высокий',
    description: 'Зеленоглазый, с темными длинными волосами, высокий, невероятно красивая. гей.',
    group: 'Элитный пансион (Берлин)',
    createdAt: Date.now() - 1000
  },
  {
    id: 'char-3',
    name: 'Билл',
    age: '17',
    traits: 'гей, близнец',
    description: 'Мой близнец, длинные черные волосы, пирсинг брови. Носит темный макияж. Ласковый, добрый, вечно требующий внимания. гей.',
    group: 'Элитный пансион (Берлин)',
    createdAt: Date.now() - 2000
  },
  {
    id: 'char-4',
    name: 'Георг (Гео)',
    age: '17',
    traits: 'гей, на позитиве',
    description: 'Черные короткие волосы, голубые глаза, татухи. Всегда на позитиве, очень добрый. Одноклассник и мой лучший друг. гей.',
    group: 'Элитный пансион (Берлин)',
    createdAt: Date.now() - 3000
  },
  {
    id: 'char-5',
    name: 'Кристофер (Крис)',
    age: '18',
    traits: 'гей, татуировки',
    description: 'Твой брат-близнец. Твоя точная копия. Зеленые холодные глаза, длинные густые темные волосы, в ушах сережки, мощный, в татуировках, высокий. гей.',
    group: 'Элитный пансион (Берлин)',
    createdAt: Date.now() - 4000
  },
  {
    id: 'char-6',
    name: 'Давид (Дав)',
    age: '18',
    traits: 'гей, белые волосы',
    description: 'Брат Криса и Джи. Высокий, сильный, в татуировках, с синими глазами и абсолютно белыми густыми длинными волосами. гей.',
    group: 'Элитный пансион (Берлин)',
    createdAt: Date.now() - 5000
  }
];

const DEFAULT_LORES: FanficLore[] = [
  {
    id: 'lore-1',
    title: 'Место действия и Стиль',
    content: 'Берлин, сентябрь. Элитный пансион. Повествование в настоящем времени. Ответы подробные, детально прописанные диалоги. Не стесняйся использовать юмор и легкий мат.',
    group: 'Элитный пансион (Берлин)',
    createdAt: Date.now()
  },
  {
    id: 'lore-2',
    title: 'Отношения: Марк и Кристофер',
    content: 'Марк и Крис — близкие друзья, но между ними чувствуется скрытое соперничество и невысказанное притяжение. Крис защищает Марка, но любит поддразнивать.',
    group: 'Элитный пансион (Берлин)',
    createdAt: Date.now() - 1000
  }
];

export const FanficDesk: React.FC = () => {
  // Persistence state
  const [characters, setCharacters] = useState<FanficCharacter[]>(() => {
    const saved = localStorage.getItem('secret_notes_fanfic_characters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load fanfic characters', e);
      }
    }
    return DEFAULT_CHARACTERS;
  });

  const [lores, setLores] = useState<FanficLore[]>(() => {
    const saved = localStorage.getItem('secret_notes_fanfic_lores');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load fanfic lores', e);
      }
    }
    return DEFAULT_LORES;
  });

  // Active group selection for filtering characters & lores on main panel
  const [activeGroup, setActiveGroup] = useState<string>('Все');

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Prompt compiler modal state
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  // Multi-selection states for compilator (tied to prompt builder)
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
  const [selectedLoreIds, setSelectedLoreIds] = useState<string[]>([]);

  // Character Add / Edit Forms (main screen)
  const [showAddCharForm, setShowAddCharForm] = useState(false);
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  
  // Character field states
  const [charName, setCharName] = useState('');
  const [charAge, setCharAge] = useState('');
  const [charTraits, setCharTraits] = useState('');
  const [charDescription, setCharDescription] = useState('');
  const [charGroup, setCharGroup] = useState('Ориджинал');

  // Lore Add / Edit Forms (main screen)
  const [showAddLoreForm, setShowAddLoreForm] = useState(false);
  const [editingLoreId, setEditingLoreId] = useState<string | null>(null);

  // Lore field states
  const [loreTitle, setLoreTitle] = useState('');
  const [loreContent, setLoreContent] = useState('');
  const [loreGroup, setLoreGroup] = useState('Ориджинал');

  // Mini forms inside compiling modal
  const [showModalAddChar, setShowModalAddChar] = useState(false);
  const [showModalAddLore, setShowModalAddLore] = useState(false);

  // Clipboard copy success animations
  const [compilationCopied, setCompilationCopied] = useState(false);

  // Auto-save mechanisms
  const saveCharacters = (updated: FanficCharacter[]) => {
    setCharacters(updated);
    localStorage.setItem('secret_notes_fanfic_characters', JSON.stringify(updated));
  };

  const saveLores = (updated: FanficLore[]) => {
    setLores(updated);
    localStorage.setItem('secret_notes_fanfic_lores', JSON.stringify(updated));
  };

  // Preset Seeding
  const handleLoadPresets = () => {
    saveCharacters(DEFAULT_CHARACTERS);
    saveLores(DEFAULT_LORES);
    setActiveGroup('Все');
  };

  // Reset entirely
  const handleClearAll = () => {
    if (confirm('Очистить всю базу персонажей и лора фанфиков?')) {
      saveCharacters([]);
      saveLores([]);
      setSelectedCharIds([]);
      setSelectedLoreIds([]);
    }
  };

  // Group options builder
  const allGroups = Array.from(new Set([
    'Все',
    ...characters.map(c => c.group || 'Ориджинал'),
    ...lores.map(l => l.group || 'Ориджинал')
  ])).filter(g => g && g.trim() !== '');

  // Filter lists based on group and search query
  const filteredCharacters = characters.filter(char => {
    const groupMatches = activeGroup === 'Все' || char.group === activeGroup;
    const searchMatches = !searchQuery.trim() || 
      char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (char.traits && char.traits.toLowerCase().includes(searchQuery.toLowerCase())) ||
      char.description.toLowerCase().includes(searchQuery.toLowerCase());
    return groupMatches && searchMatches;
  });

  const filteredLores = lores.filter(lore => {
    const groupMatches = activeGroup === 'Все' || lore.group === activeGroup;
    const searchMatches = !searchQuery.trim() ||
      lore.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lore.content.toLowerCase().includes(searchQuery.toLowerCase());
    return groupMatches && searchMatches;
  });

  // Toggle selection for compilation
  const handleToggleCharSelect = (id: string) => {
    setSelectedCharIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleLoreSelect = (id: string) => {
    setSelectedLoreIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Compile full text template
  const getCompiledText = () => {
    const selectedChars = characters.filter(c => selectedCharIds.includes(c.id));
    const selectedLores = lores.filter(l => selectedLoreIds.includes(l.id));

    if (selectedChars.length === 0 && selectedLores.length === 0) {
      return 'Пожалуйста, выберите хотя бы одного персонажа или лор-заметку из списка слева, чтобы собрать сюжетную карточку! ✨';
    }

    let result = '';

    if (selectedChars.length > 0) {
      result += '👥 ПЕРСОНАЖИ И ХАРАКТЕРИСТИКИ\n';
      selectedChars.forEach(char => {
        const agePart = char.age ? `${char.age} лет. ` : '';
        const traitsPart = char.traits ? `(${char.traits}). ` : '';
        result += `${char.name}: ${agePart}${traitsPart}${char.description}\n`;
      });
      result += '\n';
    }

    if (selectedLores.length > 0) {
      result += '📜 ЛОР И СВЯЗИ\n';
      selectedLores.forEach(lore => {
        result += `${lore.title}: ${lore.content}\n`;
      });
    }

    return result.trim();
  };

  // Copy full compilation
  const handleCopyCompilation = () => {
    const text = getCompiledText();
    navigator.clipboard.writeText(text).then(() => {
      setCompilationCopied(true);
      setTimeout(() => setCompilationCopied(false), 2000);
    });
  };

  // Open Prompt compilation flow
  const handleOpenPromptCreator = () => {
    // Select all displayed or visible items by default so user can quickly filter/generate
    setSelectedCharIds(filteredCharacters.map(c => c.id));
    setSelectedLoreIds(filteredLores.map(l => l.id));
    setIsPromptModalOpen(true);
  };

  // Add / Edit Character Action
  const handleSaveCharacter = (e: React.FormEvent, isModalSource = false) => {
    e.preventDefault();
    if (!charName.trim() || !charDescription.trim()) return;

    if (editingCharId) {
      // Editing
      const updated = characters.map(c => c.id === editingCharId ? {
        ...c,
        name: charName.trim(),
        age: charAge.trim() || undefined,
        traits: charTraits.trim() || undefined,
        description: charDescription.trim(),
        group: charGroup.trim() || 'Ориджинал'
      } : c);
      saveCharacters(updated);
      setEditingCharId(null);
    } else {
      // Creating
      const newChar: FanficCharacter = {
        id: `char-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: charName.trim(),
        age: charAge.trim() || undefined,
        traits: charTraits.trim() || undefined,
        description: charDescription.trim(),
        group: charGroup.trim() || 'Ориджинал',
        createdAt: Date.now()
      };
      const updated = [newChar, ...characters];
      saveCharacters(updated);
      setSelectedCharIds(prev => [...prev, newChar.id]); // Auto-select new items
      if (isModalSource) {
        setShowModalAddChar(false);
      } else {
        setShowAddCharForm(false);
      }
    }

    // Reset fields
    setCharName('');
    setCharAge('');
    setCharTraits('');
    setCharDescription('');
  };

  // Delete character
  const handleDeleteCharacter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Удалить эту карточку персонажа?')) {
      const updated = characters.filter(c => c.id !== id);
      saveCharacters(updated);
      setSelectedCharIds(prev => prev.filter(x => x !== id));
    }
  };

  // Start edit character
  const handleStartEditChar = (char: FanficCharacter, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCharId(char.id);
    setCharName(char.name);
    setCharAge(char.age || '');
    setCharTraits(char.traits || '');
    setCharDescription(char.description);
    setCharGroup(char.group);
    setShowAddCharForm(true);
  };

  // Add / Edit Lore Action
  const handleSaveLore = (e: React.FormEvent, isModalSource = false) => {
    e.preventDefault();
    if (!loreTitle.trim() || !loreContent.trim()) return;

    if (editingLoreId) {
      // Editing
      const updated = lores.map(l => l.id === editingLoreId ? {
        ...l,
        title: loreTitle.trim(),
        content: loreContent.trim(),
        group: loreGroup.trim() || 'Ориджинал'
      } : l);
      saveLores(updated);
      setEditingLoreId(null);
    } else {
      // Creating
      const newLore: FanficLore = {
        id: `lore-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title: loreTitle.trim(),
        content: loreContent.trim(),
        group: loreGroup.trim() || 'Ориджинал',
        createdAt: Date.now()
      };
      const updated = [newLore, ...lores];
      saveLores(updated);
      setSelectedLoreIds(prev => [...prev, newLore.id]); // Auto-select new items
      if (isModalSource) {
        setShowModalAddLore(false);
      } else {
        setShowAddLoreForm(false);
      }
    }

    // Reset fields
    setLoreTitle('');
    setLoreContent('');
  };

  // Delete lore
  const handleDeleteLore = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Удалить это описание лора/отношений?')) {
      const updated = lores.filter(l => l.id !== id);
      saveLores(updated);
      setSelectedLoreIds(prev => prev.filter(x => x !== id));
    }
  };

  // Start edit lore
  const handleStartEditLore = (lore: FanficLore, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLoreId(lore.id);
    setLoreTitle(lore.title);
    setLoreContent(lore.content);
    setLoreGroup(lore.group);
    setShowAddLoreForm(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* ACTION TOP LINE & NEW PROMPT BIG TRIGGER */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4 shadow-md">
        
        {/* Simple Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#F4B5CD]/10 border border-[#F4B5CD]/20 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-[#F4B5CD]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">I think we're doomed.</h3>
          </div>
        </div>

        {/* Action Group */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleLoadPresets}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
            title="Восстановить примеры истории про Берлин и Марка"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Шаблоны</span>
          </button>
          
          <button
            type="button"
            onClick={handleClearAll}
            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/18 border border-rose-500/20 text-rose-300 rounded-xl transition cursor-pointer"
            title="Полностью очистить все карточки"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleOpenPromptCreator}
            className="px-4 py-2 bg-[#F4B5CD] text-[#12131a] hover:bg-[#ffc5dd] rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all duration-200 shadow-[0_0_15px_rgba(244,181,205,0.25)] flex items-center gap-1.5 cursor-pointer ml-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Новый промпт ✨</span>
          </button>
        </div>
      </div>

      {/* Group Tabs (Сгруппировать) */}
      <div className="flex flex-wrap gap-2 items-center pb-2 border-b border-white/5">
        <span className="text-[9px] uppercase tracking-wider font-extrabold font-mono text-white/30 flex items-center gap-1 mr-2">
          <Layers className="w-3.5 h-3.5 text-[#F4B5CD]" /> Книги / Вселенная:
        </span>
        {allGroups.map(group => {
          const totalInGroup = characters.filter(c => c.group === group).length + lores.filter(l => l.group === group).length;
          const displayCount = group === 'Все' ? (characters.length + lores.length) : totalInGroup;

          return (
            <button
              key={group}
              onClick={() => setActiveGroup(group)}
              className={`px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-xl border transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                activeGroup === group
                  ? 'bg-[#F4B5CD]/15 border-[#F4B5CD]/50 text-[#F4B5CD] shadow-[0_0_10px_rgba(244,181,205,0.1)]'
                  : 'bg-white/[0.01] border-white/5 text-white/50 hover:text-white hover:border-white/10'
              }`}
            >
              <span>{group}</span>
              <span className="px-1.5 py-0.2 bg-white/10 text-white/70 rounded-full text-[8px] font-mono">
                {displayCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main split work Desk - REPOSITORY MANAGEMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* CHARACTERS MANAGEMENT BLOCK */}
        <div className="bg-[#12131a]/30 border border-white/5 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex justify-between items-center">
            <h4 className="text-xs uppercase tracking-wider font-extrabold text-[#F4B5CD] flex items-center gap-2">
              <User className="w-4 h-4 text-[#F4B5CD]" />
              <span>Персонажи ({filteredCharacters.length})</span>
            </h4>
            <button
              type="button"
              onClick={() => {
                setEditingCharId(null);
                setCharName('');
                setCharAge('');
                setCharTraits('');
                setCharDescription('');
                setShowAddCharForm(true);
              }}
              className="px-3 py-1.5 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/18 border border-[#F4B5CD]/20 text-[#F4B5CD] text-[9px] uppercase tracking-wider font-extrabold rounded-lg transition duration-150 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Создать</span>
            </button>
          </div>

          {/* Inline add character form */}
          {showAddCharForm && (
            <form onSubmit={(e) => handleSaveCharacter(e, false)} className="bg-[#12131a]/95 border border-[#F4B5CD]/30 p-4 rounded-xl space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] uppercase font-bold text-white/70">
                  {editingCharId ? 'Редактировать карточку' : 'Новый персонаж'}
                </span>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddCharForm(false);
                    setEditingCharId(null);
                  }} 
                  className="text-white/40 hover:text-[#F4B5CD]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-white/40 uppercase font-mono">Имя персонажа</label>
                  <input
                    type="text"
                    placeholder="Например: Марк (Я)"
                    value={charName}
                    onChange={(e) => setCharName(e.target.value)}
                    required
                    className="w-full bg-white/[0.02] border border-white/10 focus:border-[#F4B5CD]/40 p-2 rounded-lg text-xs text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-[#F4B5CD]/20 transition"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 uppercase font-mono">Возраст</label>
                  <input
                    type="text"
                    placeholder="Например: 17 или 18"
                    value={charAge}
                    onChange={(e) => setCharAge(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 focus:border-[#F4B5CD]/40 p-2 rounded-lg text-xs text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-[#F4B5CD]/20 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-white/40 uppercase font-mono">Метки/Особенности</label>
                  <input
                    type="text"
                    placeholder="Например: гей, близнец"
                    value={charTraits}
                    onChange={(e) => setCharTraits(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 focus:border-[#F4B5CD]/40 p-2 rounded-lg text-xs text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-[#F4B5CD]/20 transition"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 uppercase font-mono">Книга / Группа</label>
                  <input
                    type="text"
                    placeholder="Например: Ориджинал, Берлин..."
                    value={charGroup}
                    onChange={(e) => setCharGroup(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 focus:border-[#F4B5CD]/40 p-2 rounded-lg text-xs text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-[#F4B5CD]/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] text-white/40 uppercase font-mono font-medium">Внешность, характер, биография</label>
                <textarea
                  placeholder="Опишите внешность, характер и другие важные подробности..."
                  value={charDescription}
                  onChange={(e) => setCharDescription(e.target.value)}
                  required
                  rows={3}
                  className="w-full bg-white/[0.02] border border-white/10 focus:border-[#F4B5CD]/40 p-2 rounded-lg text-xs text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-[#F4B5CD]/20 transition leading-relaxed resize-y font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCharForm(false);
                    setEditingCharId(null);
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg text-[9px] font-extrabold uppercase cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#F4B5CD]/15 hover:bg-[#F4B5CD]/25 text-[#F4B5CD] rounded-lg text-[9px] font-extrabold uppercase cursor-pointer"
                >
                  {editingCharId ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          )}

          {/* Characters List */}
          {filteredCharacters.length === 0 ? (
            <div className="text-center py-8 text-white/20 italic text-xs border border-dashed border-white/5 rounded-xl">
              {searchQuery ? 'Персонажи не найдены.' : 'База персонажей пуста.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
              {filteredCharacters.map(char => (
                <div 
                  key={char.id}
                  className="bg-[#12131a]/40 border border-white/5 hover:border-white/15 p-4 rounded-xl flex flex-col justify-between gap-3 text-left relative group transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-[#F4B5CD]/10 text-[#F4B5CD] border border-[#F4B5CD]/25 flex items-center justify-center text-[10px] font-extrabold uppercase shrink-0">
                          {char.name.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-white truncate">{char.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleStartEditChar(char, e)}
                          className="p-1 hover:bg-white/5 text-white/40 hover:text-white rounded-md transition cursor-pointer"
                          title="Редактировать"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCharacter(char.id, e)}
                          className="p-1 hover:bg-rose-500/10 text-white/30 hover:text-rose-400 rounded-md transition cursor-pointer"
                          title="Удалить"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {char.age && (
                        <span className="px-1.5 py-0.2 bg-white/5 text-white/50 rounded text-[8px] font-mono">
                          {char.age} лет
                        </span>
                      )}
                      {char.traits && char.traits.split(',').map((tr, idx) => (
                        <span key={idx} className="px-1.5 py-0.2 bg-[#F4B5CD]/10 text-[#F4B5CD] rounded text-[8px] font-semibold">
                          {tr.trim()}
                        </span>
                      ))}
                      <span className="ml-auto text-[8px] text-white/20 uppercase font-mono tracking-widest truncate max-w-[80px]">
                        {char.group}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-white/60 font-sans leading-relaxed break-words line-clamp-4">
                    {char.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LORE & SCENARIOS MANAGEMENT BLOCK */}
        <div className="bg-[#12131a]/30 border border-white/5 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex justify-between items-center">
            <h4 className="text-xs uppercase tracking-wider font-extrabold text-[#F4B5CD] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#F4B5CD]" />
              <span>Лор и Сюжетные темы ({filteredLores.length})</span>
            </h4>
            <button
              type="button"
              onClick={() => {
                setEditingLoreId(null);
                setLoreTitle('');
                setLoreContent('');
                setShowAddLoreForm(true);
              }}
              className="px-3 py-1.5 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/18 border border-[#F4B5CD]/20 text-[#F4B5CD] text-[9px] uppercase tracking-wider font-extrabold rounded-lg transition duration-150 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить</span>
            </button>
          </div>

          {/* Inline add lore form */}
          {showAddLoreForm && (
            <form onSubmit={(e) => handleSaveLore(e, false)} className="bg-[#12131a]/95 border border-[#F4B5CD]/30 p-4 rounded-xl space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] uppercase font-bold text-white/70">
                  {editingLoreId ? 'Редактировать лор' : 'Новый лор/связь'}
                </span>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddLoreForm(false);
                    setEditingLoreId(null);
                  }} 
                  className="text-white/40 hover:text-[#F4B5CD]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-white/40 uppercase font-mono">Название связи или темы</label>
                  <input
                    type="text"
                    placeholder="Например: Любовники, Берлинский лор..."
                    value={loreTitle}
                    onChange={(e) => setLoreTitle(e.target.value)}
                    required
                    className="w-full bg-white/[0.02] border border-white/10 focus:border-[#F4B5CD]/40 p-2 rounded-lg text-xs text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-[#F4B5CD]/20 transition"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 uppercase font-mono">Группа / Вселенная</label>
                  <input
                    type="text"
                    placeholder="Например: Ориджинал, Берлин..."
                    value={loreGroup}
                    onChange={(e) => setLoreGroup(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 focus:border-[#F4B5CD]/40 p-2 rounded-lg text-xs text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-[#F4B5CD]/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] text-white/40 uppercase font-mono font-medium">Описание отношений или особенностей сюжета</label>
                <textarea
                  placeholder="Опишите лор, сюжетные связи, место действия или отношения персонажей..."
                  value={loreContent}
                  onChange={(e) => setLoreContent(e.target.value)}
                  required
                  rows={4}
                  className="w-full bg-white/[0.02] border border-white/10 focus:border-[#F4B5CD]/40 p-2 rounded-lg text-xs text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-[#F4B5CD]/20 transition leading-relaxed resize-y font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddLoreForm(false);
                    setEditingLoreId(null);
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg text-[9px] font-extrabold uppercase cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#F4B5CD]/15 hover:bg-[#F4B5CD]/25 text-[#F4B5CD] rounded-lg text-[9px] font-extrabold uppercase cursor-pointer"
                >
                  {editingLoreId ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          )}

          {/* Lores List */}
          {filteredLores.length === 0 ? (
            <div className="text-center py-8 text-white/20 italic text-xs border border-dashed border-white/5 rounded-xl">
              {searchQuery ? 'Записи лора не найдены.' : 'Записей лора пока нет.'}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
              {filteredLores.map(lore => (
                <div 
                  key={lore.id}
                  className="bg-[#12131a]/40 border border-white/5 hover:border-white/15 p-4 rounded-xl flex flex-col gap-2 text-left relative group/lore transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="w-3.5 h-3.5 text-white/40" />
                      <span className="text-xs font-bold text-white truncate">{lore.title}</span>
                      <span className="px-1.5 py-0.2 bg-white/5 text-white/30 rounded text-[7.5px] uppercase font-mono truncate max-w-[100px]">
                        {lore.group}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleStartEditLore(lore, e)}
                        className="p-1 hover:bg-white/5 text-white/40 hover:text-white rounded-md transition cursor-pointer"
                        title="Редактировать"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteLore(lore.id, e)}
                        className="p-1 hover:bg-rose-500/10 text-white/30 hover:text-rose-400 rounded-md transition cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-white/70 leading-relaxed font-sans whitespace-pre-wrap font-normal break-words pl-5 border-l border-white/5">
                    {lore.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* -------------------- NEW PROMPT OVERLAY MODAL -------------------- */}
      {isPromptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-[#12131a] to-[#25171e] border border-[#F4B5CD]/30 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-black/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#F4B5CD] animate-pulse" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#F4B5CD]">Генератор Сюжетного Промпта ✨</h3>
              </div>
              <button 
                onClick={() => {
                  setIsPromptModalOpen(false);
                  setShowModalAddChar(false);
                  setShowModalAddLore(false);
                }}
                className="p-1.5 hover:bg-white/5 text-white/50 hover:text-white rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Grid */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 no-scrollbar">
              
              {/* LEFT: Items Selection (Lg: 7) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Quick Selection List: Characters */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-extrabold text-[#F4B5CD] tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Шаг 1: Выберите персонажей ({characters.filter(c => selectedCharIds.includes(c.id)).length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowModalAddChar(!showModalAddChar)}
                      className="text-[9.5px] text-[#F4B5CD] hover:text-[#ffc5dd] font-semibold flex items-center gap-1 cursor-pointer bg-[#F4B5CD]/10 px-2 py-1 rounded-md border border-[#F4B5CD]/20"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{showModalAddChar ? 'Закрыть форму' : 'Создать на месте'}</span>
                    </button>
                  </div>

                  {/* Add Character Quick Inline form inside Modal */}
                  {showModalAddChar && (
                    <form onSubmit={(e) => handleSaveCharacter(e, true)} className="bg-black/40 border border-[#F4B5CD]/20 p-3.5 rounded-xl space-y-3.5 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          placeholder="Имя"
                          value={charName}
                          onChange={(e) => setCharName(e.target.value)}
                          required
                          className="bg-white/[0.02] border border-white/10 p-2 rounded-lg text-xs text-white"
                        />
                        <input
                          type="text"
                          placeholder="Возраст"
                          value={charAge}
                          onChange={(e) => setCharAge(e.target.value)}
                          className="bg-white/[0.02] border border-white/10 p-2 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          placeholder="Метки (например: гей, близнец)"
                          value={charTraits}
                          onChange={(e) => setCharTraits(e.target.value)}
                          className="bg-white/[0.02] border border-white/10 p-2 rounded-lg text-xs text-white"
                        />
                        <input
                          type="text"
                          placeholder="Вселенная (например: Берлин)"
                          value={charGroup}
                          onChange={(e) => setCharGroup(e.target.value)}
                          className="bg-white/[0.02] border border-white/10 p-2 rounded-lg text-xs text-white"
                        />
                      </div>
                      <textarea
                        placeholder="Опишите внешность и характер..."
                        value={charDescription}
                        onChange={(e) => setCharDescription(e.target.value)}
                        required
                        rows={2}
                        className="w-full bg-white/[0.02] border border-white/10 p-2 rounded-lg text-xs text-white"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => setShowModalAddChar(false)} className="px-2.5 py-1 bg-white/5 rounded-md text-[9px] text-white/50 font-bold uppercase">Отмена</button>
                        <button type="submit" className="px-3 py-1 bg-[#F4B5CD]/20 hover:bg-[#F4B5CD]/30 border border-[#F4B5CD]/35 text-[#F4B5CD] rounded-md text-[9px] font-bold uppercase">Добавить</button>
                      </div>
                    </form>
                  )}

                  {/* Character Checklist Selector */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto no-scrollbar border border-white/5 rounded-xl p-2 bg-black/10">
                    {characters.map(char => {
                      const isSelected = selectedCharIds.includes(char.id);
                      return (
                        <div
                          key={char.id}
                          onClick={() => handleToggleCharSelect(char.id)}
                          className={`p-2.5 rounded-lg border transition duration-150 cursor-pointer flex items-center gap-3 text-left ${
                            isSelected 
                              ? 'bg-[#F4B5CD]/[0.08] border-[#F4B5CD]/40' 
                              : 'bg-[#12131a]/40 border-white/5 hover:border-white/15'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Controlled via parent onClick
                            className="accent-[#F4B5CD] shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white block truncate">{char.name}</span>
                            <span className="text-[9px] text-white/40 block truncate">
                              {char.traits || 'без меток'} · {char.group}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Selection List: Lores */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-extrabold text-[#F4B5CD] tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> Шаг 2: Выберите темы лора / связи ({lores.filter(l => selectedLoreIds.includes(l.id)).length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowModalAddLore(!showModalAddLore)}
                      className="text-[9.5px] text-[#F4B5CD] hover:text-[#ffc5dd] font-semibold flex items-center gap-1 cursor-pointer bg-[#F4B5CD]/10 px-2 py-1 rounded-md border border-[#F4B5CD]/20"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{showModalAddLore ? 'Закрыть форму' : 'Создать на месте'}</span>
                    </button>
                  </div>

                  {/* Add Lore Quick Inline form inside Modal */}
                  {showModalAddLore && (
                    <form onSubmit={(e) => handleSaveLore(e, true)} className="bg-black/40 border border-[#F4B5CD]/20 p-3.5 rounded-xl space-y-3.5 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          placeholder="Название лора/темы"
                          value={loreTitle}
                          onChange={(e) => setLoreTitle(e.target.value)}
                          required
                          className="bg-white/[0.02] border border-white/10 p-2 rounded-lg text-xs text-white"
                        />
                        <input
                          type="text"
                          placeholder="Книга/Вселенная"
                          value={loreGroup}
                          onChange={(e) => setLoreGroup(e.target.value)}
                          className="bg-white/[0.02] border border-white/10 p-2 rounded-lg text-xs text-white"
                        />
                      </div>
                      <textarea
                        placeholder="Опишите лор, сюжетные связи, место действия или отношения персонажей..."
                        value={loreContent}
                        onChange={(e) => setLoreContent(e.target.value)}
                        required
                        rows={2}
                        className="w-full bg-white/[0.02] border border-white/10 p-2 rounded-lg text-xs text-white"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => setShowModalAddLore(false)} className="px-2.5 py-1 bg-white/5 rounded-md text-[9px] text-white/50 font-bold uppercase">Отмена</button>
                        <button type="submit" className="px-3 py-1 bg-[#F4B5CD]/20 hover:bg-[#F4B5CD]/30 border border-[#F4B5CD]/35 text-[#F4BCD] rounded-md text-[9px] font-bold uppercase">Добавить</button>
                      </div>
                    </form>
                  )}

                  {/* Lore Checklist Selector */}
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto no-scrollbar border border-white/5 rounded-xl p-2 bg-black/10">
                    {lores.map(lore => {
                      const isSelected = selectedLoreIds.includes(lore.id);
                      return (
                        <div
                          key={lore.id}
                          onClick={() => handleToggleLoreSelect(lore.id)}
                          className={`p-2 rounded-lg border transition duration-150 cursor-pointer flex items-start gap-3 text-left ${
                            isSelected 
                              ? 'bg-[#F4B5CD]/[0.08] border-[#F4B5CD]/40' 
                              : 'bg-[#12131a]/40 border-white/5 hover:border-white/15'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Controlled via parent onClick
                            className="accent-[#F4B5CD] mt-0.5 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white block">{lore.title}</span>
                            <span className="text-[10px] text-white/50 block line-clamp-1">{lore.content}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* RIGHT: Live Compiled Text Output (Lg: 5) */}
              <div className="lg:col-span-5 flex flex-col justify-between bg-black/35 border border-white/5 p-5 rounded-2xl relative">
                
                <div className="space-y-1.5 mb-3">
                  <span className="text-[10px] uppercase font-extrabold text-[#F4B5CD] tracking-widest block">
                    📜 Готовая Сюжетная Сборка
                  </span>
                  <p className="text-[10px] text-white/40">
                    Текст ниже генерируется на лету по выбранным галочкам:
                  </p>
                </div>

                <textarea
                  readOnly
                  value={getCompiledText()}
                  className="w-full flex-1 bg-black/50 border border-white/5 hover:border-white/10 rounded-xl p-4 text-[10.5px] font-mono leading-relaxed text-white placeholder-white/20 focus:outline-none resize-none h-60 lg:h-[350px] overflow-y-auto no-scrollbar"
                />

                <button
                  type="button"
                  onClick={handleCopyCompilation}
                  disabled={selectedCharIds.length === 0 && selectedLoreIds.length === 0}
                  className={`w-full mt-4 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition duration-200 shadow-lg ${
                    selectedCharIds.length === 0 && selectedLoreIds.length === 0
                      ? 'bg-white/5 border border-white/5 text-white/20 cursor-not-allowed'
                      : 'bg-[#F4B5CD] hover:bg-[#ffc5dd] active:scale-[0.98] text-[#12131a] shadow-[#F4B5CD]/10 cursor-pointer'
                  }`}
                >
                  {compilationCopied ? (
                    <>
                      <Check className="w-4 h-4 text-[#12131a] animate-bounce" />
                      <span>СКОПИРОВАНО В БУФЕР! 💖</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#12131a]" />
                      <span>СКОПИРОВАТЬ ДЛЯ ФАНФИКА 📋</span>
                    </>
                  )}
                </button>

                <div className="mt-3.5 flex gap-2 items-start text-left bg-white/[0.01] p-2.5 rounded-xl border border-white/5">
                  <Info className="w-3.5 h-3.5 text-[#F4B5CD] shrink-0 mt-0.5" />
                  <p className="text-[9.5px] text-white/40 leading-normal">
                    Скопируйте и отправьте это AI перед началом генерации, чтобы он помнил все сюжетные связи и внешность!
                  </p>
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/5 bg-black/20 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsPromptModalOpen(false);
                  setShowModalAddChar(false);
                  setShowModalAddLore(false);
                }}
                className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Закрыть меню
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
