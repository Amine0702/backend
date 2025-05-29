<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvitedMember extends Model
{
    use HasFactory;

    protected $fillable = [
        'email',
        'project_id',
        'status',
        'invitation_token',
        'role', // Ajout du champ role
    ];

    /**
     * Get the project that owns the invited member.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
