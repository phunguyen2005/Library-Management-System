import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  getReportsData,
  getFineDetails,
  ReportData,
  ReportFilter,
  ReportFilterType,
} from '../../api/reportApi';
import EmptyState from '../../components/EmptyState';
import { getErrorMessage } from '../../lib/errors';
import { emitToast } from '../../notifications/events';
import CSVExportSelector from '../../components/CSVExportSelector';

const AVAILABLE_EXPORT_COLUMNS_FINES = [
  { key: 'fine_id', label: 'Mã phạt / Giao dịch' },
  { key: 'student_name', label: 'Tên độc giả' },
  { key: 'student_email', label: 'Email độc giả' },
  { key: 'amount', label: 'Số tiền phạt' },
  { key: 'status', label: 'Trạng thái thu nợ' },
  { key: 'payment_method', label: 'Phương thức nộp' },
  { key: 'transaction_ref', label: 'Mã tham chiếu' },
  { key: 'reason', label: 'Lý do phạt' },
  { key: 'processor_name', label: 'Người xử lý' },
  { key: 'created_at', label: 'Thời gian phạt' },
  { key: 'paid_at', label: 'Thời gian nộp' },
];

const DEFAULT_EXPORT_COLUMNS_FINES = ['fine_id', 'student_name', 'amount', 'status', 'payment_method', 'paid_at'];

import {
  DonutChart,
  TrendLineChart,
  RevenueTrendChart,
  PaymentMethodsChart,
} from './reports/ReportCharts';
import {
  StatCard,
  FinanceCard,
  TopBooksList,
  TopMembersList,
  RecentTransactionsTable,
  TopScholarsList,
  RewardsStatsWidget,
} from './reports/ReportWidgets';

// ─── helpers ────────────────────────────────────────────────────────────────

function todayString() { return new Date().toISOString().slice(0, 10); }
function currentMonthString() { return new Date().toISOString().slice(0, 7); }
function currentYearString() { return String(new Date().getFullYear()); }

function formatDateDMY(dateStr: string) {
  const parts = dateStr.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
}

function filterLabel(filter: ReportFilter): string {
  if (!filter) return 'Tất cả thời gian';
  if (filter.filter_type === 'day') return `Ngày ${formatDateDMY(filter.filter_value)}`;
  if (filter.filter_type === 'range') {
    const [start, end] = filter.filter_value.split(',');
    return `Ngày ${formatDateDMY(start)} – ${formatDateDMY(end)}`;
  }
  if (filter.filter_type === 'month') {
    const [y, m] = filter.filter_value.split('-');
    return `Tháng ${parseInt(m, 10)}/${y}`;
  }
  return `Năm ${filter.filter_value}`;
}

// ─── Tab config ──────────────────────────────────────────────────────────────

type TabKey = 'overview' | 'finance' | 'rankings';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview',  label: 'Tổng quan',   icon: 'dashboard' },
  { key: 'finance',   label: 'Tài chính',   icon: 'payments' },
  { key: 'rankings',  label: 'Bảng xếp hạng', icon: 'leaderboard' },
];

// ─── Chart section card wrapper ───────────────────────────────────────────────

