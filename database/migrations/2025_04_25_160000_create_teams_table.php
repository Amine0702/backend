<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('status')->default('active'); // active, paused
            $table->string('priority')->default('medium'); // high, medium, low
            $table->foreignId('leader_id')->nullable()->constrained('team_members')->nullOnDelete();
            $table->integer('completion_rate')->default(0);
            $table->timestamp('last_updated_at')->nullable();
            $table->timestamps();
        });

        Schema::create('team_member', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_member_id')->constrained()->cascadeOnDelete();
            $table->string('role')->default('member');
            $table->timestamps();

            $table->unique(['team_id', 'team_member_id']);
        });

        Schema::create('project_team', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['project_id', 'team_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_team');
        Schema::dropIfExists('team_member');
        Schema::dropIfExists('teams');
    }
};
