import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SHELF_LABELS } from '../lib/bookClassification';

export { SHELF_LABELS };

interface LibraryMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightLocation?: string | null;
  bookTitle?: string;
}

// Helper to clean and parse locations into shelves or zones
function parseLocation(locationStr?: string | null): { shelf?: string; zone?: string; original: string } {
  const original = locationStr || '';
  if (!locationStr) return { original };

  const cleanStr = locationStr.trim().toUpperCase();

  // Matches shelf like A1, B2, S-05, R-02
  const shelfMatch = cleanStr.match(/(?:KỆ|KHU|DÃY|SHELF|TABLE|ROOM|PHÒNG|BÀN|BÀN HỌC|BÀN NHÓM)?\s*([A-J]|[RGS])\s*[-_]?\s*0*(\d+)/i);
  if (shelfMatch) {
    const type = shelfMatch[1]; // A-J or R/G/S
    const num = parseInt(shelfMatch[2], 10); // number
    return { shelf: `${type}${num}`, original };
  }

  // Zone matches
  if (cleanStr.includes('MÁY TÍNH') || cleanStr.includes('COMPUTER')) {
    return { zone: 'computer_room', original };
  }
  if (cleanStr.includes('BÁO') || cleanStr.includes('TẠP CHÍ') || cleanStr.includes('NEWSPAPER') || cleanStr.includes('MAGAZINE')) {
    return { zone: 'newspaper_room', original };
  }
  if (cleanStr.includes('HỌP') || cleanStr.includes('HỘI THẢO') || cleanStr.includes('CONFERENCE') || cleanStr.includes('SEMINAR')) {
    return { zone: 'conference_room', original };
  }
  if (cleanStr.includes('TIẾP SV') || cleanStr.includes('TIẾP SINH VIÊN') || cleanStr.includes('QUẦY GV')) {
    return { zone: 'reception_student', original };
  }
  if (cleanStr.includes('NỘI BỘ') || cleanStr.includes('NHÂN VIÊN') || cleanStr.includes('KHO SÁCH') || cleanStr.includes('INTERNAL')) {
    return { zone: 'internal_staff', original };
  }
  if (cleanStr.includes('LỄ TÂN') || cleanStr.includes('MƯỢN-TRẢ') || cleanStr.includes('RECEPTION')) {
    return { zone: 'reception_desk', original };
  }
  if (cleanStr.includes('TỦ KHÓA') || cleanStr.includes('GỬI ĐỒ') || cleanStr.includes('LOCKER')) {
    return { zone: 'lockers', original };
  }

  return { zone: 'general', original };
}

interface MapZoneInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  details?: string;
}

type LibraryMapTab = 'map' | 'details';

const MAP_BASE_WIDTH = 900;
const MAP_BASE_HEIGHT = 760;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.25;
const ZOOM_STEP = 0.1;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

const ZONES: Record<string, MapZoneInfo> = {
  computer_room: {
    id: 'computer_room',
    name: 'Phòng Máy Tính',
    description: 'Bố trí 4 máy tính tra cứu tốc độ cao dành cho sinh viên.',
    icon: 'computer',
    details: 'Được trang bị internet cáp quang, cài đặt sẵn cơ sở dữ liệu thư viện phục vụ tra cứu tài liệu học tập, nghiên cứu và truy cập học liệu điện tử.',
  },
  newspaper_room: {
    id: 'newspaper_room',
    name: 'Phòng Đọc Báo / Tạp Chí',
    description: 'Nơi đọc báo giấy, báo tuần và các ấn phẩm định kỳ mới nhất.',
    icon: 'menu_book',
    details: 'Không gian yên tĩnh, có ghế sofa nghỉ ngơi và kệ trưng bày các loại báo chí, tạp chí khoa học chuyên ngành trong nước và quốc tế.',
  },
  internal_staff: {
    id: 'internal_staff',
    name: 'Kho Sách / Nhân Viên',
    description: 'Khu vực nghiệp vụ, lưu trữ sách gốc và văn phòng làm việc của thủ thư.',
    icon: 'badge',
    details: 'Khu vực nội bộ dành riêng cho thủ thư xử lý phân loại sách mới, quản lý kho lưu trữ sâu và lưu động tài liệu.',
  },
  conference_room: {
    id: 'conference_room',
    name: 'Phòng Họp Hội Thảo',
    description: 'Không gian tổ chức hội nghị, seminars hoặc các buổi sinh hoạt chuyên đề.',
    icon: 'groups',
    details: 'Được trang bị máy chiếu, bảng tương tác thông minh và hệ thống âm thanh, bàn họp sức chứa 15-20 người.',
  },
  reception_student: {
    id: 'reception_student',
    name: 'Phòng Tiếp Sinh Viên & Quầy GV',
    description: 'Giải đáp thắc mắc, hỗ trợ thủ tục làm thẻ thư viện và đăng ký tài liệu.',
    icon: 'support_agent',
    details: 'Nơi sinh viên đăng ký các dịch vụ đặc biệt hoặc giáo viên gửi học liệu, giáo trình bản cứng bổ sung cho môn học.',
  },
  lockers: {
    id: 'lockers',
    name: 'Tủ Khóa Gửi Đồ',
    description: 'Dãy tủ khóa thông minh gửi tư trang cá nhân trước khi vào thư viện.',
    icon: 'lock',
    details: 'Có chìa khóa riêng hoặc thẻ quét cảm ứng. Sinh viên bắt buộc gửi balo, túi xách lớn tại đây trước khi vào phòng đọc chính.',
  },
  reception_desk: {
    id: 'reception_desk',
    name: 'Quầy Lễ Tân / Mượn - Trả Sách',
    description: 'Quầy phục vụ chính thực hiện thủ tục mượn sách, trả sách và nộp phạt.',
    icon: 'desk',
    details: 'Thủ thư túc trực thường xuyên để hỗ trợ quét mã vạch mượn/trả sách, kiểm tra tình trạng kho và tư vấn tìm tài liệu.',
  },
  study_area: {
    id: 'study_area',
    name: 'Khu Tự Học',
    description: 'Không gian tự học cá nhân hoặc học tập nhóm đa dạng.',
    icon: 'local_library',
    details: 'Gồm 20 bàn đơn tự học yên tĩnh, 3 bàn thảo luận nhóm lớn và 2 phòng thảo luận nhóm biệt lập cách âm.',
  },
  bookcase_area: {
    id: 'bookcase_area',
    name: 'Khu Kệ Sách',
    description: 'Khu vực lưu trữ các kệ sách vật lý chính của thư viện phân theo phân mục.',
    icon: 'shelves',
    details: 'Phân loại từ A đến J theo sơ đồ thư viện: khoa học tự nhiên ở dãy A, kinh tế - lịch sử ở dãy B, công nghệ - kỹ thuật ở dãy C, văn học - xã hội ở dãy D, tham khảo ở dãy E và các nhóm chuyên đề bổ sung ở tầng 2.',
  },
};

