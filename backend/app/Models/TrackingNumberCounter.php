<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrackingNumberCounter extends Model
{
    protected $primaryKey = 'year';

    public $incrementing = false;

    protected $keyType = 'int';

    protected $fillable = [
        'year',
        'last_sequence',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'last_sequence' => 'integer',
        ];
    }
}
