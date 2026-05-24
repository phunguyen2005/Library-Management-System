import React from 'react';
import { ReportData } from '../../../api/reportApi';

// ─── Donut Chart ─────────────────────────────────────────────────────────────

export function DonutChart({ rates }: { rates: ReportData['return_rates'] }) {
  const total = rates.reduce((sum, r) => sum + r.value, 0);
  if (total === 0)
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        Chưa có đủ số liệu
      </div>
    );

  const colors = ['#2563eb', '#f59e0b', '#10b981', '#ef4444'];
  let accumulatedPercentage = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
      <div className="relative w-40 h-40 shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />
          {rates.map((rate, index) => {
            const percentage = (rate.value / total) * 100;
            const strokeDasharray = `${percentage} ${100 - percentage}`;
            const strokeDashoffset = 100 - accumulatedPercentage;
            accumulatedPercentage += percentage;
            return (
              <circle
                key={rate.name}
                cx="18" cy="18" r="15.915"
                fill="none"
                stroke={colors[index % colors.length]}
                strokeWidth="3"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500 hover:stroke-[4]"
              >
                <title>{`${rate.name}: ${rate.value} phiếu (${Math.round(percentage)}%)`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-full m-4 shadow-inner">
          <span className="text-2xl font-extrabold text-foreground">{total}</span>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Lượt phiếu</span>
        </div>
      </div>

      <div className="space-y-2.5 flex-1 min-w-[160px]">
        {rates.map((rate, index) => {
          const percentage = total > 0 ? Math.round((rate.value / total) * 100) : 0;
          return (
            <div key={rate.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colors[index % colors.length] }} />
                <span className="text-slate-600 font-medium">{rate.name}</span>
              </div>
              <span className="font-bold text-slate-800">{rate.value} ({percentage}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Monthly Trend Line ───────────────────────────────────────────────────────

export function TrendLineChart({ trends }: { trends: ReportData['monthly_trends'] }) {
  if (trends.length === 0)
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        Chưa có dữ liệu lịch sử
      </div>
    );

  const maxCount = Math.max(...trends.map((t) => t.count), 5);
  const height = 180;
  const width = 500;
  const padding = 30;

  const points = trends.map((t, index) => ({
    x: padding + (index * (width - 2 * padding)) / (trends.length - 1 || 1),
    y: height - padding - (t.count * (height - 2 * padding)) / maxCount,
    ...t,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const y = padding + r * (height - 2 * padding);
          const val = Math.round(maxCount * (1 - r));
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={padding - 8} y={y + 4} fill="#94a3b8" fontSize="8" textAnchor="end" fontWeight="bold">{val}</text>
            </g>
          );
        })}
        <path d={areaD} fill="url(#areaGrad)" />
        <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i} className="group">
            <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#2563eb" strokeWidth="2"
              className="hover:scale-150 transition-transform cursor-pointer" />
            <text x={p.x} y={p.y - 10} fill="#1e293b" fontSize="8" fontWeight="bold" textAnchor="middle"
              className="opacity-0 group-hover:opacity-100 transition-opacity">{p.count}</text>
            <text x={p.x} y={height - padding + 14} fill="#64748b" fontSize="8" fontWeight="semibold" textAnchor="middle">
              {p.month}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Revenue Trend Line ───────────────────────────────────────────────────────

export function RevenueTrendChart({ trends }: { trends: ReportData['revenue_trends'] }) {
  if (trends.length === 0)
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        Chưa có dữ liệu giao dịch phát sinh
      </div>
    );

  const maxTotal = Math.max(...trends.map((t) => t.total), 50000);
  const height = 180;
  const width = 500;
  const padding = 35;
  const step = Math.ceil(trends.length / 5);

  const points = trends.map((t, index) => ({
    x: padding + (index * (width - 2 * padding)) / (trends.length - 1 || 1),
    y: height - padding - (t.total * (height - 2 * padding)) / maxTotal,
    ...t,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <linearGradient id="revAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const y = padding + r * (height - 2 * padding);
          const val = Math.round(maxTotal * (1 - r));
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={padding - 6} y={y + 3} fill="#94a3b8" fontSize="7" textAnchor="end" fontWeight="bold">
                {val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${Math.round(val / 1000)}K` : val}
              </text>
            </g>
          );
        })}
        <path d={areaD} fill="url(#revAreaGrad)" />
        <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i} className="group">
            <circle cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke="#10b981" strokeWidth="2"
              className="hover:scale-150 transition-transform cursor-pointer" />
            <title>{`${p.date}: ${p.total.toLocaleString('vi-VN')} đ`}</title>
            {i % step === 0 && (
              <text x={p.x} y={height - padding + 12} fill="#64748b" fontSize="7" fontWeight="semibold" textAnchor="middle">
                {p.date.substring(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Payment Methods Donut ────────────────────────────────────────────────────

export function PaymentMethodsChart({ byMethod }: { byMethod: ReportData['financials']['by_method'] }) {
  const total = byMethod.cash + byMethod.momo + byMethod.vnpay;
  if (total === 0)
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        Chưa có giao dịch thanh toán nào
      </div>
    );

  const rates = [
    { name: 'Tiền mặt', value: byMethod.cash, color: '#10b981' },
    { name: 'Ví MoMo', value: byMethod.momo, color: '#ec4899' },
    { name: 'Ví VNPay', value: byMethod.vnpay, color: '#3b82f6' },
  ];

  let accumulatedPercentage = 0;

  return (
    <div className="flex flex-col items-center gap-6 justify-center w-full">
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />
          {rates.map((rate) => {
            const percentage = (rate.value / total) * 100;
            const strokeDasharray = `${percentage} ${100 - percentage}`;
            const strokeDashoffset = 100 - accumulatedPercentage;
            accumulatedPercentage += percentage;
            return (
              <circle
                key={rate.name}
                cx="18" cy="18" r="15.915"
                fill="none"
                stroke={rate.color}
                strokeWidth="3"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              >
                <title>{`${rate.name}: ${rate.value.toLocaleString('vi-VN')}đ (${Math.round(percentage)}%)`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-full m-4 shadow-inner">
          <span className="text-sm font-extrabold text-foreground">{Math.round(total / 1000)}K</span>
          <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Tổng thu</span>
        </div>
      </div>

      <div className="space-y-2 w-full">
        {rates.map((rate) => {
          const percentage = total > 0 ? Math.round((rate.value / total) * 100) : 0;
          return (
            <div key={rate.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: rate.color }} />
                <span className="text-slate-600 font-medium">{rate.name}</span>
              </div>
              <span className="font-bold text-slate-800">{rate.value.toLocaleString('vi-VN')} đ ({percentage}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
