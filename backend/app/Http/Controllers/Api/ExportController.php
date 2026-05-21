<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FinanceRecord;
use App\Models\Shipment;
use App\Support\CsvExporter;
use Database\Seeders\Support\FinanceAmountRules;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class ExportController extends Controller
{
    public function shipments(): Response
    {
        $headers = [
            'tracking_number',
            'client',
            'manager',
            'origin',
            'destination',
            'cargo',
            'status',
            'weight',
            'weight_unit',
            'volume',
            'volume_unit',
            'created_date',
        ];

        $rows = Shipment::query()
            ->with(['client', 'manager'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Shipment $shipment) => [
                $shipment->tracking_number,
                $shipment->client?->company ?? '',
                $shipment->manager?->name ?? '',
                $shipment->origin,
                $shipment->destination,
                $shipment->cargo ?? '',
                $shipment->status,
                $shipment->weight ?? '',
                $shipment->weight_unit ?? ($shipment->weight ? 'kg' : ''),
                $shipment->volume ?? '',
                $shipment->volume_unit ?? ($shipment->volume ? 'm3' : ''),
                $shipment->created_at?->format('Y-m-d') ?? '',
            ]);

        return $this->csvResponse('shipments.csv', $headers, $rows);
    }

    public function finance(): Response
    {
        $headers = [
            'invoice_number',
            'shipment_tracking_number',
            'client',
            'total_amount',
            'paid_amount',
            'outstanding_amount',
            'status',
        ];

        $rows = FinanceRecord::query()
            ->with(['client', 'shipment'])
            ->orderByDesc('invoice_date')
            ->get()
            ->map(function (FinanceRecord $record) {
                $total = (float) $record->total_amount;
                $paid = (float) $record->paid_amount;

                return [
                    $this->invoiceNumber($record),
                    $record->shipment?->tracking_number ?? '',
                    $record->client?->company ?? '',
                    number_format($total, 2, '.', ''),
                    number_format($paid, 2, '.', ''),
                    number_format(FinanceAmountRules::balance($total, $paid), 2, '.', ''),
                    $record->status,
                ];
            });

        return $this->csvResponse('finance.csv', $headers, $rows);
    }

    private function invoiceNumber(FinanceRecord $record): string
    {
        return 'INV-2026-'.str_pad((string) $record->id, 3, '0', STR_PAD_LEFT);
    }

    /**
     * @param  list<string>  $headers
     * @param  iterable<int, list<string|int|float|null>>  $rows
     */
    private function csvResponse(string $filename, array $headers, iterable $rows): Response
    {
        return response(CsvExporter::build($headers, $rows), HttpResponse::HTTP_OK, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }
}
