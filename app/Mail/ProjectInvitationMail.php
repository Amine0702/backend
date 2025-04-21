<?php

namespace App\Mail;

use App\Models\Project;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ProjectInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public $project;
    public $joinLink;
    public $role;

    /**
     * Create a new message instance.
     *
     * @param Project $project
     * @param string  $joinLink
     * @param string  $role
     */
    public function __construct(Project $project, $joinLink, $role = 'member')
    {
        $this->project = $project;
        $this->joinLink = $joinLink;
        $this->role = $role;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->subject('Invitation pour rejoindre le projet : ' . $this->project->name)
            ->markdown('emails.project_invitation');
    }
}
