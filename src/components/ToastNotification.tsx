import React, { useEffect } from 'react';
import { ToastState } from '../hooks/useProducts';
import { CheckCircle2, X } from 'lucide-react';

interface ToastNotificationProps {
  toast: ToastState;
  onClose: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  toast,
  onClose
}) => {
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        onClose();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast.show, toast.id, onClose]);

  if (!toast.show) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-bounce-short">
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-800 flex items-start gap-3 max-w-md">
        <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-lg">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="flex-1 pr-2">
          <p className="text-sm font-bold text-slate-100">{toast.message}</p>
          {toast.subtext && (
            <p className="text-xs text-slate-400 mt-0.5">{toast.subtext}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
