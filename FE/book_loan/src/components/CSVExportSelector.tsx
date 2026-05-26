import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type AvailableColumn = {
  key: string;
  label: string;
};

type CSVExportSelectorProps = {
  isOpen: boolean;
  onClose: () => void;
  onExport: (selectedColumns: string[]) => void;
  availableColumns: AvailableColumn[];
  defaultColumns: string[];
  title: string;
  description: string;
};

export default function CSVExportSelector({
  isOpen,
  onClose,
  onExport,
  availableColumns,
  defaultColumns,
  title,
  description,
}: CSVExportSelectorProps) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedColumns(defaultColumns);
    }
  }, [isOpen, defaultColumns]);

  if (!isOpen) return null;

  const handleToggleColumn = (key: string) => {
    if (selectedColumns.includes(key)) {
      setSelectedColumns(selectedColumns.filter(c => c !== key));
    } else {
      setSelectedColumns([...selectedColumns, key]);
    }
  };

  const handleSelectAll = () => {
    setSelectedColumns(availableColumns.map(c => c.key));
  };

  const handleDeselectAll = () => {
    setSelectedColumns([]);
  };

  const handleResetToDefault = () => {
    setSelectedColumns(defaultColumns);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedColumns.length === 0) {
      alert('Vui lòng chọn ít nhất một cột để xuất dữ liệu.');
      return;
    }
    onExport(selectedColumns);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 15 }}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-5 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">download_for_offline</span>
              {title}
            </h3>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content & Presets bar */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            <div className="flex justify-between items-center bg-slate-50 border border-slate-200/50 rounded-xl px-4 py-2.5 shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Chọn nhanh mẫu cột</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  Tất cả
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                >
                  Bỏ tất cả
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  Mặc định
                </button>
              </div>
            </div>

            {/* Checkbox grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {availableColumns.map((col) => {
                const isChecked = selectedColumns.includes(col.key);
                return (
                  <div
                    key={col.key}
                    onClick={() => handleToggleColumn(col.key)}
                    className={`border rounded-xl p-3 flex items-center gap-3 cursor-pointer select-none transition-all duration-150 ${
                      isChecked
                        ? 'border-primary bg-primary/5 text-primary-dark font-semibold shadow-sm'
                        : 'border-slate-100 bg-slate-50/20 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // Handle clicking in div container
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 shrink-0 pointer-events-none"
                    />
                    <span className="text-xs leading-normal">{col.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex justify-end gap-3 p-5 border-t border-slate-100 shrink-0 bg-slate-50/50">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-100 hover:bg-slate-200 px-5 py-2.5 font-bold text-slate-600 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={selectedColumns.length === 0}
              className="rounded-xl bg-primary hover:opacity-95 px-6 py-2.5 font-bold text-white shadow-md shadow-primary/20 transition-opacity flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              Tải tệp tin (.CSV)
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
