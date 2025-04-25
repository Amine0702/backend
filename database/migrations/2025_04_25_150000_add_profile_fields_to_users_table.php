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
        Schema::table('users', function (Blueprint $table) {
            $table->text('bio')->nullable()->after('profile_picture_url');
            $table->string('job_title')->nullable()->after('bio');
            $table->string('company')->nullable()->after('job_title');
            $table->string('location')->nullable()->after('company');
            $table->string('phone')->nullable()->after('location');
            $table->text('skills')->nullable()->after('phone');
            $table->string('website')->nullable()->after('skills');
            $table->string('linkedin')->nullable()->after('website');
            $table->string('github')->nullable()->after('linkedin');
            $table->string('twitter')->nullable()->after('github');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'bio',
                'job_title',
                'company',
                'location',
                'phone',
                'skills',
                'website',
                'linkedin',
                'github',
                'twitter',
            ]);
        });
    }
};
