import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  getReportsData,
  ReportData,
  ReportFilter,
  ReportFilterType,
} from '../../api/reportApi';
import EmptyState from '../../components/EmptyState';
import { getErrorMessage } from '../../lib/errors';
import { emitToast } from '../../notifications/events';

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
                    <div>
                      <h3 className="text-base font-bold text-foreground">Nhật ký giao dịch gần đây</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Danh sách các khoản nộp phạt thực tế đã hoàn thành.</p>
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
                  <section className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-foreground">Top 5 sách được mượn nhiều nhất</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Những ấn phẩm thu hút lượng độc giả sinh viên nhiều nhất.</p>
                    </div>
                    <TopBooksList books={data.top_books} />
                  </section>

                  <section className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-foreground">Top 5 sinh viên tích cực nhất</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Những độc giả chăm chỉ mượn trả tài liệu học tập nhiều nhất.</p>
                    </div>
                    <TopMembersList members={data.top_members} />
                  </section>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
