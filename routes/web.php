<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});


Route::get('/', function () {
    return response()->json([
        'message' => '✅ Laravel API déployée avec succès sur Railway!',
    ]);
});

