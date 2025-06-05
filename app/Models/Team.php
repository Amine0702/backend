<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Team extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'status',
        'priority',
        'leader_id',
        'completion_rate',
        'last_updated_at',
    ];

    protected $casts = [
        'completion_rate' => 'integer',
        'last_updated_at' => 'datetime',
    ];

    /**
     * Get the team members for the team.
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(TeamMember::class, 'team_member')
            ->withPivot('role')
            ->withTimestamps();
    }

    /**
     * Get the team leader.
     */
    public function leader()
    {
        return $this->belongsTo(TeamMember::class, 'leader_id');
    }

    /**
     * Get the projects for the team.
     */
    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'project_team')
            ->withTimestamps();
    }

    /**
     * Get active projects count
     */
    public function getActiveProjectsCountAttribute()
    {
        return $this->projects()->where('status', 'active')->count();
    }
}
