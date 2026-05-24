<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Borrowing;
use App\Models\Fine;
use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * Build a date-range array [start, end] from filter_type and filter_value query params.
     * filter_type: 'day' | 'month' | 'year'
     * filter_value: 'YYYY-MM-DD' | 'YYYY-MM' | 'YYYY'
     * Returns null for no filter (all-time).
     */
    private function getDateRange(Request $request): ?array
    {
        $type  = $request->query('filter_type');  // day | month | year
        $value = $request->query('filter_value'); // e.g. 2025-05-23, 2025-05, 2025

        if (!$type || !$value) {
            return null;
        }

        switch ($type) {
            case 'day':
                // value = YYYY-MM-DD
                $start = $value . ' 00:00:00';
                $end   = $value . ' 23:59:59';
                break;
            case 'range':
                // value = YYYY-MM-DD,YYYY-MM-DD
                $parts = explode(',', $value);
                $start = ($parts[0] ?? now()->toDateString()) . ' 00:00:00';
                $end   = ($parts[1] ?? ($parts[0] ?? now()->toDateString())) . ' 23:59:59';
                break;
            case 'month':
                // value = YYYY-MM
                $parts = explode('-', $value);
                $year  = (int) $parts[0];
                $month = (int) ($parts[1] ?? 1);
                $start = sprintf('%04d-%02d-01', $year, $month);
                $end   = date('Y-m-t', mktime(0, 0, 0, $month, 1, $year));
                break;
            case 'year':
                // value = YYYY
                $year  = (int) $value;
                $start = sprintf('%04d-01-01', $year);
                $end   = sprintf('%04d-12-31', $year);
                break;
            default:
                return null;
        }

        return [$start, $end];
    }

    /** Apply a date range to a Borrowing query on borrow_date column. */
    private function applyBorrowDateFilter($query, ?array $range)
    {
        if ($range) {
            $query->whereBetween('borrow_date', $range);
        }
        return $query;
    }

    /** Apply a date range to a Fine query on created_at column. */
    private function applyFineDateFilter($query, ?array $range)
    {
        if ($range) {
            $query->whereBetween('created_at', $range);
        }
        return $query;
    }

    public function index(Request $request)
    {
        $range = $this->getDateRange($request);

        // 1. Biểu đồ mượn trả theo từng tháng
        $trendQuery = Borrowing::query()
            ->selectRaw("strftime('%Y-%m', borrow_date) as month, count(*) as count");

        if ($range) {
            // When a filter is active, show breakdown within that period
            $trendQuery->whereBetween('borrow_date', $range);
        } else {
            // Default: last 6 months
            $trendQuery->where('borrow_date', '>=', now()->subMonths(6)->toDateString());
        }

        $monthlyTrends = $trendQuery
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
                $parts = explode('-', $item->month);
                $label = isset($parts[1]) ? "Tháng " . intval($parts[1]) . "/" . $parts[0] : $item->month;
                return [
                    'month' => $label,
                    'count' => $item->count,
                ];
            });

        // 2. Tỷ lệ sách trễ hạn vs sách trả đúng hạn
        $returnedOnTime = $this->applyBorrowDateFilter(
            Borrowing::where('status', Borrowing::STATUS_RETURNED)->whereRaw('return_date <= due_date'),
            $range
        )->count();

        $returnedLate = $this->applyBorrowDateFilter(
            Borrowing::where('status', Borrowing::STATUS_RETURNED)->whereRaw('return_date > due_date'),
            $range
        )->count();

        $overdueUnreturned = $this->applyBorrowDateFilter(
            Borrowing::where('status', Borrowing::STATUS_BORROWED)->where('due_date', '<', now()->toDateString()),
            $range
        )->count();

        $onTimeActive = $this->applyBorrowDateFilter(
            Borrowing::where('status', Borrowing::STATUS_BORROWED)->where('due_date', '>=', now()->toDateString()),
            $range
        )->count();

        // 3. Thống kê tiền phạt nâng cao
        $paymentsQuery = \App\Models\FinePayment::where('status', 'completed');
        if ($range) {
            $paymentsQuery->whereBetween('created_at', $range);
        }
        $byMethod = $paymentsQuery->select('method', DB::raw('sum(amount_paid) as total'))
            ->groupBy('method')
            ->get()
            ->pluck('total', 'method')
            ->toArray();

        $totalCollected = (float) ($byMethod['cash'] ?? 0) 
            + (float) ($byMethod['momo'] ?? 0) 
            + (float) ($byMethod['vnpay'] ?? 0)
            + (float) ($byMethod['transfer'] ?? 0);

        $totalUnpaid = (float) $this->applyFineDateFilter(Fine::where('status', 'unpaid'), $range)->sum('amount');
        $totalWaived = (float) $this->applyFineDateFilter(Fine::where('status', 'waived'), $range)->sum('amount');

        $byMethodCash  = (float) ($byMethod['cash'] ?? 0);
        $byMethodMomo  = (float) (($byMethod['momo'] ?? 0) + ($byMethod['transfer'] ?? 0));
        $byMethodVnpay = (float) ($byMethod['vnpay'] ?? 0);

        // 3.1 Xu hướng doanh thu phạt (daily revenue trends)
        $revenueTrendQuery = \App\Models\FinePayment::where('status', 'completed')
            ->selectRaw("strftime('%Y-%m-%d', created_at) as date, sum(amount_paid) as total");
        if ($range) {
            $revenueTrendQuery->whereBetween('created_at', $range);
        } else {
            // Mặc định: 30 ngày gần nhất
            $revenueTrendQuery->where('created_at', '>=', now()->subDays(30)->toDateTimeString());
        }
        $revenueTrends = $revenueTrendQuery
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function ($item) {
                return [
                    'date'  => $item->date,
                    'total' => (float) $item->total,
                ];
            });

        // 3.2 10 giao dịch nộp phạt gần đây nhất
        $recentTransactions = \App\Models\FinePayment::where('status', 'completed')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(function ($payment) {
                $fine = $payment->fine;
                $member = $fine ? $fine->member : null;
                $collector = $payment->collector;

                return [
                    'payment_id'      => $payment->payment_id,
                    'member_name'     => $member ? $member->name : 'Sinh viên ẩn danh',
                    'member_email'    => $member ? $member->email : '',
                    'amount'          => (float) $payment->amount_paid,
                    'method'          => $payment->method,
                    'transaction_ref' => $payment->transaction_ref,
                    'date'            => $payment->created_at ? $payment->created_at->toDateTimeString() : '',
                    'collected_by'    => $collector ? $collector->name : ($payment->method !== 'cash' ? 'Cổng trực tuyến' : 'Hệ thống'),
                ];
            });

        // 4. Top 5 cuốn sách mượn nhiều nhất
        $topBooks = $this->applyBorrowDateFilter(
            Borrowing::query()->select('book_id', DB::raw('count(*) as borrow_count')),
            $range
        )
            ->groupBy('book_id')
            ->orderByDesc('borrow_count')
            ->limit(5)
            ->get()
            ->map(function ($item) {
                $book = Book::find($item->book_id);
                return [
                    'title'       => $book->title ?? 'Sách đã xóa',
                    'author'      => $book->author ?? '',
                    'genre'       => $book->genre ?? '',
                    'borrow_count' => $item->borrow_count,
                ];
            });

        // 5. Top 5 sinh viên tích cực nhất
        $topMembers = $this->applyBorrowDateFilter(
            Borrowing::query()->select('member_id', DB::raw('count(*) as borrow_count')),
            $range
        )
            ->groupBy('member_id')
            ->orderByDesc('borrow_count')
            ->limit(5)
            ->get()
            ->map(function ($item) {
                $member = Member::find($item->member_id);
                return [
                    'name'         => $member->name ?? 'Sinh viên ẩn danh',
                    'email'        => $member->email ?? '',
                    'borrow_count' => $item->borrow_count,
                ];
            });

        // Aggregate totals: scoped to filter when active, otherwise all-time
        $totalBorrowings = $this->applyBorrowDateFilter(Borrowing::query(), $range)->count();

        return response()->json([
            'monthly_trends' => $monthlyTrends,
            'return_rates'   => [
                ['name' => 'Đúng hạn',                'value' => $returnedOnTime],
                ['name' => 'Trễ hạn (Đã trả)',        'value' => $returnedLate],
                ['name' => 'Đang mượn (Trong hạn)',   'value' => $onTimeActive],
                ['name' => 'Đang mượn (Quá hạn)',     'value' => $overdueUnreturned],
            ],
            'financials'     => [
                'collected' => $totalCollected,
                'unpaid'    => $totalUnpaid,
                'waived'    => $totalWaived,
                'by_method' => [
                    'cash'  => $byMethodCash,
                    'momo'  => $byMethodMomo,
                    'vnpay' => $byMethodVnpay,
                ]
            ],
            'revenue_trends'      => $revenueTrends,
            'recent_transactions' => $recentTransactions,
            'top_books'      => $topBooks,
            'top_members'    => $topMembers,
            'total_books'    => Book::count(),
            'total_members'  => Member::count(),
            'total_borrowings' => $totalBorrowings,
        ]);
    }

    public function export(Request $request)
    {
        $range = $this->getDateRange($request);

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="bao-cao-thong-ke-' . now()->format('Ymd') . '.csv"',
            'Pragma'              => 'no-cache',
            'Cache-Control'       => 'must-revalidate, post-check=0, pre-check=0',
            'Expires'             => '0',
        ];

        $callback = function () use ($range) {
            $file = fopen('php://output', 'w');

            // UTF-8 BOM for Excel compatibility
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($file, ['BÁO CÁO THỐNG KÊ HỆ THỐNG THƯ VIỆN SỐ - ENTERPRISE EDITION']);
            fputcsv($file, ['Ngày xuất báo cáo:', now()->toDateTimeString()]);
            if ($range) {
                fputcsv($file, ['Khoảng thời gian:', $range[0] . ' - ' . $range[1]]);
            }
            fputcsv($file, []);

            fputcsv($file, ['CHỈ SỐ TỔNG QUAN']);
            fputcsv($file, ['Chỉ số', 'Giá trị']);
            fputcsv($file, ['Tổng số đầu sách', Book::count()]);
            fputcsv($file, ['Tổng số sinh viên đăng ký', Member::count()]);
            $totalBorrowings = $this->applyBorrowDateFilter(Borrowing::query(), $range)->count();
            fputcsv($file, ['Tổng số lượt mượn trả', $totalBorrowings]);

            $byMethod = \App\Models\FinePayment::where('status', 'completed')
                ->when($range, function ($q) use ($range) {
                    return $q->whereBetween('created_at', $range);
                })
                ->select('method', DB::raw('sum(amount_paid) as total'))
                ->groupBy('method')
                ->get()
                ->pluck('total', 'method')
                ->toArray();

            $collected = (float) ($byMethod['cash'] ?? 0) 
                + (float) ($byMethod['momo'] ?? 0) 
                + (float) ($byMethod['vnpay'] ?? 0)
                + (float) ($byMethod['transfer'] ?? 0);

            $unpaid = $this->applyFineDateFilter(Fine::where('status', 'unpaid'), $range)->sum('amount');
            $waived = $this->applyFineDateFilter(Fine::where('status', 'waived'), $range)->sum('amount');

            fputcsv($file, ['Tổng phí phạt đã thu thực tế (VND)', number_format($collected)]);
            fputcsv($file, ['  Trong đó nộp Tiền mặt (VND)', number_format((float)($byMethod['cash'] ?? 0))]);
            fputcsv($file, ['  Trong đó qua Ví MoMo (VND)', number_format((float)(($byMethod['momo'] ?? 0) + ($byMethod['transfer'] ?? 0)))]);
            fputcsv($file, ['  Trong đó qua Ví VNPay (VND)', number_format((float)($byMethod['vnpay'] ?? 0))]);
            fputcsv($file, ['Tổng phí phạt còn nợ (VND)', number_format($unpaid)]);
            fputcsv($file, ['Tổng phí phạt đã miễn giảm (VND)', number_format($waived)]);
            fputcsv($file, []);

            fputcsv($file, ['TOP 5 SÁCH ĐƯỢC MƯỢN NHIỀU NHẤT']);
            fputcsv($file, ['Tên sách', 'Tác giả', 'Thể loại', 'Số lượt mượn']);
            $topBooks = $this->applyBorrowDateFilter(
                Borrowing::query()->select('book_id', DB::raw('count(*) as borrow_count')),
                $range
            )->groupBy('book_id')->orderByDesc('borrow_count')->limit(5)->get();
            foreach ($topBooks as $item) {
                $book = Book::find($item->book_id);
                fputcsv($file, [
                    $book->title  ?? 'Sách đã xóa',
                    $book->author ?? '',
                    $book->genre  ?? '',
                    $item->borrow_count,
                ]);
            }
            fputcsv($file, []);

            fputcsv($file, ['TOP 5 SINH VIÊN TÍCH CỰC NHẤT']);
            fputcsv($file, ['Tên sinh viên', 'Email', 'Số lượt mượn']);
            $topMembers = $this->applyBorrowDateFilter(
                Borrowing::query()->select('member_id', DB::raw('count(*) as borrow_count')),
                $range
            )->groupBy('member_id')->orderByDesc('borrow_count')->limit(5)->get();
            foreach ($topMembers as $item) {
                $member = Member::find($item->member_id);
                fputcsv($file, [
                    $member->name  ?? 'Sinh viên ẩn danh',
                    $member->email ?? '',
                    $item->borrow_count,
                ]);
            }
            fputcsv($file, []);

            fputcsv($file, ['DANH SÁCH GIAO DỊCH NỘP PHẠT GẦN ĐÂY']);
            fputcsv($file, ['Mã giao dịch', 'Sinh viên', 'Số tiền (VND)', 'Phương thức', 'Mã tham chiếu', 'Thời gian', 'Người thu / duyệt']);
            $recentPayments = \App\Models\FinePayment::where('status', 'completed')
                ->orderByDesc('created_at')
                ->limit(20)
                ->get();
            foreach ($recentPayments as $payment) {
                $fine = $payment->fine;
                $member = $fine ? $fine->member : null;
                $collector = $payment->collector;

                fputcsv($file, [
                    '#' . $payment->payment_id,
                    $member ? ($member->name . ' (' . $member->email . ')') : 'Sinh viên ẩn danh',
                    number_format((float) $payment->amount_paid),
                    strtoupper($payment->method),
                    $payment->transaction_ref ?? '',
                    $payment->created_at ? $payment->created_at->toDateTimeString() : '',
                    $collector ? $collector->name : ($payment->method !== 'cash' ? 'Cổng trực tuyến' : 'Hệ thống')
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
