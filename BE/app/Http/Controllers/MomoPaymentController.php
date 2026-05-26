<?php

namespace App\Http\Controllers;

use App\Models\Fine;
use App\Models\FinePayment;
use App\Notifications\FineStatusNotification;
use App\Services\AuditLoggerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MomoPaymentController extends Controller
{
    // Định nghĩa hằng số trạng thái chờ đối soát thủ công (nếu cần dùng song song)
    public const STATUS_PENDING_VERIFICATION = 'pending_verification';

    /**
     * Khởi tạo giao dịch MoMo trực tuyến (Hỗ trợ cả chế độ thật Sandbox và chế độ giả lập)
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
        if ($amount < 1000) {
            return response()->json([
                'message' => 'Số tiền phạt quá thấp để giao dịch qua ví MoMo (tối thiểu 1,000 VND).'
            ], 400);
        }

        // 2. Tạo bản ghi FinePayment ở trạng thái pending
        $payment = DB::transaction(function () use ($fine, $amount) {
            FinePayment::query()
                ->where('fine_id', $fine->fine_id)
                ->where('method', FinePayment::METHOD_MOMO)
                ->whereIn('status', [FinePayment::STATUS_PENDING, self::STATUS_PENDING_VERIFICATION])
                ->update(['status' => FinePayment::STATUS_FAILED]);

            $ref = 'FINE_PAY_' . $fine->fine_id . '_' . time();

            return FinePayment::create([
                'fine_id' => $fine->fine_id,
                'amount_paid' => $amount,
                'method' => FinePayment::METHOD_MOMO,
                'transaction_ref' => $ref,
                'status' => FinePayment::STATUS_PENDING,
                'collected_by' => null,
            ]);
        });

        // 3. Đọc cấu hình chế độ
        $momoConfig = config('services.momo');
        $isSimulation = filter_var($momoConfig['simulation'] ?? true, FILTER_VALIDATE_BOOLEAN);

        // NẾU LÀ CHẾ ĐỘ GIẢ LẬP (MOMO_SIMULATION=true)
        if ($isSimulation) {
            // Trả về link trỏ vào trang mockup simulator trên frontend
            $payUrl = "/momo-mockup-checkout?payment_id=" . $payment->payment_id . 
                      "&amount=" . $amount . 
                      "&ref=" . $payment->transaction_ref . 
                      "&fine_id=" . $fine->fine_id .
                      "&book=" . urlencode($fine->borrowing?->book?->title ?? 'Tài liệu');

            return response()->json([
                'message' => 'Khởi tạo phiên thanh toán giả lập thành công.',
                'simulation' => true,
                'payment_id' => $payment->payment_id,
                'payUrl' => $payUrl,
            ]);
        }

        // NẾU LÀ CHẾ ĐỘ CHẠY THẬT (MOMO_SIMULATION=false - CỔNG SANDBOX TỰ XÁC NHẬN)
        try {
            $partnerCode = $momoConfig['partner_code'];
            $accessKey = $momoConfig['access_key'];
            $secretKey = $momoConfig['secret_key'];
            $endpoint = $momoConfig['endpoint'];
            
            $orderId = $payment->transaction_ref;
            $requestId = $payment->transaction_ref;
            $orderInfo = "Thanh toan phi phat phieu muon #" . $fine->loan_id . " - Sach: " . ($fine->borrowing?->book?->title ?? 'Tai lieu');
            $redirectUrl = $momoConfig['redirect_url'];
            $ipnUrl = $momoConfig['ipn_url'];
            $extraData = "";

            // Tính chữ ký số chuẩn MoMo V2
            $rawHash = "accessKey=" . $accessKey .
                       "&amount=" . $amount .
                       "&extraData=" . $extraData .
                       "&ipnUrl=" . $ipnUrl .
                       "&orderId=" . $orderId .
                       "&orderInfo=" . $orderInfo .
                       "&partnerCode=" . $partnerCode .
                       "&redirectUrl=" . $redirectUrl .
                       "&requestId=" . $requestId .
                       "&requestType=captureWallet";

            $signature = hash_hmac("sha256", $rawHash, $secretKey);

            $payload = [
                'partnerCode' => $partnerCode,
                'partnerName' => 'Book Loan Library',
                'storeId' => 'BookLoanStore',
                'requestId' => $requestId,
                'amount' => $amount,
                'orderId' => $orderId,
                'orderInfo' => $orderInfo,
                'redirectUrl' => $redirectUrl,
                'ipnUrl' => $ipnUrl,
                'lang' => 'vi',
                'extraData' => $extraData,
                'requestType' => 'captureWallet',
                'signature' => $signature,
            ];

            Log::info("Calling real MoMo Sandbox API session", ['payload' => $payload]);

            // Thêm withoutVerifying() để tránh lỗi SSL cURL (cURL error 60) phổ biến trên môi trường XAMPP Windows local
            $response = Http::withoutVerifying()->timeout(10)->post($endpoint, $payload);

            if ($response->failed()) {
                Log::error("MoMo payment initiation failed", ['body' => $response->body()]);
                return response()->json([
                    'message' => 'Lỗi kết nối tới cổng thanh toán MoMo Sandbox. Vui lòng kiểm tra cấu hình trong file .env.'
                ], 502);
            }

            $resData = $response->json();

            if (isset($resData['resultCode']) && $resData['resultCode'] === 0) {
                // Lưu phản hồi của gateway
                $payment->gateway_response = $resData;
                $payment->save();

                return response()->json([
                    'message' => 'Khởi tạo phiên thanh toán MoMo Sandbox thành công.',
                    'simulation' => false,
                    'payment_id' => $payment->payment_id,
                    'payUrl' => $resData['payUrl'], // Link MoMo Sandbox Checkout chứa QR Code thật
                ]);
            } else {
                Log::error("MoMo gateway refused request", ['response' => $resData]);
                return response()->json([
                    'message' => 'Cổng MoMo Sandbox từ chối yêu cầu: ' . ($resData['message'] ?? 'Lỗi không xác định')
                ], 400);
            }
        } catch (\Exception $e) {
            Log::error("MoMo Payment Exception", ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Có lỗi xảy ra khi tạo giao dịch. Chi tiết: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Webhook nhận kết quả từ MoMo thật (IPN Callback) - TỰ ĐỘNG XÁC NHẬN.
     */
    public function ipn(Request $request)
    {
        Log::info("MoMo IPN Webhook Received", $request->all());

        $momoConfig = config('services.momo');
        $secretKey = $momoConfig['secret_key'];
        
        $partnerCode = $request->input('partnerCode');
        $orderId = $request->input('orderId');
        $requestId = $request->input('requestId');
        $amount = $request->input('amount');
        $orderInfo = $request->input('orderInfo');
        $orderType = $request->input('orderType');
        $transId = $request->input('transId');
        $resultCode = (int) $request->input('resultCode');
        $message = $request->input('message');
        $payType = $request->input('payType');
        $responseTime = $request->input('responseTime');
        $extraData = $request->input('extraData');
        $momoSignature = $request->input('signature');

        // Xác minh chữ ký gửi từ MoMo (theo chuẩn MoMo V2 Alphabetical Order)
        $rawHash = "accessKey=" . $momoConfig['access_key'] .
                   "&amount=" . $amount .
                   "&extraData=" . ($extraData ?? '') .
                   "&message=" . $message .
                   "&orderId=" . $orderId .
                   "&orderInfo=" . $orderInfo .
                   "&orderType=" . $orderType .
                   "&partnerCode=" . $partnerCode .
                   "&payType=" . $payType .
                   "&requestId=" . $requestId .
                   "&responseTime=" . $responseTime .
                   "&resultCode=" . $resultCode .
                   "&transId=" . $transId;

        $computedSignature = hash_hmac("sha256", $rawHash, $secretKey);

        if (!hash_equals($computedSignature, (string)$momoSignature)) {
            Log::warning("MoMo Webhook Signature mismatch", [
                'received' => $momoSignature,
                'computed' => $computedSignature
            ]);
            return response()->json(['message' => 'Mã xác thực chữ ký số không hợp lệ'], 400);
        }

        // Tìm khoản thanh toán
        $payment = FinePayment::query()
            ->with(['fine.member'])
            ->where('transaction_ref', $orderId)
            ->first();

        if (!$payment) {
            Log::warning("No payment record found for transaction reference", ['ref' => $orderId]);
            return response()->json(['message' => 'Không tìm thấy hồ sơ thanh toán.'], 404);
        }

        if ($payment->status !== FinePayment::STATUS_PENDING) {
            Log::info("Payment is already processed", ['ref' => $orderId, 'status' => $payment->status]);
            return response()->json(['message' => 'Giao dịch này đã được xử lý từ trước.'], 200);
        }

        if (! is_numeric($amount) || (int) $amount !== (int) $payment->amount_paid) {
            Log::warning("MoMo IPN Amount mismatch", [
                'ref' => $orderId,
                'received' => $amount,
                'expected' => $payment->amount_paid,
            ]);

            return response()->json(['message' => 'Số tiền thanh toán không hợp lệ.'], 400);
        }

        // TỰ ĐỘNG CẬP NHẬT TRẠNG THÁI (AUTO-CONFIRM)
        DB::transaction(function () use ($payment, $resultCode, $transId, $request) {
            $payment->gateway_response = array_merge($payment->gateway_response ?? [], $request->all());

            if ($resultCode === 0) {
                // Thành công!
                $payment->status = FinePayment::STATUS_COMPLETED;
                $payment->save();

                $fine = $payment->fine;
                $fine->status = Fine::STATUS_PAID;
                $fine->paid_at = now();
                $fine->save();

                // Ghi nhật ký hệ thống (Audit Log)
                AuditLoggerService::log(
                    'collect_fine',
                    'Hệ thống tự động xác nhận đóng phạt trễ hạn qua MoMo trực tuyến thành công: ' . number_format((float) $fine->amount) . ' VND (Mã phiếu phạt: #' . $fine->fine_id . ', Mã GD MoMo: ' . $transId . ')'
                );

                // Gửi thông báo đến tài khoản Sinh viên
                $fine->member->notify(new FineStatusNotification($fine->fresh(['borrowing.book']), Fine::STATUS_PAID));
                
                Log::info("Fine Payment verified automatically via MoMo IPN Webhook!", ['fine_id' => $fine->fine_id]);
            } else {
                // Thất bại
                $payment->status = FinePayment::STATUS_FAILED;
                $payment->save();
                Log::info("Fine Payment marked as FAILED via MoMo IPN", ['ref' => $payment->transaction_ref]);
            }
        });

        // Trả về kết quả đúng cấu trúc MoMo yêu cầu
        return response()->json([
            'partnerCode' => $partnerCode,
            'orderId' => $orderId,
            'requestId' => $requestId,
            'resultCode' => 0,
            'message' => 'Nhận Webhook và xử lý tự động thành công.',
            'responseTime' => now()->toISOString()
        ]);
    }

    /**
     * API Giả lập thông báo Webhook MoMo (Simulation Webhook).
     */
    public function simulateIpn(Request $request)
    {
        $momoConfig = config('services.momo');
        $isSimulation = filter_var($momoConfig['simulation'] ?? true, FILTER_VALIDATE_BOOLEAN);

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
                    'Sinh viên đóng phạt trễ hạn thành công qua [MoMo Giả lập]: ' . number_format((float) $fine->amount) . ' VND (Mã phiếu phạt: #' . $fine->fine_id . ')'
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
                ? 'Giả lập thanh toán MoMo thành công! Khoản phạt đã được xoá nợ.' 
                : 'Giả lập thanh toán MoMo thất bại.'
        ]);
    }

    /**
     * Cho phép Client Polling kiểm tra trạng thái thanh toán.
     */
    public function checkStatus(Request $request, int $paymentId)
    {
        $student = $request->user();

        $payment = FinePayment::query()
            ->whereHas('fine', function ($query) use ($student) {
                $query->where('member_id', $student->member_id);
            })
            ->find($paymentId);

        if (!$payment) {
            return response()->json(['message' => 'Không tìm thấy hồ sơ thanh toán tương ứng.'], 404);
        }

        return response()->json([
            'payment_id' => $payment->payment_id,
            'fine_id' => $payment->fine_id,
            'status' => $payment->status,
            'amount' => $payment->amount_paid,
            'method' => $payment->method,
        ]);
    }


}
