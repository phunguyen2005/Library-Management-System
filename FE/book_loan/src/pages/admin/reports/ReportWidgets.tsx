import React from 'react';
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
}

export function FinanceCard({
  label, hint, value, icon, accentBorder, textColor, iconColor, iconBg,
}: FinanceCardProps) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-5 shadow-sm flex items-center justify-between border-l-4 ${accentBorder}`}>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <h3 className={`text-xl font-extrabold ${textColor} mt-1`}>{value}</h3>
        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{hint}</span>
      </div>
      <span className={`material-symbols-outlined ${iconColor} ${iconBg} p-2.5 rounded-lg text-2xl`}>{icon}</span>
    </div>
  );
}

// ─── Top-books list ───────────────────────────────────────────────────────────

export function TopBooksList({ books }: { books: ReportData['top_books'] }) {
  if (books.length === 0)
    return <EmptyState icon="book" title="Chưa có dữ liệu mượn" message="Lượt mượn sách nổi bật sẽ xuất hiện tại đây." />;

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
            {book.borrow_count} lượt
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Top-members list ─────────────────────────────────────────────────────────

export function TopMembersList({ members }: { members: ReportData['top_members'] }) {
  if (members.length === 0)
    return <EmptyState icon="group" title="Chưa có độc giả" message="Lịch sử độc giả mượn tích cực sẽ hiển thị tại đây." />;

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
            {member.borrow_count} lượt
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
const METHOD_LABEL: Record<string, string> = {
  cash: 'Tiền mặt',
  momo: 'MoMo',
  vnpay: 'VNPay',
};

export function RecentTransactionsTable({ transactions }: { transactions: ReportData['recent_transactions'] }) {
  if (transactions.length === 0)
    return <EmptyState icon="receipt_long" title="Chưa có giao dịch" message="Lịch sử nộp phạt thực tế sẽ hiển thị ở đây khi phát sinh." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">Mã GD</th>
            <th className="px-4 py-3">Sinh viên</th>
            <th className="px-4 py-3">Số tiền</th>
            <th className="px-4 py-3">Phương thức</th>
            <th className="px-4 py-3">Mã tham chiếu</th>
            <th className="px-4 py-3">Thời gian</th>
            <th className="px-4 py-3">Người xác nhận</th>
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
              <td className="px-4 py-3 font-bold text-emerald-600">{payment.amount.toLocaleString('vi-VN')} đ</td>
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
