<?php

use App\Http\Controllers\AdminMemberController;
use App\Http\Controllers\AdminLibrarianController;
use App\Http\Controllers\AiMetadataController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BlogPostController;
use App\Http\Controllers\BookController;
use App\Http\Controllers\BorrowController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\LibrarySettingController;
use App\Http\Controllers\OpenApiController;
use App\Http\Controllers\ReadingProgressController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\RoomBookingController;
use App\Http\Controllers\GamifyController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);
Route::get('/openapi.json', [OpenApiController::class, 'spec']);
Route::get('/docs', [OpenApiController::class, 'ui']);

Route::middleware('throttle:auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
    Route::post('/resend-otp', [AuthController::class, 'resendOtp']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/verify-forgot-password-otp', [AuthController::class, 'verifyForgotPasswordOtp']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
});

Route::get('/auth/{provider}/redirect', [\App\Http\Controllers\OAuthController::class, 'redirect']);
Route::get('/auth/{provider}/callback', [\App\Http\Controllers\OAuthController::class, 'callback']);

Route::get('/books', [BookController::class, 'index']);
Route::get('/blog/posts', [BlogPostController::class, 'index']);
Route::get('/blog/posts/{slug}', [BlogPostController::class, 'show']);
Route::get('/books/{book}', [BookController::class, 'show']);
Route::get('/rooms', [RoomController::class, 'index']);
Route::get('/rooms/{room}', [RoomController::class, 'show']);
Route::get('/rooms/{room}/schedule', [RoomController::class, 'schedule']);
Route::get('/books/autocomplete', [BookController::class, 'autocomplete']);
Route::get('/books/{bookId}/reviews', [\App\Http\Controllers\ReviewController::class, 'index']);
Route::get('/digital-documents/{book}/download', [BookController::class, 'downloadDigitalDocument'])
    ->middleware('signed')
    ->name('digital-documents.download');

Route::post('/momo/ipn', [\App\Http\Controllers\MomoPaymentController::class, 'ipn']);
Route::post('/momo/simulate-ipn', [\App\Http\Controllers\MomoPaymentController::class, 'simulateIpn']);

Route::get('/vnpay/ipn', [\App\Http\Controllers\VnpayPaymentController::class, 'ipn']);
Route::post('/vnpay/ipn', [\App\Http\Controllers\VnpayPaymentController::class, 'ipn']);
Route::post('/vnpay/simulate-ipn', [\App\Http\Controllers\VnpayPaymentController::class, 'simulateIpn']);

