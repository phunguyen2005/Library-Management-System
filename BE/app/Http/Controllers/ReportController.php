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

        // 5.1 Top 5 Học giả tích lũy XP nhiều nhất
        $topXpMembers = Member::query()
            ->select('member_id', 'name', 'email', 'level', 'xp')
            ->withCount('badges')
            ->orderByDesc('xp')
            ->orderByDesc('member_id')
            ->limit(5)
            ->get()
            ->map(function ($m) {
                return [
                    'name'         => $m->name ?? 'Sinh viên ẩn danh',
                    'email'        => $m->email ?? '',
                    'level'        => $m->level ?? 1,
                    'xp'           => $m->xp ?? 0,
                    'badges_count' => $m->badges_count ?? 0,
                ];
            });

        // 5.2 Thống kê đổi thưởng (Rewards redemption statistics)
        $rewardsQuery = \App\Models\MemberReward::query();
        if ($range) {
            $rewardsQuery->whereBetween('redeemed_at', $range);
        }
        $totalRedeemed = $rewardsQuery->count();

        $rewardsSumQuery = \App\Models\MemberReward::query();
        if ($range) {
            $rewardsSumQuery->whereBetween('redeemed_at', $range);
        }
        $totalPointsSpent = (int) $rewardsSumQuery->join('rewards', 'member_rewards.reward_id', '=', 'rewards.id')
            ->sum('rewards.points_cost');

        $rewardsGroupQuery = \App\Models\MemberReward::query();
        if ($range) {
            $rewardsGroupQuery->whereBetween('redeemed_at', $range);
        }
        $byRewardType = $rewardsGroupQuery->join('rewards', 'member_rewards.reward_id', '=', 'rewards.id')
            ->select('rewards.name', 'rewards.code', DB::raw('count(*) as count'))
            ->groupBy('rewards.name', 'rewards.code')
            ->get()
            ->map(function ($item) {
                return [
                    'name'  => $item->name,
                    'code'  => $item->code,
                    'count' => $item->count,
                ];
            })
            ->toArray();

        $rewardsStats = [
            'total_redeemed'     => $totalRedeemed,
            'total_points_spent' => $totalPointsSpent,
            'by_reward_type'     => $byRewardType,
        ];

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
            'top_xp_members' => $topXpMembers,
            'rewards_stats'  => $rewardsStats,
            'total_books'    => Book::count(),
            'total_members'  => Member::count(),
            'total_borrowings' => $totalBorrowings,
        ]);
    }

    public function export(Request $request)
    {
        $range = $this->getDateRange($request);

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-16LE',
            'Content-Disposition' => 'attachment; filename="bao-cao-thong-ke-' . now()->format('Ymd') . '.csv"',
            'Pragma'              => 'no-cache',
            'Cache-Control'       => 'must-revalidate, post-check=0, pre-check=0',
            'Expires'             => '0',
        ];

        $callback = function () use ($range) {
            $file = fopen('php://output', 'w');

            // UTF-16LE BOM for absolute Excel compatibility
            fwrite($file, chr(0xFF) . chr(0xFE));

            $this->writeCsvRow($file, ['BÁO CÁO THỐNG KÊ HỆ THỐNG THƯ VIỆN SỐ - ENTERPRISE EDITION']);
            $this->writeCsvRow($file, ['Ngày xuất báo cáo:', now()->toDateTimeString()]);
            if ($range) {
                $this->writeCsvRow($file, ['Khoảng thời gian:', $range[0] . ' - ' . $range[1]]);
            }
            $this->writeCsvRow($file, []);

            $this->writeCsvRow($file, ['CHỈ SỐ TỔNG QUAN']);
            $this->writeCsvRow($file, ['Chỉ số', 'Giá trị']);
            $this->writeCsvRow($file, ['Tổng số đầu sách', Book::count()]);
            $this->writeCsvRow($file, ['Tổng số sinh viên đăng ký', Member::count()]);
            $totalBorrowings = $this->applyBorrowDateFilter(Borrowing::query(), $range)->count();
            $this->writeCsvRow($file, ['Tổng số lượt mượn trả', $totalBorrowings]);

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

            $this->writeCsvRow($file, ['Tổng phí phạt đã thu thực tế (VND)', number_format($collected)]);
            $this->writeCsvRow($file, ['  Trong đó nộp Tiền mặt (VND)', number_format((float)($byMethod['cash'] ?? 0))]);
            $this->writeCsvRow($file, ['  Trong đó qua Ví MoMo (VND)', number_format((float)(($byMethod['momo'] ?? 0) + ($byMethod['transfer'] ?? 0)))]);
            $this->writeCsvRow($file, ['  Trong đó qua Ví VNPay (VND)', number_format((float)($byMethod['vnpay'] ?? 0))]);
            $this->writeCsvRow($file, ['Tổng phí phạt còn nợ (VND)', number_format($unpaid)]);
            $this->writeCsvRow($file, ['Tổng phí phạt đã miễn giảm (VND)', number_format($waived)]);
            $this->writeCsvRow($file, []);

            $this->writeCsvRow($file, ['TOP 5 SÁCH ĐƯỢC MƯỢN NHIỀU NHẤT']);
            $this->writeCsvRow($file, ['Tên sách', 'Tác giả', 'Thể loại', 'Số lượt mượn']);
            $topBooks = $this->applyBorrowDateFilter(
                Borrowing::query()->select('book_id', DB::raw('count(*) as borrow_count')),
                $range
            )->groupBy('book_id')->orderByDesc('borrow_count')->limit(5)->get();
            foreach ($topBooks as $item) {
                $book = Book::find($item->book_id);
                $this->writeCsvRow($file, [
                    $book->title  ?? 'Sách đã xóa',
                    $book->author ?? '',
                    $book->genre  ?? '',
                    $item->borrow_count,
                ]);
            }
            $this->writeCsvRow($file, []);

            $this->writeCsvRow($file, ['TOP 5 SINH VIÊN TÍCH CỰC NHẤT']);
            $this->writeCsvRow($file, ['Tên sinh viên', 'Email', 'Số lượt mượn']);
            $topMembers = $this->applyBorrowDateFilter(
                Borrowing::query()->select('member_id', DB::raw('count(*) as borrow_count')),
                $range
            )->groupBy('member_id')->orderByDesc('borrow_count')->limit(5)->get();
            foreach ($topMembers as $item) {
                $member = Member::find($item->member_id);
                $this->writeCsvRow($file, [
                    $member->name  ?? 'Sinh viên ẩn danh',
                    $member->email ?? '',
                    $item->borrow_count,
                ]);
            }
            $this->writeCsvRow($file, []);

            $this->writeCsvRow($file, ['TOP 5 HỌC GIẢ TÍCH LŨY XP']);
            $this->writeCsvRow($file, ['Tên học giả', 'Email', 'Cấp độ', 'Số XP', 'Huy hiệu sở hữu']);
            $topXpExport = Member::query()->withCount('badges')->orderByDesc('xp')->orderByDesc('member_id')->limit(5)->get();
            foreach ($topXpExport as $m) {
                $this->writeCsvRow($file, [
                    $m->name  ?? 'Sinh viên ẩn danh',
                    $m->email ?? '',
                    'Cấp ' . ($m->level ?? 1),
                    $m->xp ?? 0,
                    ($m->badges_count ?? 0) . ' huy hiệu',
                ]);
            }
            $this->writeCsvRow($file, []);

            // Thống kê đổi thưởng
            $rewardsQuery = \App\Models\MemberReward::query();
            if ($range) {
                $rewardsQuery->whereBetween('redeemed_at', $range);
            }
            $totalRedeemedExport = $rewardsQuery->count();

            $rewardsSumQuery = \App\Models\MemberReward::query();
            if ($range) {
                $rewardsSumQuery->whereBetween('redeemed_at', $range);
            }
            $totalPointsSpentExport = (int) $rewardsSumQuery->join('rewards', 'member_rewards.reward_id', '=', 'rewards.id')
                ->sum('rewards.points_cost');

            $rewardsGroupQuery = \App\Models\MemberReward::query();
            if ($range) {
                $rewardsGroupQuery->whereBetween('redeemed_at', $range);
            }
            $byRewardTypeExport = $rewardsGroupQuery->join('rewards', 'member_rewards.reward_id', '=', 'rewards.id')
                ->select('rewards.name', 'rewards.code', DB::raw('count(*) as count'))
                ->groupBy('rewards.name', 'rewards.code')
                ->get();

            $this->writeCsvRow($file, ['THỐNG KÊ QUY ĐỔI PHẦN THƯỞNG']);
            $this->writeCsvRow($file, ['Chỉ số đổi thưởng', 'Giá trị']);
            $this->writeCsvRow($file, ['Tổng số lượt đã đổi quà', $totalRedeemedExport . ' lượt']);
            $this->writeCsvRow($file, ['Tổng số điểm đã tiêu tốn (Points)', number_format($totalPointsSpentExport) . ' points']);
            $this->writeCsvRow($file, []);
            $this->writeCsvRow($file, ['Phân bổ đổi quà:', 'Mã phần thưởng', 'Số lượt đổi']);
            foreach ($byRewardTypeExport as $item) {
                $this->writeCsvRow($file, [
                    $item->name,
                    $item->code,
                    $item->count . ' lượt',
                ]);
            }
            $this->writeCsvRow($file, []);

            $this->writeCsvRow($file, ['DANH SÁCH GIAO DỊCH NỘP PHẠT GẦN ĐÂY']);
            $this->writeCsvRow($file, ['Mã giao dịch', 'Sinh viên', 'Số tiền (VND)', 'Phương thức', 'Mã tham chiếu', 'Thời gian', 'Người thu / duyệt']);
            $recentPayments = \App\Models\FinePayment::where('status', 'completed')
                ->orderByDesc('created_at')
                ->limit(20)
                ->get();
            foreach ($recentPayments as $payment) {
                $fine = $payment->fine;
                $member = $fine ? $fine->member : null;
                $collector = $payment->collector;

                $this->writeCsvRow($file, [
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

    public function finesDetail(Request $request)
    {
        $type = $request->query('type'); // 'collected' | 'unpaid' | 'waived'
        $range = $this->getDateRange($request);

        if (!in_array($type, ['collected', 'unpaid', 'waived'])) {
            return response()->json(['message' => 'Invalid report type specified.'], 400);
        }

        $data = [];

        if ($type === 'collected') {
            // Actual fine collections (FinePayment with status = completed)
            $query = \App\Models\FinePayment::where('status', 'completed')
                ->with(['fine.member', 'fine.borrowing.book', 'collector'])
                ->orderByDesc('created_at');

            if ($range) {
                $query->whereBetween('created_at', $range);
            }

            $data = $query->get()->map(function ($payment) {
                $fine = $payment->fine;
                $member = $fine ? $fine->member : null;
                $borrowing = $fine ? $fine->borrowing : null;
                $book = $borrowing ? $borrowing->book : null;
                $collector = $payment->collector;

                return [
                    'id' => $payment->payment_id,
                    'amount' => (float) $payment->amount_paid,
                    'method' => $payment->method,
                    'transaction_ref' => $payment->transaction_ref,
                    'created_at' => $payment->created_at ? $payment->created_at->toDateTimeString() : '',
                    'student_name' => $member ? $member->name : 'Sinh viên ẩn danh',
                    'student_email' => $member ? $member->email : '',
                    'book_title' => $book ? $book->title : 'Sách đã xóa',
                    'reason' => $fine ? $fine->reason : 'N/A',
                    'processor_name' => $collector ? $collector->name : ($payment->method !== 'cash' ? 'Cổng trực tuyến' : 'Hệ thống'),
                ];
            });
        } elseif ($type === 'unpaid') {
            // Outstanding debts (Fine with status = unpaid)
            $query = \App\Models\Fine::where('status', 'unpaid')
                ->with(['member', 'borrowing.book'])
                ->orderByDesc('created_at');

            if ($range) {
                $query->whereBetween('created_at', $range);
            }

            $data = $query->get()->map(function ($fine) {
                $member = $fine->member;
                $borrowing = $fine->borrowing;
                $book = $borrowing ? $borrowing->book : null;

                return [
                    'id' => $fine->fine_id,
                    'amount' => (float) $fine->amount,
                    'reason' => $fine->reason,
                    'created_at' => $fine->created_at ? $fine->created_at->toDateTimeString() : '',
                    'student_name' => $member ? $member->name : 'Sinh viên ẩn danh',
                    'student_email' => $member ? $member->email : '',
                    'book_title' => $book ? $book->title : 'Sách đã xóa',
                    'notes' => $fine->notes ?? '',
                ];
            });
        } elseif ($type === 'waived') {
            // Waived fines (Fine with status = waived)
            $query = \App\Models\Fine::where('status', 'waived')
                ->with(['member', 'borrowing.book', 'waivedBy'])
                ->orderByDesc('updated_at');

            if ($range) {
                $query->whereBetween('created_at', $range);
            }

            $data = $query->get()->map(function ($fine) {
                $member = $fine->member;
                $borrowing = $fine->borrowing;
                $book = $borrowing ? $borrowing->book : null;
                $waivedBy = $fine->waivedBy;

                return [
                    'id' => $fine->fine_id,
                    'amount' => (float) $fine->amount,
                    'reason' => $fine->reason,
                    'created_at' => $fine->created_at ? $fine->created_at->toDateTimeString() : '',
                    'student_name' => $member ? $member->name : 'Sinh viên ẩn danh',
                    'student_email' => $member ? $member->email : '',
                    'book_title' => $book ? $book->title : 'Sách đã xóa',
                    'processor_name' => $waivedBy ? $waivedBy->name : 'Hệ thống',
                    'waived_reason' => $fine->waived_reason ?? '',
                    'notes' => $fine->notes ?? '',
                ];
            });
        }

        return response()->json($data);
    }

    public function exportBooks(Request $request)
    {
        $query = Book::query();

        // Apply filters identical to index
        $search = trim((string) $request->query('query', ''));
        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('title', 'like', '%' . $search . '%')
                    ->orWhere('author', 'like', '%' . $search . '%')
                    ->orWhere('genre', 'like', '%' . $search . '%');
                if (is_numeric($search)) {
                    $query->orWhere('book_id', (int)$search);
                }
            });
        }

        if ($request->has('genre') && $request->query('genre') !== null) {
            $query->where('genre', $request->query('genre'));
        }
        if ($request->has('is_available') && $request->query('is_available') !== null) {
            $query->where('is_available', (bool)$request->query('is_available'));
        }
        if ($request->has('is_digital') && $request->query('is_digital') !== null) {
            $query->where('is_digital', (bool)$request->query('is_digital'));
        }

        $books = $query->orderByDesc('book_id')->get();

        $headerMap = [
            'book_id' => 'Mã tài liệu',
            'title' => 'Tên tài liệu',
            'author' => 'Tác giả',
            'genre' => 'Thể loại / Danh mục',
            'published_year' => 'Năm xuất bản',
            'location' => 'Vị trí kệ',
            'total_quantity' => 'Tổng số bản',
            'available_quantity' => 'Khả dụng',
            'is_digital' => 'Loại tài liệu',
            'download_count' => 'Số lượt tải số',
        ];

        $columns = $request->input('columns');
        if (is_string($columns)) {
            $columns = explode(',', $columns);
        }
        $columns = is_array($columns) ? array_map('trim', $columns) : [];
        $columns = array_intersect($columns, array_keys($headerMap));
        if (empty($columns)) {
            $columns = array_keys($headerMap);
        }

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-16LE',
            'Content-Disposition' => 'attachment; filename="xuat-kho-sach-' . now()->format('Ymd') . '.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($books, $columns, $headerMap) {
            $file = fopen('php://output', 'w');
            fwrite($file, chr(0xFF) . chr(0xFE));

            // Write Headers
            $csvHeaders = array_map(fn($col) => $headerMap[$col], $columns);
            $this->writeCsvRow($file, $csvHeaders);

            // Write Rows
            foreach ($books as $book) {
                $row = [];
                foreach ($columns as $col) {
                    $row[] = match ($col) {
                        'book_id' => '#' . $book->book_id,
                        'is_digital' => $book->is_digital ? 'Tài nguyên số' : 'Sách mượn vật lý',
                        'total_quantity' => $book->is_digital ? 'N/A' : $book->total_quantity,
                        'available_quantity' => $book->is_digital ? 'N/A' : $book->available_quantity,
                        'download_count' => $book->is_digital ? $book->download_count : 'N/A',
                        default => $book->$col ?? '',
                    };
                }
                $this->writeCsvRow($file, $row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function exportMembers(Request $request)
    {
        $query = Member::query();

        // Apply filters identical to index
        $search = trim((string) $request->query('query', ''));
        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%')
                    ->orWhere('phone_number', 'like', '%' . $search . '%');
            });
        }

        $members = $query->orderBy('member_id')->get();

        $headerMap = [
            'member_id' => 'Mã sinh viên',
            'name' => 'Họ và tên',
            'email' => 'Địa chỉ Email',
            'phone_number' => 'Số điện thoại',
            'level' => 'Cấp độ học giả',
            'xp' => 'Điểm kinh nghiệm (XP)',
            'points' => 'Điểm Coin tích lũy',
            'join_date' => 'Ngày tham gia',
        ];

        $columns = $request->input('columns');
        if (is_string($columns)) {
            $columns = explode(',', $columns);
        }
        $columns = is_array($columns) ? array_map('trim', $columns) : [];
        $columns = array_intersect($columns, array_keys($headerMap));
        if (empty($columns)) {
            $columns = array_keys($headerMap);
        }

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-16LE',
            'Content-Disposition' => 'attachment; filename="danh-sach-sinh-vien-' . now()->format('Ymd') . '.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($members, $columns, $headerMap) {
            $file = fopen('php://output', 'w');
            fwrite($file, chr(0xFF) . chr(0xFE));

            // Write Headers
            $csvHeaders = array_map(fn($col) => $headerMap[$col], $columns);
            $this->writeCsvRow($file, $csvHeaders);

            // Write Rows
            foreach ($members as $member) {
                $row = [];
                foreach ($columns as $col) {
                    $row[] = match ($col) {
                        'member_id' => '#' . $member->member_id,
                        default => $member->$col ?? '',
                    };
                }
                $this->writeCsvRow($file, $row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function exportFines(Request $request)
    {
        $range = $this->getDateRange($request);

        $query = \App\Models\FinePayment::where('status', 'completed')
            ->with(['fine.member', 'collector'])
            ->orderByDesc('created_at');

        if ($range) {
            $query->whereBetween('created_at', $range);
        }

        $payments = $query->get();

        $headerMap = [
            'payment_id' => 'Mã giao dịch',
            'student_name' => 'Học viên / Độc giả',
            'student_email' => 'Email',
            'amount' => 'Số tiền thu phạt (VND)',
            'method' => 'Phương thức nộp',
            'transaction_ref' => 'Mã tham chiếu thanh toán',
            'created_at' => 'Thời gian thu',
            'collector_name' => 'Người thu / duyệt',
        ];

        $columns = $request->input('columns');
        if (is_string($columns)) {
            $columns = explode(',', $columns);
        }
        $columns = is_array($columns) ? array_map('trim', $columns) : [];
        $columns = array_intersect($columns, array_keys($headerMap));
        if (empty($columns)) {
            $columns = array_keys($headerMap);
        }

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-16LE',
            'Content-Disposition' => 'attachment; filename="nhat-ky-giao-dich-' . now()->format('Ymd') . '.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($payments, $columns, $headerMap) {
            $file = fopen('php://output', 'w');
            fwrite($file, chr(0xFF) . chr(0xFE));

            // Write Headers
            $csvHeaders = array_map(fn($col) => $headerMap[$col], $columns);
            $this->writeCsvRow($file, $csvHeaders);

            // Write Rows
            foreach ($payments as $payment) {
                $fine = $payment->fine;
                $member = $fine ? $fine->member : null;
                $collector = $payment->collector;

                $row = [];
                foreach ($columns as $col) {
                    $row[] = match ($col) {
                        'payment_id' => '#' . $payment->payment_id,
                        'student_name' => $member ? $member->name : 'Sinh viên ẩn danh',
                        'student_email' => $member ? $member->email : '',
                        'amount' => $payment->amount_paid,
                        'method' => strtoupper($payment->method),
                        'transaction_ref' => $payment->transaction_ref ?? '—',
                        'created_at' => $payment->created_at ? $payment->created_at->toDateTimeString() : '',
                        'collector_name' => $collector ? $collector->name : ($payment->method !== 'cash' ? 'Cổng trực tuyến' : 'Hệ thống'),
                        default => '',
                    };
                }
                $this->writeCsvRow($file, $row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }


    private function writeCsvRow($file, array $fields): void
    {
        $rowFields = array_map(function ($field) {
            $field = $this->sanitizeCsvField($field);
            if ($field === null) {
                return '';
            }
            $fieldStr = str_replace(["\r", "\n", "\t"], ' ', (string)$field);
            if (str_contains($fieldStr, '"') || str_contains($fieldStr, "\t")) {
                $fieldStr = '"' . str_replace('"', '""', $fieldStr) . '"';
            }
            return $fieldStr;
        }, $fields);

        $rowStr = implode("\t", $rowFields) . "\r\n";
        $utf16Row = mb_convert_encoding($rowStr, 'UTF-16LE', 'UTF-8');
        fwrite($file, $utf16Row);
    }

    private function sanitizeCsvField(mixed $field): mixed
    {
        if (! is_string($field)) {
            return $field;
        }

        $trimmed = ltrim($field);

        if ($trimmed !== '' && in_array($trimmed[0], ['=', '+', '-', '@'], true)) {
            return "'" . $field;
        }

        return $field;
    }
}
