<?php

namespace App\Models;

use Database\Factories\CheckpointFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Checkpoint extends Model
{
    /** @use HasFactory<CheckpointFactory> */
    use HasFactory;

    protected $fillable = [
        'shipment_id',
        'sequence',
        'city',
        'country',
        'address',
        'latitude',
        'longitude',
        'planned_at',
        'arrived_at',
        'status',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'planned_at' => 'datetime',
            'arrived_at' => 'datetime',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
        ];
    }

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }
}
