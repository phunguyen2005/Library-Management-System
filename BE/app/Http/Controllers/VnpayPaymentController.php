<?php

namespace App\Http\Controllers;

use App\Models\Fine;
use App\Models\FinePayment;
use App\Notifications\FineStatusNotification;
use App\Services\AuditLoggerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class VnpayPaymentController extends Controller
{
    /**
     * Khởi tạo giao dịch VNPay (Hỗ trợ cả chế độ thật Sandbox và chế độ giả lập)
     */
    public function initiatePayment(Request $request, int $fineId)
    {
        $student = $request->user();

        // 1. Kiểm tra khoản phạt trễ hạn
        $fine = Fine::query()
            ->with(['borrowing.book'])
            ->where('member_id', $student->member_id)
            ->find($fineId);

        if (!$fine) {
            return response()->json([
                'message' => 'Không tìm thấy phiếu phí phạt của bạn.'
            ], 404);
        }

        if ($fine->status !== Fine::STATUS_UNPAID) {
            return response()->json([
                'message' => 'Khoản phạt này đã được thanh toán hoặc miễn giảm trước đó.'
            ], 422);
        }

        if ($fine->reason === Fine::REASON_OVERDUE && 
            $fine->borrowing && 
            $fine->borrowing->status !== \App\Models\Borrowing::STATUS_RETURNED) {
            return response()->json([
                'message' => __('messages.borrow.pay_overdue_requires_returned')
            ], 422);
        }

        $amount = (int) $fine->amount;
        if ($amount < 5000) {
            return response()->json([
                'message' => 'Số tiền phạt quá thấp để giao dịch qua VNPay (tối thiểu 5,000 VND).'
            ], 400);
        }

        // 2. Tạo bản ghi FinePayment ở trạng thái pending (Hủy các thanh toán VNPay cũ đang treo)
        $payment = DB::transaction(function () use ($fine, $amount) {
            FinePayment::query()
                ->where('fine_id', $fine->fine_id)
                ->where('method', FinePayment::METHOD_VNPAY)
                ->where('status', FinePayment::STATUS_PENDING)
                ->update(['status' => FinePayment::STATUS_FAILED]);

            $ref = 'FINE_PAY_' . $fine->fine_id . '_' . time();

            return FinePayment::create([
                'fine_id' => $fine->fine_id,
                'amount_paid' => $amount,
                'method' => FinePayment::METHOD_VNPAY,
                'transaction_ref' => $ref,
                'status' => FinePayment::STATUS_PENDING,
                'collected_by' => null,
            ]);
        });

        // 3. Đọc cấu hình VNPay
        $vnpayConfig = config('services.vnpay');
        $isSimulation = filter_var($vnpayConfig['simulation'] ?? true, FILTER_VALIDATE_BOOLEAN);

        // NẾU LÀ CHẾ ĐỘ GIẢ LẬP (VNPAY_SIMULATION=true)
        if ($isSimulation) {
            $payUrl = "/vnpay-mockup-checkout?payment_id=" . $payment->payment_id . 
                      "&amount=" . $amount . 
                      "&ref=" . $payment->transaction_ref . 
                      "&fine_id=" . $fine->fine_id .
                      "&book=" . urlencode($fine->borrowing?->book?->title ?? 'Tài liệu');

            return response()->json([
                'message' => 'Khởi tạo phiên thanh toán giả lập VNPay thành công.',
                'simulation' => true,
                'payment_id' => $payment->payment_id,
                'payUrl' => $payUrl,
            ]);
        }

        // NẾU LÀ CHẾ ĐỘ CHẠY THẬT SANDBOX (VNPAY_SIMULATION=false)
        try {
            $vnp_Url = $vnpayConfig['endpoint'];
            // Đảm bảo vnp_ReturnUrl hoàn toàn sạch sẽ, KHÔNG chứa ký tự ? hay & (để tránh VNPay phân tách sai query string dẫn đến lỗi chữ ký)
            $vnp_Returnurl = $vnpayConfig['redirect_url'];
            $vnp_TmnCode = $vnpayConfig['tmn_code'];
            $vnp_HashSecret = $vnpayConfig['hash_secret'];

            $vnp_TxnRef = $payment->transaction_ref;
            // KHÔNG sử dụng ký tự đặc biệt như dấu thang (#) để tránh lỗi phân tách URL
            $vnp_OrderInfo = "Thanh toan phi phat phieu muon " . $fine->loan_id;
            $vnp_OrderType = "other";
            $vnp_Amount = $amount * 100;
            $vnp_Locale = "vn";
            
            // Đảm bảo IP luôn ở định dạng IPv4 hợp lệ khi chạy localhost (tránh lỗi ::1 của IPv6 gây sai chữ ký)
            $vnp_IpAddr = $request->ip() ?? '127.0.0.1';
            if ($vnp_IpAddr === '::1' || str_contains($vnp_IpAddr, ':')) {
                $vnp_IpAddr = '127.0.0.1';
            }

            $inputData = array(
                "vnp_Version" => "2.1.0",
                "vnp_TmnCode" => $vnp_TmnCode,
                "vnp_Amount" => $vnp_Amount,
                "vnp_Command" => "pay",
                "vnp_CreateDate" => date('YmdHis'),
                "vnp_CurrCode" => "VND",
                "vnp_IpAddr" => $vnp_IpAddr,
                "vnp_Locale" => $vnp_Locale,
                "vnp_OrderInfo" => $vnp_OrderInfo,
                "vnp_OrderType" => $vnp_OrderType,
                "vnp_ReturnUrl" => $vnp_Returnurl,
                "vnp_TxnRef" => $vnp_TxnRef,
            );

            ksort($inputData);
            $hashdata = "";
            $query = "";
            $i = 0;
            foreach ($inputData as $key => $value) {
                // Theo chuẩn VNPay 2.1.0, cả key và value trong chuỗi hash đều phải được urlencode
                if ($i == 1) {
                    $hashdata .= '&' . urlencode($key) . "=" . urlencode($value);
                } else {
                    $hashdata .= urlencode($key) . "=" . urlencode($value);
                    $i = 1;
                }
                $query .= urlencode($key) . "=" . urlencode($value) . '&';
            }

            $vnp_Url = $vnp_Url . "?" . $query;
            if (isset($vnp_HashSecret)) {
                $vnpSecureHash = hash_hmac('sha512', $hashdata, $vnp_HashSecret);
                $vnp_Url .= 'vnp_SecureHash=' . $vnpSecureHash;
            }

            Log::info("Generated real VNPay Sandbox redirection URL", ['url' => $vnp_Url]);

            return response()->json([
                'message' => 'Khởi tạo phiên thanh toán VNPay Sandbox thành công.',
                'simulation' => false,
                'payment_id' => $payment->payment_id,
                'payUrl' => $vnp_Url,
            ]);

        } catch (\Exception $e) {
            Log::error("VNPay Payment Exception", ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Có lỗi xảy ra khi tạo giao dịch VNPay. Chi tiết: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Webhook nhận kết quả từ VNPay thật (IPN Callback) - TỰ ĐỘNG XÁC NHẬN.
     */
    public function ipn(Request $request)
    {
        Log::info("VNPay IPN Webhook Received", $request->all());

        $vnpayConfig = config('services.vnpay');
        $vnp_HashSecret = $vnpayConfig['hash_secret'];

        $vnp_SecureHash = $request->input('vnp_SecureHash');
        $inputData = array();
        foreach ($request->all() as $key => $value) {
            if (substr($key, 0, 4) == "vnp_") {
                $inputData[$key] = $value;
            }
        }

        unset($inputData['vnp_SecureHash']);
        unset($inputData['vnp_SecureHashType']);
        ksort($inputData);

        $i = 0;
        $hashData = "";
        foreach ($inputData as $key => $value) {
            // Theo chuẩn VNPay 2.1.0, các tham số đầu vào trong chuỗi hash cũng phải được urlencode
            if ($i == 1) {
                $hashData .= '&' . urlencode($key) . "=" . urlencode($value);
            } else {
                $hashData .= urlencode($key) . "=" . urlencode($value);
                $i = 1;
            }
        }

        $computedSecureHash = hash_hmac('sha512', $hashData, $vnp_HashSecret);

        if (!hash_equals($computedSecureHash, (string)$vnp_SecureHash)) {
            Log::warning("VNPay Webhook Signature mismatch", [
                'received' => $vnp_SecureHash,
                'computed' => $computedSecureHash
            ]);
            return response()->json([
                'RspCode' => '97',
                'Message' => 'Signature mismatch'
            ]);
        }

        $txnRef = $request->input('vnp_TxnRef');
        $responseCode = $request->input('vnp_ResponseCode');
        $transactionStatus = $request->input('vnp_TransactionStatus');
        $vnpAmount = (int)$request->input('vnp_Amount');

        $payment = FinePayment::query()
            ->with(['fine.member'])
            ->where('transaction_ref', $txnRef)
            ->first();

        if (!$payment) {
            Log::warning("No payment record found for VNPay transaction reference", ['ref' => $txnRef]);
            return response()->json([
                'RspCode' => '01',
                'Message' => 'Order not found'
            ]);
        }

        // Kiểm tra số tiền khớp nhau (VNPay nhân 100)
        if ($vnpAmount != ((int)$payment->amount_paid * 100)) {
            Log::warning("VNPay IPN amount mismatch", [
                'received' => $vnpAmount,
                'expected' => (int)$payment->amount_paid * 100
            ]);
            return response()->json([
                'RspCode' => '04',
                'Message' => 'Invalid amount'
            ]);
        }

        if ($payment->status !== FinePayment::STATUS_PENDING) {
            Log::info("VNPay payment is already processed", ['ref' => $txnRef, 'status' => $payment->status]);
            return response()->json([
                'RspCode' => '02',
                'Message' => 'Order already confirmed'
            ]);
        }

        DB::transaction(function () use ($payment, $responseCode, $transactionStatus, $request) {
            $payment->gateway_response = array_merge($payment->gateway_response ?? [], $request->all());

            if ($responseCode === '00' && $transactionStatus === '00') {
                // Thanh toán thành công!
                $payment->status = FinePayment::STATUS_COMPLETED;
                $payment->save();

                $fine = $payment->fine;
                $fine->status = Fine::STATUS_PAID;
                $fine->paid_at = now();
                $fine->save();

                // Ghi nhật ký hệ thống (Audit Log)
                AuditLoggerService::log(
                    'collect_fine',
                    'Hệ thống tự động xác nhận đóng phạt trễ hạn qua VNPay trực tuyến thành công: ' . number_format((float) $fine->amount) . ' VND (Mã phiếu phạt: #' . $fine->fine_id . ', Mã GD VNPay: ' . $request->input('vnp_TransactionNo') . ')'
                );

                // Gửi thông báo đến tài khoản Sinh viên
                $fine->member->notify(new FineStatusNotification($fine->fresh(['borrowing.book']), Fine::STATUS_PAID));
                
                Log::info("Fine Payment verified automatically via VNPay IPN Webhook!", ['fine_id' => $fine->fine_id]);
            } else {
                // Thất bại
                $payment->status = FinePayment::STATUS_FAILED;
                $payment->save();
                Log::info("Fine Payment marked as FAILED via VNPay IPN", ['ref' => $payment->transaction_ref]);
            }
        });

        return response()->json([
            'RspCode' => '00',
            'Message' => 'Confirm Success'
        ]);
    }

    /**
     * API Giả lập thông báo Webhook VNPay (Simulation Webhook).
     */
    public function simulateIpn(Request $request)
    {
        $vnpayConfig = config('services.vnpay');
        $isSimulation = filter_var($vnpayConfig['simulation'] ?? true, FILTER_VALIDATE_BOOLEAN);

        if (!$isSimulation) {
            return response()->json([
                'message' => 'Hệ thống đang hoạt động ở chế độ thanh toán thật Sandbox. Không cho phép kích hoạt Webhook giả lập.'
            ], 403);
        }

        $validated = $request->validate([
            'payment_id' => ['required', 'integer', 'exists:fine_payments,payment_id'],
            'status' => ['required', 'string', 'in:completed,failed']
        ]);

        $payment = FinePayment::query()
            ->with(['fine.member'])
            ->find($validated['payment_id']);

        if ($payment->status !== FinePayment::STATUS_PENDING) {
            return response()->json([
                'message' => 'Giao dịch này đã được xử lý từ trước.'
            ], 422);
        }

        DB::transaction(function () use ($payment, $validated) {
            if ($validated['status'] === 'completed') {
                $payment->status = FinePayment::STATUS_COMPLETED;
                $payment->save();

                $fine = $payment->fine;
                $fine->status = Fine::STATUS_PAID;
                $fine->paid_at = now();
                $fine->save();

                // Ghi log
                AuditLoggerService::log(
                    'collect_fine',
                    'Sinh viên đóng phạt trễ hạn thành công qua [VNPay Giả lập]: ' . number_format((float) $fine->amount) . ' VND (Mã phiếu phạt: #' . $fine->fine_id . ')'
                );

                // Gửi thông báo
                $fine->member->notify(new FineStatusNotification($fine->fresh(['borrowing.book']), Fine::STATUS_PAID));
            } else {
                $payment->status = FinePayment::STATUS_FAILED;
                $payment->save();
            }
        });

        return response()->json([
            'message' => $validated['status'] === 'completed' 
                ? 'Giả lập thanh toán VNPay thành công! Khoản phạt đã được xoá nợ.' 
                : 'Giả lập thanh toán VNPay thất bại.'
        ]);
    }
}
