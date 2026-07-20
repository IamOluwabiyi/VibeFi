/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-800 dark:text-emerald-200',
      icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-800 dark:text-amber-200',
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    },
    danger: {
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      icon: <AlertCircle className="h-5 w-5 text-red-500" />,
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      icon: <Info className="h-5 w-5 text-blue-500" />,
    },
  };

  const current = config[type];

  return (
    <div
      id="toast-notification"
      className={`fixed bottom-6 right-6 z-50 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border ${current.bg} ${current.border} ${current.text} max-w-sm animate-slide-up transition-all`}
    >
      <div className="flex items-center gap-2">
        {current.icon}
        <span className="text-sm font-medium">{message}</span>
      </div>
      <button
        id="toast-close-btn"
        onClick={onClose}
        className="p-1 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer"
        aria-label="Close notification"
      >
        <X className="h-4 w-4 opacity-70" />
      </button>
    </div>
  );
}
