export type TransportType = 'auto' | 'air' | 'sea' | 'intermodal';
export type ShipmentStatus = 'planned' | 'in_transit' | 'at_checkpoint' | 'delivered' | 'delayed';

export interface CheckPoint {
  id: string;
  city: string;
  country: string;
  address: string;
  arrivedAt?: string;
  plannedAt: string;
  status: 'passed' | 'current' | 'upcoming';
  note?: string;
}

export interface Manager {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  telegramId: string;
  region: string;
  role?: string;
  department?: string;
  activeShipments: number;
}

export interface Client {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  country: string;
  city?: string;
  address?: string;
}

export interface FinanceRecord {
  id: string;
  shipmentId: string;
  clientId: string;
  totalAmount: number;
  paidAmount: number;
  currency: string;
  invoiceDate: string;
  dueDate: string;
  status: 'paid' | 'partial' | 'unpaid' | 'overdue';
  items: { label: string; amount: number }[];
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  type: TransportType;
  status: ShipmentStatus;
  clientId: string;
  managerId: string;
  origin: string;
  destination: string;
  cargo: string;
  weight: string;
  weightUnit?: string;
  volume: string;
  volumeUnit?: string;
  createdAt: string;
  plannedPickup?: string;
  estimatedDelivery: string;
  notes?: string;
  checkpoints: CheckPoint[];
  financeId: string;
  telegramNotifications: boolean;
}

export const managers: Manager[] = [
  { id: 'm1', name: 'Алексей Морозов', avatar: 'AM', email: 'a.morozov@logistix.kz', phone: '+7 701 234 5678', telegramId: '@morozov_lgx', region: 'Центральная Азия', activeShipments: 12 },
  { id: 'm2', name: 'Дина Сейткали', avatar: 'ДС', email: 'd.seitkali@logistix.kz', phone: '+7 702 345 6789', telegramId: '@dina_lgx', region: 'Европа', activeShipments: 8 },
  { id: 'm3', name: 'Рустам Нуров', avatar: 'РН', email: 'r.nurov@logistix.kz', phone: '+7 700 456 7890', telegramId: '@rustam_lgx', region: 'Восток', activeShipments: 15 },
  { id: 'm4', name: 'Анна Белова', avatar: 'АБ', email: 'a.belova@logistix.kz', phone: '+7 707 567 8901', telegramId: '@anna_lgx', region: 'СНГ', activeShipments: 6 },
];

export const clients: Client[] = [
  { id: 'c1', company: 'KazExport LLP', contact: 'Серик Ахметов', email: 's.akhmetov@kazexport.kz', phone: '+7 727 300 1111', country: 'Казахстан' },
  { id: 'c2', company: 'Global Trade GmbH', contact: 'Hans Mueller', email: 'h.mueller@globaltrade.de', phone: '+49 30 2000 5000', country: 'Германия' },
  { id: 'c3', company: 'Silk Road Cargo', contact: 'Лю Вэй', email: 'liu.wei@silkroad.cn', phone: '+86 21 6000 8888', country: 'Китай' },
  { id: 'c4', company: 'AzureTrans LLC', contact: 'Иван Петров', email: 'i.petrov@azuretrans.ru', phone: '+7 495 100 2020', country: 'Россия' },
  { id: 'c5', company: 'EuroCargo SA', contact: 'Marie Dupont', email: 'm.dupont@eurocargo.fr', phone: '+33 1 4000 6000', country: 'Франция' },
];

