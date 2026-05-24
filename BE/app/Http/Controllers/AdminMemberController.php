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
        $query = Member::query()->orderBy('member_id');
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

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:4096',
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();
        
        $handle = fopen($path, 'r');
        if (!$handle) {
            return response()->json(['message' => 'Không thể mở tệp tin.'], 400);
        }

        $header = fgetcsv($handle, 1000, ",");
        if (!$header) {
            fclose($handle);
            return response()->json(['message' => 'Tệp tin trống hoặc không hợp lệ.'], 400);
        }

        $header = array_map(function($h) {
            return trim(preg_replace('/[\x{FEFF}\x{200B}]/u', '', $h));
        }, $header);

        // Map column names to indexes
        $colMap = [
            'name' => array_search('name', $header) !== false ? array_search('name', $header) : array_search('ho_ten', $header),
            'email' => array_search('email', $header),
            'phone_number' => array_search('phone_number', $header) !== false ? array_search('phone_number', $header) : array_search('so_dien_thoai', $header),
            'password' => array_search('password', $header) !== false ? array_search('password', $header) : array_search('mat_khau', $header),
            'join_date' => array_search('join_date', $header) !== false ? array_search('join_date', $header) : array_search('ngay_tham_gia', $header),
        ];

        if ($colMap['name'] === false) $colMap['name'] = 0;
        if ($colMap['email'] === false) $colMap['email'] = 1;
        if ($colMap['phone_number'] === false) $colMap['phone_number'] = 2;
        if ($colMap['password'] === false) $colMap['password'] = 3;
        if ($colMap['join_date'] === false) $colMap['join_date'] = 4;

        $successCount = 0;
        $errors = [];
        $rowNum = 1;

        DB::beginTransaction();
        try {
            while (($row = fgetcsv($handle, 1000, ",")) !== false) {
                $rowNum++;
                
                if (empty(array_filter($row))) {
                    continue;
                }

                $name = trim($row[$colMap['name']] ?? '');
                $email = trim($row[$colMap['email']] ?? '');
                $phone = trim($row[$colMap['phone_number']] ?? '');
                $password = trim($row[$colMap['password']] ?? '');
                $joinDate = trim($row[$colMap['join_date']] ?? '');

                if (empty($name)) {
                    $errors[] = "Dòng $rowNum: Tên không được để trống.";
                    continue;
                }

                if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $errors[] = "Dòng $rowNum: Email không hợp lệ ($email).";
                    continue;
                }

                if (Member::where('email', $email)->exists()) {
                    $errors[] = "Dòng $rowNum: Email '$email' đã tồn tại trong hệ thống.";
                    continue;
                }

                if (empty($password)) {
                    $password = 'Student123';
                } else if (strlen($password) < 8 || !preg_match('/[a-zA-Z]/', $password) || !preg_match('/[0-9]/', $password)) {
                    $errors[] = "Dòng $rowNum: Mật khẩu phải có ít nhất 8 ký tự, bao gồm cả chữ và số.";
                    continue;
                }

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

            if (count($errors) > 0) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Nhập dữ liệu thất bại do có lỗi validation.',
                    'errors' => $errors,
                    'success_count' => 0
                ], 422);
            }

            DB::commit();
            
            \App\Services\AuditLoggerService::log('member_import', "Đã import thành công $successCount thành viên từ file CSV.");

            return response()->json([
                'message' => "Nhập dữ liệu thành công. Đã thêm $successCount thành viên.",
                'success_count' => $successCount,
                'errors' => []
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
