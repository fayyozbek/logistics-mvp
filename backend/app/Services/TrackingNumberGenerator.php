<?php

namespace App\Services;

use App\Models\Shipment;
use App\Models\TrackingNumberCounter;
use Illuminate\Support\Facades\DB;

class TrackingNumberGenerator
{
    public function next(?int $year = null): string
    {
        $year ??= (int) now()->format('Y');

        return DB::transaction(function () use ($year) {
            $counter = TrackingNumberCounter::query()
                ->lockForUpdate()
                ->where('year', $year)
                ->first();

            if ($counter === null) {
                $counter = TrackingNumberCounter::query()->create([
                    'year' => $year,
                    'last_sequence' => $this->maxSequenceFromShipments($year),
                ]);
            }

            $counter->last_sequence++;
            $counter->save();

            return $this->format($year, $counter->last_sequence);
        });
    }

    public function syncFromShipments(?int $year = null): void
    {
        $years = $year !== null
            ? [$year]
            : $this->yearsPresentInShipments();

        if ($years === []) {
            $years = [(int) now()->format('Y')];
        }

        foreach ($years as $counterYear) {
            TrackingNumberCounter::query()->updateOrCreate(
                ['year' => $counterYear],
                ['last_sequence' => $this->maxSequenceFromShipments($counterYear)],
            );
        }
    }

    public function format(int $year, int $sequence): string
    {
        return sprintf('LGX-%d-%04d', $year, $sequence);
    }

    private function maxSequenceFromShipments(int $year): int
    {
        $prefix = "LGX-{$year}-";

        $latest = Shipment::query()
            ->where('tracking_number', 'like', $prefix.'%')
            ->orderByDesc('tracking_number')
            ->value('tracking_number');

        if (! is_string($latest) || ! preg_match('/-(\d+)$/', $latest, $matches)) {
            return 0;
        }

        return (int) $matches[1];
    }

    /**
     * @return list<int>
     */
    private function yearsPresentInShipments(): array
    {
        $years = [];

        Shipment::query()
            ->select('tracking_number')
            ->lazy()
            ->each(function (Shipment $shipment) use (&$years): void {
                if (preg_match('/^LGX-(\d{4})-\d+$/', $shipment->tracking_number, $matches)) {
                    $years[(int) $matches[1]] = true;
                }
            });

        return array_keys($years);
    }
}