export const financeRecords: FinanceRecord[] = [
  {
    id: 'f1', shipmentId: 's1', clientId: 'c1',
    totalAmount: 4800, paidAmount: 4800, currency: 'USD',
    invoiceDate: '2026-04-10', dueDate: '2026-05-10', status: 'paid',
    items: [{ label: 'Фрахт', amount: 3500 }, { label: 'Таможня', amount: 900 }, { label: 'Страховка', amount: 400 }],
  },
  {
    id: 'f2', shipmentId: 's2', clientId: 'c2',
    totalAmount: 12600, paidAmount: 6000, currency: 'USD',
    invoiceDate: '2026-04-18', dueDate: '2026-05-18', status: 'partial',
    items: [{ label: 'Авиафрахт', amount: 9000 }, { label: 'Таможня', amount: 2100 }, { label: 'Доп. сборы', amount: 1500 }],
  },
  {
    id: 'f3', shipmentId: 's3', clientId: 'c3',
    totalAmount: 22000, paidAmount: 0, currency: 'USD',
    invoiceDate: '2026-04-25', dueDate: '2026-05-25', status: 'unpaid',
    items: [{ label: 'Морской фрахт', amount: 15000 }, { label: 'Таможня', amount: 4500 }, { label: 'Хранение', amount: 2500 }],
  },
  {
    id: 'f4', shipmentId: 's4', clientId: 'c4',
    totalAmount: 7200, paidAmount: 0, currency: 'USD',
    invoiceDate: '2026-04-01', dueDate: '2026-05-01', status: 'overdue',
    items: [{ label: 'Фрахт', amount: 5500 }, { label: 'Таможня', amount: 1200 }, { label: 'Страховка', amount: 500 }],
  },
  {
    id: 'f5', shipmentId: 's5', clientId: 'c5',
    totalAmount: 9400, paidAmount: 9400, currency: 'USD',
    invoiceDate: '2026-05-01', dueDate: '2026-06-01', status: 'paid',
    items: [{ label: 'Интермодал', amount: 7000 }, { label: 'Таможня', amount: 1800 }, { label: 'Страховка', amount: 600 }],
  },
  {
    id: 'f6', shipmentId: 's6', clientId: 'c1',
    totalAmount: 5100, paidAmount: 2000, currency: 'USD',
    invoiceDate: '2026-05-10', dueDate: '2026-06-10', status: 'partial',
    items: [{ label: 'Фрахт', amount: 3800 }, { label: 'Таможня', amount: 900 }, { label: 'Страховка', amount: 400 }],
  },
];

