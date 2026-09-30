import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { toast as sonnerToast, Toaster } from 'sonner';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  type?: ToastType;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, options?: ToastOptions) => void;
  removeToast: (id: string | number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const duration = options?.duration ?? 5000;
    
    const action = options?.action ? {
      label: options.action.label,
      onClick: options.action.onClick
    } : undefined;

    switch (options?.type) {
      case 'success':
        sonnerToast.success(message, { duration, action });
        break;
      case 'error':
        sonnerToast.error(message, { duration, action });
        break;
      case 'warning':
        sonnerToast.warning(message, { duration, action });
        break;
      default:
        sonnerToast(message, { duration, action });
        break;
    }
  }, []);

  const removeToast = useCallback((id: string | number) => {
    sonnerToast.dismiss(id);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <Toaster position="bottom-right" richColors />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }
  return context;
};
