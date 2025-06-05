<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'start_date',
        'end_date',
        'clerk_user_id',
        'status',
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
    ];

    /**
     * Get the columns for the project.
     */
    public function columns(): HasMany
    {
        return $this->hasMany(Column::class);
    }

    /**
     * Get the team members for the project.
     */
    public function teamMembers(): BelongsToMany
    {
        return $this->belongsToMany(TeamMember::class, 'project_team_member')
            ->withPivot('role')
            ->withTimestamps();
    }

    /**
     * Get the invited members for the project.
     */
    public function invitedMembers(): HasMany
    {
        return $this->hasMany(InvitedMember::class);
    }

    public function tasks()
    {
        return $this->hasManyThrough(Task::class, Column::class);
    }
}