export const shipments: Shipment[] = [
  {
    id: 's1', trackingNumber: 'LGX-2026-0421', type: 'auto', status: 'delivered',
    clientId: 'c1', managerId: 'm1', origin: 'Алматы', destination: 'Ташкент',
    cargo: 'Электроника', weight: '2 400 кг', volume: '18 м³',
    createdAt: '2026-04-10', estimatedDelivery: '2026-04-15',
    financeId: 'f1', telegramNotifications: true,
    checkpoints: [
      { id: 'cp1', city: 'Алматы', country: 'KZ', address: 'Склад Алматы, ул. Промышленная 12', plannedAt: '2026-04-10 08:00', arrivedAt: '2026-04-10 08:30', status: 'passed' },
      { id: 'cp2', city: 'Шымкент', country: 'KZ', address: 'Терминал М-39', plannedAt: '2026-04-11 14:00', arrivedAt: '2026-04-11 15:20', status: 'passed', note: 'Задержка на 1ч 20м' },
      { id: 'cp3', city: 'Ташкент', country: 'UZ', address: 'Таможня Гишт-Купрук', plannedAt: '2026-04-13 10:00', arrivedAt: '2026-04-13 11:00', status: 'passed' },
      { id: 'cp4', city: 'Ташкент', country: 'UZ', address: 'Склад получателя, ул. Навои 44', plannedAt: '2026-04-15 09:00', arrivedAt: '2026-04-15 09:45', status: 'passed' },
    ],
  },
  {
    id: 's2', trackingNumber: 'LGX-2026-0498', type: 'air', status: 'in_transit',
    clientId: 'c2', managerId: 'm2', origin: 'Алматы', destination: 'Франкфурт',
    cargo: 'Медицинское оборудование', weight: '850 кг', volume: '6 м³',
    createdAt: '2026-04-18', estimatedDelivery: '2026-04-20',
    financeId: 'f2', telegramNotifications: true,
    checkpoints: [
      { id: 'cp1', city: 'Алматы', country: 'KZ', address: 'Аэропорт ALA — карго-терминал', plannedAt: '2026-04-18 22:00', arrivedAt: '2026-04-18 22:00', status: 'passed' },
      { id: 'cp2', city: 'Стамбул', country: 'TR', address: 'Аэропорт IST — транзит', plannedAt: '2026-04-19 06:30', arrivedAt: '2026-04-19 06:45', status: 'passed' },
      { id: 'cp3', city: 'Франкфурт', country: 'DE', address: 'Аэропорт FRA — таможня', plannedAt: '2026-04-19 10:00', status: 'current' },
      { id: 'cp4', city: 'Франкфурт', country: 'DE', address: 'Склад клиента, Hanauer Landstr. 126', plannedAt: '2026-04-20 14:00', status: 'upcoming' },
    ],
  },
  {
    id: 's3', trackingNumber: 'LGX-2026-0512', type: 'sea', status: 'in_transit',
    clientId: 'c3', managerId: 'm3', origin: 'Шанхай', destination: 'Актау',
    cargo: 'Промышленные детали', weight: '18 000 кг', volume: '42 м³',
    createdAt: '2026-04-25', estimatedDelivery: '2026-05-28',
    financeId: 'f3', telegramNotifications: false,
    checkpoints: [
      { id: 'cp1', city: 'Шанхай', country: 'CN', address: 'Порт Yangshan, тер. 4', plannedAt: '2026-04-25 10:00', arrivedAt: '2026-04-25 10:00', status: 'passed' },
      { id: 'cp2', city: 'Каспийское море', country: '–', address: 'Транзит', plannedAt: '2026-05-15 00:00', status: 'current' },
      { id: 'cp3', city: 'Актау', country: 'KZ', address: 'Порт Актау — причал №3', plannedAt: '2026-05-28 08:00', status: 'upcoming' },
    ],
  },
  {
    id: 's4', trackingNumber: 'LGX-2026-0387', type: 'auto', status: 'delayed',
    clientId: 'c4', managerId: 'm1', origin: 'Москва', destination: 'Алматы',
    cargo: 'Стройматериалы', weight: '12 000 кг', volume: '56 м³',
    createdAt: '2026-04-01', estimatedDelivery: '2026-04-10',
    financeId: 'f4', telegramNotifications: true,
    checkpoints: [
      { id: 'cp1', city: 'Москва', country: 'RU', address: 'Склад Домодедово', plannedAt: '2026-04-01 07:00', arrivedAt: '2026-04-01 07:30', status: 'passed' },
      { id: 'cp2', city: 'Оренбург', country: 'RU', address: 'КПП Сагарчин', plannedAt: '2026-04-03 18:00', arrivedAt: '2026-04-04 09:00', status: 'passed', note: 'Задержка на таможне 15ч' },
      { id: 'cp3', city: 'Актобе', country: 'KZ', address: 'Терминал Актобе', plannedAt: '2026-04-05 12:00', status: 'current', note: 'Ожидание документов' },
      { id: 'cp4', city: 'Алматы', country: 'KZ', address: 'Склад клиента', plannedAt: '2026-04-10 09:00', status: 'upcoming' },
    ],
  },
  {
    id: 's5', trackingNumber: 'LGX-2026-0533', type: 'intermodal', status: 'delivered',
    clientId: 'c5', managerId: 'm4', origin: 'Париж', destination: 'Алматы',
    cargo: 'Одежда и текстиль', weight: '5 200 кг', volume: '28 м³',
    createdAt: '2026-05-01', estimatedDelivery: '2026-05-12',
    financeId: 'f5', telegramNotifications: true,
    checkpoints: [
      { id: 'cp1', city: 'Париж', country: 'FR', address: 'Склад отправителя, Roissy CDG', plannedAt: '2026-05-01 08:00', arrivedAt: '2026-05-01 08:00', status: 'passed' },
      { id: 'cp2', city: 'Варшава', country: 'PL', address: 'Ж/Д терминал Малашевиче', plannedAt: '2026-05-03 12:00', arrivedAt: '2026-05-03 13:00', status: 'passed' },
      { id: 'cp3', city: 'Алматы', country: 'KZ', address: 'Станция Алматы-1', plannedAt: '2026-05-12 07:00', arrivedAt: '2026-05-12 07:30', status: 'passed' },
    ],
  },
  {
    id: 's6', trackingNumber: 'LGX-2026-0561', type: 'air', status: 'planned',
    clientId: 'c1', managerId: 'm2', origin: 'Алматы', destination: 'Дубай',
    cargo: 'Ювелирные изделия', weight: '120 кг', volume: '0.8 м³',
    createdAt: '2026-05-10', estimatedDelivery: '2026-05-14',
    financeId: 'f6', telegramNotifications: true,
    checkpoints: [
      { id: 'cp1', city: 'Алматы', country: 'KZ', address: 'Аэропорт ALA — карго-терминал', plannedAt: '2026-05-13 23:00', status: 'upcoming' },
      { id: 'cp2', city: 'Дубай', country: 'AE', address: 'Аэропорт DXB — таможня', plannedAt: '2026-05-14 05:00', status: 'upcoming' },
      { id: 'cp3', city: 'Дубай', country: 'AE', address: 'Склад клиента, Jebel Ali', plannedAt: '2026-05-14 12:00', status: 'upcoming' },
    ],
  },
];

export const monthlyStats = [
  { month: 'Янв', shipments: 38, revenue: 142000 },
  { month: 'Фев', shipments: 42, revenue: 168000 },
  { month: 'Мар', shipments: 51, revenue: 195000 },
  { month: 'Апр', shipments: 46, revenue: 181000 },
  { month: 'Май', shipments: 58, revenue: 224000 },
];

export const transportShare = [
  { name: 'Авто', value: 38, color: '#3B82F6' },
  { name: 'Авиа', value: 28, color: '#8B5CF6' },
  { name: 'Морской', value: 20, color: '#06B6D4' },
  { name: 'Интермодал', value: 14, color: '#10B981' },
];
