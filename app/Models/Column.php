<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Column extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'project_id',
        'order',
    ];

    /**
     * Get the project that owns the column.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the tasks for the column.
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }
}
