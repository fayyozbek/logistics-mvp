import { clients, financeRecords, managers, shipments } from '../data/mock';
import { buildCsv } from './csv';

function invoiceNumber(id: string): string {
  const numeric = id.replace(/\D/g, '') || id;
  return `INV-2026-${numeric.padStart(3, '0')}`;
}

export function buildShipmentsExportCsv(): string {
  const headers = [
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

  const rows = shipments.map((shipment) => {
    const client = clients.find((c) => c.id === shipment.clientId);
    const manager = managers.find((m) => m.id === shipment.managerId);

    return [
      shipment.trackingNumber,
      client?.company ?? '',
      manager?.name ?? '',
      shipment.origin,
      shipment.destination,
      shipment.cargo,
      shipment.status,
      shipment.weight,
      shipment.weightUnit ?? (shipment.weight ? 'kg' : ''),
      shipment.volume,
      shipment.volumeUnit ?? (shipment.volume ? 'm3' : ''),
      shipment.createdAt,
    ];
  });

  return buildCsv(headers, rows);
}

export function buildFinanceExportCsv(): string {
  const headers = [
    'invoice_number',
    'shipment_tracking_number',
    'client',
    'total_amount',
    'paid_amount',
    'outstanding_amount',
    'status',
  ];

  const rows = financeRecords.map((record) => {
    const client = clients.find((c) => c.id === record.clientId);
    const shipment = shipments.find((s) => s.id === record.shipmentId);
    const outstanding = Math.max(0, record.totalAmount - record.paidAmount);

    return [
      invoiceNumber(record.id),
      shipment?.trackingNumber ?? '',
      client?.company ?? '',
      record.totalAmount.toFixed(2),
      record.paidAmount.toFixed(2),
      outstanding.toFixed(2),
      record.status,
    ];
  });

  return buildCsv(headers, rows);
}
