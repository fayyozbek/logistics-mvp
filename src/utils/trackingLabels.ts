import type { Client, FinanceRecord, Manager, Shipment } from '../data/mock';

export function clientCompany(client: Client | null | undefined): string {
  return client?.company?.trim() || 'Не указан';
}

export function clientContact(client: Client | null | undefined): string | undefined {
  const contact = client?.contact?.trim();
  return contact || undefined;
}

export function shipmentClientCompany(shipment: Shipment): string {
  return clientCompany(shipment.client);
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

export function financeRecordClientCompany(record: FinanceRecord): string {
  return clientCompany(record.client);
}

export function financeRecordClientContact(record: FinanceRecord): string | undefined {
  return clientContact(record.client);
}

export function managerSelectOptions(
  managers: Manager[],
  selected?: Manager | null,
): Manager[] {
  if (managers.length > 0) {
    return managers;
  }
  if (selected?.id && selected.name) {
    return [selected];
  }
  return [];
}

export function clientSelectOptions(
  clients: Client[],
  selected?: Client | null,
): Client[] {
  if (clients.length > 0) {
    return clients;
  }
  if (selected?.id && selected.company) {
    return [selected];
  }
  return [];
}
