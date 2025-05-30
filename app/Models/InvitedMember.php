<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvitedMember extends Model
{
    use HasFactory;

    protected $fillable = [
        'email',
        'project_id',
        'status',
        'invitation_token',
        'role', // Ajouter cette ligne
    ];
}
