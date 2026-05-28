import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { emitToast } from '../notifications/events';
import { getErrorMessage } from '../lib/errors';

type ExpectedField = {
  key: string;
  label: string;
  required: boolean;
  fallbacks: string[];
};

type CSVImportWizardProps = {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  entityType: 'book' | 'member';
  importApiCall: (file: File, options: { dry_run: boolean; allow_partial: boolean; column_mapping: string }) => Promise<any>;
  expectedFields: ExpectedField[];
  sampleCSV: string;
  sampleFileName: string;
};

export default function CSVImportWizard({
  isOpen,
  onClose,
  onImportSuccess,
  entityType,
  importApiCall,
  expectedFields,
  sampleCSV,
  sampleFileName,
}: CSVImportWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRowsPreview, setCsvRowsPreview] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  
  // Validation / Dry-run state
  const [allowPartial, setAllowPartial] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dryRunExecuted, setDryRunExecuted] = useState(false);
  const [dryRunResults, setDryRunResults] = useState<{
    message: string;
    success_count: number;
    errors: string[];
  } | null>(null);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFile(null);
      setCsvHeaders([]);
      setCsvRowsPreview([]);
      setColumnMapping({});
      setAllowPartial(true);
      setDryRunExecuted(false);
      setDryRunResults(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Native CSV line parser supporting double quotes and configurable delimiter
  const parseCsvLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        // Handle escaped double-quotes ("")
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Detect delimiter from first line: prefer tab (exported files) then comma
  const detectDelimiter = (firstLine: string): string => {
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    return tabCount > 0 && tabCount >= commaCount ? '\t' : ',';
  };

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;
    if (!selectedFile.name.endsWith('.csv') && selectedFile.type !== 'text/csv') {
      emitToast({
        tone: 'error',
        title: 'Định dạng tệp không được hỗ trợ',
        message: 'Vui lòng chọn tệp tin định dạng CSV (.csv)',
      });
      return;
    }
    setFile(selectedFile);

    // Read and parse headers/preview
    const reader = new FileReader();
    reader.onload = (e) => {
      // e.target.result may be an ArrayBuffer (for binary read) or string
      const rawResult = e.target?.result;
      if (rawResult === null || rawResult === undefined) return;

      let text = rawResult as string;

      // Strip UTF-8 BOM (\xEF\xBB\xBF) if present
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
      }

      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length === 0) {
        emitToast({
          tone: 'error',
          title: 'Tệp CSV trống',
          message: 'Tệp CSV đã chọn không chứa bất kỳ dữ liệu nào.',
        });
        setFile(null);
        return;
      }

      // Auto-detect delimiter (tab for system exports, comma for standard CSV)
      const delimiter = detectDelimiter(lines[0]);

      // Parse headers
      const rawHeaders = parseCsvLine(lines[0], delimiter);
      // Clean BOM characters from header cells
      const cleanedHeaders = rawHeaders.map(h => h.replace(/[\uFEFF\u200B\x00]/g, '').trim());
      setCsvHeaders(cleanedHeaders);

      // Parse first 5 preview rows
      const previewRows = lines.slice(1, 6).map(line => parseCsvLine(line, delimiter));
      setCsvRowsPreview(previewRows);

      // Auto match headers based on expected field fallbacks
      const initialMapping: Record<string, string> = {};
      expectedFields.forEach(field => {
        // Look for exact matches or matches in clean form
        const matched = cleanedHeaders.find(header => {
          const normHeader = header.toLowerCase().replace(/_/g, ' ');
          return (
            normHeader === field.key.toLowerCase() ||
            field.fallbacks.some(f => normHeader.includes(f.toLowerCase()) || f.toLowerCase().includes(normHeader))
          );
        });
        if (matched) {
          initialMapping[field.key] = matched;
        } else if (field.required) {
          // If required but not matched, select first unmapped column if available as default
          const unmapped = cleanedHeaders.find(h => !Object.values(initialMapping).includes(h));
          if (unmapped) initialMapping[field.key] = unmapped;
        }
      });
      setColumnMapping(initialMapping);
    };
    reader.readAsText(selectedFile, 'UTF-8');
  };

  const handleNextToStep2 = () => {
    if (!file) return;
    setStep(2);
  };

  const handleNextToStep3 = () => {
    // Check if required fields are mapped
    const unmappedRequired = expectedFields.filter(f => f.required && !columnMapping[f.key]);
    if (unmappedRequired.length > 0) {
      emitToast({
        tone: 'error',
        title: 'Ánh xạ thiếu trường bắt buộc',
        message: `Vui lòng liên kết cột cho: ${unmappedRequired.map(f => f.label).join(', ')}`,
      });
      return;
    }
    setStep(3);
    // Auto-trigger dry-run once step 3 opens
    void triggerDryRun();
  };

  const triggerDryRun = async () => {
    if (!file) return;
    setIsProcessing(true);
    setDryRunResults(null);
    try {
      const response = await importApiCall(file, {
        dry_run: true,
        allow_partial: allowPartial,
        column_mapping: JSON.stringify(columnMapping),
      });

      setDryRunResults({
        message: response.message,
        success_count: response.success_count ?? 0,
        errors: response.errors ?? [],
      });
      setDryRunExecuted(true);
    } catch (err) {
      const message = getErrorMessage(err, 'Lỗi xác thực dữ liệu.');
      emitToast({ tone: 'error', title: 'Xác thực thất bại', message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setIsProcessing(true);

    try {
      const response = await importApiCall(file, {
        dry_run: false,
        allow_partial: allowPartial,
        column_mapping: JSON.stringify(columnMapping),
      });

      emitToast({
        tone: 'success',
        title: 'Nhập dữ liệu thành công',
        message: response.message,
      });
      onImportSuccess();
      onClose();
    } catch (error) {
      const errDetails = (error as any).details;
      if (errDetails && Array.isArray(errDetails.errors)) {
        setDryRunResults({
          message: 'Lỗi thực thi dữ liệu.',
          success_count: 0,
          errors: errDetails.errors,
        });
      } else {
        const message = getErrorMessage(error, 'Không thể nhập dữ liệu.');
        emitToast({ tone: 'error', title: 'Thất bại', message });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadSampleFile = () => {
    // Include UTF-8 BOM (\xEF\xBB\xBF) so Excel auto-detects encoding and renders Vietnamese correctly
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', sampleFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 15 }}
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[24px]">upload_file</span>
              Nhập từ tệp CSV
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Phân tích và nhập danh sách {entityType === 'book' ? 'sách & tài liệu số' : 'thành viên học giả'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Navigation Step Indicators */}
        <div className="flex border-b border-slate-100 bg-white px-8 py-3.5 justify-between text-xs font-bold text-slate-400">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-primary' : step > 1 ? 'text-emerald-600' : ''}`}>
            <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-extrabold ${step === 1 ? 'bg-primary text-white' : step > 1 ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>1</span>
            Chọn tệp CSV
          </div>
          <div className="h-[1px] flex-1 bg-slate-100 mx-4 self-center" />
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-primary' : step > 2 ? 'text-emerald-600' : ''}`}>
            <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-extrabold ${step === 2 ? 'bg-primary text-white' : step > 2 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>2</span>
            Đối chiếu cột
          </div>
          <div className="h-[1px] flex-1 bg-slate-100 mx-4 self-center" />
          <div className={`flex items-center gap-2 ${step === 3 ? 'text-primary' : ''}`}>
            <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-extrabold ${step === 3 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>3</span>
            Kiểm tra & Hoàn tất
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* STEP 1: UPLOAD */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tệp tin CSV Mẫu</h4>
                  <p className="text-[11px] text-slate-500">Tải tệp tin CSV mẫu có chứa các trường thông tin chuẩn của hệ thống.</p>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleFile}
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">download</span>
                  Tải tệp mẫu
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600">Chọn tệp tin CSV (.csv) từ máy của bạn:</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-primary/50 transition-colors rounded-xl p-8 text-center cursor-pointer relative group bg-slate-50/20">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-3 pointer-events-none">
                    <span className="material-symbols-outlined text-4xl text-slate-400 group-hover:text-primary transition-colors">
                      cloud_upload
                    </span>
                    <p className="text-sm font-semibold text-slate-700">
                      {file ? file.name : 'Kéo thả tệp tin hoặc nhấp vào đây để chọn'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Chỉ chấp nhận tệp tin định dạng .csv tối đa 4MB'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Show CSV parsing preview if file loaded */}
              {file && csvHeaders.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-700">Xem trước tệp dữ liệu ({csvRowsPreview.length} dòng mẫu):</h4>
                  <div className="overflow-x-auto border border-slate-200/80 rounded-xl max-h-48">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                          {csvHeaders.map((header, i) => (
                            <th key={i} className="px-4 py-2 border-r border-slate-100 whitespace-nowrap">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {csvRowsPreview.map((row, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-slate-50/30">
                            {csvHeaders.map((_, colIndex) => (
                              <td key={colIndex} className="px-4 py-2 border-r border-slate-100 whitespace-nowrap text-slate-600 max-w-[150px] truncate">
                                {row[colIndex] || <em className="text-slate-300">trống</em>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-4 text-xs text-slate-600">
                💡 <strong>Hướng dẫn khớp cột:</strong> Đối chiếu các trường thông tin của thư viện (bên trái) với các cột dữ liệu tương ứng có trong tệp CSV của bạn (bên phải).
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                <div className="grid grid-cols-2 bg-slate-50/50 p-4 text-xs font-bold text-slate-500">
                  <div>Trường hệ thống (Thư viện)</div>
                  <div>Cột dữ liệu của bạn (CSV)</div>
                </div>
                {expectedFields.map((field) => (
                  <div key={field.key} className="grid grid-cols-2 p-4 items-center gap-4 hover:bg-slate-50/30">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">{field.label}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {field.required ? (
                          <span className="text-red-500 font-extrabold font-mono">* Bắt buộc nhập</span>
                        ) : (
                          'Không bắt buộc'
                        )}
                      </span>
                    </div>
                    <div>
                      <select
                        aria-label={`Ghép cột ${field.label}`}
                        value={columnMapping[field.key] || ''}
                        onChange={(e) => setColumnMapping({
                          ...columnMapping,
                          [field.key]: e.target.value
                        })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">-- Bỏ qua hoặc Không ánh xạ --</option>
                        {csvHeaders.map((header, i) => (
                          <option key={i} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW DRY-RUN */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 border border-slate-200/60 rounded-xl p-4 gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Cấu hình xác thực & Nhập</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      id="allow-partial-checkbox"
                      type="checkbox"
                      checked={allowPartial}
                      onChange={(e) => setAllowPartial(e.target.checked)}
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="allow-partial-checkbox" className="text-xs text-slate-600 font-semibold select-none cursor-pointer">
                      Chấp nhận nhập bản ghi đúng, bỏ qua bản ghi lỗi (Partial Import)
                    </label>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={triggerDryRun}
                  className="rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/10 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[15px]">verified</span>
                  Chạy lại xác thực ảo
                </button>
              </div>

              {/* Loader */}
              {isProcessing && !dryRunExecuted && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-500 animate-pulse font-semibold">Hệ thống đang chạy thử validation tệp tin dữ liệu...</p>
                </div>
              )}

              {/* Dry-run Results Summary */}
              {dryRunExecuted && dryRunResults && (
                <div className="space-y-4">
                  <div className={`border rounded-xl p-4 flex items-start gap-3 shadow-sm ${
                    dryRunResults.errors.length > 0
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-green-50 border-green-200 text-green-900'
                  }`}>
                    <span className="material-symbols-outlined text-[24px] mt-0.5 shrink-0">
                      {dryRunResults.errors.length > 0 ? 'warning' : 'check_circle'}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-sm leading-snug">
                        {dryRunResults.errors.length > 0
                          ? 'Phát hiện một số lỗi trong tệp dữ liệu!'
                          : 'Tuyệt vời! Dữ liệu hoàn toàn hợp lệ.'}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Phát hiện <strong>{dryRunResults.success_count} dòng hợp lệ</strong> sẵn sàng nhập 
                        và <strong>{dryRunResults.errors.length} dòng lỗi</strong> cần kiểm tra lại.
                      </p>
                    </div>
                  </div>

                  {/* Errors details list */}
                  {dryRunResults.errors.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-red-800 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] font-bold">error</span>
                        Nhật ký lỗi chi tiết:
                      </h5>
                      <div className="border border-red-100 bg-red-50/30 rounded-xl p-3.5 max-h-48 overflow-y-auto space-y-1.5 text-xs text-red-700">
                        {dryRunResults.errors.map((err, i) => (
                          <div key={i} className="flex gap-2 items-start hover:bg-red-50/50 p-1 rounded transition-colors">
                            <span className="font-bold shrink-0">⚠️</span>
                            <span className="leading-snug">{err}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Navigation Panel */}
        <div className="flex justify-between items-center p-6 border-t border-slate-100 shrink-0 bg-slate-50/50">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step === 3 ? 2 : 1)}
                disabled={isProcessing}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 font-bold text-slate-600 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                Quay lại
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="rounded-xl bg-slate-100 hover:bg-slate-200 px-5 py-2.5 font-bold text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>

            {step === 1 && (
              <button
                type="button"
                onClick={handleNextToStep2}
                disabled={!file}
                className="rounded-xl bg-primary px-5 py-2.5 font-bold text-white shadow-md shadow-primary/10 transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                Tiếp tục (Khớp cột)
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={handleNextToStep3}
                className="rounded-xl bg-primary px-5 py-2.5 font-bold text-white shadow-md shadow-primary/10 transition-opacity hover:opacity-90 cursor-pointer"
              >
                Chạy thử Xác thực
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={isProcessing || (dryRunExecuted && dryRunResults && dryRunResults.success_count === 0)}
                className="rounded-xl bg-primary px-5 py-2.5 font-bold text-white shadow-md shadow-primary/20 transition-all hover:opacity-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Nhập dữ liệu chính thức
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
