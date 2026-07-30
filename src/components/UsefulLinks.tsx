import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Check, ExternalLink, Link2, Sparkles, BookOpen } from 'lucide-react';

interface UsefulLink {
  id: string;
  title: string;
  url: string;
}

const DEFAULT_LINKS: UsefulLink[] = [
  { id: 'def-1', title: 'ФИПИ Открытый банк заданий', url: 'https://fipi.ru/' },
  { id: 'def-2', title: 'Решу ЕГЭ / ОГЭ портал', url: 'https://sdamgia.ru/' },
  { id: 'def-3', title: 'Справочно-информационный портал Грамота', url: 'https://gramota.ru/' }
];

export const UsefulLinks: React.FC = () => {
  const [links, setLinks] = useState<UsefulLink[]>(() => {
    const saved = localStorage.getItem('useful_links');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_LINKS;
      }
    }
    return DEFAULT_LINKS;
  });

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    localStorage.setItem('useful_links', JSON.stringify(links));
  }, [links]);

  useEffect(() => {
    const handleSync = () => {
      const saved = localStorage.getItem('useful_links');
      if (saved) {
        try {
          setLinks(JSON.parse(saved));
        } catch (e) {}
      }
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('app_cloud_synced', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('app_cloud_synced', handleSync);
    };
  }, []);

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !url.trim()) {
      setError('Заполните все поля!');
      return;
    }

    // Check if URL is valid or add protocol if missing
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    try {
      new URL(formattedUrl);
    } catch (_) {
      setError('Введите корректный URL-адрес!');
      return;
    }

    const newLink: UsefulLink = {
      id: 'link-' + Date.now(),
      title: title.trim(),
      url: formattedUrl
    };

    setLinks(prev => [newLink, ...prev]);
    setTitle('');
    setUrl('');
  };

  const handleDelete = (id: string) => {
    setLinks(prev => prev.filter(link => link.id !== id));
  };

  const handleCopy = (id: string, linkUrl: string) => {
    navigator.clipboard.writeText(linkUrl).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-8 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Link Addition Box */}
        <div className="lg:col-span-4 bg-[#12131a]/70 border border-white/5 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-4 relative">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F4B5CD] animate-pulse" />
            <span className="text-[10px] font-sans uppercase text-[#F4B5CD]/80 tracking-widest font-extrabold">
              Добавить новую ссылку
            </span>
          </div>

          <form onSubmit={handleAddLink} className="space-y-3.5">
            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1.5">
                Название ссылки / Кнопки
              </label>
              <input 
                type="text" 
                required
                placeholder='e.g. Игра "корни"'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl placeholder-white/25 transition duration-200"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1.5">
                URL-адрес
              </label>
              <input 
                type="text" 
                required
                placeholder="e.g. wordwall.net/resource/123..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl placeholder-white/25 transition duration-200 font-mono"
              />
            </div>

            {error && (
              <p className="text-[10px] text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
                ⚠️ {error}
              </p>
            )}

            <button 
              type="submit"
              className="w-full h-10 bg-[#F4B5CD]/15 hover:bg-[#F4B5CD]/25 border border-[#F4B5CD]/20 text-[#F4B5CD] text-[10px] tracking-widest uppercase font-bold transition rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] shadow-md shadow-[#F4B5CD]/5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить ссылку</span>
            </button>
          </form>
        </div>

        {/* Right Side: Links Grid List */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <span className="text-[10px] font-sans uppercase text-white/40 tracking-widest font-extrabold">
              Ваши сохраненные ссылки ({links.length})
            </span>
          </div>

          {links.length === 0 ? (
            <div className="bg-[#12131a]/30 border border-dashed border-white/10 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-3">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/30">
                <BookOpen className="w-5 h-5 text-[#F4B5CD]" />
              </div>
              <h4 className="font-serif text-sm text-white">Список ссылок пуст</h4>
              <p className="text-[10px] text-white/40 leading-relaxed font-light">
                Добавьте ссылки на полезные игры, интерактивные викторины, словари или методические материалы, чтобы они всегда были под рукой!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {links.map((link) => (
                <div 
                  key={link.id}
                  className="bg-gradient-to-br from-[#12131a]/85 to-white/[0.01] hover:to-[#F4B5CD]/[0.02] border border-white/5 hover:border-white/15 p-3.5 rounded-2xl flex items-center justify-between gap-4 transition duration-300 group shadow-lg"
                >
                  {/* Clickable link label */}
                  <a 
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-left min-w-0 pr-2 group/link"
                    title={`Открыть: ${link.url}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C3B4FC]/60 group-hover/link:bg-[#F4B5CD] transition shrink-0" />
                      <p className="text-xs font-serif font-medium text-white/95 group-hover/link:text-[#F4B5CD] transition truncate leading-relaxed">
                        {link.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-white/20 mt-1 font-mono truncate">
                      <Link2 className="w-2.5 h-2.5 opacity-50" />
                      <span className="truncate">{link.url}</span>
                    </div>
                  </a>

                  {/* Quick Copy / Delete Actions Row */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCopy(link.id, link.url)}
                      title="Копировать ссылку"
                      className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-center ${
                        copiedId === link.id
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                          : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5 text-white/40 hover:text-white'
                      }`}
                    >
                      {copiedId === link.id ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleDelete(link.id)}
                      title="Удалить"
                      className="p-2 bg-white/[0.02] hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 text-white/40 hover:text-rose-400 rounded-xl transition cursor-pointer flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
