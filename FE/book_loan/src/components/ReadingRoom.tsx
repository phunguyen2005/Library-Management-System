import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { syncReadingProgress } from '../api/readingProgressApi';
import { sendChatMessage } from '../api/aiApi';
import { getErrorMessage } from '../lib/errors';
import { emitToast } from '../notifications/events';
import { applyImageFallback } from '../lib/display';
import type { DigitalDocument, ReadingProgressRecord } from '../types/book';
import { useAuth } from '../auth/AuthContext';
import { echoClient } from '../lib/echo';
import { getIntlLocale, type AppLanguage } from '../i18n';

const TRANSLATIONS = {
  vi: {
    saveError: 'Không thể lưu tiến độ đọc.',
    saveErrorTitle: 'Không thể lưu tiến độ',
    aiGreeting: 'Xin chào! Tôi là **Trợ lý AI** đồng hành cùng bạn học tập tài liệu **"{{title}}"** (định dạng {{format}}). 🤖\n\nBạn có thể hỏi tôi bất kỳ điều gì liên quan đến cuốn sách này (ví dụ: tóm tắt ý chính, giải thích các thuật ngữ khó, đặt câu hỏi kiểm tra kiến thức...). Tôi luôn sẵn sàng!',
    aiContextPrompt: 'Tôi đang đọc tài liệu "{{title}}" của tác giả {{author}}. ',
    aiContextSummary: 'Bản tóm tắt AI có sẵn: {{summary}}. ',
    aiContextQuestion: 'Tôi có câu hỏi sau: {{question}}',
    aiConnError: 'Lỗi kết nối tới trợ lý AI.',
    aiConnFailedMsg: '⚠️ *Không thể kết nối đến Trợ lý AI học tập. Vui lòng kiểm tra đường truyền và thử lại nhé!*',
    closeAriaLabel: 'Đóng phòng đọc',
    lvl5RequiredTitle: 'Yêu cầu cấp độ 5',
    lvl5RequiredMsg: 'Bạn phải đạt cấp độ 5 trở lên trong hệ thống học giả để tải tài liệu số.',
    downloadFile: 'Tải tệp',
    openNewTab: 'Mở tab mới',
    askAi: 'Hỏi Trợ lý AI',
    audioProgress: 'Tiến độ nghe bài giảng: {{percent}}%',
    audioAutoSaving: 'Đang tự động lưu...',
    audioSynced: 'Đã đồng bộ tiến trình nghe',
    pageLabel: 'Trang',
    totalLabel: 'Tổng',
    saving: 'Đang lưu',
    syncDetected: 'Phát hiện tiến trình đọc mới tại trang/giây {{page}} từ thiết bị khác.',
    syncedToastTitle: 'Đã đồng bộ',
    syncedToastMsg: 'Tiến độ đọc của bạn đã được cập nhật.',
    syncBtn: 'Đồng bộ',
    ignoreBtn: 'Bỏ qua',
    loadingPdf: 'Đang tải tài liệu PDF...',
    pdfFallbackInstructions: 'Nếu tài liệu không tự động hiển thị, vui lòng bấm nút "Mở tab mới" hoặc "Tải tệp" ở góc trên bên phải để xem.',
    pdfSecureLoading: 'Đang tải chế độ đọc an toàn trực tuyến. Vui lòng đợi trong giây lát tài liệu hiển thị.',
    playbackSpeedTitle: 'Tốc độ phát',
    rewind10sTitle: 'Lùi 10s',
    pauseTitle: 'Tạm dừng',
    playTitle: 'Phát',
    forward10sTitle: 'Tiến 10s',
    lvl5RequiredAudioMsg: 'Bạn phải đạt cấp độ 5 trở lên trong hệ thống học giả để tải bài giảng.',
    downloadAudioTitle: 'Tải bài giảng',
    previewNotSupported: 'Không thể mở xem trước trực tiếp',
    formatNotSupportedDesc: 'Tài liệu định dạng {{format}} chưa hỗ trợ trình đọc trực tuyến. Vui lòng sử dụng tính năng tải về để xem trên thiết bị của bạn.',
    downloadDocNow: 'Tải tài liệu ngay',
    noAttachedFile: 'Tài liệu số chưa đính kèm tệp tin',
    sampleRecordDesc: 'Bản ghi này đang dùng tài liệu mẫu cho đến khi thủ thư gắn tệp tin chính thức. Vui lòng quay lại sau!',
    aiAssistantTitle: 'Trợ lý học tập AI',
    aiThinking: 'Trợ lý đang suy nghĩ...',
    chatInputPlaceholder: 'Đặt câu hỏi về nội dung tài liệu...'
  },
  en: {
    saveError: 'Could not save reading progress.',
    saveErrorTitle: 'Failed to save progress',
    aiGreeting: 'Hello! I am your **AI Assistant** here to help you study **"{{title}}"** ({{format}} format). 🤖\n\nYou can ask me anything about this book (e.g. summarize key points, explain difficult terms, ask quiz questions...). I am ready!',
    aiContextPrompt: 'I am reading "{{title}}" by {{author}}. ',
    aiContextSummary: 'AI Summary available: {{summary}}. ',
    aiContextQuestion: 'I have the following question: {{question}}',
    aiConnError: 'AI Assistant connection error.',
    aiConnFailedMsg: '⚠️ *Could not connect to the AI Study Assistant. Please check your connection and try again!*',
    closeAriaLabel: 'Close reading room',
    lvl5RequiredTitle: 'Level 5 required',
    lvl5RequiredMsg: 'You must reach level 5 or above in the scholar system to download digital resources.',
    downloadFile: 'Download',
    openNewTab: 'Open Tab',
    askAi: 'Ask AI Assistant',
    audioProgress: 'Lecture audio progress: {{percent}}%',
    audioAutoSaving: 'Auto saving...',
    audioSynced: 'Audio progress synchronized',
    pageLabel: 'Page',
    totalLabel: 'Total',
    saving: 'Saving',
    syncDetected: 'New reading progress detected at page/second {{page}} from another device.',
    syncedToastTitle: 'Synchronized',
    syncedToastMsg: 'Your reading progress has been updated.',
    syncBtn: 'Sync',
    ignoreBtn: 'Ignore',
    loadingPdf: 'Loading PDF document...',
    pdfFallbackInstructions: 'If the document does not display automatically, click "Open Tab" or "Download" in the top right to view.',
    pdfSecureLoading: 'Loading secure online reader. Please wait a moment for the document to appear.',
    playbackSpeedTitle: 'Playback Speed',
    rewind10sTitle: 'Rewind 10s',
    pauseTitle: 'Pause',
    playTitle: 'Play',
    forward10sTitle: 'Forward 10s',
    lvl5RequiredAudioMsg: 'You must reach level 5 or above in the scholar system to download lectures.',
    downloadAudioTitle: 'Download lecture',
    previewNotSupported: 'Direct preview not available',
    formatNotSupportedDesc: 'Documents in {{format}} format do not support online viewing. Please download to view on your device.',
    downloadDocNow: 'Download document now',
    noAttachedFile: 'Digital resource has no file attached',
    sampleRecordDesc: 'This record uses a placeholder file until a librarian uploads the official document. Please check back later!',
    aiAssistantTitle: 'AI Study Assistant',
    aiThinking: 'Assistant is thinking...',
    chatInputPlaceholder: 'Ask a question about the document...'
  },
  zh: {
    saveError: '无法保存阅读进度。',
    saveErrorTitle: '无法保存进度',
    aiGreeting: '你好！我是您的 **AI 学习助手**，很高兴陪伴您阅读文献 **"{{title}}"** ({{format}} 格式)。 🤖\n\n您可以向我提问关于本书的任何问题 (例如：总结核心要点、解释难懂术语、提出测试问题...)。我随时准备着！',
    aiContextPrompt: '我正在阅读 {{author}} 的文献《{{title}}》。',
    aiContextSummary: '现有AI摘要：{{summary}}。',
    aiContextQuestion: '我有以下问题：{{question}}',
    aiConnError: '连接 AI 助手出错。',
    aiConnFailedMsg: '⚠️ *无法连接到 AI 学习助手。请检查您的网络连接并重试！*',
    closeAriaLabel: '关闭阅读室',
    lvl5RequiredTitle: '需要达到 5 级',
    lvl5RequiredMsg: '您必须在学者系统中达到 5 级或以上才能下载数字资源。',
    downloadFile: '下载文件',
    openNewTab: '在新标签页打开',
    askAi: '咨询 AI 助手',
    audioProgress: '音频听讲进度: {{percent}}%',
    audioAutoSaving: '正在自动保存...',
    audioSynced: '已同步听讲进度',
    pageLabel: '页码',
    totalLabel: '总页数',
    saving: '正在保存',
    syncDetected: '从其他设备检测到新的阅读进度，位于页码/秒数 {{page}}。',
    syncedToastTitle: '已同步',
    syncedToastMsg: '您的阅读进度已更新。',
    syncBtn: '同步',
    ignoreBtn: '忽略',
    loadingPdf: '正在加载 PDF 文献...',
    pdfFallbackInstructions: '如果文献未自动显示，请点击右上角的“在新标签页打开”或“下载文件”进行查看。',
    pdfSecureLoading: '正在加载安全在线阅读模式。请稍候，文献即将显示。',
    playbackSpeedTitle: '播放速度',
    rewind10sTitle: '快退 10 秒',
    pauseTitle: '暂停',
    playTitle: '播放',
    forward10sTitle: '快进 10 秒',
    lvl5RequiredAudioMsg: '您必须在学者系统中达到 5 级或以上才能下载课件音频。',
    downloadAudioTitle: '下载音频',
    previewNotSupported: '无法直接预览',
    formatNotSupportedDesc: '{{format}} 格式的文献尚不支持在线阅读。请下载到您的设备后查看。',
    downloadDocNow: '立即下载文献',
    noAttachedFile: '数字文献未附加文件',
    sampleRecordDesc: '在馆员上传正式文件之前，此记录使用样例占位文件。请稍后回来！',
    aiAssistantTitle: 'AI 学习助手',
    aiThinking: '助手正在思考...',
    chatInputPlaceholder: '提出关于文献内容的问题...'
  },
  ja: {
    saveError: '読書の進捗を保存できませんでした。',
    saveErrorTitle: '進捗を保存できません',
    aiGreeting: 'こんにちは！私はあなたと資料 **"{{title}}"** (形式 {{format}}) の学習を進める **AI アシスタント** です。 🤖\n\nこの本に関する質問なら何でも聞いてください (例: 要約、難解な用語の解説、クイズ問題の作成...)。いつでもお答えします！',
    aiContextPrompt: '私は {{author}} の資料「{{title}}」を読んでいます。',
    aiContextSummary: '利用可能なAI要約：{{summary}}。',
    aiContextQuestion: '次の質問があります：{{question}}',
    aiConnError: 'AI アシスタントへの接続エラー。',
    aiConnFailedMsg: '⚠️ *AI 勉強アシスタントに接続できませんでした。接続を確認し、もう一度お試しください！*',
    closeAriaLabel: '閲覧室を閉じる',
    lvl5RequiredTitle: 'レベル 5 が必要',
    lvl5RequiredMsg: 'デジタルリソースをダウンロードするには、学者システムでレベル 5 以上である必要があります。',
    downloadFile: 'ファイルをダウンロード',
    openNewTab: '新しいタブで開く',
    askAi: 'AI アシスタントに質問',
    audioProgress: '講義の試聴進捗: {{percent}}%',
    audioAutoSaving: '自動保存中...',
    audioSynced: '試聴進捗が同期されました',
    pageLabel: 'ページ',
    totalLabel: '合計',
    saving: '保存中',
    syncDetected: '別のデバイスからページ/秒 {{page}} に新しい読書進捗が検出されました。',
    syncedToastTitle: '同期完了',
    syncedToastMsg: '読書の進捗が更新されました。',
    syncBtn: '同期する',
    ignoreBtn: '無視する',
    loadingPdf: 'PDF 資料を読み込み中...',
    pdfFallbackInstructions: '資料が自動的に表示されない場合は、右上にある「新しいタブで開く」または「ダウンロード」ボタンを押して確認してください。',
    pdfSecureLoading: '安全なオンライン閲覧モードを読み込み中。表示されるまでしばらくお待ちください。',
    playbackSpeedTitle: '再生速度',
    rewind10sTitle: '10秒戻る',
    pauseTitle: '一時停止',
    playTitle: '再生',
    forward10sTitle: '10秒進む',
    lvl5RequiredAudioMsg: '講義音声をダウンロードするには、学者システムでレベル 5 以上である必要があります。',
    downloadAudioTitle: '音声をダウンロード',
    previewNotSupported: '直接プレビューできません',
    formatNotSupportedDesc: '{{format}} 形式の資料はオンライン閲覧に対応していません。デバイスにダウンロードしてご覧ください。',
    downloadDocNow: '今すぐ資料をダウンロード',
    noAttachedFile: 'デジタル資料にファイルが添付されていません',
    sampleRecordDesc: 'このレコードは、司書が正式なファイルを添付するまでサンプル用ファイルを使用しています。時間をおいてから再度お試しください。',
    aiAssistantTitle: 'AI 勉強アシスタント',
    aiThinking: 'アシスタントが考え中...',
    chatInputPlaceholder: '資料の内容について質問する...'
  },
  ko: {
    saveError: '독서 진도를 저장할 수 없습니다.',
    saveErrorTitle: '진도 저장 실패',
    aiGreeting: '안녕하세요! 저는 문서 **"{{title}}"** ({{format}} 형식) 공부를 함께할 **AI 학습 비서**입니다. 🤖\n\n이 책에 대해 무엇이든 질문해 보세요 (예: 핵심 요약, 어려운 용어 설명, 지식 평가용 퀴즈 요청 등...). 언제든지 준비되어 있습니다!',
    aiContextPrompt: '저는 {{author}} 저자의 "{{title}}" 문서를 읽고 있습니다. ',
    aiContextSummary: '작성된 AI 요약: {{summary}}. ',
    aiContextQuestion: '다음 질문이 있습니다: {{question}}',
    aiConnError: 'AI 비서 연결 오류.',
    aiConnFailedMsg: '⚠️ *AI 학습 비서에 연결할 수 없습니다. 통신 상태를 확인하고 다시 시도해 주세요!*',
    closeAriaLabel: '열람실 닫기',
    lvl5RequiredTitle: '레벨 5 이상 요구됨',
    lvl5RequiredMsg: '디지털 자료를 다운로드하려면 학자 시스템 레벨 5 이상이어야 합니다.',
    downloadFile: '파일 다운로드',
    openNewTab: '새 탭 열기',
    askAi: 'AI 비서에게 질문',
    audioProgress: '강의 청취 진도: {{percent}}%',
    audioAutoSaving: '자동 저장 중...',
    audioSynced: '청취 진도가 동기화되었습니다',
    pageLabel: '페이지',
    totalLabel: '전체',
    saving: '저장 중',
    syncDetected: '다른 기기에서 페이지/초 {{page}}의 새로운 독서 진도가 감지되었습니다.',
    syncedToastTitle: '동기화 완료',
    syncedToastMsg: '독서 진도가 업데이트되었습니다.',
    syncBtn: '동기화',
    ignoreBtn: '무시',
    loadingPdf: 'PDF 문서 로딩 중...',
    pdfFallbackInstructions: '문서가 자동으로 표시되지 않는 경우, 우측 상단의 "새 탭 열기" 또는 "파일 다운로드" 버튼을 클릭하여 확인해 주십시오.',
    pdfSecureLoading: '안전한 온라인 리더 모드를 로딩 중입니다. 문서가 나타날 때까지 잠시만 기다려 주십시오.',
    playbackSpeedTitle: '재생 속도',
    rewind10sTitle: '10초 뒤로',
    pauseTitle: '일시정지',
    playTitle: '재생',
    forward10sTitle: '10초 앞으로',
    lvl5RequiredAudioMsg: '강의 음원을 다운로드하려면 학자 시스템 레벨 5 이상이어야 합니다.',
    downloadAudioTitle: '음원 다운로드',
    previewNotSupported: '직접 미리보기 불가',
    formatNotSupportedDesc: '{{format}} 형식의 문서는 온라인 뷰어를 지원하지 않습니다. 기기에 다운로드한 후 열람해 주십시오.',
    downloadDocNow: '문서 지금 다운로드',
    noAttachedFile: '디지털 문서에 첨부된 파일이 없습니다',
    sampleRecordDesc: '사서가 공식 파일을 첨부하기 전까지는 샘플용 예시 파일을 사용합니다. 나중에 다시 확인해 주세요!',
    aiAssistantTitle: 'AI 학습 비서',
    aiThinking: '비서가 생각하는 중...',
    chatInputPlaceholder: '문서 내용에 대해 질문하세요...'
  }
};


