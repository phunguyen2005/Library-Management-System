import React, { useMemo, useState } from 'react';

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
    details: 'Phân loại từ A1 đến E2 theo chuẩn phân loại thập phân Dewey. Sách khoa học tự nhiên ở dãy A, kinh tế - lịch sử ở dãy B, kỹ thuật ở dãy C, văn học xã hội ở dãy D và sách tham khảo ở dãy E.',
  },
};

export const SHELF_LABELS: Record<string, string> = {
  A1: 'KHTN (Khoa học Tự nhiên)',
  A2: 'KHTN (Khoa học Tự nhiên)',
  A3: 'KHTN (Khoa học Tự nhiên)',
  A4: 'KHTN (Khoa học Tự nhiên)',
  B1: 'KT-LS (Kinh tế - Lịch sử)',
  B2: 'KT-LS (Kinh tế - Lịch sử)',
  B3: 'KT-LS (Kinh tế - Lịch sử)',
  B4: 'KT-LS (Kinh tế - Lịch sử)',
  B5: 'KT-LS (Kinh tế - Lịch sử)',
  B6: 'KT-LS (Kinh tế - Lịch sử)',
  B7: 'KT-LS (Kinh tế - Lịch sử)',
  B8: 'KT-LS (Kinh tế - Lịch sử)',
  C1: 'CN-KT (Công nghệ - Kỹ thuật)',
  C2: 'CN-KT (Công nghệ - Kỹ thuật)',
  C3: 'CN-KT (Công nghệ - Kỹ thuật)',
  D1: 'VH-XH (Văn học - Xã hội)',
  D2: 'VH-XH (Văn học - Xã hội)',
  D3: 'VH-XH (Văn học - Xã hội)',
  D4: 'VH-XH (Văn học - Xã hội)',
  E1: 'Tham khảo',
  E2: 'Từ điển',
  E3: 'Tham khảo bổ sung',
  F1: 'Ngoại ngữ / Ngoại văn',
  F2: 'Ngoại ngữ / Ngoại văn',
  F3: 'Ngoại ngữ / Ngoại văn',
  F4: 'Ngoại ngữ / Ngoại văn',
  F5: 'Ngoại ngữ / Ngoại văn',
  F6: 'Ngoại ngữ / Ngoại văn',
  G1: 'Giáo trình đại học',
  G2: 'Giáo trình đại học',
  G3: 'Giáo trình đại học',
  G4: 'Giáo trình đại học',
  H1: 'Pháp luật / Chính trị',
  H2: 'Pháp luật / Chính trị',
  H3: 'Pháp luật / Chính trị',
  I1: 'Nghệ thuật / Thể thao',
  I2: 'Nghệ thuật / Thể thao',
  J1: 'Triết học / Tâm lý học',
  J2: 'Triết học / Tâm lý học',
  J3: 'Triết học / Tâm lý học',
};

