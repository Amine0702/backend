<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use  HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'clerk_user_id',
        'profile_picture_url',
        'role',
        'bio',
        'job_title',
        'company',
        'location',
        'phone',
        'skills',
        'website',
        'linkedin',
        'github',
        'twitter',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    /**
     * Get the team member associated with the user.
     */
    public function teamMember()
    {
        return $this->hasOne(TeamMember::class, 'clerk_user_id', 'clerk_user_id');
    }
}
