<?php

namespace App\Models;

use Database\Factories\ShipmentFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Shipment extends Model
{
    /** @use HasFactory<ShipmentFactory> */
    use HasFactory;

    public const STATUSES = [
        'planned',
        'in_transit',
        'at_checkpoint',
        'delivered',
        'delayed',
    ];

    /** Statuses counted as active for manager workload and dashboard KPIs. */
    public const ACTIVE_STATUSES = [
        'planned',
        'in_transit',
        'at_checkpoint',
        'delayed',
    ];

    /**
     * @return list<string>
     */
    public static function detailRelations(): array
    {
        return ['client', 'manager', 'checkpoints', 'financeRecord'];
    }

    /**
     * @return list<string>
     */
    public static function summaryRelations(): array
    {
        return ['client', 'manager'];
    }

    /**
     * @param  Builder<Shipment>  $query
     * @return Builder<Shipment>
     */
    public function scopeWithDetailRelations($query)
    {
        return $query->with(self::detailRelations());
    }

    /**
     * @param  Builder<Shipment>  $query
     * @return Builder<Shipment>
     */
    public function scopeWithSummaryRelations($query)
    {
        return $query->with(self::summaryRelations());
    }

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
        'weight_unit',
        'volume',
        'volume_unit',
        'estimated_delivery',
        'planned_pickup',
        'telegram_notifications',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'estimated_delivery' => 'date',
            'planned_pickup' => 'date',
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
