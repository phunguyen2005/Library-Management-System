<?php

namespace App\Http\Controllers;

use App\Http\Requests\MemberIndexRequest;
use App\Http\Requests\MemberStoreRequest;
use App\Http\Requests\MemberUpdateRequest;
use App\Http\Resources\MemberResource;
use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminMemberController extends Controller
{
    public function index(MemberIndexRequest $request)
    {
        $validated = $request->validated();
        $query = Member::query()->withCount('badges')->orderBy('member_id');
        $search = trim((string) ($validated['query'] ?? ''));

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('name', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%')
                    ->orWhere('phone_number', 'like', '%'.$search.'%');
            });
        }

        $members = $query->paginate($validated['limit'] ?? 15, ['*'], 'page', $validated['page'] ?? 1)
            ->withQueryString();

        return MemberResource::collection($members);
    }

    public function store(MemberStoreRequest $request)
    {
        $validated = $request->validated();

        $member = Member::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone_number' => $validated['phone_number'] ?? null,
            'join_date' => $validated['join_date'] ?? now()->toDateString(),
            'password' => $validated['password'],
        ]);

        return response()->json(new MemberResource($member), 201);
    }

    public function update(MemberUpdateRequest $request, Member $member)
    {
        $validated = $request->validated();

        $member->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone_number' => $validated['phone_number'] ?? null,
            'join_date' => $validated['join_date'] ?? $member->join_date,
        ]);

        if (array_key_exists('borrow_suspended_until', $validated)) {
            $member->borrow_suspended_until = $validated['borrow_suspended_until'];
        }

        if (array_key_exists('level', $validated)) {
            $member->level = $validated['level'];
        }

        if (array_key_exists('xp', $validated)) {
            $member->xp = $validated['xp'];
        }

        if (array_key_exists('points', $validated)) {
            $member->points = $validated['points'];
        }

        if (array_key_exists('daily_streak', $validated)) {
            $member->daily_streak = $validated['daily_streak'];
        }

        if (! empty($validated['password'])) {
            $member->password = $validated['password'];
        }

        $member->save();

        return response()->json(new MemberResource($member->fresh()));
    }

    public function destroy(Member $member)
    {
        if ($member->borrowings()->exists()) {
            return response()->json([
                'message' => 'Không thể xóa thành viên đã có lịch sử mượn.',
            ], 422);
        }

        $member->delete();

        return response()->json([
            'message' => 'Xóa thành viên thành công.',
        ]);
    }

    public function toggleDisable(Member $member)
    {
        $newState = ! $member->is_disabled;
        $member->is_disabled = $newState;
        $member->save();

        if ($newState) {
            // Revoke all active access tokens so the user is immediately logged out
            $member->tokens()->delete();

            // Revoke all active refresh tokens so they cannot refresh their token
            \App\Models\RefreshToken::where('user_id', $member->member_id)
                ->where('user_type', 'student')
                ->delete();

            \App\Services\AuditLoggerService::log(
                'member_disabled',
                "Vô hiệu hóa tài khoản thành viên: {$member->name} (ID: {$member->member_id})."
            );
        } else {
            \App\Services\AuditLoggerService::log(
                'member_enabled',
                "Kích hoạt lại tài khoản thành viên: {$member->name} (ID: {$member->member_id})."
            );
        }

        return response()->json([
            'message' => $newState
                ? "Tài khoản của {$member->name} đã bị vô hiệu hóa."
                : "Tài khoản của {$member->name} đã được kích hoạt lại.",
            'data' => new MemberResource($member->fresh()),
        ]);
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:4096',
            'dry_run' => 'nullable|boolean',
            'allow_partial' => 'nullable|boolean',
            'column_mapping' => 'nullable|string', // JSON mapping
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();
        
        $handle = fopen($path, 'r');
        if (!$handle) {
            return response()->json(['message' => 'Không thể mở tệp tin.'], 400);
        }

        // Auto-detect delimiter: read first line as raw text and count tabs vs commas
        $firstLine = fgets($handle);
        if ($firstLine === false) {
            fclose($handle);
            return response()->json(['message' => 'Tệp tin trống hoặc không hợp lệ.'], 400);
        }
        $tabCount   = substr_count($firstLine, "\t");
        $commaCount = substr_count($firstLine, ',');
        $delimiter  = ($tabCount > 0 && $tabCount >= $commaCount) ? "\t" : ",";

        // Rewind to re-read the header with fgetcsv using the detected delimiter
        rewind($handle);

        $header = fgetcsv($handle, 0, $delimiter);
        if (!$header) {
            fclose($handle);
            return response()->json(['message' => 'Tệp tin trống hoặc không hợp lệ.'], 400);
        }

        $header = array_map(function($h) {
            // Strip BOM, zero-width space, and null bytes (common in UTF-16 files)
            return trim(preg_replace('/[\x{FEFF}\x{200B}\x00]/u', '', $h));
        }, $header);

        $columnMapping = [];
        if ($request->has('column_mapping')) {
            $columnMapping = json_decode($request->input('column_mapping'), true) ?: [];
        }

        // Map column names to indexes
        $colMap = [];
        foreach (['name', 'email', 'phone_number', 'password', 'join_date'] as $key) {
            $csvColName = $columnMapping[$key] ?? null;
            if ($csvColName !== null) {
                $idx = array_search(trim($csvColName), $header);
                if ($idx !== false) {
                    $colMap[$key] = $idx;
                    continue;
                }
            }

            // Fallback logic
            $fallbackField = match($key) {
                'name' => 'ho_ten',
                'phone_number' => 'so_dien_thoai',
                'password' => 'mat_khau',
                'join_date' => 'ngay_tham_gia',
                default => null
            };

            $idx = array_search($key, $header);
            if ($idx === false && $fallbackField) {
                $idx = array_search($fallbackField, $header);
            }
            $colMap[$key] = $idx;
        }

        // Name and Email are strictly required
        if ($colMap['name'] === false) {
            fclose($handle);
            return response()->json(['message' => 'Không tìm thấy cột Họ tên (name) trong tệp CSV.'], 422);
        }
        if ($colMap['email'] === false) {
            fclose($handle);
            return response()->json(['message' => 'Không tìm thấy cột Email trong tệp CSV.'], 422);
        }

        $dryRun = filter_var($request->input('dry_run', false), FILTER_VALIDATE_BOOLEAN);
        $allowPartial = filter_var($request->input('allow_partial', false), FILTER_VALIDATE_BOOLEAN);

        $successCount = 0;
        $errors = [];
        $rowNum = 1;
        $importedEmails = []; // Prevent duplicate emails in the same CSV import file

        DB::beginTransaction();
        try {
            while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
                $rowNum++;
                
                if (empty(array_filter($row))) {
                    continue;
                }

                $name = trim($row[$colMap['name']] ?? '');
                $email = trim($row[$colMap['email']] ?? '');
                $phone = $colMap['phone_number'] !== false ? trim($row[$colMap['phone_number']] ?? '') : '';
                $password = $colMap['password'] !== false ? trim($row[$colMap['password']] ?? '') : '';
                $joinDate = $colMap['join_date'] !== false ? trim($row[$colMap['join_date']] ?? '') : '';

                $rowErrors = [];

                if (empty($name)) {
                    $rowErrors[] = "Tên không được để trống.";
                }

                if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $rowErrors[] = "Email không hợp lệ ($email).";
                } else {
                    if (in_array($email, $importedEmails, true)) {
                        $rowErrors[] = "Email '$email' bị lặp lại trong tệp CSV.";
                    } elseif (Member::where('email', $email)->exists()) {
                        $rowErrors[] = "Email '$email' đã tồn tại trên hệ thống.";
                    }
                }

                if (!empty($password)) {
                    if (strlen($password) < 8 || !preg_match('/[a-zA-Z]/', $password) || !preg_match('/[0-9]/', $password)) {
                        $rowErrors[] = "Mật khẩu phải có ít nhất 8 ký tự, bao gồm cả chữ và số.";
                    }
                }

                if (count($rowErrors) > 0) {
                    foreach ($rowErrors as $err) {
                        $errors[] = "Dòng $rowNum: $err";
                    }
                    continue;
                }

                if (empty($password)) {
                    $password = 'Student123';
                }

                $importedEmails[] = $email;

                Member::create([
                    'name' => $name,
                    'email' => $email,
                    'phone_number' => !empty($phone) ? $phone : null,
                    'password' => bcrypt($password),
                    'join_date' => !empty($joinDate) ? $joinDate : now()->toDateString(),
                ]);

                $successCount++;
            }
            
            fclose($handle);

            // Handle Dry-run / Aborting / Partial committing
            if ($dryRun) {
                DB::rollBack();
                return response()->json([
                    'message' => count($errors) > 0 
                        ? 'Chạy thử hoàn tất: Có một số lỗi dữ liệu được phát hiện.' 
                        : 'Chạy thử hoàn tất: Dữ liệu hoàn toàn hợp lệ và sẵn sàng nhập.',
                    'dry_run' => true,
                    'errors' => $errors,
                    'success_count' => $successCount
                ]);
            }

            if (count($errors) > 0 && !$allowPartial) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Nhập dữ liệu thất bại do có lỗi validation.',
                    'errors' => $errors,
                    'success_count' => 0
                ], 422);
            }

            DB::commit();
            
            if ($successCount > 0) {
                \App\Services\AuditLoggerService::log('member_import', "Đã import thành công $successCount thành viên từ file CSV.");
            }

            return response()->json([
                'message' => count($errors) > 0 
                    ? "Nhập dữ liệu hoàn tất. Đã thêm thành công $successCount thành viên, bỏ qua " . (count($errors)) . " lỗi."
                    : "Nhập dữ liệu thành công. Đã thêm $successCount thành viên.",
                'success_count' => $successCount,
                'errors' => $errors
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            fclose($handle);
            return response()->json([
                'message' => 'Đã xảy ra lỗi trong quá trình nhập dữ liệu: ' . $e->getMessage()
            ], 500);
        }
    }
}
