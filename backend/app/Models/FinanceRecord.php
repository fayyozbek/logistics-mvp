<?php

namespace App\Models;

use Database\Factories\FinanceRecordFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceRecord extends Model
{
    /** @use HasFactory<FinanceRecordFactory> */
    use HasFactory;

    protected $fillable = [
        'shipment_id',
        'client_id',
        'total_amount',
        'paid_amount',
        'currency',
        'invoice_date',
        'due_date',
        'status',
        'items',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'invoice_date' => 'date',
            'due_date' => 'date',
            'items' => 'array',
        ];
    }

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