export default function LibraryMapModal({ isOpen, onClose, highlightLocation, bookTitle }: LibraryMapModalProps) {
  const [activeZone, setActiveZone] = useState<MapZoneInfo | null>(null);

  const parsed = useMemo(() => parseLocation(highlightLocation), [highlightLocation]);

  const initialFloor = useMemo(() => {
    if (parsed.shelf) {
      const char = parsed.shelf.charAt(0).toUpperCase();
      if (['F', 'G', 'H', 'I', 'J'].includes(char)) return 2;
    }
    return 1;
  }, [parsed.shelf]);

  const [selectedFloor, setSelectedFloor] = useState<number>(initialFloor);

  React.useEffect(() => {
    if (parsed.shelf) {
      const char = parsed.shelf.charAt(0).toUpperCase();
      if (['F', 'G', 'H', 'I', 'J'].includes(char)) {
        setSelectedFloor(2);
      } else {
        setSelectedFloor(1);
      }
    }
  }, [parsed.shelf]);

  if (!isOpen) return null;

  const isShelfHighlighted = (shelfCode: string) => parsed.shelf === shelfCode;
  const isZoneHighlighted = (zoneId: string) => parsed.zone === zoneId;

  // Render a bookshelf unit
  const renderShelf = (shelfCode: string, themeColor: string) => {
    const isHighlighted = isShelfHighlighted(shelfCode);
    const label = SHELF_LABELS[shelfCode] || 'Kệ sách';

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
        onMouseEnter={() =>
          setActiveZone({
            id: shelfCode,
            name: `Kệ Sách ${shelfCode}`,
            description: `Khu vực: ${label}`,
            icon: 'shelves',
            details: `Kệ chuyên đề chứa các tài liệu thuộc phân mục: ${label}. Mã phân loại Dewey tương ứng.`,
          })
        }
        onMouseLeave={() => setActiveZone(null)}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm transition-all duration-300">
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
        <header className="flex items-center justify-between border-b border-surface-container-high bg-surface-container-low px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined">map</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface">Sơ đồ bố trí Thư viện</h2>
              <p className="text-xs text-on-surface-variant">
                Bố cục không gian học tập và định vị tài liệu tại chỗ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-surface-container-lowest">
          
          {/* Main Map Viewport */}
          <div className="flex-1 overflow-auto custom-scrollbar p-6 blueprint-grid relative">
            
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
            <div className="mx-auto min-w-[700px] max-w-[850px] border-4 border-slate-700 bg-surface-bright rounded-2xl p-4 shadow-inner relative">
              
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
                    onMouseEnter={() => setActiveZone(ZONES.conference_room)}
                    onMouseLeave={() => setActiveZone(null)}
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
                    onMouseEnter={() => setActiveZone(ZONES.computer_room)}
                    onMouseLeave={() => setActiveZone(null)}
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
                    onMouseEnter={() => setActiveZone(ZONES.newspaper_room)}
                    onMouseLeave={() => setActiveZone(null)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <span className="material-symbols-outlined text-sm">menu_book</span>
                        <h4 className="text-xs font-bold">ĐỌC BÁO / TẠP CHÍ</h4>
                      </div>
                      <span className="text-[10px] text-emerald-500">Mới 📰</span>
                    </div>
                    <div className="mt-2 flex justify-center gap-3">
                      <span className="rounded-lg bg-surface-container px-3 py-1 text-[10px] flex items-center gap-1">🪑 Ghế 1</span>
                      <span className="rounded-lg bg-surface-container px-3 py-1 text-[10px] flex items-center gap-1">🪑 Ghế 2</span>
                    </div>
                  </div>

                  {/* Reception Student Room */}
                  <div
                    className={`rounded-xl border-2 p-3 transition-all duration-300 cursor-pointer h-[8.25rem] flex flex-col justify-between ${
                      isZoneHighlighted('reception_student')
                        ? 'animate-pulse-glow border-amber-500 bg-amber-500/10'
                        : 'border-slate-350 bg-slate-50/20 dark:border-slate-700 hover:border-primary hover:bg-primary/5'
                    }`}
                    onMouseEnter={() => setActiveZone(ZONES.reception_student)}
                    onMouseLeave={() => setActiveZone(null)}
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
                              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                                <span>Dãy A: Khoa học Tự nhiên</span>
                                <span className="font-mono text-[9px] opacity-75">A1 - A4</span>
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
                              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                                <span>Dãy B: Kinh tế - Lịch sử</span>
                                <span className="font-mono text-[9px] opacity-75">B1 - B8</span>
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
                              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                                <span>Dãy C: Công nghệ - Kỹ thuật</span>
                                <span className="font-mono text-[9px] opacity-75">C1 - C3</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {renderShelf('C1', 'emerald')}
                                {renderShelf('C2', 'emerald')}
                                {renderShelf('C3', 'emerald')}
                              </div>
                            </div>

                            {/* Row D */}
                            <div className="space-y-1 border-b border-dashed border-slate-150/40 dark:border-slate-800/40 pb-2.5">
                              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                                <span>Dãy D: Văn học - Xã hội</span>
                                <span className="font-mono text-[9px] opacity-75">D1 - D4</span>
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
                              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                                <span>Dãy E: Tham khảo & Từ điển</span>
                                <span className="font-mono text-[9px] opacity-75">E1 - E3</span>
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
                              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                                <span>Dãy F: Ngoại ngữ & Ngoại văn</span>
                                <span className="font-mono text-[9px] opacity-75">F1 - F6</span>
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
                              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                                <span>Dãy G: Giáo trình Đại học</span>
                                <span className="font-mono text-[9px] opacity-75">G1 - G4</span>
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
                              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                                <span>Dãy H: Pháp luật & Chính trị</span>
                                <span className="font-mono text-[9px] opacity-75">H1 - H3</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {renderShelf('H1', 'amber')}
                                {renderShelf('H2', 'amber')}
                                {renderShelf('H3', 'amber')}
                              </div>
                            </div>

                            {/* Row I */}
                            <div className="space-y-1 border-b border-dashed border-slate-150/40 dark:border-slate-800/40 pb-2.5">
                              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                                <span>Dãy I: Nghệ thuật & Thể thao</span>
                                <span className="font-mono text-[9px] opacity-75">I1 - I2</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {renderShelf('I1', 'pink')}
                                {renderShelf('I2', 'pink')}
                              </div>
                            </div>

                            {/* Row J */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                                <span>Dãy J: Triết học & Tâm lý học</span>
                                <span className="font-mono text-[9px] opacity-75">J1 - J3</span>
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
                      onMouseEnter={() => setActiveZone(ZONES.lockers)}
                      onMouseLeave={() => setActiveZone(null)}
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
                          onMouseEnter={() =>
                            setActiveZone({
                              id: 'R1',
                              name: 'Phòng Nhóm R-01',
                              description: 'Phòng thảo luận nhóm cách âm, sức chứa 6-8 người.',
                              icon: 'meeting_room',
                            })
                          }
                          onMouseLeave={() => setActiveZone(null)}
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
                          onMouseEnter={() =>
                            setActiveZone({
                              id: 'R2',
                              name: 'Phòng Nhóm R-02',
                              description: 'Phòng thảo luận nhóm cách âm, sức chứa 6-8 người.',
                              icon: 'meeting_room',
                            })
                          }
                          onMouseLeave={() => setActiveZone(null)}
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
                              onMouseEnter={() =>
                                setActiveZone({
                                  id: code,
                                  name: `Bàn học S-${String(i + 1).padStart(2, '0')}`,
                                  description: 'Bàn tự học đơn cá nhân.',
                                  icon: 'desk',
                                })
                              }
                              onMouseLeave={() => setActiveZone(null)}
                            >
                              S{i + 1}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Group Tables (G-01 to G-03) */}
                    <div className="mt-1.5 space-y-1">
                      <p className="text-[9px] text-outline font-bold uppercase">Bàn nhóm lớn</p>
                      {['G1', 'G2', 'G3'].map((code, idx) => {
                        const isHigh = parsed.shelf === code;
                        return (
                          <div
                            key={code}
                            className={`rounded-lg border px-2 py-0.5 text-xs cursor-pointer flex justify-between items-center transition-all duration-200 ${
                              isHigh
                                ? 'animate-pulse-glow border-amber-500 bg-amber-500/25 text-amber-900 dark:text-amber-300'
                                : 'border-dashed border-sky-300/40 bg-sky-500/5 hover:bg-sky-500/10 text-sky-700 dark:text-sky-300'
                            }`}
                            onMouseEnter={() =>
                              setActiveZone({
                                id: code,
                                name: `Bàn Nhóm G-0${idx + 1}`,
                                description: 'Bàn họp nhóm lớn, có cổng cắm điện và cáp mạng.',
                                icon: 'table_restaurant',
                                details: 'Sức chứa tối đa 6 người, thích hợp thảo luận nhóm vừa và làm việc nhóm.',
                              })
                            }
                            onMouseLeave={() => setActiveZone(null)}
                          >
                            <span className="font-bold">G-0{idx + 1}</span>
                            <span className="text-[9px] font-sans opacity-80">6 chỗ 🪑🪑🪑</span>
                          </div>
                        );
                      })}
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
                              onMouseEnter={() =>
                                setActiveZone({
                                  id: code,
                                  name: `Bàn học S-${i + 13}`,
                                  description: 'Bàn tự học đơn cá nhân.',
                                  icon: 'desk',
                                })
                              }
                              onMouseLeave={() => setActiveZone(null)}
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
                    onMouseEnter={() => setActiveZone(ZONES.internal_staff)}
                    onMouseLeave={() => setActiveZone(null)}
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
                    onMouseEnter={() => setActiveZone(ZONES.reception_desk)}
                    onMouseLeave={() => setActiveZone(null)}
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

          {/* Interactive Info Sidebar panel */}
          <aside className="w-full md:w-80 border-t md:border-t-0 md:border-l border-surface-container-high bg-surface-container-low p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <h3 className="text-sm font-bold uppercase text-outline tracking-wider mb-4 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">info</span>
                Chi tiết khu vực
              </h3>

              {activeZone || parsed.shelf || parsed.zone ? (
                <div className="space-y-4 animate-fade-in">
                  {/* Current Active or Highlighted Zone Info */}
                  {(() => {
                    const info = activeZone || (parsed.zone ? ZONES[parsed.zone] : null) || (parsed.shelf ? {
                      id: parsed.shelf,
                      name: `Kệ Sách ${parsed.shelf}`,
                      description: `Khu vực: ${SHELF_LABELS[parsed.shelf] || 'Chuyên đề sách'}`,
                      icon: 'shelves',
                      details: `Kệ lưu trữ tài liệu phân loại theo nhóm chuyên đề ${SHELF_LABELS[parsed.shelf] || 'bổ sung'}. Vui lòng đối chiếu mã trên gáy sách.`,
                    } : null);

                    if (!info) return null;

                    return (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-2xl">{info.icon}</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-on-surface text-sm">{info.name}</h4>
                            <p className="text-[11px] text-on-surface-variant leading-tight">{info.description}</p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-surface-container-high bg-surface-bright p-4 text-xs text-on-surface-variant leading-relaxed shadow-sm">
                          {info.details || 'Không gian tự học yên tĩnh phục vụ sinh viên. Vui lòng giữ trật tự và vệ sinh chung khi sử dụng.'}
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
            onClick={onClose}
            className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            Đóng sơ đồ
          </button>
        </footer>

      </div>
    </div>
  );
}
