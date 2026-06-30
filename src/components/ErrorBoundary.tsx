import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Trash2, Home } from 'lucide-react';
import { safeStorage } from '../utils/safeStorage';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
    this.props = props;
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    // Clear potentially corrupted local data
    try {
      // Clear cabinet drafts and student progress fallbacks
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('student_') || key.startsWith('tutor_local_cabinets')) {
          localStorage.removeItem(key);
        }
      });
      safeStorage.removeItem('tutor_students_db');
    } catch (e) {
      console.error(e);
    }
    // Reload the page without parameters
    window.location.href = window.location.origin + window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#12131a] flex flex-col items-center justify-center p-6 text-white text-center selection:bg-red-500/20 selection:text-white">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-6 animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>
          
          <h1 className="text-xl font-bold text-white mb-2 font-sans">
            {this.props.fallbackTitle || 'Произошел программный сбой'}
          </h1>
          
          <p className="text-xs text-white/60 max-w-md mb-6 leading-relaxed font-sans">
            Интерфейс не смог отобразиться из-за непредвиденной ошибки в коде или поврежденных данных в ссылке. Не беспокойтесь, ваши данные защищены.
          </p>

          {this.state.error && (
            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 max-w-md text-left text-[11px] text-red-300 mb-6 font-mono overflow-auto max-h-40 w-full">
              <span className="font-bold text-red-400 block mb-1">Детали ошибки:</span>
              {this.state.error.toString()}
            </div>
          )}

          <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-5 max-w-md text-left text-xs text-amber-200/80 mb-8 space-y-2 font-sans">
            <p className="font-bold text-amber-400">💡 Рекомендуемые шаги:</p>
            <ul className="list-disc pl-4 space-y-1.5 font-medium">
              <li>Попробуйте <b>перезагрузить страницу</b>.</li>
              <li>Если вы открыли кабинет по ссылке, убедитесь, что ссылка <b>скопирована полностью</b> и не была обрезана мессенджером (Telegram, WhatsApp и др.).</li>
              <li>Если ошибка повторяется, нажмите кнопку <b>«Сбросить и вернуться на главную»</b> ниже, чтобы очистить временные файлы и начать заново.</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button 
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition duration-150 flex items-center gap-1.5 border-none cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Обновить страницу
            </button>
            
            <button 
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 active:bg-white/15 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition duration-150 flex items-center gap-1.5 border border-white/10 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              Сбросить и вернуться
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
