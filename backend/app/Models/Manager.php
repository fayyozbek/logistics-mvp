<?php

namespace App\Models;

use Database\Factories\ManagerFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Manager extends Model
{
    /** @use HasFactory<ManagerFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'avatar',
        'email',
        'phone',
        'telegram_id',
        'region',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function shipments(): HasMany
    {
        return $this->hasMany(Shipment::class);
    }

    public function hasActiveShipments(): bool
    {
        return $this->shipments()->exists();
    }
}
