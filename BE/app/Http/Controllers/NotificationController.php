<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $limit = $request->query('limit', 15);
        $notifications = $user->notifications()->paginate($limit);

        return response()->json($notifications);
    }

    public function markAsRead(Request $request, string $id)
    {
        $user = $request->user();
        $notification = $user->notifications()->where('id', $id)->first();

        if ($notification) {
            $notification->markAsRead();
        }

        return response()->json([
            'message_key' => 'messages.notifications.mark_read',
            'message' => __('messages.notifications.mark_read'),
        ]);
    }

    public function markAllAsRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json([
            'message_key' => 'messages.notifications.mark_all_read',
            'message' => __('messages.notifications.mark_all_read'),
        ]);
    }
}
