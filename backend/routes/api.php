<?php

use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FinanceController;
use App\Http\Controllers\Api\ManagerController;
use App\Http\Controllers\Api\ShipmentController;
use App\Http\Controllers\Api\TelegramSettingController;
use App\Http\Controllers\Api\TrackingController;
use App\Http\Controllers\HealthController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::get('/dashboard', [DashboardController::class, 'index']);
Route::get('/shipments', [ShipmentController::class, 'index']);
Route::get('/shipments/{shipment}', [ShipmentController::class, 'show']);
Route::get('/tracking', [TrackingController::class, 'index']);
Route::get('/managers', [ManagerController::class, 'index']);
Route::get('/finance', [FinanceController::class, 'index']);
Route::get('/telegram/settings', [TelegramSettingController::class, 'show']);
