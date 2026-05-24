<?php

namespace App\Models;

use Database\Factories\ShipmentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Shipment extends Model
{
    /** @use HasFactory<ShipmentFactory> */
    use HasFactory, SoftDeletes;

    public const STATUSES = [
        'planned',
        'in_transit',
        'at_checkpoint',
        'delivered',
        'delayed',
    ];

    protected $fillable = [
        'tracking_number',
        'transport_type',
        'status',
        'client_id',
        'manager_id',
        'route_id',
        'origin',
        'destination',
        'cargo',
        'weight',
        'volume',
        'estimated_delivery',
        'telegram_notifications',
    ];

    protected function casts(): array
    {
        return [
            'estimated_delivery' => 'date',
            'telegram_notifications' => 'boolean',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(Manager::class);
    }

    public function route(): BelongsTo
    {
        return $this->belongsTo(Route::class);
    }

    public function checkpoints(): HasMany
    {
        return $this->hasMany(Checkpoint::class)->orderBy('sequence');
    }

    public function financeRecord(): HasOne
    {
        return $this->hasOne(FinanceRecord::class);
    }
}
