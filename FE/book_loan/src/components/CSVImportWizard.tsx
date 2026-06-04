import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
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

const TRANSLATIONS = {
  vi: {
    unsupportedFormatTitle: 'Định dạng tệp không được hỗ trợ',
    unsupportedFormatMessage: 'Vui lòng chọn tệp tin định dạng CSV (.csv)',
    emptyCsvTitle: 'Tệp CSV trống',
    emptyCsvMessage: 'Tệp CSV đã chọn không chứa bất kỳ dữ liệu nào.',
    missingRequiredMappingTitle: 'Ánh xạ thiếu trường bắt buộc',
    missingRequiredMappingMessage: 'Vui lòng liên kết cột cho: ',
    validationFailedTitle: 'Xác thực thất bại',
    validationFailedDefault: 'Lỗi xác thực dữ liệu.',
    importSuccessTitle: 'Nhập dữ liệu thành công',
    importExecutionError: 'Lỗi thực thi dữ liệu.',
    importFailedTitle: 'Thất bại',
    importFailedDefault: 'Không thể nhập dữ liệu.',
    title: 'Nhập từ tệp CSV',
    descriptionBooks: 'Phân tích và nhập danh sách sách & tài liệu số',
    descriptionMembers: 'Phân tích và nhập danh sách thành viên học giả',
    close: 'Đóng',
    stepSelectFile: 'Chọn tệp CSV',
    stepColumnMapping: 'Đối chiếu cột',
    stepVerifyFinish: 'Kiểm tra & Hoàn tất',
    sampleFileTitle: 'Tệp tin CSV Mẫu',
    sampleFileDesc: 'Tải tệp tin CSV mẫu có chứa các trường thông tin chuẩn của hệ thống.',
    downloadSample: 'Tải tệp mẫu',
    selectFileLabel: 'Chọn tệp tin CSV (.csv) từ máy của bạn:',
    dropAreaPlaceholder: 'Kéo thả tệp tin hoặc nhấp vào đây để chọn',
    fileLimitHint: 'Chỉ chấp nhận tệp tin định dạng .csv tối đa 4MB',
    previewTitle: 'Xem trước tệp dữ liệu ({{count}} dòng mẫu):',
    emptyValue: 'trống',
    mappingInstructions: '💡 Hướng dẫn khớp cột: Đối chiếu các trường thông tin của thư viện (bên trái) với các cột dữ liệu tương ứng có trong tệp CSV của bạn (bên phải).',
    systemFieldHeader: 'Trường hệ thống (Thư viện)',
    csvColumnHeader: 'Cột dữ liệu của bạn (CSV)',
    requiredField: '* Bắt buộc nhập',
    optionalField: 'Không bắt buộc',
    selectColumnPlaceholder: '-- Bỏ qua hoặc Không ánh xạ --',
    configValidationTitle: 'Cấu hình xác thực & Nhập',
    allowPartialLabel: 'Chấp nhận nhập bản ghi đúng, bỏ qua bản ghi lỗi (Partial Import)',
    reRunDryRun: 'Chạy lại xác thực ảo',
    validatingMessage: 'Hệ thống đang chạy thử validation tệp tin dữ liệu...',
    dryRunErrorTitle: 'Phát hiện một số lỗi trong tệp dữ liệu!',
    dryRunSuccessTitle: 'Tuyệt vời! Dữ liệu hoàn toàn hợp lệ.',
    dryRunSummary: 'Phát hiện {{successCount}} dòng hợp lệ sẵn sàng nhập và {{errorCount}} dòng lỗi cần kiểm tra lại.',
    errorLogTitle: 'Nhật ký lỗi chi tiết:',
    back: 'Quay lại',
    cancel: 'Hủy',
    continueMapping: 'Tiếp tục (Khớp cột)',
    runDryRun: 'Chạy thử Xác thực',
    processing: 'Đang xử lý...',
    officialImport: 'Nhập dữ liệu chính thức'
  },
  en: {
    unsupportedFormatTitle: 'Unsupported file format',
    unsupportedFormatMessage: 'Please select a CSV (.csv) file',
    emptyCsvTitle: 'Empty CSV file',
    emptyCsvMessage: 'The selected CSV file does not contain any data.',
    missingRequiredMappingTitle: 'Missing required field mapping',
    missingRequiredMappingMessage: 'Please link columns for: ',
    validationFailedTitle: 'Validation failed',
    validationFailedDefault: 'Data validation error.',
    importSuccessTitle: 'Data imported successfully',
    importExecutionError: 'Data execution error.',
    importFailedTitle: 'Failed',
    importFailedDefault: 'Could not import data.',
    title: 'Import from CSV',
    descriptionBooks: 'Analyze and import book & digital resource lists',
    descriptionMembers: 'Analyze and import student & scholar lists',
    close: 'Close',
    stepSelectFile: 'Select CSV File',
    stepColumnMapping: 'Column Mapping',
    stepVerifyFinish: 'Verify & Finish',
    sampleFileTitle: 'Sample CSV File',
    sampleFileDesc: 'Download sample CSV file containing standard system fields.',
    downloadSample: 'Download sample',
    selectFileLabel: 'Choose CSV (.csv) file from your computer:',
    dropAreaPlaceholder: 'Drag and drop file or click here to select',
    fileLimitHint: 'Only accepts .csv files up to 4MB',
    previewTitle: 'Data Preview ({{count}} sample rows):',
    emptyValue: 'empty',
    mappingInstructions: '💡 Column Mapping Instructions: Match library system fields (left) with the corresponding columns in your CSV file (right).',
    systemFieldHeader: 'System Field (Library)',
    csvColumnHeader: 'Your Data Column (CSV)',
    requiredField: '* Required',
    optionalField: 'Optional',
    selectColumnPlaceholder: '-- Skip or Unmapped --',
    configValidationTitle: 'Validation & Import Configuration',
    allowPartialLabel: 'Allow partial import (import valid rows, skip errors)',
    reRunDryRun: 'Re-run dry run validation',
    validatingMessage: 'System is dry-running data file validation...',
    dryRunErrorTitle: 'Some errors were found in the data file!',
    dryRunSuccessTitle: 'Excellent! All data is valid.',
    dryRunSummary: 'Found {{successCount}} valid rows ready for import and {{errorCount}} error rows that need checking.',
    errorLogTitle: 'Detailed error log:',
    back: 'Back',
    cancel: 'Cancel',
    continueMapping: 'Continue (Map Columns)',
    runDryRun: 'Run Dry Run Validation',
    processing: 'Processing...',
    officialImport: 'Official Import'
  },
  zh: {
    unsupportedFormatTitle: '不支持的文件格式',
    unsupportedFormatMessage: '请选择CSV (.csv) 格式的文件',
    emptyCsvTitle: '空CSV文件',
    emptyCsvMessage: '选定的CSV文件不包含任何数据。',
    missingRequiredMappingTitle: '缺少必填字段映射',
    missingRequiredMappingMessage: '请为以下项关联列：',
    validationFailedTitle: '验证失败',
    validationFailedDefault: '数据验证错误。',
    importSuccessTitle: '成功导入数据',
    importExecutionError: '数据执行错误。',
    importFailedTitle: '失败',
    importFailedDefault: '无法导入数据。',
    title: '从CSV文件导入',
    descriptionBooks: '分析并导入图书与数字资源列表',
    descriptionMembers: '分析并导入学者会员列表',
    close: '关闭',
    stepSelectFile: '选择CSV文件',
    stepColumnMapping: '列对齐',
    stepVerifyFinish: '检查并完成',
    sampleFileTitle: 'CSV样例文件',
    sampleFileDesc: '下载包含系统标准信息字段 of CSV样例文件。',
    downloadSample: '下载样例文件',
    selectFileLabel: '从您的电脑选择CSV (.csv) 文件：',
    dropAreaPlaceholder: '拖拽文件或点击此处选择',
    fileLimitHint: '仅支持最大4MB的.csv文件',
    previewTitle: '数据预览（{{count}}行示例）：',
    emptyValue: '空',
    mappingInstructions: '💡 列映射指南：将图书馆系统字段（左侧）与您的CSV文件中的对应列（右侧）进行比对。',
    systemFieldHeader: '系统字段 (图书馆)',
    csvColumnHeader: '您的数据列 (CSV)',
    requiredField: '* 必填',
    optionalField: '选填',
    selectColumnPlaceholder: '-- 忽略或未映射 --',
    configValidationTitle: '验证与导入配置',
    allowPartialLabel: '接受导入正确记录，忽略错误记录 (部分导入)',
    reRunDryRun: '重新运行虚拟验证',
    validatingMessage: '系统正在试运行数据文件验证...',
    dryRunErrorTitle: '在数据文件中发现一些错误！',
    dryRunSuccessTitle: '太棒了！数据完全有效。',
    dryRunSummary: '发现 {{successCount}} 行有效数据已准备好导入，以及 {{errorCount}} 行错误数据需要检查。',
    errorLogTitle: '详细错误日志：',
    back: '返回',
    cancel: '取消',
    continueMapping: '继续（对齐列）',
    runDryRun: '进行虚拟验证',
    processing: '处理中...',
    officialImport: '正式导入数据'
  },
  ja: {
    unsupportedFormatTitle: 'サポートされていないファイル形式',
    unsupportedFormatMessage: 'CSV形式（.csv）のファイルを選択してください',
    emptyCsvTitle: '空のCSVファイル',
    emptyCsvMessage: '選択されたCSVファイルにはデータが含まれていません。',
    missingRequiredMappingTitle: '必須フィールドのマッピング不足',
    missingRequiredMappingMessage: '次の列を関連付けてください：',
    validationFailedTitle: '検証失敗',
    validationFailedDefault: 'データ検証エラー。',
    importSuccessTitle: 'データのインポートに成功しました',
    importExecutionError: 'データ実行エラー。',
    importFailedTitle: '失敗',
    importFailedDefault: 'データをインポートできませんでした。',
    title: 'CSVファイルからインポート',
    descriptionBooks: '書籍およびデジタルリソースのリストを解析してインポート',
    descriptionMembers: '学者メンバーのリストを解析してインポート',
    close: '閉じる',
    stepSelectFile: 'CSVファイルを選択',
    stepColumnMapping: '列のマッピング',
    stepVerifyFinish: '確認して完了',
    sampleFileTitle: 'サンプルCSVファイル',
    sampleFileDesc: 'システムの標準情報フィールドを含むサンプルCSVファイルをダウンロードします。',
    downloadSample: 'サンプルをダウンロード',
    selectFileLabel: 'お使いのコンピュータからCSV（.csv）ファイルを選択してください：',
    dropAreaPlaceholder: 'ファイルをドラッグ＆ドロップするか、ここをクリックして選択してください',
    fileLimitHint: '最大4MBの.csvファイルのみ対応',
    previewTitle: 'データプレビュー（{{count}}行のサンプル）：',
    emptyValue: '空',
    mappingInstructions: '💡 マッピング手順：図書館システムフィールド（左）とCSVファイルの対応する列（右）を対照します。',
    systemFieldHeader: 'システムフィールド（図書館）',
    csvColumnHeader: 'CSVのデータ列',
    requiredField: '* 必須',
    optionalField: '任意',
    selectColumnPlaceholder: '-- スキップまたは未マッピング --',
    configValidationTitle: '検証とインポートの設定',
    allowPartialLabel: '正しいレコードのインポートを許可し、エラーレコードを無視する (部分インポート)',
    reRunDryRun: '仮想検証を再実行',
    validatingMessage: 'システムがデータファイルの検証を実行中...',
    dryRunErrorTitle: 'データファイルにいくつかエラーが検出されました！',
    dryRunSuccessTitle: '素晴らしい！すべてのデータが有効です。',
    dryRunSummary: 'インポート準備完了の有効な行が {{successCount}} 行、確認が必要なエラー行が {{errorCount}} 行検出されました。',
    errorLogTitle: '詳細エラーログ：',
    back: '戻る',
    cancel: 'キャンセル',
    continueMapping: '続行（列をマッピング）',
    runDryRun: '仮想検証を実行',
    processing: '処理中...',
    officialImport: 'データを正式にインポート'
  },
  ko: {
    unsupportedFormatTitle: '지원되지 않는 파일 형식',
    unsupportedFormatMessage: 'CSV (.csv) 형식의 파일을 선택하십시오',
    emptyCsvTitle: '빈 CSV 파일',
    emptyCsvMessage: '선택한 CSV 파일에 데이터가 없습니다.',
    missingRequiredMappingTitle: '필수 필드 매핑 누락',
    missingRequiredMappingMessage: '다음 필드에 대한 열을 연결하십시오: ',
    validationFailedTitle: '검증 실패',
    validationFailedDefault: '데이터 검증 오류.',
    importSuccessTitle: '데이터 가져오기 성공',
    importExecutionError: '데이터 실행 오류.',
    importFailedTitle: '실패',
    importFailedDefault: '데이터를 가져올 수 없습니다.',
    title: 'CSV 파일에서 가져오기',
    descriptionBooks: '도서 및 디지털 자원 리스트 분석 및 가져오기',
    descriptionMembers: '학자 회원 리스트 분석 및 가져오기',
    close: '닫기',
    stepSelectFile: 'CSV 파일 선택',
    stepColumnMapping: '열 매핑',
    stepVerifyFinish: '검사 및 완료',
    sampleFileTitle: '샘플 CSV 파일',
    sampleFileDesc: '시스템 표준 정보 필드가 포함된 샘플 CSV 파일을 다운로드합니다.',
    downloadSample: '샘플 다운로드',
    selectFileLabel: '컴퓨터에서 CSV (.csv) 파일을 선택하세요:',
    dropAreaPlaceholder: '파일을 드래그 앤 드롭하거나 여기를 클릭하여 선택하세요',
    fileLimitHint: '최대 4MB의 .csv 파일만 지원됨',
    previewTitle: '데이터 미리보기 ({{count}}개 샘플 행):',
    emptyValue: '비어 있음',
    mappingInstructions: '💡 열 매핑 안내: 도서관 시스템 필드(왼쪽)와 CSV 파일의 해당 열(오른쪽)을 비교하여 대응하십시오.',
    systemFieldHeader: '시스템 필드 (도서관)',
    csvColumnHeader: 'CSV 데이터 열',
    requiredField: '* 필수 입력',
    optionalField: '선택 사항',
    selectColumnPlaceholder: '-- 무시 또는 매핑되지 않음 --',
    configValidationTitle: '검증 및 가져오기 설정',
    allowPartialLabel: '올바른 레코드만 가져오고 오류 레코드는 무시 (부분 가져오기)',
    reRunDryRun: '가상 검증 재실행',
    validatingMessage: '시스템이 데이터 파일 가상 검증을 실행 중입니다...',
    dryRunErrorTitle: '데이터 파일에서 일부 오류가 발견되었습니다!',
    dryRunSuccessTitle: '훌륭합니다! 모든 데이터가 유효합니다.',
    dryRunSummary: '가져올 준비가 된 유효한 행 {{successCount}}개와 확인이 필요한 오류 행 {{errorCount}}개를 발견했습니다.',
    errorLogTitle: '상세 오류 로그:',
    back: '이전',
    cancel: '취소',
    continueMapping: '계속 (열 매핑)',
    runDryRun: '가상 검증 실행',
    processing: '처리 중...',
    officialImport: '데이터 공식 가져오기'
  }
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
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'vi').startsWith('en') ? 'en' :
                      (i18n.language || 'vi').startsWith('zh') ? 'zh' :
                      (i18n.language || 'vi').startsWith('ja') ? 'ja' :
                      (i18n.language || 'vi').startsWith('ko') ? 'ko' : 'vi';
  const localT = TRANSLATIONS[currentLang];

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
        title: localT.unsupportedFormatTitle,
        message: localT.unsupportedFormatMessage,
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
          title: localT.emptyCsvTitle,
          message: localT.emptyCsvMessage,
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
        title: localT.missingRequiredMappingTitle,
        message: `${localT.missingRequiredMappingMessage}${unmappedRequired.map(f => f.label).join(', ')}`,
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
      const message = getErrorMessage(err, localT.validationFailedDefault);
      emitToast({ tone: 'error', title: localT.validationFailedTitle, message });
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
        title: localT.importSuccessTitle,
        message: response.message,
      });
      onImportSuccess();
      onClose();
    } catch (error) {
      const errDetails = (error as any).details;
      if (errDetails && Array.isArray(errDetails.errors)) {
        setDryRunResults({
          message: localT.importExecutionError,
          success_count: 0,
          errors: errDetails.errors,
        });
      } else {
        const message = getErrorMessage(error, localT.importFailedDefault);
        emitToast({ tone: 'error', title: localT.importFailedTitle, message });
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
              {localT.title}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {entityType === 'book' ? localT.descriptionBooks : localT.descriptionMembers}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label={localT.close}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Navigation Step Indicators */}
        <div className="flex border-b border-slate-100 bg-white px-8 py-3.5 justify-between text-xs font-bold text-slate-400">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-primary' : step > 1 ? 'text-emerald-600' : ''}`}>
            <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-extrabold ${step === 1 ? 'bg-primary text-white' : step > 1 ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>1</span>
            {localT.stepSelectFile}
          </div>
          <div className="h-[1px] flex-1 bg-slate-100 mx-4 self-center" />
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-primary' : step > 2 ? 'text-emerald-600' : ''}`}>
            <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-extrabold ${step === 2 ? 'bg-primary text-white' : step > 2 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>2</span>
            {localT.stepColumnMapping}
          </div>
          <div className="h-[1px] flex-1 bg-slate-100 mx-4 self-center" />
          <div className={`flex items-center gap-2 ${step === 3 ? 'text-primary' : ''}`}>
            <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-extrabold ${step === 3 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>3</span>
            {localT.stepVerifyFinish}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* STEP 1: UPLOAD */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{localT.sampleFileTitle}</h4>
                  <p className="text-[11px] text-slate-500">{localT.sampleFileDesc}</p>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleFile}
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">download</span>
                  {localT.downloadSample}
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600">{localT.selectFileLabel}</label>
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
                      {file ? file.name : localT.dropAreaPlaceholder}
                    </p>
                    <p className="text-xs text-slate-400">
                      {file ? `${(file.size / 1024).toFixed(1)} KB` : localT.fileLimitHint}
                    </p>
                  </div>
                </div>
              </div>

              {/* Show CSV parsing preview if file loaded */}
              {file && csvHeaders.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-700">{localT.previewTitle.replace('{{count}}', String(csvRowsPreview.length))}</h4>
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
                                {row[colIndex] || <em className="text-slate-300">{localT.emptyValue}</em>}
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
                {(() => {
                  const parts = localT.mappingInstructions.split(':');
                  if (parts.length > 1) {
                    return (
                      <>
                        <strong>{parts[0]}:</strong>{parts.slice(1).join(':')}
                      </>
                    );
                  }
                  return localT.mappingInstructions;
                })()}
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                <div className="grid grid-cols-2 bg-slate-50/50 p-4 text-xs font-bold text-slate-500">
                  <div>{localT.systemFieldHeader}</div>
                  <div>{localT.csvColumnHeader}</div>
                </div>
                {expectedFields.map((field) => (
                  <div key={field.key} className="grid grid-cols-2 p-4 items-center gap-4 hover:bg-slate-50/30">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">{field.label}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {field.required ? (
                          <span className="text-red-500 font-extrabold font-mono">{localT.requiredField}</span>
                        ) : (
                          localT.optionalField
                        )}
                      </span>
                    </div>
                    <div>
                      <select
                        aria-label={`${localT.stepColumnMapping} ${field.label}`}
                        value={columnMapping[field.key] || ''}
                        onChange={(e) => setColumnMapping({
                          ...columnMapping,
                          [field.key]: e.target.value
                        })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">{localT.selectColumnPlaceholder}</option>
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
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{localT.configValidationTitle}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      id="allow-partial-checkbox"
                      type="checkbox"
                      checked={allowPartial}
                      onChange={(e) => setAllowPartial(e.target.checked)}
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="allow-partial-checkbox" className="text-xs text-slate-600 font-semibold select-none cursor-pointer">
                      {localT.allowPartialLabel}
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
                  {localT.reRunDryRun}
                </button>
              </div>

              {/* Loader */}
              {isProcessing && !dryRunExecuted && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-500 animate-pulse font-semibold">{localT.validatingMessage}</p>
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
                          ? localT.dryRunErrorTitle
                          : localT.dryRunSuccessTitle}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {localT.dryRunSummary
                          .replace('{{successCount}}', String(dryRunResults.success_count))
                          .replace('{{errorCount}}', String(dryRunResults.errors.length))}
                      </p>
                    </div>
                  </div>

                  {/* Errors details list */}
                  {dryRunResults.errors.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-red-800 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] font-bold">error</span>
                        {localT.errorLogTitle}
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
                {localT.back}
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
              {localT.cancel}
            </button>

            {step === 1 && (
              <button
                type="button"
                onClick={handleNextToStep2}
                disabled={!file}
                className="rounded-xl bg-primary px-5 py-2.5 font-bold text-white shadow-md shadow-primary/10 transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {localT.continueMapping}
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={handleNextToStep3}
                className="rounded-xl bg-primary px-5 py-2.5 font-bold text-white shadow-md shadow-primary/10 transition-opacity hover:opacity-90 cursor-pointer"
              >
                {localT.runDryRun}
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
                    {localT.processing}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    {localT.officialImport}
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
