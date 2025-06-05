<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserInvitation extends Model
{
    use HasFactory;

    protected $fillable = [
        'email',
        'invitation_token',
        'status',
        'role',
        'invited_by',
        'expires_at'
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];
}
