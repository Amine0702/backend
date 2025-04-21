<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class TeamMember extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
        'avatar',
        'clerk_user_id',
    ];

    /**
     * Get the projects for the team member.
     */
    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'project_team_member')
            ->withPivot('role')
            ->withTimestamps();
    }
}
