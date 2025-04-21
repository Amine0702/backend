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
       Schema::create('tasks', function (Blueprint $table) {
           $table->id();
           $table->foreignId('column_id')->constrained()->onDelete('cascade');
           $table->string('title');
           $table->text('description')->nullable();
           $table->string('status')->default('à_faire'); // à_faire, en_cours, en_révision, terminé
           $table->string('priority')->default('moyenne'); // basse, moyenne, haute, urgente
           $table->foreignId('assignee_id')->nullable()->constrained('team_members')->nullOnDelete();
           $table->string('creator_id')->nullable(); // ID Clerk du créateur de la tâche
           $table->integer('estimated_time')->default(0); // in minutes
           $table->integer('actual_time')->default(0); // in minutes
           $table->timestamp('due_date')->nullable();
           $table->timestamp('started_at')->nullable();
           $table->timestamp('completed_at')->nullable();
           $table->boolean('timer_active')->default(false);
           $table->json('tags')->nullable();
           $table->timestamps();
       });
   }

   /**
    * Reverse the migrations.
    */
   public function down(): void
   {
       Schema::dropIfExists('tasks');
   }
};