interface ReadingRoomProps {
  document: DigitalDocument;
  onClose: () => void;
  onProgressSaved?: (progress: ReadingProgressRecord) => void;
}

export default function ReadingRoom({ document, onClose, onProgressSaved }: ReadingRoomProps) {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'vi').startsWith('en') ? 'en' :
                      (i18n.language || 'vi').startsWith('zh') ? 'zh' :
                      (i18n.language || 'vi').startsWith('ja') ? 'ja' :
                      (i18n.language || 'vi').startsWith('ko') ? 'ko' : 'vi';
  const localT = TRANSLATIONS[currentLang];

  const { user, role } = useAuth();
  const userLevel = typeof user?.level === 'number' ? user.level : 1;
  const canDownload = role === 'admin' || role === 'librarian' || userLevel >= 5;

  const isPdf = document.format.toUpperCase() === 'PDF';
  const isAudio = document.format.toUpperCase() === 'AUDIO';
  
  const [currentPage, setCurrentPage] = useState(document.readingProgress?.current_page ?? 1);
  const [totalPages, setTotalPages] = useState(document.readingProgress?.total_pages ?? 1);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [showSyncBanner, setShowSyncBanner] = useState<number | null>(null);
  // Use state (not just ref) so the debounce useEffect actually re-triggers
  const [pendingSave, setPendingSave] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const lastSavedPageRef = useRef(document.readingProgress?.current_page ?? 1);
  // Refs to always hold latest values inside async callbacks / event handlers
  const currentPageRef = useRef(document.readingProgress?.current_page ?? 1);
  const totalPagesRef = useRef(document.readingProgress?.total_pages ?? 1);
  // Guard to prevent audio timeupdate from writing before it has seeked to saved position
  const audioReadyRef = useRef(false);
  const progressPercent = totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;

  // Audio specific states & refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // AI Chat specific states & refs
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Keep refs in sync with state so async save always reads latest values
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { totalPagesRef.current = totalPages; }, [totalPages]);

  const saveProgress = useCallback(async () => {
    if (role !== 'student') {
      return;
    }

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setPendingSave(false);

    // Read from refs so we always get the latest values even inside stale closures
    const latestPage = currentPageRef.current;
    const latestTotal = totalPagesRef.current;

    // Automatically set total pages to at least current page to avoid capping back to 1
    const nextTotalPages = Math.max(1, latestTotal, latestPage);
    const nextCurrentPage = Math.min(Math.max(1, latestPage), nextTotalPages);

    setIsSavingProgress(true);

    try {
      const progress = await syncReadingProgress(document.id, {
        current_page: nextCurrentPage,
        total_pages: nextTotalPages,
      });

      if (progress) {
        setCurrentPage(progress.current_page);
        setTotalPages(progress.total_pages);
        currentPageRef.current = progress.current_page;
        totalPagesRef.current = progress.total_pages;
        lastSavedPageRef.current = progress.current_page;
        onProgressSaved?.(progress);
      }

    } catch (error: unknown) {
      const message = getErrorMessage(error, localT.saveError);
      emitToast({ tone: 'error', title: localT.saveErrorTitle, message });
    } finally {
      setIsSavingProgress(false);
    }
  }, [document.id, onProgressSaved, role]);

  const queueProgressSave = () => {
    setPendingSave(true);
  };

  const flushPendingProgressSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setPendingSave(false);
    await saveProgress();
  }, [saveProgress]);

  const handleClose = async () => {
    // Flush any pending save before closing
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    await saveProgress();
    onClose();
  };

  // Debounced auto save: triggers whenever pendingSave flips to true
  useEffect(() => {
    if (!pendingSave) {
      return undefined;
    }

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      saveTimeoutRef.current = null;
      void saveProgress();
    }, 800); // 800ms debounce

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [pendingSave, currentPage, totalPages, saveProgress]);

  // Real-time multi-device reading progress synchronization
  useEffect(() => {
    if (role !== 'student' || !user || !user.member_id) return;

    const channelName = `member.${user.member_id}`;
    const channel = echoClient.private(channelName);

    channel.listen('.reading.progress.updated', (event: any) => {
      // Only prompt if the progress event is for this document and from a different page position
      if (event.book_id === document.id && event.current_page !== currentPage) {
        setShowSyncBanner(event.current_page);
      }
    });

    return () => {
      echoClient.leave(channelName);
    };
  }, [user, role, document.id, currentPage]);

  // Prefill AI messages on open
  useEffect(() => {
    if (isAiOpen && aiMessages.length === 0) {
      setAiMessages([
        {
          sender: 'ai',
          text: localT.aiGreeting.replace('{{title}}', document.title).replace('{{format}}', document.format),
        },
      ]);
    }
  }, [isAiOpen, aiMessages.length, document.title, document.format, localT]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, isAiOpen]);

  // Reset iframe loading when document changes
  useEffect(() => {
    setIsIframeLoading(true);
  }, [document.id]);

  // Re-sync page progress state when opening a different document.
  // useState() only captures the initial value once – when the user switches books,
  // we must explicitly restore the saved position from the new document's readingProgress.
  useEffect(() => {
    const savedPage = document.readingProgress?.current_page ?? 1;
    const savedTotal = document.readingProgress?.total_pages ?? 1;
    setCurrentPage(savedPage);
    setTotalPages(savedTotal);
    currentPageRef.current = savedPage;
    totalPagesRef.current = savedTotal;
    lastSavedPageRef.current = savedPage;
    audioReadyRef.current = false; // reset audio guard for new document
  }, [document.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Audio helper handlers
  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      void audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    // Guard: don't record progress until audio has seeked to saved position
    if (!audioReadyRef.current) return;
    const current = audioRef.current.currentTime;
    setCurrentTime(current);

    // Save playback position to progress: 1 sec = 1 page
    const currentSec = Math.max(1, Math.floor(current));
    if (currentSec !== currentPageRef.current) {
      setCurrentPage(currentSec);
      currentPageRef.current = currentSec;

      // Save progress to database every 10 seconds of continuous listening for students
      if (role === 'student' && Math.abs(currentSec - lastSavedPageRef.current) >= 10) {
        void saveProgress();
      } else {
        queueProgressSave();
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration;
    setDuration(dur);
    const totalSecs = Math.max(1, Math.floor(dur));
    setTotalPages(totalSecs);
    totalPagesRef.current = totalSecs;

    // Seek audio back to saved position from previous session
    const savedSec = document.readingProgress?.current_page ?? 0;
    if (savedSec > 1 && savedSec < totalSecs) {
      audioRef.current.currentTime = savedSec;
      setCurrentTime(savedSec);
    }
    // Mark audio as ready so handleTimeUpdate starts recording
    audioReadyRef.current = true;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    setCurrentPage(Math.max(1, Math.floor(time)));
    queueProgressSave();
  };

  const handleSkip = (seconds: number) => {
    if (!audioRef.current) return;
    let nextTime = audioRef.current.currentTime + seconds;
    if (nextTime < 0) nextTime = 0;
    if (nextTime > duration) nextTime = duration;
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
    setCurrentPage(Math.max(1, Math.floor(nextTime)));
    queueProgressSave();
  };

  const cyclePlaybackRate = () => {
    if (!audioRef.current) return;
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    audioRef.current.playbackRate = nextRate;
  };

  // AI Chat helper handler
  const handleSendAiMessage = async () => {
    if (!aiInput.trim() || isAiLoading) return;

    const userMsgText = aiInput;
    setAiInput('');
    setAiMessages((prev) => [...prev, { sender: 'user', text: userMsgText }]);
    setIsAiLoading(true);

    try {
      // Package query with book metadata context
      const contextualPrompt = localT.aiContextPrompt.replace('{{title}}', document.title).replace('{{author}}', document.author) +
        (document.aiSummary ? localT.aiContextSummary.replace('{{summary}}', document.aiSummary) : '') +
        localT.aiContextQuestion.replace('{{question}}', userMsgText);

      // Package conversation history
      const history = aiMessages.slice(-8).map((msg) => ({
        sender: msg.sender === 'user' ? ('user' as const) : ('ai' as const),
        text: msg.text,
      }));

      const chatResponse = await sendChatMessage(contextualPrompt, history);
      setAiMessages((prev) => [...prev, { sender: 'ai', text: chatResponse.response }]);

    } catch (error: unknown) {
      const message = getErrorMessage(error, localT.aiConnError);
      setAiMessages((prev) => [
        ...prev,
        { sender: 'ai', text: localT.aiConnFailedMsg },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-900 text-stone-100 animate-fade-in">
      {/* Header bar */}
      <header className="flex h-16 items-center justify-between border-b border-stone-800 bg-stone-950 px-6 shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleClose()}
            aria-label={localT.closeAriaLabel}
            className="flex h-10 w-10 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-100 cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <div>
            <h1 className="line-clamp-1 text-base font-bold">{document.title}</h1>
            <p className="text-xs text-stone-400">{document.author} • {document.type}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded bg-stone-800 px-2.5 py-1 text-xs font-bold uppercase text-stone-300">
            {document.format}
          </span>
          {document.downloadUrl && (
            <button
              type="button"
              onClick={() => {
                if (!canDownload) {
                  emitToast({
                    tone: 'warning',
                    title: localT.lvl5RequiredTitle,
                    message: localT.lvl5RequiredMsg,
                  });
                  return;
                }
                window.open(document.downloadUrl!, '_blank');
              }}
              className="flex h-10 gap-2 items-center rounded-lg bg-stone-800 px-4 text-sm font-semibold transition-colors hover:bg-stone-700 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span>{localT.downloadFile}</span>
            </button>
          )}

          {isPdf && document.openUrl && canDownload && (
            <a
              href={document.openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 gap-2 items-center rounded-lg bg-stone-800 px-4 text-sm font-semibold transition-colors hover:bg-stone-750 text-stone-300 hover:text-white cursor-pointer"
              title={localT.openNewTab}
            >
              <span className="material-symbols-outlined text-lg">open_in_new</span>
              <span>{localT.openNewTab}</span>
            </a>
          )}
 
          {/* AI Helper Toggle Button */}
          {!isAudio && (
            <button
              type="button"
              onClick={() => setIsAiOpen(!isAiOpen)}
              className={`flex h-10 gap-2 items-center rounded-lg px-4 text-sm font-bold transition-all cursor-pointer ${
                isAiOpen
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">smart_toy</span>
              <span>{localT.askAi}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleClose()}
            className="flex h-10 w-10 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-100 cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
      </header>

      {/* Progress Sync Info Bar */}
      {!isAudio && (
        <section className="flex flex-wrap items-center gap-3 border-b border-stone-800 bg-stone-950 px-6 py-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-stone-300">
            <span>{localT.pageLabel}</span>
            <input
              type="number"
              min="1"
              value={currentPage}
              onChange={(event) => {
                queueProgressSave();
                setCurrentPage(Number(event.target.value) || 1);
              }}
              onBlur={() => void flushPendingProgressSave()}
              className="h-9 w-20 rounded-lg border border-stone-700 bg-stone-900 px-2 text-sm text-stone-100 outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-stone-300">
            <span>{localT.totalLabel}</span>
            <input
              type="number"
              min="1"
              value={totalPages}
              onChange={(event) => {
                queueProgressSave();
                setTotalPages(Number(event.target.value) || 1);
              }}
              onBlur={() => void flushPendingProgressSave()}
              className="h-9 w-20 rounded-lg border border-stone-700 bg-stone-900 px-2 text-sm text-stone-100 outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <div className="min-w-[180px] flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-stone-800">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <span className="text-xs font-bold text-stone-300">{progressPercent}%</span>
          <span aria-live="polite" className="min-w-16 text-xs font-semibold text-stone-500">
            {isSavingProgress ? localT.saving : ''}
          </span>
        </section>
      )}

      {/* Main Split Viewport */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Reading / Playback Panel */}
        <main className="relative flex-1 bg-stone-900 p-4 flex flex-col justify-center items-center overflow-hidden">
          {showSyncBanner !== null && (
            <div className="absolute top-4 left-1/2 z-45 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-primary/20 bg-stone-900/90 px-4 py-2 text-xs font-semibold text-stone-100 shadow-2xl backdrop-blur-md animate-in slide-in-from-top duration-300">
              <span className="material-symbols-outlined text-primary text-base animate-pulse">sync</span>
              <span>{localT.syncDetected.replace('{{page}}', String(showSyncBanner))}</span>
              <div className="flex items-center gap-2 ml-4">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage(showSyncBanner);
                    if (audioRef.current && isAudio) {
                      audioRef.current.currentTime = showSyncBanner;
                      setCurrentTime(showSyncBanner);
                    }
                    setShowSyncBanner(null);
                    emitToast({ tone: 'success', title: localT.syncedToastTitle, message: localT.syncedToastMsg });
                  }}
                  className="rounded bg-primary px-2.5 py-1 font-bold text-white hover:bg-primary-hover transition-colors cursor-pointer"
                >
                  {localT.syncBtn}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSyncBanner(null)}
                  className="rounded bg-stone-850 px-2 py-1 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
                >
                  {localT.ignoreBtn}
                </button>
              </div>
            </div>
          )}

          {document.openUrl ? (
            <div className="h-full w-full overflow-hidden rounded-xl border border-stone-850 bg-stone-950 shadow-2xl flex flex-col items-center justify-center">
              {isPdf ? (
                <div className="relative h-full w-full flex items-center justify-center bg-stone-950 animate-fade-in">
                  {isIframeLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-950 space-y-4 p-6">
                      <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
                      <p className="text-xs text-stone-400 font-medium">{localT.loadingPdf}</p>
                      <p className="text-[11px] text-stone-500 max-w-xs text-center leading-normal">
                        {canDownload ? localT.pdfFallbackInstructions : localT.pdfSecureLoading}
                      </p>
                    </div>
                  )}
                  <iframe
                    src={
                      (() => {
                        const savedPage = document.readingProgress?.current_page ?? 1;
                        const pageParam = savedPage > 1 ? `page=${savedPage}&` : '';
                        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                          return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(document.openUrl)}`;
                        }
                        return `${document.openUrl}#${pageParam}toolbar=1`;
                      })()
                    }
                    title={document.title}
                    onLoad={() => setIsIframeLoading(false)}
                    className={`h-full w-full border-none transition-opacity duration-300 ${
                      isIframeLoading ? 'opacity-0' : 'opacity-100'
                    }`}
                    allow="autoplay"
                  />
                </div>
              ) : isAudio ? (
                <div className="flex flex-col items-center justify-center space-y-6 p-6 w-full max-w-lg">
                  <audio
                    ref={audioRef}
                    src={document.openUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                  />

                  {/* Vinyl Rotating Disc Cover */}
                  <div className="relative flex items-center justify-center">
                    <div
                      className="h-44 w-44 rounded-full bg-stone-950 border-4 border-stone-850 shadow-2xl overflow-hidden flex items-center justify-center relative"
                      style={{
                        animation: isPlaying ? 'spin 15s linear infinite' : 'none',
                      }}
                    >
                      {/* Vinyl Grooves */}
                      <div className="absolute inset-2 rounded-full border border-stone-800/30"></div>
                      <div className="absolute inset-5 rounded-full border border-stone-800/30"></div>
                      <div className="absolute inset-8 rounded-full border border-stone-800/30"></div>
                      <div className="absolute inset-11 rounded-full border border-stone-800/30"></div>

                      <img
                        src={document.cover || '/fallback-book-cover.png'}
                        alt={document.title}
                        className="h-20 w-20 rounded-full object-cover z-10 border border-stone-900"
                        onError={(event) => applyImageFallback(event.currentTarget)}
                      />

                      {/* Center Spindle */}
                      <div className="absolute h-3 w-3 bg-stone-900 rounded-full z-20 border border-stone-700 shadow-inner"></div>
                    </div>
                  </div>

                  {/* Audio Track Info */}
                  <div className="text-center space-y-1">
                    <h2 className="text-base font-bold text-stone-100 line-clamp-1">{document.title}</h2>
                    <p className="text-xs text-stone-400">{document.author} • Audio Lecture</p>
                  </div>

                  {/* Custom Styled Audio Player Panel */}
                  <div className="w-full space-y-4 bg-stone-900/60 p-4 rounded-xl border border-stone-800 backdrop-blur-xs">
                    {/* Progress Slider */}
                    <div className="space-y-1">
                      <div className="py-2.5 flex items-center">
                        <input
                          type="range"
                          min={0}
                          max={duration || 100}
                          value={currentTime}
                          onChange={handleSeek}
                          className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:hover:scale-125"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-stone-400">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center justify-between">
                      {/* Playback Rate Selector */}
                      <button
                        type="button"
                        onClick={cyclePlaybackRate}
                        className="flex h-8 px-2.5 items-center justify-center rounded-lg bg-stone-950 hover:bg-stone-850 border border-stone-800 text-[10px] font-bold text-stone-300 transition-colors cursor-pointer"
                        title={localT.playbackSpeedTitle}
                      >
                        <span className="material-symbols-outlined text-[13px] mr-1">speed</span>
                        <span>{playbackRate}x</span>
                      </button>

                      {/* Backward 10s */}
                      <button
                        type="button"
                        onClick={() => handleSkip(-10)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-950 hover:bg-stone-850 border border-stone-800 text-stone-300 transition-colors cursor-pointer"
                        title={localT.rewind10sTitle}
                      >
                        <span className="material-symbols-outlined text-base">replay_10</span>
                      </button>

                      {/* Play / Pause Toggle Button */}
                      <button
                        type="button"
                        onClick={togglePlayPause}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-primary hover:bg-primary/90 text-white shadow-md transition-transform active:scale-95 cursor-pointer"
                        title={isPlaying ? localT.pauseTitle : localT.playTitle}
                      >
                        <span className="material-symbols-outlined text-2xl select-none">
                          {isPlaying ? 'pause' : 'play_arrow'}
                        </span>
                      </button>

                      {/* Forward 10s */}
                      <button
                        type="button"
                        onClick={() => handleSkip(10)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-950 hover:bg-stone-850 border border-stone-800 text-stone-300 transition-colors cursor-pointer"
                        title={localT.forward10sTitle}
                      >
                        <span className="material-symbols-outlined text-base">forward_10</span>
                      </button>

                      {/* Download Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!canDownload) {
                            emitToast({
                              tone: 'warning',
                              title: localT.lvl5RequiredTitle,
                              message: localT.lvl5RequiredAudioMsg,
                            });
                            return;
                          }
                          if (document.downloadUrl) {
                            window.open(document.downloadUrl, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-950 hover:bg-stone-850 border border-stone-800 text-stone-300 transition-colors cursor-pointer"
                        title={localT.downloadAudioTitle}
                      >
                        <span className="material-symbols-outlined text-[15px]">download</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center space-y-4">
                  <span className="material-symbols-outlined text-6xl text-primary animate-bounce">menu_book</span>
                  <h3 className="text-lg font-bold">{localT.previewNotSupported}</h3>
                  <p className="max-w-md text-center text-sm text-stone-400">
                    {localT.formatNotSupportedDesc.replace('{{format}}', document.format)}
                  </p>
                  {document.downloadUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!canDownload) {
                          emitToast({
                            tone: 'warning',
                            title: localT.lvl5RequiredTitle,
                            message: localT.lvl5RequiredMsg,
                          });
                          return;
                        }
                        window.open(document.downloadUrl!, '_blank');
                      }}
                      className="rounded-lg bg-primary px-6 py-3 font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      {localT.downloadDocNow}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center space-y-4">
              <span className="material-symbols-outlined text-6xl text-stone-600">error</span>
              <h3 className="text-lg font-bold">{localT.noAttachedFile}</h3>
              <p className="max-w-md text-center text-sm text-stone-400">
                {localT.sampleRecordDesc}
              </p>
            </div>
          )}
        </main>

        {/* Right sidebar - AI Chatbot Drawer */}
        {isAiOpen && !isAudio && (
          <div className="w-full md:w-96 border-l border-stone-800 bg-stone-950 flex flex-col h-full animate-slide-left z-30">
            {/* Sidebar Chat Header */}
            <header className="flex h-14 items-center justify-between border-b border-stone-800 px-4 bg-stone-900/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl animate-pulse">smart_toy</span>
                <span className="text-xs font-bold text-stone-200 uppercase tracking-wider">{localT.aiAssistantTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAiOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-800 hover:text-stone-100 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </header>

            {/* AI Messages list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-stone-950">
              {aiMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-primary text-white rounded-tr-none shadow-md shadow-primary/10'
                        : 'bg-stone-900 border border-stone-800 text-stone-200 rounded-tl-none shadow-inner'
                    }`}
                  >
                    {msg.text.split('\n').map((line, idx) => (
                      <p key={idx} className="my-0.5 min-h-[0.5rem] whitespace-pre-line">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-none p-3 bg-stone-900 border border-stone-800 text-stone-400">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1 w-1 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1 w-1 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1 w-1 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="text-[10px] ml-1 text-stone-500 font-medium">{localT.aiThinking}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatMessagesEndRef} />
            </div>

            {/* Input form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendAiMessage();
              }}
              className="border-t border-stone-800 bg-stone-900/30 p-3 flex gap-2 items-center"
            >
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder={localT.chatInputPlaceholder}
                disabled={isAiLoading}
                className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder:text-stone-500 outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!aiInput.trim() || isAiLoading}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-40 transition-opacity cursor-pointer shadow-md shadow-primary/10"
              >
                <span className="material-symbols-outlined text-base">send</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Global CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
