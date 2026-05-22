<?php

namespace App\Http\Controllers;

use App\Http\Requests\MemberIndexRequest;
use App\Http\Requests\MemberStoreRequest;
use App\Http\Requests\MemberUpdateRequest;
use App\Http\Resources\MemberResource;
use App\Models\Member;

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
}
