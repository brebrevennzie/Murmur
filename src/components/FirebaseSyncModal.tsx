import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { X, Cloud, CloudOff, Lock, Mail, RefreshCw, AlertCircle, CheckCircle, ArrowRight, LogOut, Shield } from 'lucide-react';

interface FirebaseSyncModalProps {
  user: User | null;
  syncStatus: 'idle' | 'syncing' | 'saved' | 'error';
  authError: string | null;
  setAuthError: (err: string | null) => void;
  onClose: () => void;
  onSignIn: (email: string, pass: string) => Promise<void>;
  onSignUp: (email: string, pass: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  isConnectionBlocked?: boolean;
}

export const FirebaseSyncModal: React.FC<FirebaseSyncModalProps> = ({
  user,
  syncStatus,
  authError,
  setAuthError,
  onClose,
  onSignIn,
  onSignUp,
  onGoogleSignIn,
  onSignOut,
  isConnectionBlocked = false,
}) => {
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLocalLoading(true);
    setAuthError(null);

    try {
      if (isSignUpMode) {
        await onSignUp(email.trim(), password.trim());
      } else {
        await onSignIn(email.trim(), password.trim());
      }
    } catch (err) {
      // Errors handled by useFirebaseSync state
    } finally {
      setLocalLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setGoogleLoading(true);
    setAuthError(null);
    try {
      await onGoogleSignIn();
      onClose(); // auto-close on successful google login
    } catch (err) {
      // Errors handled by useFirebaseSync state
    } finally {
      setGoogleLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (isConnectionBlocked) {
      return (
        <div className="flex items-center gap-1.5 text-orange-400 bg-orange-500/10 border border-orange-500/25 px-2.5 py-1 rounded-full text-[10px] font-mono select-none animate-pulse">
          <AlertCircle className="w-3 h-3 text-orange-400" />
          РФ БЛОК / ВЫ ОФЛАЙН
        </div>
      );
    }
    switch (syncStatus) {
      case 'syncing':
        return (
          <div className="flex items-center gap-1.5 text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-full text-[10px] font-mono select-none">
            <RefreshCw className="w-3 h-3 animate-spin" />
            СИНХРОНИЗАЦИЯ...
          </div>
        );
      case 'saved':
        return (
          <div className="flex items-center gap-1.5 text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full text-[10px] font-mono select-none">
            <CheckCircle className="w-3 h-3" />
            ВСЕ СОХРАНЕНО В ОБЛАКЕ
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1.5 text-rose-300 bg-rose-500/10 border border-rose-500/25 px-2.5 py-1 rounded-full text-[10px] font-mono select-none">
            <AlertCircle className="w-3 h-3 animate-pulse" />
            ОШИБКА РЕЗЕРВИРОВАНИЯ
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 text-white/40 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-[10px] font-mono select-none">
            <CloudOff className="w-3 h-3" />
            АВТОНОМНЫЙ РЕЖИМ
          </div>
        );
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" 
      onClick={onClose}
    >
      <div 
        className="bg-[#12131a] w-full max-w-md border border-white/10 shadow-2xl relative overflow-hidden animate-slideUp text-left rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Background effect */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-radial-at-t from-[#F4B5CD]/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-44 h-44 bg-radial-at-b from-[#C3B4FC]/5 via-transparent to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#F4B5CD]/10 rounded-xl border border-[#F4B5CD]/20 text-[#F4B5CD]">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-white uppercase font-mono">Облачный сейв (Firebase)</h3>
              <p className="text-[10px] text-white/40 mt-0.5">Включите автосохранение во всех браузерах</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Safari / Apple Iframe Environment Alert */}
        {(typeof navigator !== 'undefined' && (/^((?!chrome|android).)*safari/i.test(navigator.userAgent) || (typeof window !== 'undefined' && window.self !== window.top))) && (
          <div className="mt-4 p-3.5 bg-indigo-500/10 border border-indigo-500/20 text-[#C3B4FC]/90 text-xs rounded-xl space-y-1.5 relative z-10 font-sans">
            <div className="flex items-center gap-1.5 font-bold font-mono text-[10px] uppercase tracking-wide text-indigo-300">
              <Shield className="w-3.5 h-3.5 text-indigo-300" />
              ОСОБЕННОСТИ ДЛЯ SAFARI / APPLE
            </div>
            <p className="text-[11px] leading-normal text-white/70">
              Браузер Safari по умолчанию блокирует синхронизацию базы данных Google/Firebase внутри встроенных фреймов из-за настроек конфиденциальности.
            </p>
            <div className="text-[10px] space-y-1 leading-normal text-indigo-200/80">
              <div>• <strong>Решение 1:</strong> Откройте сайт <a href={typeof window !== 'undefined' ? window.location.origin : '#'} target="_blank" rel="noopener noreferrer" className="underline font-bold text-white hover:text-[#F4B5CD]" onClick={() => onClose()}>в новой независимой вкладке</a> (кнопка открытия вверху справа).</div>
              <div>• <strong>Решение 2:</strong> Или отключите опцию <strong>«Без перекрестного отслеживания»</strong> в настройках вашего Safari на телефоне/компьютере.</div>
            </div>
          </div>
        )}

        {/* Connection block warning */}
        {isConnectionBlocked && (
          <div className="mt-4 p-3.5 bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs rounded-xl space-y-2 relative z-10 font-sans">
            <div className="flex items-center gap-1.5 font-bold font-mono text-[10px] uppercase tracking-wide text-orange-400">
              <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
              БЛОКИРОВКА СЕРВЕРОВ GOOGLE В РФ
            </div>
            <p className="text-[11px] leading-relaxed text-white/90">
              Обнаружен сбой соединения с базой данных Google Firebase.
            </p>
            <div className="text-[10px] space-y-1.5 leading-relaxed text-white/70">
              <div>• 💻 <strong>На ноутбуке (с VPN/прокси):</strong> всё синхронизируется без проблем, база данных обновляется в облаке.</div>
              <div>• 🖥️ <strong>На ПК (без VPN/прокси):</strong> браузер не может достучаться до серверов Google. Из-за этого изменения не загружаются и не отправляются.</div>
              <div>• 🔧 <strong>Решение:</strong> Чтобы синхронизация заработала, включите VPN или рабочий прокси <strong>на каждом из устройств</strong>.</div>
            </div>
          </div>
        )}

        {/* Error messaging */}
        {authError && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-start gap-2 relative z-10 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{authError}</span>
          </div>
        )}

        {/* Main interactive block */}
        <div className="mt-5 relative z-10">
          {user ? (
            /* Logged in state view */
            <div className="space-y-5">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-wider uppercase text-white/40">Статус сети:</span>
                  {getStatusBadge()}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono tracking-wider uppercase text-white/40 block">Аккаунт репетитора:</span>
                  <div className="flex items-center gap-2 text-white/80 text-xs font-mono font-bold bg-[#1a1b24] px-3 py-2 rounded-xl border border-white/5 truncate">
                    <Mail className="w-3.5 h-3.5 text-[#F4B5CD]" />
                    <span className="truncate">{user.email}</span>
                  </div>
                </div>

                <div className="text-[11px] text-white/50 leading-relaxed pt-1">
                  💡 Все изменения учеников, расписания, оплат и программ КТП теперь сохраняются в облаке в реальном времени. Если вы откроете это приложение в Safari на телефоне или Chrome на компьютере, все данные синхронизируются мгновенно!
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={onSignErrSafe => onSignOut()}
                  className="w-full py-2.5 px-4 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-[11px] uppercase tracking-wider font-semibold font-mono flex items-center justify-center gap-2 transition duration-200 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Выйти из облака
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#F4B5CD] hover:opacity-90 text-[#12131a] text-[11px] uppercase tracking-wider font-bold transition duration-200 cursor-pointer"
                >
                  Готово
                </button>
              </div>
            </div>
          ) : (
            /* Login Form view */
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={googleLoading}
                className="w-full py-3 px-4 rounded-xl border border-[#F4B5CD]/30 bg-[#F4B5CD]/5 text-[#F4B5CD] hover:bg-[#F4B5CD]/10 active:scale-[0.98] text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center justify-center gap-2.5 shadow-lg disabled:opacity-50"
              >
                {googleLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Shield className="w-4 h-4 shrink-0 text-[#F4B5CD]" />
                    <span>Быстрый вход через Google</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 py-1">
                <div className="grow h-px bg-white/5" />
                <span className="text-[9px] uppercase tracking-widest font-mono text-white/20 font-bold">или по почте</span>
                <div className="grow h-px bg-white/5" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="text-[11px] text-white/60 leading-relaxed bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                  🔒 Зарегистрируйте аккаунт, чтобы ваши данные никогда не стерлись при закрытии вкладки или очистке кэша браузера. Синхронизируйте работу в любом браузере и на любом устройстве в реальном времени.
                </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-mono text-white/40 block font-semibold">Ваш Email:</span>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. tutor@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#F4B5CD]/50"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-mono text-white/40 block font-semibold">Пароль:</span>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Минимум 6 символов"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#F4B5CD]/50"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={localLoading}
                  className="w-full py-3 px-4 rounded-xl bg-radial-at-t from-[#F4B5CD] via-[#F4B5CD] to-[#df9cad] hover:brightness-105 active:scale-[0.98] text-[#12131a] text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {localLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>{isSignUpMode ? 'Зарегистрироваться' : 'Синхронизировать аккаунт'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <span 
                  onClick={() => {
                    setIsSignUpMode(!isSignUpMode);
                    setAuthError(null);
                  }}
                  className="text-[11px] text-[#F4B5CD] hover:underline cursor-pointer select-none font-mono"
                >
                  {isSignUpMode 
                    ? 'Ранее создавали аккаунт? Войти' 
                    : 'Нет аккаунта? Зарегистрироваться бесплатно'}
                </span>
              </div>
            </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
