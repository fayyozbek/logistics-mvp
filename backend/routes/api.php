<?php

use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\CheckpointController;
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
Route::post('/shipments', [ShipmentController::class, 'store']);
Route::get('/shipments/{shipment}', [ShipmentController::class, 'show']);
Route::patch('/shipments/{shipment}', [ShipmentController::class, 'update']);
Route::delete('/shipments/{shipment}', [ShipmentController::class, 'destroy']);
Route::patch('/shipments/{shipment}/status', [ShipmentController::class, 'updateStatus']);
Route::post('/shipments/{shipment}/checkpoints', [CheckpointController::class, 'store']);
Route::patch('/checkpoints/{checkpoint}', [CheckpointController::class, 'update']);
Route::get('/tracking', [TrackingController::class, 'index']);
Route::get('/clients', [ClientController::class, 'index']);
Route::post('/clients', [ClientController::class, 'store']);
Route::get('/clients/{client}', [ClientController::class, 'show']);
Route::patch('/clients/{client}', [ClientController::class, 'update']);
Route::delete('/clients/{client}', [ClientController::class, 'destroy']);
Route::get('/managers', [ManagerController::class, 'index']);
Route::get('/managers/overview', [ManagerController::class, 'overview']);
Route::post('/managers', [ManagerController::class, 'store']);
Route::get('/managers/{manager}', [ManagerController::class, 'show']);
Route::patch('/managers/{manager}', [ManagerController::class, 'update']);
Route::delete('/managers/{manager}', [ManagerController::class, 'destroy']);
Route::get('/finance', [FinanceController::class, 'index']);
Route::patch('/finance/{financeRecord}/status', [FinanceController::class, 'updateStatus']);
Route::get('/telegram/settings', [TelegramSettingController::class, 'show']);
Route::patch('/telegram/settings', [TelegramSettingController::class, 'update']);
