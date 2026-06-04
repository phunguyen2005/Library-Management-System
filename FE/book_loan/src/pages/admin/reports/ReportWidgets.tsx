import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReportData } from '../../../api/reportApi';
import EmptyState from '../../../components/EmptyState';

// ─── Metric card ─────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: string;
  iconColor: string;   // e.g. 'text-blue-500'
  iconBg: string;      // e.g. 'bg-blue-500/10'
  delay?: number;
}

export function StatCard({ label, value, icon, iconColor, iconBg, delay = 0 }: StatCardProps) {
  return (
    <div
      className="rounded-2xl border border-border bg-surface p-6 shadow-sm flex items-center justify-between"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="text-2xl font-extrabold text-foreground mt-1.5">{value}</div>
      </div>
      <span className={`material-symbols-outlined ${iconColor} ${iconBg} p-3 rounded-xl text-3xl`}>{icon}</span>
    </div>
  );
}

// ─── Finance accent card (coloured left border) ───────────────────────────────

interface FinanceCardProps {
  label: string;
  hint: string;
  value: string;
  icon: string;
  accentBorder: string; // e.g. 'border-l-emerald-500'
  textColor: string;    // e.g. 'text-emerald-600'
  iconColor: string;
  iconBg: string;
  onClick?: () => void;
}