export default function LibraryMapModal({ isOpen, onClose, highlightLocation, bookTitle }: LibraryMapModalProps) {
  const [activeZone, setActiveZone] = useState<MapZoneInfo | null>(null);
  const [selectedZone, setSelectedZone] = useState<MapZoneInfo | null>(null);
  const [activeTab, setActiveTab] = useState<LibraryMapTab>('map');
  const [zoom, setZoom] = useState(1);
  const [isAutoFit, setIsAutoFit] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(MAP_BASE_WIDTH);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const parsed = useMemo(() => parseLocation(highlightLocation), [highlightLocation]);

  const initialFloor = useMemo(() => {
    if (parsed.shelf) {
      const char = parsed.shelf.charAt(0).toUpperCase();
      if (['F', 'G', 'H', 'I', 'J'].includes(char)) return 2;
    }
    return 1;
  }, [parsed.shelf]);

  const [selectedFloor, setSelectedFloor] = useState<number>(initialFloor);

  useEffect(() => {
    if (parsed.shelf) {
      const char = parsed.shelf.charAt(0).toUpperCase();
      if (['F', 'G', 'H', 'I', 'J'].includes(char)) {
        setSelectedFloor(2);
      } else {
        setSelectedFloor(1);
      }
    }
  }, [parsed.shelf]);

  const fitScale = useMemo(() => clampZoom(Math.min(1, viewportWidth / MAP_BASE_WIDTH)), [viewportWidth]);

  const resetInteractionState = useCallback(() => {
    setActiveZone(null);
    setSelectedZone(null);
    setActiveTab('map');
    setIsAutoFit(true);
    setZoom(1);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetInteractionState();
    }
  }, [isOpen, resetInteractionState]);

  useEffect(() => {
    if (!isOpen || !viewportRef.current) return;

    const viewport = viewportRef.current;
    const updateWidth = (nextWidth?: number) => {
      const measuredWidth = nextWidth || viewport.getBoundingClientRect().width || viewport.clientWidth;
      setViewportWidth(measuredWidth > 0 ? measuredWidth : MAP_BASE_WIDTH);
    };

    updateWidth();

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width;
      updateWidth(width);
    });

    observer.observe(viewport);
    return () => observer.disconnect();
  }, [isOpen]);

  useEffect(() => {
    if (isAutoFit) {
      setZoom(fitScale);
    }
  }, [fitScale, isAutoFit]);

  const handleClose = useCallback(() => {
    resetInteractionState();
    onClose();
  }, [onClose, resetInteractionState]);

  if (!isOpen) return null;

  const isShelfHighlighted = (shelfCode: string) => parsed.shelf === shelfCode;
  const isZoneHighlighted = (zoneId: string) => parsed.zone === zoneId;

  const getShelfInfo = (shelfCode: string, label = SHELF_LABELS[shelfCode] || 'Kệ sách'): MapZoneInfo => ({
    id: shelfCode,
    name: `Kệ Sách ${shelfCode}`,
    description: `Khu vực: ${label}`,
    icon: 'shelves',
    details: `Kệ chuyên đề chứa các tài liệu thuộc phân mục: ${label}. Mã phân loại Dewey tương ứng.`,
  });

  const selectZone = (zone: MapZoneInfo) => {
    setSelectedZone(zone);
    setActiveZone(zone);
  };

  const getInteractiveZoneProps = (zone: MapZoneInfo) => ({
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': zone.icon === 'shelves' && /^[A-J]\d+$/i.test(zone.id) ? `Chọn kệ ${zone.id}` : `Chọn ${zone.name}`,
    onClick: () => selectZone(zone),
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectZone(zone);
      }
    },
    onMouseEnter: () => setActiveZone(zone),
    onMouseLeave: () => setActiveZone(null),
  });

  const highlightedZone = parsed.zone ? ZONES[parsed.zone] : null;
  const highlightedShelf = parsed.shelf ? getShelfInfo(parsed.shelf) : null;
  const currentInfo = selectedZone || activeZone || highlightedZone || highlightedShelf;
  const zoomPercent = Math.round(zoom * 100);

  const setManualZoom = (nextZoom: number) => {
    setIsAutoFit(false);
    setZoom(clampZoom(nextZoom));
  };

  const fitToScreen = () => {
    setIsAutoFit(true);
    setZoom(fitScale);
  };

  const resetToActualSize = () => {
    setIsAutoFit(false);
    setZoom(1);
  };

  // Render a bookshelf unit
  const renderShelf = (shelfCode: string, themeColor: string) => {
    const isHighlighted = isShelfHighlighted(shelfCode);
    const label = SHELF_LABELS[shelfCode] || 'Kệ sách';
    const shelfInfo = getShelfInfo(shelfCode, label);

    // Tailwind classes are hardcoded or mapped to keep dynamic template strings working nicely
    const borderClass = isHighlighted ? 'border-amber-500 bg-amber-500/25 text-amber-900 dark:text-amber-300 scale-105 z-10' : '';
    
    // Choose static classes based on themeColor to avoid Tailwind v4 purging/not finding dynamic classes
    let normalClasses = '';
    if (themeColor === 'sky') {
      normalClasses = 'border-sky-400/40 bg-sky-50/10 text-sky-700 hover:border-sky-400 hover:bg-sky-100/30 dark:text-sky-300 dark:hover:bg-sky-950/20';
    } else if (themeColor === 'amber') {
      normalClasses = 'border-amber-400/40 bg-amber-50/10 text-amber-700 hover:border-amber-400 hover:bg-amber-100/30 dark:text-amber-300 dark:hover:bg-amber-950/20';
    } else if (themeColor === 'emerald') {
      normalClasses = 'border-emerald-400/40 bg-emerald-50/10 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100/30 dark:text-emerald-300 dark:hover:bg-emerald-950/20';
    } else if (themeColor === 'pink') {
      normalClasses = 'border-pink-400/40 bg-pink-50/10 text-pink-700 hover:border-pink-400 hover:bg-pink-100/30 dark:text-pink-300 dark:hover:bg-pink-950/20';
    } else if (themeColor === 'violet') {
      normalClasses = 'border-violet-400/40 bg-violet-50/10 text-violet-700 hover:border-violet-400 hover:bg-violet-100/30 dark:text-violet-300 dark:hover:bg-violet-950/20';
    } else {
      normalClasses = 'border-orange-400/40 bg-orange-50/10 text-orange-700 hover:border-orange-400 hover:bg-orange-100/30 dark:text-orange-300 dark:hover:bg-orange-950/20';
    }

    return (
      <div
        key={shelfCode}
        className={`relative flex h-14 items-center justify-center rounded-lg border-2 font-mono text-xs font-bold transition-all duration-300 select-none cursor-pointer ${
          isHighlighted ? borderClass : normalClasses
        }`}
        {...getInteractiveZoneProps(shelfInfo)}
      >
        <div className="text-center">
          <p className="text-[10px] tracking-widest opacity-85">{shelfCode}</p>
          <p className="text-[8px] font-sans font-normal opacity-75 truncate max-w-[60px] mx-auto">
            {shelfCode.startsWith('A')
              ? 'KHTN'
              : shelfCode.startsWith('B')
              ? 'KT-LS'
              : shelfCode.startsWith('C')
              ? 'CN-KT'
              : shelfCode.startsWith('D')
              ? 'VH-XH'
              : shelfCode.startsWith('E')
              ? 'T.Khảo'
              : 'Sách'}
          </p>
        </div>
        {isHighlighted && (
          <div className="absolute -top-6 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-amber-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-md animate-bounce">
            🎯 {bookTitle ? 'Sách ở đây!' : shelfCode}
          </div>
        )}
      </div>
    );
  };

  // Check if highlighted location is an auxiliary shelf
  const isAuxiliaryShelf = parsed.shelf && ['F', 'G', 'H', 'I', 'J'].includes(parsed.shelf.charAt(0));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-2 backdrop-blur-sm transition-all duration-300 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="library-map-title"
    >
      {/* Dynamic Keyframe Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 15px rgba(234, 179, 8, 0.7), inset 0 0 8px rgba(234, 179, 8, 0.4);
            border-color: rgb(245, 158, 11);
          }
          50% {
            box-shadow: 0 0 25px rgba(234, 179, 8, 0.95), inset 0 0 15px rgba(234, 179, 8, 0.7);
            border-color: rgb(217, 119, 6);
          }
        }
        .animate-pulse-glow {
          animation: pulse-glow 1.5s infinite ease-in-out;
        }
        .blueprint-grid {
          background-image: radial-gradient(rgba(14, 165, 233, 0.15) 1px, transparent 1px);
          background-size: 16px 16px;
        }
      `}} />

      <div className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-surface-bright shadow-2xl border border-surface-container-high animate-fade-in">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-surface-container-high bg-surface-container-low px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined">map</span>
            </div>
            <div>
              <h2 id="library-map-title" className="text-base font-bold text-on-surface">Sơ đồ bố trí Thư viện</h2>
              <p className="text-xs text-on-surface-variant">
                Bố cục không gian học tập và định vị tài liệu tại chỗ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Đóng cửa sổ sơ đồ"
            className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="grid grid-cols-2 border-b border-surface-container-high bg-surface-container-low p-1 md:hidden" role="tablist" aria-label="Chế độ xem sơ đồ thư viện">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'map'}
            onClick={() => setActiveTab('map')}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
              activeTab === 'map'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            Bản đồ
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'details'}
            onClick={() => setActiveTab('details')}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
              activeTab === 'details'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            Chú thích & Chi tiết
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-surface-container-lowest">
          
          {/* Main Map Viewport */}
          <div
            ref={viewportRef}
            data-testid="library-map-viewport"
            className={`${activeTab === 'map' ? 'block' : 'hidden'} md:block flex-1 overflow-auto custom-scrollbar p-3 sm:p-6 blueprint-grid relative`}
          >
            <div className="absolute right-3 top-3 z-30 flex items-center gap-1 rounded-full border border-surface-container-high bg-surface-bright/95 p-1 shadow-lg backdrop-blur">
              <button
                type="button"
                aria-label="Thu nhỏ"
                onClick={() => setManualZoom(zoom - ZOOM_STEP)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-base">remove</span>
              </button>
              <span className="min-w-12 text-center text-[11px] font-bold text-on-surface">{zoomPercent}%</span>
              <button
                type="button"
                aria-label="Phóng to"
                onClick={() => setManualZoom(zoom + ZOOM_STEP)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-base">add</span>
              </button>
              <span className="mx-0.5 h-5 w-px bg-surface-container-high" />
              <button
                type="button"
                aria-label="Vừa màn hình"
                onClick={fitToScreen}
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  isAutoFit ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-base">fit_screen</span>
              </button>
              <button
                type="button"
                aria-label="Kích thước gốc 100%"
                onClick={resetToActualSize}
                className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-base">center_focus_strong</span>
              </button>
            </div>
            
            {/* Quick alert if a specific book location is highlighted */}
            {highlightLocation && (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-300 animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500">my_location</span>
                  <span>
                    Đang định vị tài liệu: <strong>{bookTitle || 'Sách được chọn'}</strong> tại{' '}
                    <strong className="underline text-amber-500">{highlightLocation}</strong>
                  </span>
                </div>
                {isAuxiliaryShelf && (
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                    Kệ phụ bổ sung
                  </span>
                )}
              </div>
            )}

            {/* Layout Blueprint */}
            <div
              data-testid="library-map-shell"
              className="mx-auto relative shrink-0"
              style={{ width: MAP_BASE_WIDTH * zoom, height: MAP_BASE_HEIGHT * zoom }}
            >
              <div
                data-testid="library-map-blueprint"
                className="absolute left-0 top-0 border-4 border-slate-700 bg-surface-bright rounded-2xl p-4 shadow-inner"
                style={{
                  width: MAP_BASE_WIDTH,
                  height: MAP_BASE_HEIGHT,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
              >
              
              {/* Outer boundary wall label */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full bg-slate-700 text-white text-[10px] uppercase font-bold tracking-wider">
                Thư viện Trường Đại học Sư phạm TP.HCM
              </div>

              {/* Grid Layout representing the ASCII map */}
              <div className="grid grid-cols-12 gap-3 pt-6">
                
                {/* 1. ROOMS ON LEFT (Col 1-3) */}
                <div className="col-span-3 space-y-3">
                  
                  {/* Conference/Seminar Room */}
                  <div
                    className={`rounded-xl border-2 p-3 transition-all duration-300 cursor-pointer h-[9.5rem] flex flex-col justify-between ${
                      isZoneHighlighted('conference_room')
                        ? 'animate-pulse-glow border-amber-500 bg-amber-500/10'
                        : 'border-slate-350 bg-slate-50/20 dark:border-slate-700 hover:border-primary hover:bg-primary/5'
                    }`}
                    {...getInteractiveZoneProps(ZONES.conference_room)}
                  >
                    <div className="flex items-center gap-1.5 text-indigo-500">
                      <span className="material-symbols-outlined text-sm">groups</span>
                      <h4 className="text-xs font-bold leading-tight">PHÒNG HỌP HỘI THẢO</h4>
                    </div>
                    <div className="my-1 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/10 p-1 text-center text-[9px] text-indigo-700 dark:text-indigo-300">
                      ── Bàn họp lớn ──
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-center">
                      <span className="text-[10px]">🪑</span>
                      <span className="text-[10px]">🪑</span>
                      <span className="text-[10px]">🪑</span>
                      <span className="text-[10px]">🪑</span>
                    </div>
                  </div>

                  {/* Computer Room */}
                  <div
                    className={`rounded-xl border-2 p-3 transition-all duration-300 cursor-pointer h-[9.5rem] ${
                      isZoneHighlighted('computer_room')
                        ? 'animate-pulse-glow border-amber-500 bg-amber-500/10'
                        : 'border-slate-350 bg-slate-50/20 dark:border-slate-700 hover:border-primary hover:bg-primary/5'
                    }`}
                    {...getInteractiveZoneProps(ZONES.computer_room)}
                  >
                    <div className="flex items-center gap-1.5 text-primary">
                      <span className="material-symbols-outlined text-sm">computer</span>
                      <h4 className="text-xs font-bold">PHÒNG MÁY TÍNH</h4>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1.5 text-center">
                      <span className="rounded bg-surface-container py-1 text-[10px]">💻 PC1</span>
                      <span className="rounded bg-surface-container py-1 text-[10px]">💻 PC2</span>
                      <span className="rounded bg-surface-container py-1 text-[10px]">💻 PC3</span>
                      <span className="rounded bg-surface-container py-1 text-[10px]">💻 PC4</span>
                    </div>
                  </div>

                  {/* Newspaper/Magazine Reading Room */}
                  <div
                    className={`rounded-xl border-2 p-3 transition-all duration-300 cursor-pointer h-[7.5rem] ${
                      isZoneHighlighted('newspaper_room')
                        ? 'animate-pulse-glow border-amber-500 bg-amber-500/10'
                        : 'border-slate-350 bg-slate-50/20 dark:border-slate-700 hover:border-primary hover:bg-primary/5'
                    }`}
                    {...getInteractiveZoneProps(ZONES.newspaper_room)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <span className="material-symbols-outlined text-sm">menu_book</span>
                        <h4 className="text-xs font-bold">ĐỌC BÁO / TẠP CHÍ</h4>
                      </div>
                      <span className="text-[10px] text-emerald-500">Mới 📰</span>
                    </div>
                    <div className="mt-2 flex justify-center gap-2">
                      <span className="rounded-lg bg-surface-container px-2 py-1 text-[9px] flex items-center gap-1 whitespace-nowrap">🪑 Ghế 1</span>
                      <span className="rounded-lg bg-surface-container px-2 py-1 text-[9px] flex items-center gap-1 whitespace-nowrap">🪑 Ghế 2</span>
                    </div>
                  </div>

                  {/* Reception Student Room */}
                  <div
                    className={`rounded-xl border-2 p-3 transition-all duration-300 cursor-pointer h-[8.25rem] flex flex-col justify-between ${
                      isZoneHighlighted('reception_student')
                        ? 'animate-pulse-glow border-amber-500 bg-amber-500/10'
                        : 'border-slate-350 bg-slate-50/20 dark:border-slate-700 hover:border-primary hover:bg-primary/5'
                    }`}
                    {...getInteractiveZoneProps(ZONES.reception_student)}
                  >
                    <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
                      <span className="material-symbols-outlined text-sm">support_agent</span>
                      <h4 className="text-xs font-bold">PHÒNG TIẾP SV</h4>
                    </div>
                    <div className="rounded border border-teal-500/35 bg-teal-500/15 p-2 text-center text-[10px] font-bold text-teal-700 dark:text-teal-300">
                      QUẦY GV 📋
                    </div>
                  </div>

                </div>

                {/* 2. MAIN CENTER BODY (Col 4-9) */}
                <div className="col-span-6 flex flex-col space-y-3">
                  
                  {/* Core Bookshelf Zone */}
                  <div
                    className={`rounded-xl border-2 p-4 h-[29.5rem] flex flex-col justify-between transition-all duration-300 ${
                      isZoneHighlighted('bookcase_area')
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="mb-3 flex items-center justify-between border-b border-surface-container pb-2">
                        <div className="flex items-center gap-1.5 text-primary">
                          <span className="material-symbols-outlined text-sm">shelves</span>
                          <h4 className="text-xs font-bold uppercase">Khu vực kệ sách chính</h4>
                        </div>
                        <span className="text-[10px] text-outline tracking-wider font-semibold">Dewey Classification</span>
                      </div>

                      {/* Floor Switcher tabs */}
                      <div className="mb-3 flex gap-2 p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setSelectedFloor(1)}
                          className={`flex-1 py-1.5 px-3 text-[10px] font-bold rounded-md transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                            selectedFloor === 1
                              ? 'bg-primary text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">stairs</span>
                          TẦNG 1 (DÃY A - E)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedFloor(2)}
                          className={`flex-1 py-1.5 px-3 text-[10px] font-bold rounded-md transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                            selectedFloor === 2
                              ? 'bg-primary text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">stairs</span>
                          TẦNG 2 (DÃY F - J)
                        </button>
                      </div>
                    </div>

                    {/* Floor 1 Content */}
                    {selectedFloor === 1 && (
                      <div className="flex-1 flex flex-col justify-between animate-fade-in">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Cột Trái: Dãy kệ A - B */}
                          <div className="space-y-3">
                            {/* Row A */}
                            <div className="space-y-1 border-b border-dashed border-slate-150/40 dark:border-slate-800/40 pb-2.5">
                              <div className="flex flex-col text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">
                                <div className="flex justify-between items-center">
                                  <span>Dãy A</span>
                                  <span className="font-mono text-[9px] opacity-75">A1 - A4</span>
                                </div>
                                <div className="text-[8px] font-normal text-slate-400 dark:text-slate-500 normal-case truncate">
                                  Khoa học Tự nhiên
                                </div>
                              </div>
                              <div className="grid grid-cols-4 gap-2">
                                {renderShelf('A1', 'sky')}
                                {renderShelf('A2', 'sky')}
                                {renderShelf('A3', 'sky')}
                                {renderShelf('A4', 'sky')}
                              </div>
                            </div>

                            {/* Row B */}
                            <div className="space-y-1">
                              <div className="flex flex-col text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">
                                <div className="flex justify-between items-center">
                                  <span>Dãy B</span>
                                  <span className="font-mono text-[9px] opacity-75">B1 - B8</span>
                                </div>
                                <div className="text-[8px] font-normal text-slate-400 dark:text-slate-500 normal-case truncate">
                                  Kinh tế - Lịch sử
                                </div>
                              </div>
                              <div className="grid grid-cols-4 gap-2">
                                {renderShelf('B1', 'amber')}
                                {renderShelf('B2', 'amber')}
                                {renderShelf('B3', 'amber')}
                                {renderShelf('B4', 'amber')}
                                {renderShelf('B5', 'amber')}
                                {renderShelf('B6', 'amber')}
                                {renderShelf('B7', 'amber')}
                                {renderShelf('B8', 'amber')}
                              </div>
                            </div>
                          </div>

                          {/* Cột Phải: Dãy kệ C - E */}
                          <div className="space-y-3">
                            {/* Row C */}
                            <div className="space-y-1 border-b border-dashed border-slate-150/40 dark:border-slate-800/40 pb-2.5">
                              <div className="flex flex-col text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">
                                <div className="flex justify-between items-center">
                                  <span>Dãy C</span>
                                  <span className="font-mono text-[9px] opacity-75">C1 - C3</span>
                                </div>
                                <div className="text-[8px] font-normal text-slate-400 dark:text-slate-500 normal-case truncate">
                                  Công nghệ - Kỹ thuật
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {renderShelf('C1', 'emerald')}
                                {renderShelf('C2', 'emerald')}
                                {renderShelf('C3', 'emerald')}
                              </div>
                            </div>

                            {/* Row D */}
                            <div className="space-y-1 border-b border-dashed border-slate-150/40 dark:border-slate-800/40 pb-2.5">
                              <div className="flex flex-col text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">
                                <div className="flex justify-between items-center">
                                  <span>Dãy D</span>
                                  <span className="font-mono text-[9px] opacity-75">D1 - D4</span>
                                </div>
                                <div className="text-[8px] font-normal text-slate-400 dark:text-slate-500 normal-case truncate">
                                  Văn học - Xã hội
                                </div>
                              </div>
                              <div className="grid grid-cols-4 gap-2">
                                {renderShelf('D1', 'pink')}
                                {renderShelf('D2', 'pink')}
                                {renderShelf('D3', 'pink')}
                                {renderShelf('D4', 'pink')}
                              </div>
                            </div>

                            {/* Row E */}
                            <div className="space-y-1">
                              <div className="flex flex-col text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">
                                <div className="flex justify-between items-center">
                                  <span>Dãy E</span>
                                  <span className="font-mono text-[9px] opacity-75">E1 - E3</span>
                                </div>
                                <div className="text-[8px] font-normal text-slate-400 dark:text-slate-500 normal-case truncate">
                                  Tham khảo & Từ điển
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {renderShelf('E1', 'violet')}
                                {renderShelf('E2', 'violet')}
                                {renderShelf('E3', 'violet')}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Floor 1 Info Banner */}
                        <div className="mt-3 rounded-lg border border-sky-400/20 bg-sky-500/5 p-2 text-[10px] text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-xs">info</span>
                          <span>Tầng 1 chứa tài liệu KHTN, Kinh tế, Tin học, Kỹ thuật và Văn học đại chúng.</span>
                        </div>
                      </div>
                    )}

                    {/* Floor 2 Content */}
                    {selectedFloor === 2 && (
                      <div className="flex-1 flex flex-col justify-between animate-fade-in">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Cột Trái: Dãy kệ F - G */}
                          <div className="space-y-3">
                            {/* Row F */}
                            <div className="space-y-1 border-b border-dashed border-slate-150/40 dark:border-slate-800/40 pb-2.5">
                              <div className="flex flex-col text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">
                                <div className="flex justify-between items-center">
                                  <span>Dãy F</span>
                                  <span className="font-mono text-[9px] opacity-75">F1 - F6</span>
                                </div>
                                <div className="text-[8px] font-normal text-slate-400 dark:text-slate-500 normal-case truncate">
                                  Ngoại ngữ & Ngoại văn
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {renderShelf('F1', 'orange')}
                                {renderShelf('F2', 'orange')}
                                {renderShelf('F3', 'orange')}
                                {renderShelf('F4', 'orange')}
                                {renderShelf('F5', 'orange')}
                                {renderShelf('F6', 'orange')}
                              </div>
                            </div>

                            {/* Row G */}
                            <div className="space-y-1">
                              <div className="flex flex-col text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">
                                <div className="flex justify-between items-center">
                                  <span>Dãy G</span>
                                  <span className="font-mono text-[9px] opacity-75">G1 - G4</span>
                                </div>
                                <div className="text-[8px] font-normal text-slate-400 dark:text-slate-500 normal-case truncate">
                                  Giáo trình Đại học
                                </div>
                              </div>
                              <div className="grid grid-cols-4 gap-2">
                                {renderShelf('G1', 'sky')}
                                {renderShelf('G2', 'sky')}
                                {renderShelf('G3', 'sky')}
                                {renderShelf('G4', 'sky')}
                              </div>
                            </div>
                          </div>

                          {/* Cột Phải: Dãy kệ H - J */}
                          <div className="space-y-3">
                            {/* Row H */}
                            <div className="space-y-1 border-b border-dashed border-slate-150/40 dark:border-slate-800/40 pb-2.5">
                              <div className="flex flex-col text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">
                                <div className="flex justify-between items-center">
                                  <span>Dãy H</span>
                                  <span className="font-mono text-[9px] opacity-75">H1 - H3</span>
                                </div>
                                <div className="text-[8px] font-normal text-slate-400 dark:text-slate-500 normal-case truncate">
                                  Pháp luật & Chính trị
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {renderShelf('H1', 'amber')}
                                {renderShelf('H2', 'amber')}
                                {renderShelf('H3', 'amber')}
                              </div>
                            </div>

                            {/* Row I */}
                            <div className="space-y-1 border-b border-dashed border-slate-150/40 dark:border-slate-800/40 pb-2.5">
                              <div className="flex flex-col text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">
                                <div className="flex justify-between items-center">
                                  <span>Dãy I</span>
                                  <span className="font-mono text-[9px] opacity-75">I1 - I2</span>
                                </div>
                                <div className="text-[8px] font-normal text-slate-400 dark:text-slate-500 normal-case truncate">
                                  Nghệ thuật & Thể thao
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {renderShelf('I1', 'pink')}
                                {renderShelf('I2', 'pink')}
                              </div>
                            </div>

                            {/* Row J */}
                            <div className="space-y-1">
                              <div className="flex flex-col text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">
                                <div className="flex justify-between items-center">
                                  <span>Dãy J</span>
                                  <span className="font-mono text-[9px] opacity-75">J1 - J3</span>
                                </div>
                                <div className="text-[8px] font-normal text-slate-400 dark:text-slate-500 normal-case truncate">
                                  Triết học & Tâm lý học
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {renderShelf('J1', 'violet')}
                                {renderShelf('J2', 'violet')}
                                {renderShelf('J3', 'violet')}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Floor 2 Info Banner */}
                        <div className="mt-3 rounded-lg border border-purple-400/20 bg-purple-500/5 p-2 text-[10px] text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-xs">info</span>
                          <span>Tầng 2 tập trung sách chuyên ngành Ngoại ngữ, Giáo trình, Luật, Mỹ thuật và Triết học.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lockers and Security Gate */}
                  <div className="grid grid-cols-2 gap-3 h-[6.75rem]">
                    {/* Lockers */}
                    <div
                      className={`rounded-xl border-2 p-2 transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                        isZoneHighlighted('lockers')
                          ? 'animate-pulse-glow border-amber-500 bg-amber-500/10'
                          : 'border-slate-350 bg-slate-50/20 dark:border-slate-700 hover:border-primary hover:bg-primary/5'
                      }`}
                      {...getInteractiveZoneProps(ZONES.lockers)}
                    >
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <span className="material-symbols-outlined text-xs">lock</span>
                        <span className="text-[10px] font-bold">TỦ KHÓA GỬI ĐỒ</span>
                      </div>
                      <div className="flex justify-around text-xs mb-1">
                        <span>🔒</span>
                        <span>🔒</span>
                        <span>🔒</span>
                        <span>🔒</span>
                        <span>🔒</span>
                      </div>
                    </div>

                    {/* Security Gates */}
                    <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100/30 p-2 flex flex-col items-center justify-center">
                      <p className="text-[8px] font-bold uppercase text-outline tracking-widest">Cổng từ an ninh</p>
                      <div className="flex items-center gap-3 text-xs mt-1 text-primary animate-pulse">
                        <span>◀</span>
                        <span className="material-symbols-outlined text-sm">sensors</span>
                        <span>▶</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* 3. RIGHT COLUMN (Col 10-12) */}
                <div className="col-span-3 space-y-3">
                  
                  {/* Self-study Area */}
                  <div
                    className={`rounded-xl border-2 p-3 transition-all duration-300 h-[21rem] flex flex-col justify-between ${
                      isZoneHighlighted('study_area')
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <div className="border-b border-surface-container pb-1">
                      <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                        <span className="material-symbols-outlined text-sm">local_library</span>
                        <h4 className="text-xs font-bold">KHU TỰ HỌC</h4>
                      </div>
                    </div>

                    {/* Group Rooms R-01, R-02 */}
                    <div className="space-y-1 mt-1.5">
                      <p className="text-[9px] text-outline font-bold uppercase">Phòng nhóm</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div
                          className={`rounded-lg border p-1 text-center cursor-pointer transition-all duration-200 ${
                            parsed.shelf === 'R1'
                              ? 'animate-pulse-glow border-amber-500 bg-amber-500/25'
                              : 'border-sky-300/40 bg-sky-500/5 hover:bg-sky-500/10'
                          }`}
                          {...getInteractiveZoneProps({
                            id: 'R1',
                            name: 'Phòng Nhóm R-01',
                            description: 'Phòng thảo luận nhóm cách âm, sức chứa 6-8 người.',
                            icon: 'meeting_room',
                          })}
                        >
                          <span className="block text-[10px] font-bold text-sky-700 dark:text-sky-300">R-01</span>
                          <span className="text-[8px] text-slate-500">Group Room</span>
                        </div>
                        <div
                          className={`rounded-lg border p-1 text-center cursor-pointer transition-all duration-200 ${
                            parsed.shelf === 'R2'
                              ? 'animate-pulse-glow border-amber-500 bg-amber-500/25'
                              : 'border-sky-300/40 bg-sky-500/5 hover:bg-sky-500/10'
                          }`}
                          {...getInteractiveZoneProps({
                            id: 'R2',
                            name: 'Phòng Nhóm R-02',
                            description: 'Phòng thảo luận nhóm cách âm, sức chứa 6-8 người.',
                            icon: 'meeting_room',
                          })}
                        >
                          <span className="block text-[10px] font-bold text-sky-700 dark:text-sky-300">R-02</span>
                          <span className="text-[8px] text-slate-500">Group Room</span>
                        </div>
                      </div>
                    </div>

                    {/* Desks Grid (S-01 to S-12) */}
                    <div className="mt-1.5">
                      <p className="text-[9px] text-outline font-bold uppercase mb-1">Góc tự học cá nhân</p>
                      <div className="grid grid-cols-4 gap-1">
                        {Array.from({ length: 12 }, (_, i) => {
                          const code = `S${i + 1}`;
                          const isHigh = parsed.shelf === code;
                          return (
                            <div
                              key={code}
                              className={`rounded border py-0.5 text-center text-[9px] cursor-pointer font-mono font-bold transition-all duration-150 ${
                                isHigh
                                  ? 'animate-pulse-glow border-amber-500 bg-amber-500/25 text-amber-900 dark:text-amber-300'
                                  : 'border-slate-200 bg-slate-50/10 hover:bg-slate-100 dark:border-slate-800'
                              }`}
                              {...getInteractiveZoneProps({
                                id: code,
                                name: `Bàn học S-${String(i + 1).padStart(2, '0')}`,
                                description: 'Bàn tự học đơn cá nhân.',
                                icon: 'desk',
                              })}
                            >
                              S{i + 1}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Group Tables (G-01 to G-03) */}
                    <div className="mt-1.5">
                      <p className="text-[9px] text-outline font-bold uppercase mb-1">Bàn nhóm lớn</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['G1', 'G2', 'G3'].map((code, idx) => {
                          const isHigh = parsed.shelf === code;
                          return (
                            <div
                              key={code}
                              className={`rounded-lg border py-1 text-center cursor-pointer transition-all duration-200 ${
                                isHigh
                                  ? 'animate-pulse-glow border-amber-500 bg-amber-500/25 text-amber-900 dark:text-amber-300'
                                  : 'border-dashed border-sky-300/40 bg-sky-500/5 hover:bg-sky-500/10 text-sky-700 dark:text-sky-300'
                              }`}
                              {...getInteractiveZoneProps({
                                id: code,
                                name: `Bàn Nhóm G-0${idx + 1}`,
                                description: 'Bàn họp nhóm lớn, có cổng cắm điện và cáp mạng.',
                                icon: 'table_restaurant',
                                details: 'Sức chứa tối đa 6 người, thích hợp thảo luận nhóm vừa và làm việc nhóm.',
                              })}
                            >
                              <span className="block text-[10px] font-bold">G-0{idx + 1}</span>
                              <span className="text-[8px] opacity-80">6 chỗ 🪑</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Desks Grid (S-13 to S-20) */}
                    <div className="mt-1.5">
                      <div className="grid grid-cols-4 gap-1">
                        {Array.from({ length: 8 }, (_, i) => {
                          const code = `S${i + 13}`;
                          const isHigh = parsed.shelf === code;
                          return (
                            <div
                              key={code}
                              className={`rounded border py-0.5 text-center text-[9px] cursor-pointer font-mono font-bold transition-all duration-150 ${
                                isHigh
                                  ? 'animate-pulse-glow border-amber-500 bg-amber-500/25 text-amber-900 dark:text-amber-300'
                                  : 'border-slate-200 bg-slate-50/10 hover:bg-slate-100 dark:border-slate-800'
                              }`}
                              {...getInteractiveZoneProps({
                                id: code,
                                name: `Bàn học S-${i + 13}`,
                                description: 'Bàn tự học đơn cá nhân.',
                                icon: 'desk',
                              })}
                            >
                              S{i + 13}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Internal Staff / Storage */}
                  <div
                    className={`rounded-xl border-2 p-3 transition-all duration-300 cursor-pointer h-[7rem] flex flex-col justify-between ${
                      isZoneHighlighted('internal_staff')
                        ? 'animate-pulse-glow border-amber-500 bg-amber-500/10'
                        : 'border-slate-350 bg-slate-50/20 dark:border-slate-700 hover:border-primary hover:bg-primary/5'
                    }`}
                    {...getInteractiveZoneProps(ZONES.internal_staff)}
                  >
                    <div className="flex items-center gap-1.5 text-rose-500">
                      <span className="material-symbols-outlined text-sm">badge</span>
                      <h4 className="text-xs font-bold leading-tight">KHO SÁCH / NHÂN VIÊN</h4>
                    </div>
                    <p className="text-[9px] text-rose-700 dark:text-rose-300 font-semibold italic text-center uppercase tracking-wider">
                      ⚠️ Nội bộ / Staff only
                    </p>
                  </div>

                  {/* Reception desk / Checkout */}
                  <div
                    className={`rounded-xl border-2 p-3 transition-all duration-300 cursor-pointer h-[7.5rem] flex flex-col justify-between ${
                      isZoneHighlighted('reception_desk')
                        ? 'animate-pulse-glow border-amber-500 bg-amber-500/10'
                        : 'border-slate-350 bg-slate-50/20 dark:border-slate-700 hover:border-primary hover:bg-primary/5'
                    }`}
                    {...getInteractiveZoneProps(ZONES.reception_desk)}
                  >
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <span className="material-symbols-outlined text-sm">desk</span>
                      <h4 className="text-[11px] font-bold leading-tight">QUẦY LỄ TÂN & MƯỢN-TRẢ</h4>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-500">
                      <span>📋 Nhân viên</span>
                      <span>Thủ thư 👨‍💼</span>
                    </div>
                  </div>

                </div>

              </div>

              {/* Main Entrance (Centered Bottom) */}
              <div className="mt-4 border-t-4 border-slate-700 pt-3 flex justify-center">
                <div className="rounded-xl border-2 border-slate-400 bg-slate-200/50 dark:bg-slate-800/80 px-10 py-2.5 text-center shadow-md relative">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-200">
                    ═══ CỬA VÀO CHÍNH ═══
                  </p>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded bg-slate-700 px-2 py-0.5 text-[8px] font-bold text-white uppercase">
                    Entrance
                  </div>
                </div>
              </div>

            </div>
          </div>

            {selectedZone && (
              <div
                data-testid="mobile-zone-sheet"
                className="absolute inset-x-3 bottom-3 z-40 rounded-2xl border border-surface-container-high bg-surface-bright p-4 shadow-2xl md:hidden"
                aria-label="Chi tiết khu vực đã chọn"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <span className="material-symbols-outlined">{selectedZone.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-on-surface">{selectedZone.name}</h4>
                    <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{selectedZone.description}</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Đóng chi tiết khu vực"
                    onClick={() => setSelectedZone(null)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className="mt-3 w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm"
                >
                  Xem chi tiết & Chú giải
                </button>
              </div>
            )}
          </div>

          {/* Interactive Info Sidebar panel */}
          <aside
            className={`${activeTab === 'details' ? 'flex' : 'hidden'} md:flex w-full md:w-80 border-t md:border-t-0 md:border-l border-surface-container-high bg-surface-container-low p-6 flex-col justify-between overflow-y-auto`}
            aria-label="Chi tiết khu vực"
          >
            <div>
              <h3 className="text-sm font-bold uppercase text-outline tracking-wider mb-4 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">info</span>
                Chi tiết khu vực
              </h3>

              {currentInfo ? (
                <div className="space-y-4 animate-fade-in">
                  {/* Current Active or Highlighted Zone Info */}
                  {(() => {
                    return (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-2xl">{currentInfo.icon}</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-on-surface text-sm">{currentInfo.name}</h4>
                            <p className="text-[11px] text-on-surface-variant leading-tight">{currentInfo.description}</p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-surface-container-high bg-surface-bright p-4 text-xs text-on-surface-variant leading-relaxed shadow-sm">
                          {currentInfo.details || 'Không gian tự học yên tĩnh phục vụ sinh viên. Vui lòng giữ trật tự và vệ sinh chung khi sử dụng.'}
                        </div>
                      </>
                    );
                  })()}

                  {/* Highlights Indicator */}
                  {highlightLocation && parsed.shelf && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">my_location</span>
                        Vị trí tài liệu định vị
                      </p>
                      <p className="text-xs leading-relaxed text-on-surface-variant">
                        Cuốn sách <strong>{bookTitle || 'bạn chọn'}</strong> hiện nằm tại{' '}
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono font-bold text-amber-800 dark:text-amber-300">
                          {highlightLocation}
                        </span>
                        . Vui lòng đến khu vực được nhấp nháy màu vàng trên sơ đồ để nhận sách.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 text-on-surface-variant space-y-3">
                  <span className="material-symbols-outlined text-4xl text-outline/50 animate-bounce">
                    ads_click
                  </span>
                  <p className="text-xs leading-relaxed max-w-[200px] mx-auto">
                    Di chuột qua hoặc click vào các phòng, kệ sách hoặc khu vực tự học trên sơ đồ để xem thông tin chi tiết.
                  </p>
                </div>
              )}
            </div>

            {/* Legend / Chú giải */}
            <div className="border-t border-surface-container-high pt-5 mt-5">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-3">Chú giải bản đồ</h4>
              
              {/* Dynamic Shelves based on Floor */}
              <div className="mb-4">
                <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">
                  Kệ Sách {selectedFloor === 1 ? 'Tầng 1' : 'Tầng 2'}
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-on-surface-variant">
                  {selectedFloor === 1 ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3.5 w-3.5 rounded border border-sky-400/40 bg-sky-50/40" />
                        <span>Kệ A (KHTN)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3.5 w-3.5 rounded border border-amber-400/40 bg-amber-50/40" />
                        <span>Kệ B (KT-LS)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3.5 w-3.5 rounded border border-emerald-400/40 bg-emerald-50/40" />
                        <span>Kệ C (CN-KT)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3.5 w-3.5 rounded border border-pink-400/40 bg-pink-50/40" />
                        <span>Kệ D (VH-XH)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3.5 w-3.5 rounded border border-violet-400/40 bg-violet-50/40" />
                        <span>Kệ E (T.Khảo)</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3.5 w-3.5 rounded border border-orange-400/40 bg-orange-50/40" />
                        <span>Kệ F (Ngoại ngữ)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3.5 w-3.5 rounded border border-sky-400/40 bg-sky-50/40" />
                        <span>Kệ G (Giáo trình)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3.5 w-3.5 rounded border border-amber-400/40 bg-amber-50/40" />
                        <span>Kệ H (Pháp luật)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3.5 w-3.5 rounded border border-pink-400/40 bg-pink-50/40" />
                        <span>Kệ I (Mỹ thuật)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3.5 w-3.5 rounded border border-violet-400/40 bg-violet-50/40" />
                        <span>Kệ J (Triết học)</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Spaces and Positioning */}
              <div>
                <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">
                  Không gian & Định vị
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-on-surface-variant">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3.5 w-3.5 rounded border-2 border-dashed border-amber-500 bg-amber-500/25 animate-pulse" />
                    <span className="font-bold text-amber-600">Sách cần tìm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3.5 w-3.5 rounded border border-sky-300/40 bg-sky-500/5" />
                    <span>Phòng/Bàn nhóm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3.5 w-3.5 rounded border border-slate-200 bg-slate-50/10 dark:border-slate-800" />
                    <span>Bàn tự học đơn</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3.5 w-3.5 rounded border border-rose-500/35 bg-rose-500/15" />
                    <span>Khu vực nội bộ</span>
                  </div>
                </div>
              </div>
            </div>

          </aside>
          
        </div>

        {/* Footer */}
        <footer className="flex justify-end border-t border-surface-container-high bg-surface-container-low px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            Đóng sơ đồ
          </button>
        </footer>

      </div>
    </div>
  );
}