// AI Chat Stream — public (no auth required); logged-in users get extra function-calling features
// Uses Sanctum token parsing if present (optional auth pattern)
Route::middleware(['throttle:10,1'])
    ->post('/ai/chat-stream', [\App\Http\Controllers\AiChatController::class, 'chatStream']);


Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'updateProfile']);
    Route::post('/me/send-password-otp', [AuthController::class, 'sendPasswordOtp']);
    Route::post('/me/verify-password-otp', [AuthController::class, 'verifyPasswordOtp']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me/devices', [AuthController::class, 'getActiveDevices']);
    Route::delete('/me/devices/{tokenId}', [AuthController::class, 'revokeDevice']);

    Route::get('/notifications', [\App\Http\Controllers\NotificationController::class, 'index']);
    Route::put('/notifications/{id}/read', [\App\Http\Controllers\NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [\App\Http\Controllers\NotificationController::class, 'markAllAsRead']);

    Route::get('/digital-documents', [BookController::class, 'getDigitalDocuments']);

    Route::middleware('throttle:10,1')->group(function () {
        Route::post('/ai/chat', [\App\Http\Controllers\AiChatController::class, 'chat']);
        Route::get('/ai/recommendations', [\App\Http\Controllers\AiChatController::class, 'recommendations']);
    });
    // Room Booking Creation (shared for students and librarians/admins)
    Route::post('/room-bookings', [RoomBookingController::class, 'store']);
    Route::get('/gamify/leaderboard', [GamifyController::class, 'leaderboard']);

    Route::middleware('role:student')->group(function () {
        Route::post('/requests', [BorrowController::class, 'requestBorrow']);
        Route::get('/requests/me', [BorrowController::class, 'getMemberRequests']);
        Route::delete('/requests/{loanId}/cancel', [BorrowController::class, 'cancelBorrow']);
        Route::get('/favorites', [FavoriteController::class, 'index']);
        Route::post('/favorites/{book}', [FavoriteController::class, 'store']);
        Route::delete('/favorites/{book}', [FavoriteController::class, 'destroy']);
        Route::get('/reading-progress', [ReadingProgressController::class, 'index']);
        Route::get('/reading-progress/{book}', [ReadingProgressController::class, 'show']);
        Route::put('/reading-progress/{book}', [ReadingProgressController::class, 'update']);
        Route::post('/books/{bookId}/reviews', [\App\Http\Controllers\ReviewController::class, 'store']);
        Route::get('/reservations/me', [\App\Http\Controllers\ReservationController::class, 'me']);
        Route::post('/reservations/{bookId}', [\App\Http\Controllers\ReservationController::class, 'reserve']);
        Route::delete('/reservations/{reservationId}', [\App\Http\Controllers\ReservationController::class, 'cancel']);
        Route::get('/fines/me/summary', [\App\Http\Controllers\FineController::class, 'summary']);
        Route::get('/fines/me', [\App\Http\Controllers\FineController::class, 'me']);
        Route::post('/fines/{fineId}/apply-waiver', [\App\Http\Controllers\FineController::class, 'applyWaiver']);
        Route::post('/fines/{fineId}/momo/pay', [\App\Http\Controllers\MomoPaymentController::class, 'initiatePayment']);
        Route::post('/fines/{fineId}/vnpay/pay', [\App\Http\Controllers\VnpayPaymentController::class, 'initiatePayment']);
        Route::get('/fines/payments/{paymentId}/status', [\App\Http\Controllers\MomoPaymentController::class, 'checkStatus']);
        
        // Room Bookings
        Route::get('/room-bookings/me', [RoomBookingController::class, 'myBookings']);
        Route::delete('/room-bookings/{id}/cancel', [RoomBookingController::class, 'cancel']);
        Route::post('/room-bookings/{id}/check-out', [RoomBookingController::class, 'checkOut']);

        // Gamification
        Route::get('/gamify/profile', [GamifyController::class, 'profile']);
        Route::post('/gamify/check-in', [GamifyController::class, 'checkIn']);
        Route::get('/gamify/badges', [GamifyController::class, 'badges']);
        Route::get('/gamify/rewards', [GamifyController::class, 'rewards']);
        Route::post('/gamify/rewards/{id}/redeem', [GamifyController::class, 'redeem']);
    });

    // Staff operations (both Admin and Librarian)
    Route::middleware('role:admin,librarian')->group(function () {
        Route::post('/ai/books/metadata-all', [AiMetadataController::class, 'generateAll']);
        Route::post('/ai/books/{book}/metadata', [AiMetadataController::class, 'generate']);

        // Student Members Management
        Route::middleware('permission:manage_members')->group(function () {
            Route::get('/members', [AdminMemberController::class, 'index']);
            Route::post('/members', [AdminMemberController::class, 'store']);
            Route::post('/members/import', [AdminMemberController::class, 'import']);
            Route::put('/members/{member}', [AdminMemberController::class, 'update']);
            Route::delete('/members/{member}', [AdminMemberController::class, 'destroy']);
            Route::patch('/members/{member}/toggle-disable', [AdminMemberController::class, 'toggleDisable']);
        });

        // Books Catalog Management
        Route::middleware('permission:manage_books')->group(function () {
            Route::post('/books', [BookController::class, 'store']);
            Route::post('/books/import', [BookController::class, 'import']);
            Route::put('/books/{book}', [BookController::class, 'update']);
            Route::get('/books/{book}/copies', [BookController::class, 'getCopies']);
            Route::post('/books/{book}/copies', [BookController::class, 'addCopy']);
            Route::put('/books/{book}/copies/{copy}', [BookController::class, 'updateCopy']);
            Route::delete('/books/{book}/copies/{copy}', [BookController::class, 'deleteCopy']);
            Route::post('/books/{book}/digital-file', [BookController::class, 'uploadDigitalFile']);
            Route::post('/books/{book}/cover-image', [BookController::class, 'uploadCoverImage']);
            Route::delete('/books/{book}', [BookController::class, 'destroy']);
            Route::post('/books/{bookId}/complete-repair', [BookController::class, 'completeRepair']);
        });

        Route::middleware('permission:manage_blog')->group(function () {
            Route::get('/admin/blog/posts', [BlogPostController::class, 'adminIndex']);
            Route::post('/admin/blog/posts', [BlogPostController::class, 'store']);
            Route::put('/admin/blog/posts/{blogPost}', [BlogPostController::class, 'update']);
            Route::post('/admin/blog/posts/{blogPost}', [BlogPostController::class, 'update']);
            Route::delete('/admin/blog/posts/{blogPost}', [BlogPostController::class, 'destroy']);
            Route::post('/admin/blog/posts/{blogPost}/publish', [BlogPostController::class, 'publish']);
            Route::post('/admin/blog/posts/{blogPost}/pin', [BlogPostController::class, 'pin']);
            Route::post('/admin/blog/posts/{blogPost}/generate-excerpt', [BlogPostController::class, 'generateExcerpt']);
        });

        // Borrow Requests, Returns & cash payments
        Route::middleware('permission:approve_requests')->group(function () {
            Route::get('/requests', [BorrowController::class, 'getAllRequests']);
            Route::post('/requests/{loanId}/approve', [BorrowController::class, 'approveBorrow']);
            Route::post('/requests/{loanId}/confirm-pickup', [BorrowController::class, 'confirmPickup']);
            Route::post('/requests/{loanId}/reject', [BorrowController::class, 'rejectBorrow']);
            Route::post('/requests/{loanId}/return', [BorrowController::class, 'returnBook']);
            Route::patch('/requests/{loanId}/extend', [BorrowController::class, 'extendLoan']);
        });

        // Fine Management
        Route::middleware('permission:manage_fines')->group(function () {
            Route::get('/admin/fines', [\App\Http\Controllers\FineController::class, 'adminIndex']);
            Route::post('/admin/fines', [\App\Http\Controllers\FineController::class, 'store']);
            Route::get('/admin/fines/statistics', [\App\Http\Controllers\FineController::class, 'statistics']);
            Route::post('/fines/{fineId}/pay', [\App\Http\Controllers\FineController::class, 'pay']);
            
        });

        // Room Bookings & Study Rooms Management
        Route::middleware('permission:manage_rooms')->group(function () {
            Route::get('/admin/room-bookings', [RoomBookingController::class, 'adminIndex']);
            Route::get('/admin/room-bookings/statistics', [RoomBookingController::class, 'statistics']);
            Route::post('/admin/room-bookings/{id}/approve', [RoomBookingController::class, 'approve']);
            Route::post('/admin/room-bookings/{id}/reject', [RoomBookingController::class, 'reject']);
            Route::post('/admin/room-bookings/{id}/check-in', [RoomBookingController::class, 'adminCheckIn']);
            Route::post('/admin/room-bookings/check-in-code', [RoomBookingController::class, 'adminCheckInCode']);
            Route::post('/admin/room-bookings/{id}/check-out', [RoomBookingController::class, 'adminCheckOut']);
            Route::post('/admin/room-bookings/{id}/cancel-check-in', [RoomBookingController::class, 'adminCancelCheckIn']);
            Route::post('/rooms', [RoomController::class, 'store']);
            Route::put('/rooms/{room}', [RoomController::class, 'update']);
            Route::delete('/rooms/{room}', [RoomController::class, 'destroy']);
        });

        // Special Administrative Privilege Group (Admin ONLY or specific permissions)
        Route::middleware('permission:view_audit_logs')->get('/audit-logs', [\App\Http\Controllers\AuditLogController::class, 'index']);
        
        Route::middleware('permission:view_reports')->group(function () {
            Route::get('/reports', [\App\Http\Controllers\ReportController::class, 'index']);
            Route::get('/reports/export', [\App\Http\Controllers\ReportController::class, 'export']);
            Route::get('/reports/export-books', [\App\Http\Controllers\ReportController::class, 'exportBooks']);
            Route::get('/reports/export-members', [\App\Http\Controllers\ReportController::class, 'exportMembers']);
            Route::get('/reports/export-fines', [\App\Http\Controllers\ReportController::class, 'exportFines']);
            Route::get('/reports/export-overdue', [\App\Http\Controllers\ReportController::class, 'exportOverdue']);
            Route::get('/reports/export-circulation', [\App\Http\Controllers\ReportController::class, 'exportCirculation']);
            Route::get('/reports/export-assets', [\App\Http\Controllers\ReportController::class, 'exportAssets']);
            Route::get('/reports/export-digital', [\App\Http\Controllers\ReportController::class, 'exportDigital']);
            Route::get('/reports/fines-detail', [\App\Http\Controllers\ReportController::class, 'finesDetail']);
        });

        Route::middleware('permission:manage_settings')->group(function () {
            Route::get('/library-settings', [LibrarySettingController::class, 'show']);
            Route::put('/library-settings', [LibrarySettingController::class, 'update']);
        });

        Route::middleware('permission:waive_fines')->post('/fines/{fineId}/waive', [\App\Http\Controllers\FineController::class, 'waive']);

        Route::middleware('permission:manage_librarians')->group(function () {
            Route::get('/librarians', [AdminLibrarianController::class, 'index']);
            Route::post('/librarians', [AdminLibrarianController::class, 'store']);
            Route::put('/librarians/{librarian}', [AdminLibrarianController::class, 'update']);
            Route::delete('/librarians/{librarian}', [AdminLibrarianController::class, 'destroy']);
        });
    });
});
