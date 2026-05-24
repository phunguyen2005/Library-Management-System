import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  onConfirm,
  onCancel,
  isDestructive = false
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-[var(--color-surface)] rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDestructive ? 'bg-red-50 text-red-600' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'}`}>
                  <span className="material-symbols-outlined text-2xl">
                    {isDestructive ? 'warning' : 'help'}
                  </span>
                </div>
                <h3 className="text-xl font-medium text-[var(--color-on-surface)]">
                  {title}
                </h3>
              </div>
              <p className="text-[var(--color-on-surface-variant)] mb-6">
                {message}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--color-on-surface-variant)] hover:bg-[var(--color-on-surface)]/5 transition-colors"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors ${
                    isDestructive 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90'
                  }`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
