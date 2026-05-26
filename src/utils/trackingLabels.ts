import type { Shipment } from '../data/mock';

export function shipmentClientCompany(shipment: Shipment): string {
  return shipment.client?.company?.trim() || 'Не указан';
}

export function shipmentManagerName(shipment: Shipment, short = false): string {
  const name = shipment.manager?.name?.trim();
  if (!name) {
    return 'Не назначен';
  }
  if (!short) {
    return name;
  }
  const parts = name.split(/\s+/).filter(Boolean);
  return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : name;
}
