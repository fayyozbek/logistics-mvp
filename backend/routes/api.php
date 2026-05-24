<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CheckpointController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FinanceController;
use App\Http\Controllers\Api\ManagerController;
use App\Http\Controllers\Api\ShipmentController;
use App\Http\Controllers\Api\TelegramNotificationController;
use App\Http\Controllers\Api\TelegramSettingController;
use App\Http\Controllers\Api\TrackingController;
use App\Http\Controllers\HealthController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::middleware('role:admin,manager,operator,finance,viewer')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::get('/shipments', [ShipmentController::class, 'index']);
        Route::get('/shipments/{shipment}', [ShipmentController::class, 'show']);
        Route::get('/tracking', [TrackingController::class, 'index']);
        Route::get('/finance', [FinanceController::class, 'index']);
    });

    Route::middleware('role:admin,manager,operator')->group(function () {
        Route::get('/managers', [ManagerController::class, 'index']);
    });

    Route::middleware('role:admin,manager,operator,finance,viewer')->group(function () {
        Route::get('/clients', [ClientController::class, 'index']);
    });

    Route::middleware('role:admin,manager,operator')->group(function () {
        Route::post('/clients', [ClientController::class, 'store']);
        Route::patch('/clients/{client}', [ClientController::class, 'update']);
    });

    Route::middleware('role:admin')->group(function () {
        Route::post('/managers', [ManagerController::class, 'store']);
        Route::patch('/managers/{manager}', [ManagerController::class, 'update']);
        Route::delete('/managers/{manager}', [ManagerController::class, 'destroy']);
        Route::delete('/clients/{client}', [ClientController::class, 'destroy']);
    });

    Route::middleware('role:admin,manager,operator,finance')->group(function () {
        Route::get('/telegram/status', [TelegramSettingController::class, 'status']);
        Route::get('/telegram/settings', [TelegramSettingController::class, 'show']);
    });

    Route::middleware('role:admin,manager')->group(function () {
        Route::get('/telegram/notifications', [TelegramNotificationController::class, 'index']);
    });

    Route::middleware('role:admin,manager')->group(function () {
        Route::post('/shipments', [ShipmentController::class, 'store']);
        Route::delete('/shipments/{shipment}', [ShipmentController::class, 'destroy']);
    });

    Route::middleware('role:admin,manager,operator')->group(function () {
        Route::patch('/shipments/{shipment}/status', [ShipmentController::class, 'updateStatus']);
        Route::post('/shipments/{shipment}/checkpoints', [CheckpointController::class, 'store']);
        Route::patch('/checkpoints/{checkpoint}', [CheckpointController::class, 'update']);
    });

    Route::middleware('role:admin,finance')->group(function () {
        Route::patch('/finance/{financeRecord}/status', [FinanceController::class, 'updateStatus']);
    });

    Route::middleware('role:admin')->group(function () {
        Route::patch('/telegram/settings', [TelegramSettingController::class, 'update']);
        Route::post('/telegram/test-message', [TelegramSettingController::class, 'testMessage']);
    });
});