export function FinanceCard({
  label, hint, value, icon, accentBorder, textColor, iconColor, iconBg, onClick,
}: FinanceCardProps) {
  const { t } = useTranslation();
  const interactiveStyles = onClick
    ? 'cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 active:scale-[0.99] transition-all duration-200 hover:-translate-y-0.5'
    : '';

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-border bg-surface p-5 shadow-sm flex flex-col justify-between border-l-4 ${accentBorder} ${interactiveStyles}`}
    >
      <div className="flex items-center justify-between w-full">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <h3 className={`text-xl font-extrabold ${textColor} mt-1`}>{value}</h3>
          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{hint}</span>
        </div>
        <span className={`material-symbols-outlined ${iconColor} ${iconBg} p-2.5 rounded-lg text-2xl`}>{icon}</span>
      </div>
      {onClick && (
        <div className={`text-[10px] font-bold ${textColor} mt-3.5 flex items-center gap-1 opacity-80 hover:opacity-100`}>
          <span>{t('adminReports.viewDetailList', 'Xem danh sách chi tiết')}</span>
          <span className="material-symbols-outlined text-[10px] font-bold">arrow_forward</span>
        </div>
      )}
    </div>
  );
}

// ─── Top-books list ───────────────────────────────────────────────────────────

export function TopBooksList({ books }: { books: ReportData['top_books'] }) {
  const { t } = useTranslation();
  if (books.length === 0)
    return <EmptyState icon="book" title={t('adminReports.noBorrowData', 'Chưa có dữ liệu mượn')} message={t('adminReports.noBorrowDataDesc', 'Lượt mượn sách nổi bật sẽ xuất hiện tại đây.')} />;


  return (
    <div className="divide-y divide-border/60">
      {books.map((book, index) => (
        <div key={index} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
          <div className="text-sm font-extrabold text-blue-500 bg-blue-500/10 w-8 h-8 rounded-full flex items-center justify-center shrink-0">
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm text-foreground truncate">{book.title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{book.author} | {book.genre}</p>
          </div>
          <span className="text-xs font-bold bg-muted border border-border px-2.5 py-1 rounded-md text-foreground shrink-0">
            {book.borrow_count} {t('adminReports.timesCount', 'lượt')}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Top-members list ─────────────────────────────────────────────────────────

export function TopMembersList({ members }: { members: ReportData['top_members'] }) {
  const { t } = useTranslation();
  if (members.length === 0)
    return <EmptyState icon="group" title={t('adminReports.noReaders', 'Chưa có độc giả')} message={t('adminReports.noReadersDesc', 'Lịch sử độc giả mượn tích cực sẽ hiển thị tại đây.')} />;


  return (
    <div className="divide-y divide-border/60">
      {members.map((member, index) => (
        <div key={index} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
          <div className="text-sm font-extrabold text-indigo-500 bg-indigo-500/10 w-8 h-8 rounded-full flex items-center justify-center shrink-0">
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm text-foreground truncate">{member.name}</h4>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{member.email}</p>
          </div>
          <span className="text-xs font-bold bg-muted border border-border px-2.5 py-1 rounded-md text-foreground shrink-0">
            {member.borrow_count} {t('adminReports.timesCount', 'lượt')}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Recent transactions table ────────────────────────────────────────────────

const METHOD_STYLES: Record<string, string> = {
  cash:  'bg-green-50 text-green-700 border-green-200',
  momo:  'bg-pink-50  text-pink-700  border-pink-200',
  vnpay: 'bg-blue-50  text-blue-700  border-blue-200',
};
export function RecentTransactionsTable({ transactions }: { transactions: ReportData['recent_transactions'] }) {
  const { t } = useTranslation();
  
  const METHOD_LABEL: Record<string, string> = {
    cash: t('adminFines.methodCash', 'Tiền mặt'),
    momo: 'MoMo',
    vnpay: 'VNPay',
  };

  if (transactions.length === 0)
    return <EmptyState icon="receipt_long" title={t('adminReports.noTransactions', 'Chưa có giao dịch')} message={t('adminReports.noTransactionsDesc', 'Lịch sử nộp phạt thực tế sẽ hiển thị ở đây khi phát sinh.')} />;


  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">{t('adminReports.txId', 'Mã GD')}</th>
            <th className="px-4 py-3">{t('common.student', 'Sinh viên')}</th>
            <th className="px-4 py-3">{t('adminReports.txAmount', 'Số tiền')}</th>
            <th className="px-4 py-3">{t('adminReports.txMethod', 'Phương thức')}</th>
            <th className="px-4 py-3">{t('adminReports.txRef', 'Mã tham chiếu')}</th>
            <th className="px-4 py-3">{t('adminReports.txTime', 'Thời gian')}</th>
            <th className="px-4 py-3">{t('adminReports.txCollector', 'Người xác nhận')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
          {transactions.map((payment) => (
            <tr key={payment.payment_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="px-4 py-3 font-mono font-bold text-slate-500">#{payment.payment_id}</td>
              <td className="px-4 py-3">
                <div className="font-semibold text-slate-800 dark:text-slate-200">{payment.member_name}</div>
                <div className="text-[10px] text-slate-400">{payment.member_email}</div>
              </td>
              <td className="px-4 py-3 font-bold text-emerald-600">{payment.amount.toLocaleString(t('common.numberLocale', 'vi-VN'))} {t('common.currencySymbol', 'đ')}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-sm font-bold text-[9px] uppercase border ${METHOD_STYLES[payment.method] ?? 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                  {METHOD_LABEL[payment.method] ?? payment.method}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{payment.transaction_ref || '—'}</td>
              <td className="px-4 py-3 text-slate-500">{payment.date}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">{payment.collected_by}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TopScholarsList({ scholars }: { scholars: any[] }) {
  const { t } = useTranslation();
  if (!scholars || scholars.length === 0)
    return <EmptyState icon="stars" title={t('adminReports.noScholars', 'Chưa có học giả')} message={t('adminReports.noScholarsDesc', 'Xếp hạng học giả tích lũy XP sẽ hiển thị ở đây.')} />;


  return (
    <div className="divide-y divide-border/60">
      {scholars.map((scholar, index) => (
        <div key={index} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
          <div className="text-sm font-extrabold text-amber-500 bg-amber-500/10 w-8 h-8 rounded-full flex items-center justify-center shrink-0">
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm text-foreground truncate">{scholar.name}</h4>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {scholar.email} • <span className="font-bold text-indigo-600">{t('adminReports.levelLabel', 'Cấp')} {scholar.level}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-emerald-700">
              🏅 {scholar.badges_count} {t('adminReports.badgesSuffix', 'huy hiệu')}
            </span>
            <span className="text-xs font-extrabold bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md text-amber-700">
              ⚡ {scholar.xp} XP
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RewardsStatsWidget({ stats }: { stats: any }) {
  const { t } = useTranslation();
  if (!stats || stats.total_redeemed === 0)
    return <EmptyState icon="military_tech" title={t('adminReports.noRedemptions', 'Chưa có giao dịch đổi quà')} message={t('adminReports.noRedemptionsDesc', 'Thống kê quy đổi phần thưởng sẽ xuất hiện ở đây.')} />;


  return (
    <div className="space-y-4">
      {/* Summary figures */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('adminReports.redeemedItems', 'Quà đã đổi')}</span>
          <span className="font-extrabold text-sm text-slate-700 mt-1 block">{stats.total_redeemed} {t('adminReports.itemsUnit', 'vật phẩm')}</span>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('adminReports.totalPointsSpent', 'Tổng điểm đã tiêu')}</span>
          <span className="font-extrabold text-sm text-amber-600 mt-1 block">🪙 {stats.total_points_spent.toLocaleString(t('common.numberLocale', 'vi-VN'))} {t('adminReports.pointsUnit', 'điểm')}</span>
        </div>
      </div>

      {/* Breakdown per reward code */}
      <div className="space-y-2.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('adminReports.breakdownRedemption', 'Phân bổ theo loại phần thưởng')}</span>
        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
          {stats.by_reward_type?.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center bg-white border border-border p-2.5 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-indigo-500">
                  {item.code === 'extra_loan_slot' ? 'library_add' : 'hourglass_top'}
                </span>
                <span className="font-bold text-slate-700">{item.name}</span>
              </div>
              <span className="font-extrabold bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full text-[10px]">
                {item.count} {t('adminReports.redeemCountUnit', 'lượt đổi')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

