<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'data',
        'read',
        'related_id',
        'related_type',
        'sender_id',
    ];

    protected $casts = [
        'data' => 'array',
        'read' => 'boolean',
    ];

    /**
     * Get the user that owns the notification.
     */
    public function user()
    {
        return $this->belongsTo(TeamMember::class, 'user_id');
    }

    /**
     * Get the sender of the notification.
     */
    public function sender()
    {
        return $this->belongsTo(TeamMember::class, 'sender_id');
    }

    /**
     * Get the related model.
     */
    public function related()
    {
        return $this->morphTo('related');
    }
}
