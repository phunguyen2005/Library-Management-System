<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

// Private librarians channel: accessible only by librarians and admins
Broadcast::channel('librarians', function ($user) {
    return in_array($user->role ?? null, ['librarian', 'admin']) 
        || ($user->is_super_admin ?? false);
});

// Private member channel: accessible by the student themselves or staff
Broadcast::channel('member.{memberId}', function ($user, $memberId) {
    if (in_array($user->role ?? null, ['librarian', 'admin']) || ($user->is_super_admin ?? false)) {
        return true;
    }
    
    // Check if the user is the student matching the memberId
    return isset($user->member_id) && (int) $user->member_id === (int) $memberId;
});

// Default Laravel Notification Channel for Member model (resolves 403 for private-App.Models.Member.3)
Broadcast::channel('App.Models.Member.{memberId}', function ($user, $memberId) {
    if (in_array($user->role ?? null, ['librarian', 'admin']) || ($user->is_super_admin ?? false)) {
        return true;
    }
    return isset($user->member_id) && (int) $user->member_id === (int) $memberId;
});

// Default Laravel Notification Channel for Librarian model
Broadcast::channel('App.Models.Librarian.{librarianId}', function ($user, $librarianId) {
    return (int) $user->librarian_id === (int) $librarianId;
});
