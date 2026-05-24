<?php

namespace App\Http\Controllers;

use App\Http\Requests\LibrarianStoreRequest;
use App\Http\Requests\LibrarianUpdateRequest;
use App\Http\Resources\LibrarianResource;
use App\Models\Librarian;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminLibrarianController extends Controller
{
    public function index(Request $request)
    {
        $query = Librarian::query()->orderBy('librarian_id');
        $search = trim((string) ($request->query('query', '')));

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('name', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%')
                    ->orWhere('phone_number', 'like', '%'.$search.'%');
            });
        }

        $librarians = $query->paginate($request->query('limit', 15), ['*'], 'page', $request->query('page', 1))
            ->withQueryString();

        return LibrarianResource::collection($librarians);
    }

    public function store(LibrarianStoreRequest $request)
    {
        $validated = $request->validated();

        $librarian = Librarian::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone_number' => $validated['phone_number'] ?? null,
            'hire_date' => $validated['hire_date'] ?? now()->toDateString(),
            'password' => Hash::make($validated['password']),
        ]);

        // Gán vai trò
        $role = $validated['role'] ?? 'librarian';
        $librarian->syncRoles([$role]);

        // Đồng bộ quyền trực tiếp
        if (isset($validated['permissions'])) {
            $librarian->syncPermissions($validated['permissions']);
        }

        \App\Services\AuditLoggerService::log('librarian_create', 'Tạo tài khoản thủ thư mới: ' . $librarian->email);

        return response()->json(new LibrarianResource($librarian->load(['roles', 'permissions'])), 201);
    }

    public function update(LibrarianUpdateRequest $request, Librarian $librarian)
    {
        $validated = $request->validated();

        // Không cho phép chỉnh sửa tài khoản admin chính phunguyen2005 từ giao diện nếu không phải chính họ
        $currentUser = $request->user();
        if (str_starts_with(strtolower($librarian->email), 'phunguyen2005') && $currentUser->librarian_id !== $librarian->librarian_id) {
            return response()->json([
                'message' => 'Bạn không thể thay đổi thông tin của Quản trị viên tối cao.',
            ], 403);
        }

        $librarian->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone_number' => $validated['phone_number'] ?? null,
            'hire_date' => $validated['hire_date'] ?? $librarian->hire_date,
        ]);

        if (! empty($validated['password'])) {
            $librarian->password = Hash::make($validated['password']);
        }

        $librarian->save();

        // Đồng bộ vai trò nếu được truyền lên
        if (isset($validated['role'])) {
            if (str_starts_with(strtolower($librarian->email), 'phunguyen2005')) {
                $librarian->syncRoles(['admin']);
            } else {
                $librarian->syncRoles([$validated['role']]);
            }
        }

        // Đồng bộ quyền hạn trực tiếp nếu được truyền lên
        if (isset($validated['permissions'])) {
            $librarian->syncPermissions($validated['permissions']);
        }

        \App\Services\AuditLoggerService::log('librarian_update', 'Cập nhật thông tin thủ thư: ' . $librarian->email);

        return response()->json(new LibrarianResource($librarian->fresh(['roles', 'permissions'])));
    }

    public function destroy(Request $request, Librarian $librarian)
    {
        $currentUser = $request->user();

        // 1. Không cho phép tự xóa bản thân
        if ($currentUser && $currentUser->librarian_id === $librarian->librarian_id) {
            return response()->json([
                'message' => 'Bạn không thể tự xóa tài khoản của chính mình.',
            ], 422);
        }

        // 2. Không cho phép xóa Quản trị viên tối cao phunguyen2005
        if (str_starts_with(strtolower($librarian->email), 'phunguyen2005')) {
            return response()->json([
                'message' => 'Không thể xóa tài khoản Quản trị viên tối cao.',
            ], 422);
        }

        // 3. Không cho phép xóa nếu thủ thư đã duyệt phiếu mượn
        if ($librarian->processedBorrowings()->exists()) {
            return response()->json([
                'message' => 'Không thể xóa thủ thư đã có lịch sử duyệt mượn sách.',
            ], 422);
        }

        $email = $librarian->email;
        $librarian->delete();

        \App\Services\AuditLoggerService::log('librarian_delete', 'Xóa tài khoản thủ thư: ' . $email);

        return response()->json([
            'message' => 'Xóa tài khoản thủ thư thành công.',
        ]);
    }
}