function ChartCard({
  title, description, children, className = '',
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-4 ${className}`}>
      <div>
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex-1 flex items-center justify-center min-h-[200px]">
        {children}
      </div>
    </section>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function AdminReports() {
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Filter state
  const [filterType, setFilterType] = useState<ReportFilterType | 'all'>('all');
  const [startDate, setStartDate] = useState(todayString());
  const [endDate, setEndDate] = useState(todayString());
  const [monthValue, setMonthValue] = useState(currentMonthString());
  const [yearValue, setYearValue] = useState(currentYearString());
  const [activeFilter, setActiveFilter] = useState<ReportFilter>(null);

  // Detailed modal state
  const [detailType, setDetailType] = useState<'collected' | 'unpaid' | 'waived' | null>(null);
  const [detailData, setDetailData] = useState<any[] | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailSearch, setDetailSearch] = useState('');
  const [modalStartDate, setModalStartDate] = useState('');
  const [modalEndDate, setModalEndDate] = useState('');
  const [detailError, setDetailError] = useState<string | null>(null);

  const handleOpenDetail = async (type: 'collected' | 'unpaid' | 'waived') => {
    setDetailType(type);
    setIsDetailLoading(true);
    setDetailError(null);
    setDetailData([]);
    setDetailSearch('');
    setModalStartDate('');
    setModalEndDate('');
    try {
      const res = await getFineDetails(type, activeFilter);
      setDetailData(res);
    } catch (e: unknown) {
      setDetailError(getErrorMessage(e, 'Không thể tải danh sách chi tiết.'));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const filteredDetailData = (detailData || []).filter((item) => {
    const searchLower = detailSearch.toLowerCase();
    const matchesSearch = (
      (item.student_name || '').toLowerCase().includes(searchLower) ||
      (item.student_email || '').toLowerCase().includes(searchLower) ||
      (item.book_title || '').toLowerCase().includes(searchLower) ||
      (item.transaction_ref || '').toLowerCase().includes(searchLower) ||
      (item.reason || '').toLowerCase().includes(searchLower) ||
      (item.processor_name || '').toLowerCase().includes(searchLower) ||
      (item.notes || '').toLowerCase().includes(searchLower) ||
      (item.waived_reason || '').toLowerCase().includes(searchLower)
    );

    const itemDate = item.created_at ? item.created_at.substring(0, 10) : '';
    let matchesDate = true;
    if (modalStartDate && itemDate < modalStartDate) {
      matchesDate = false;
    }
    if (modalEndDate && itemDate > modalEndDate) {
      matchesDate = false;
    }

    return matchesSearch && matchesDate;
  });

  const buildFilter = (): ReportFilter => {
    if (filterType === 'all') return null;
    if (filterType === 'range') return { filter_type: 'range', filter_value: `${startDate},${endDate}` };
    if (filterType === 'month') return { filter_type: 'month', filter_value: monthValue };
    return { filter_type: 'year', filter_value: yearValue };
  };

  const loadReports = async (filter: ReportFilter) => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await getReportsData(filter));
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Không thể tải báo cáo thống kê.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadReports(null); }, []);

  const handleApplyFilter = () => {
    const f = buildFilter();
    setActiveFilter(f);
    void loadReports(f);
  };

  const handleResetFilter = () => {
    setFilterType('all');
    setActiveFilter(null);
    void loadReports(null);
  };

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const sessionStr = localStorage.getItem('auth_session');
    if (!sessionStr) return;
    try {
      const token = JSON.parse(sessionStr).token;
      emitToast({ tone: 'info', title: 'Xuất báo cáo', message: 'Đang khởi tạo tải báo cáo offline...' });

      let exportUrl = 'http://localhost:8000/api/reports/export';
      if (activeFilter) {
        exportUrl += '?' + new URLSearchParams({
          filter_type: activeFilter.filter_type,
          filter_value: activeFilter.filter_value,
        }).toString();
      }

      fetch(exportUrl, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => { if (!res.ok) throw new Error('Yêu cầu xuất báo cáo thất bại.'); return res.blob(); })
        .then((blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = Object.assign(document.createElement('a'), {
            href: url,
            download: `bao-cao-he-thong-${new Date().toISOString().slice(0, 10)}.csv`,
          });
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          emitToast({ tone: 'success', title: 'Thành công', message: 'Đã tải xuống báo cáo CSV thành công.' });
        })
        .catch((err: Error) => emitToast({ tone: 'error', title: 'Thất bại', message: err.message }));
    } catch {
      emitToast({ tone: 'error', title: 'Lỗi', message: 'Không thể xác thực để tải báo cáo.' });
    }
  };

  // ── Export Fines CSV ──────────────────────────────────────────────────────────────
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleExportFines = (columns: string[]) => {
    const sessionStr = localStorage.getItem('auth_session');
    if (!sessionStr) return;
    try {
      const token = JSON.parse(sessionStr).token;
      emitToast({ tone: 'info', title: 'Xuất dữ liệu phạt', message: 'Đang khởi tạo tải báo cáo nộp phạt...' });

      let exportUrl = 'http://localhost:8000/api/reports/export-fines';
      const params: Record<string, string> = {
        columns: columns.join(','),
      };
      if (activeFilter) {
        params.filter_type = activeFilter.filter_type;
        params.filter_value = activeFilter.filter_value;
      }
      exportUrl += '?' + new URLSearchParams(params).toString();

      fetch(exportUrl, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => { if (!res.ok) throw new Error('Yêu cầu xuất tệp dữ liệu thất bại.'); return res.blob(); })
        .then((blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = Object.assign(document.createElement('a'), {
            href: url,
            download: `bao-cao-nop-phat-${new Date().toISOString().slice(0, 10)}.csv`,
          });
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          emitToast({ tone: 'success', title: 'Thành công', message: 'Tải xuống tệp CSV thành công.' });
        })
        .catch((err: Error) => emitToast({ tone: 'error', title: 'Thất bại', message: err.message }));
    } catch {
      emitToast({ tone: 'error', title: 'Lỗi', message: 'Không thể xác thực để tải dữ liệu.' });
    }
  };

  // ─── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6 lg:p-8">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Báo Cáo &amp; Phân Tích
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Thống kê tình hình mượn trả, chỉ số tài chính và tổng quan hệ thống.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCSV}
          disabled={isLoading || !data}
          className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover px-5 py-2.5 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">file_download</span>
          Xuất CSV
        </button>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface border border-border rounded-2xl p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-end gap-4">
          {/* Filter type selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lọc theo</label>
            <div className="flex rounded-xl border border-border overflow-hidden">
              {(['all', 'range', 'month', 'year'] as const).map((t) => {
                const labels = { all: 'Tất cả', range: 'Ngày', month: 'Tháng', year: 'Năm' };
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilterType(t)}
                    className={`px-4 py-2 text-sm font-semibold transition-colors ${
                      filterType === t ? 'bg-primary text-white' : 'bg-transparent text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {labels[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date pickers */}
          {filterType === 'range' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-start-date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Từ ngày</label>
                <input id="filter-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-end-date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Đến ngày</label>
                <input id="filter-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </>
          )}
          {filterType === 'month' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="filter-month" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chọn tháng</label>
              <input id="filter-month" type="month" value={monthValue} onChange={(e) => setMonthValue(e.target.value)}
                className="rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          )}
          {filterType === 'year' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="filter-year" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chọn năm</label>
              <input id="filter-year" type="number" min="2000" max="2099" value={yearValue} onChange={(e) => setYearValue(e.target.value)}
                className="w-28 rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 ml-auto">
            {activeFilter && (
              <button type="button" onClick={handleResetFilter}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-border transition-colors">
                <span className="material-symbols-outlined text-[15px]">close</span>Xoá lọc
              </button>
            )}
            <button type="button" onClick={handleApplyFilter} disabled={isLoading}
              className="flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary-hover px-5 py-2 text-sm font-bold text-white shadow shadow-primary/20 transition-all hover:-translate-y-0.5 disabled:opacity-50">
              <span className="material-symbols-outlined text-[15px]">filter_alt</span>Áp dụng
            </button>
          </div>
        </div>

        {/* Active filter badge */}
        {activeFilter && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Đang xem:</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-bold px-3 py-1">
              <span className="material-symbols-outlined text-[13px]">calendar_today</span>
              {filterLabel(activeFilter)}
            </span>
          </div>
        )}
      </motion.section>

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 font-semibold shadow-sm">
          ⚠️ {error}
        </div>
      )}

      {/* ── Loading state ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3 bg-surface border border-border rounded-2xl shadow-sm">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Đang kết xuất báo cáo dữ liệu...</p>
        </div>

      ) : !data ? (
        <EmptyState icon="analytics" title="Không có dữ liệu báo cáo" message="Không tìm thấy số liệu tổng hợp trong hệ thống." />

      ) : (
        <div className="space-y-6">

          {/* ── Tab navigation ──────────────────────────────────────────── */}
          <div className="flex gap-1 bg-muted/60 border border-border rounded-2xl p-1.5 w-fit">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'bg-surface shadow text-primary border border-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface/50'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab content ─────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-6"
            >

              {/* ════════════════════════════════════════════════════════════
                  TAB 1 — Tổng quan
              ════════════════════════════════════════════════════════════ */}
              {activeTab === 'overview' && (
                <>
                  {/* KPI counters */}
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Lượt mượn trả"  value={data.total_borrowings} icon="swap_horiz" iconColor="text-blue-500"    iconBg="bg-blue-500/10"    delay={0}   />
                    <StatCard label="Tổng đầu sách"   value={data.total_books}      icon="auto_stories" iconColor="text-green-500" iconBg="bg-green-500/10"   delay={50}  />
                    <StatCard label="Sinh viên"        value={data.total_members}    icon="group"     iconColor="text-indigo-500"  iconBg="bg-indigo-500/10"  delay={100} />
                    <StatCard
                      label="Thực thu phạt"
                      value={<span className="text-emerald-600">{data.financials.collected.toLocaleString('vi-VN')} đ</span>}
                      icon="payments"
                      iconColor="text-emerald-500"
                      iconBg="bg-emerald-500/10"
                      delay={150}
                    />
                  </div>

                  {/* Borrowing + return-rate charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartCard
                      title={activeFilter ? `Xu hướng mượn sách — ${filterLabel(activeFilter)}` : 'Xu hướng mượn sách 6 tháng qua'}
                      description="Số lượng phiếu mượn được duyệt qua từng tháng."
                      className="min-h-[320px]"
                    >
                      <TrendLineChart trends={data.monthly_trends} />
                    </ChartCard>

                    <ChartCard
                      title="Tình trạng trả ấn phẩm &amp; Quá hạn"
                      description="Phân tích tính hiệu quả thu hồi sách theo tỷ lệ trễ hạn."
                      className="min-h-[320px]"
                    >
                      <DonutChart rates={data.return_rates} />
                    </ChartCard>
                  </div>
                </>
              )}

              {/* ════════════════════════════════════════════════════════════
                  TAB 2 — Tài chính
              ════════════════════════════════════════════════════════════ */}
              {activeTab === 'finance' && (
                <>
                  {/* Finance KPI cards */}
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <FinanceCard
                      label="Thực thu nộp phạt"
                      hint="Tiền phạt thực tế thu về"
                      value={`${data.financials.collected.toLocaleString('vi-VN')} đ`}
                      icon="account_balance_wallet"
                      accentBorder="border-l-emerald-500"
                      textColor="text-emerald-600"
                      iconColor="text-emerald-500"
                      iconBg="bg-emerald-500/5"
                      onClick={() => handleOpenDetail('collected')}
                    />
                    <FinanceCard
                      label="Nợ phạt tồn đọng"
                      hint="Tiền phạt chưa thu hồi"
                      value={`${data.financials.unpaid.toLocaleString('vi-VN')} đ`}
                      icon="credit_card_off"
                      accentBorder="border-l-rose-500"
                      textColor="text-rose-600"
                      iconColor="text-rose-500"
                      iconBg="bg-rose-500/5"
                      onClick={() => handleOpenDetail('unpaid')}
                    />
                    <FinanceCard
                      label="Phạt đã miễn giảm"
                      hint="Xoá nợ nộp phạt hợp lệ"
                      value={`${data.financials.waived.toLocaleString('vi-VN')} đ`}
                      icon="card_membership"
                      accentBorder="border-l-blue-500"
                      textColor="text-blue-600"
                      iconColor="text-blue-500"
                      iconBg="bg-blue-500/5"
                      onClick={() => handleOpenDetail('waived')}
                    />
                  </div>

                  {/* Revenue trend + payment method split */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <ChartCard
                      title="Xu hướng dòng tiền thu nộp phạt"
                      description="Dòng tiền thực tế thu về qua các ngày."
                      className="lg:col-span-2 min-h-[320px]"
                    >
                      <RevenueTrendChart trends={data.revenue_trends} />
                    </ChartCard>

                    <ChartCard
                      title="Phân bổ phương thức thanh toán"
                      description="Tỷ lệ nguồn doanh thu nộp phạt thực tế."
                      className="min-h-[320px]"
                    >
                      <PaymentMethodsChart byMethod={data.financials.by_method} />
                    </ChartCard>
                  </div>

                  {/* Recent transactions */}
                  <section className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-base font-bold text-foreground">Nhật ký giao dịch gần đây</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Danh sách các khoản nộp phạt thực tế đã hoàn thành.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsExportModalOpen(true)}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        Xuất báo cáo phạt
                      </button>
                    </div>
                    <RecentTransactionsTable transactions={data.recent_transactions} />
                  </section>
                </>
              )}

              {/* ════════════════════════════════════════════════════════════
                  TAB 3 — Bảng xếp hạng
              ════════════════════════════════════════════════════════════ */}
              {activeTab === 'rankings' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Books */}
                  <section className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-foreground">Top 5 sách được mượn nhiều nhất</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Những ấn phẩm thu hút lượng độc giả sinh viên nhiều nhất.</p>
                    </div>
                    <TopBooksList books={data.top_books} />
                  </section>

                  {/* Top Members by Borrow Count */}
                  <section className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-foreground">Top 5 sinh viên mượn nhiều nhất</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Những độc giả chăm chỉ mượn trả tài liệu học tập nhiều nhất.</p>
                    </div>
                    <TopMembersList members={data.top_members} />
                  </section>

                  {/* Top Scholars by XP */}
                  <section className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-[20px]">workspace_premium</span>
                        Top 5 Học giả tích lũy XP
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Những sinh viên tích cực tham gia các hoạt động thư viện nhất.</p>
                    </div>
                    <TopScholarsList scholars={data.top_xp_members || []} />
                  </section>

                  {/* Gamify Rewards Redemptions Stats */}
                  <section className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-amber-500 text-[20px]">military_tech</span>
                        Thống kê quy đổi phần thưởng
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Tổng quan số lượng vật phẩm/vận hành đã được kích hoạt.</p>
                    </div>
                    <RewardsStatsWidget stats={data.rewards_stats} />
                  </section>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* ── Detailed Modal Overlay ─────────────────────────────────────── */}
      <AnimatePresence>
        {detailType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailType(null)}
              className="absolute inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 15 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="relative bg-surface border border-border shadow-2xl rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border p-5 shrink-0 bg-slate-50/50 dark:bg-slate-800/20">
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-foreground tracking-tight">
                    {detailType === 'collected' && 'Chi tiết Thực thu nộp phạt'}
                    {detailType === 'unpaid' && 'Chi tiết Nợ phạt tồn đọng'}
                    {detailType === 'waived' && 'Chi tiết Phạt đã miễn giảm'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5">
                      <span className="material-symbols-outlined text-[11px]">calendar_today</span>
                      {filterLabel(activeFilter)}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Tổng số bản ghi: {filteredDetailData.length}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailType(null)}
                  className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Search and Date Range Filter Bar */}
              <div className="p-4 border-b border-border shrink-0 bg-surface/90 backdrop-blur flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground pointer-events-none">
                    <span className="material-symbols-outlined text-[18px]">search</span>
                  </span>
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo sinh viên, email, tên sách, thủ thư hoặc lý do..."
                    value={detailSearch}
                    onChange={(e) => setDetailSearch(e.target.value)}
                    className="w-full rounded-xl border border-border bg-muted/50 pl-10 pr-9 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all focus:bg-surface"
                  />
                  {detailSearch && (
                    <button
                      type="button"
                      onClick={() => setDetailSearch('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">cancel</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
                  <span className="font-bold text-muted-foreground">Khoảng ngày:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      aria-label="Từ ngày"
                      type="date"
                      value={modalStartDate}
                      onChange={(e) => setModalStartDate(e.target.value)}
                      className="rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-surface"
                    />
                    <span className="text-muted-foreground font-medium">—</span>
                    <input
                      aria-label="Đến ngày"
                      type="date"
                      value={modalEndDate}
                      onChange={(e) => setModalEndDate(e.target.value)}
                      className="rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-surface"
                    />
                  </div>
                  {(modalStartDate || modalEndDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setModalStartDate('');
                        setModalEndDate('');
                      }}
                      className="flex items-center gap-1 rounded-xl border border-border bg-muted px-2.5 py-1.5 font-bold text-muted-foreground hover:bg-border transition-colors cursor-pointer"
                      title="Xóa bộ lọc khoảng ngày"
                    >
                      <span className="material-symbols-outlined text-[13px] font-bold">close</span>
                      <span>Xóa lọc</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
                {isDetailLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-muted-foreground animate-pulse">Đang tải lịch sử chi tiết...</p>
                  </div>
                ) : detailError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 font-semibold shadow-sm">
                    ⚠️ {detailError}
                  </div>
                ) : filteredDetailData.length === 0 ? (
                  <EmptyState
                    icon="search_off"
                    title="Không có kết quả phù hợp"
                    message="Vui lòng điều chỉnh từ khóa tìm kiếm hoặc kiểm tra khoảng thời gian lọc."
                  />
                ) : (
                  <div className="overflow-x-auto border border-border rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <th className="px-4 py-3">Mã</th>
                          <th className="px-4 py-3">Độc giả</th>
                          <th className="px-4 py-3">Sách vi phạm</th>
                          <th className="px-4 py-3">Lý do</th>
                          <th className="px-4 py-3">Số tiền</th>
                          {detailType === 'collected' && (
                            <>
                              <th className="px-4 py-3">Cổng thanh toán</th>
                              <th className="px-4 py-3">Mã giao dịch</th>
                              <th className="px-4 py-3">Ngày thu</th>
                              <th className="px-4 py-3">Người xác nhận</th>
                            </>
                          )}
                          {detailType === 'unpaid' && (
                            <>
                              <th className="px-4 py-3">Ngày tạo</th>
                              <th className="px-4 py-3">Ghi chú</th>
                            </>
                          )}
                          {detailType === 'waived' && (
                            <>
                              <th className="px-4 py-3">Lý do miễn giảm</th>
                              <th className="px-4 py-3">Ngày duyệt</th>
                              <th className="px-4 py-3">Thủ thư duyệt</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 text-slate-700 dark:text-slate-300">
                        {filteredDetailData.map((item, index) => {
                          const METHOD_LABEL_MAP: Record<string, string> = {
                            cash: 'Tiền mặt',
                            momo: 'MoMo',
                            vnpay: 'VNPay',
                            transfer: 'Chuyển khoản',
                          };
                          const METHOD_STYLE_MAP: Record<string, string> = {
                            cash: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
                            momo: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/20',
                            vnpay: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
                            transfer: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
                          };

                          const REASON_LABEL_MAP: Record<string, string> = {
                            overdue: 'Quá hạn trả',
                            damaged: 'Hư hỏng sách',
                            lost: 'Mất sách',
                          };

                          return (
                            <tr
                              key={index}
                              className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors"
                            >
                              <td className="px-4 py-3 font-mono font-bold text-slate-500">#{item.id}</td>
                              <td className="px-4 py-3 min-w-[150px]">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                  {item.student_name}
                                </div>
                                <div className="text-[10px] text-slate-400">{item.student_email}</div>
                              </td>
                              <td className="px-4 py-3 max-w-[200px] truncate" title={item.book_title}>
                                {item.book_title}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                                  {REASON_LABEL_MAP[item.reason] || item.reason}
                                </span>
                              </td>
                              <td className={`px-4 py-3 font-bold ${
                                detailType === 'collected' ? 'text-emerald-600 dark:text-emerald-400' :
                                detailType === 'unpaid' ? 'text-rose-600 dark:text-rose-400' :
                                'text-blue-600 dark:text-blue-400'
                              }`}>
                                {item.amount.toLocaleString('vi-VN')} đ
                              </td>
                              {detailType === 'collected' && (
                                <>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase ${
                                      METHOD_STYLE_MAP[item.method] ?? 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                                    }`}>
                                      {METHOD_LABEL_MAP[item.method] ?? item.method}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 max-w-[120px] truncate" title={item.transaction_ref}>
                                    {item.transaction_ref || '—'}
                                  </td>
                                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{item.created_at}</td>
                                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">
                                    {item.processor_name}
                                  </td>
                                </>
                              )}
                              {detailType === 'unpaid' && (
                                <>
                                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{item.created_at}</td>
                                  <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={item.notes}>
                                    {item.notes || '—'}
                                  </td>
                                </>
                              )}
                              {detailType === 'waived' && (
                                <>
                                  <td className="px-4 py-3 max-w-[150px] truncate text-slate-600 dark:text-slate-400 font-medium" title={item.waived_reason}>
                                    <span className="inline-flex bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-md text-[10px]">
                                      {item.waived_reason || '—'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{item.created_at}</td>
                                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">
                                    {item.processor_name}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {isExportModalOpen && (
          <CSVExportSelector
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            onExport={handleExportFines}
            availableColumns={AVAILABLE_EXPORT_COLUMNS_FINES}
            defaultColumns={DEFAULT_EXPORT_COLUMNS_FINES}
            title="Xuất báo cáo Giao dịch thu phạt"
            description="Lọc và xuất nhật ký giao dịch nộp phạt thô ra tệp CSV để đối chiếu tài chính."
          />
        )}
      </AnimatePresence>
    </div>
  );
}
