<?php

namespace Database\Seeders\Support;

final class DemoData
{
    /** @return array<string, array<string, string>> */
    public static function clients(): array
    {
        return [
            'c1' => [
                'company' => 'KazExport LLP',
                'contact' => 'Серик Ахметов',
                'email' => 's.akhmetov@kazexport.kz',
                'phone' => '+7 727 300 1111',
                'country' => 'Казахстан',
            ],
            'c2' => [
                'company' => 'Global Trade GmbH',
                'contact' => 'Hans Mueller',
                'email' => 'h.mueller@globaltrade.de',
                'phone' => '+49 30 2000 5000',
                'country' => 'Германия',
            ],
            'c3' => [
                'company' => 'Silk Road Cargo',
                'contact' => 'Лю Вэй',
                'email' => 'liu.wei@silkroad.cn',
                'phone' => '+86 21 6000 8888',
                'country' => 'Китай',
            ],
            'c4' => [
                'company' => 'AzureTrans LLC',
                'contact' => 'Иван Петров',
                'email' => 'i.petrov@azuretrans.ru',
                'phone' => '+7 495 100 2020',
                'country' => 'Россия',
            ],
            'c5' => [
                'company' => 'EuroCargo SA',
                'contact' => 'Marie Dupont',
                'email' => 'm.dupont@eurocargo.fr',
                'phone' => '+33 1 4000 6000',
                'country' => 'Франция',
            ],
        ];
    }

    /** @return array<string, array<string, string>> */
    public static function managers(): array
    {
        return [
            'm1' => [
                'name' => 'Алексей Морозов',
                'avatar' => 'AM',
                'email' => 'a.morozov@logistix.kz',
                'phone' => '+7 701 234 5678',
                'telegram_id' => '@morozov_lgx',
                'region' => 'Центральная Азия',
            ],
            'm2' => [
                'name' => 'Дина Сейткали',
                'avatar' => 'ДС',
                'email' => 'd.seitkali@logistix.kz',
                'phone' => '+7 702 345 6789',
                'telegram_id' => '@dina_lgx',
                'region' => 'Европа',
            ],
            'm3' => [
                'name' => 'Рустам Нуров',
                'avatar' => 'РН',
                'email' => 'r.nurov@logistix.kz',
                'phone' => '+7 700 456 7890',
                'telegram_id' => '@rustam_lgx',
                'region' => 'Восток',
            ],
            'm4' => [
                'name' => 'Анна Белова',
                'avatar' => 'АБ',
                'email' => 'a.belova@logistix.kz',
                'phone' => '+7 707 567 8901',
                'telegram_id' => '@anna_lgx',
                'region' => 'СНГ',
            ],
        ];
    }

    /** @return list<array<string, mixed>> */
    public static function shipments(): array
    {
        return [
            [
                'key' => 's1',
                'tracking_number' => 'LGX-2026-0421',
                'transport_type' => 'auto',
                'status' => 'delivered',
                'client_key' => 'c1',
                'manager_key' => 'm1',
                'origin' => 'Алматы',
                'destination' => 'Ташкент',
                'cargo' => 'Электроника',
                'weight' => '2 400 кг',
                'volume' => '18 м³',
                'created_at' => '2026-04-10',
                'estimated_delivery' => '2026-04-15',
                'finance_key' => 'f1',
                'telegram_notifications' => true,
                'checkpoints' => [
                    ['city' => 'Алматы', 'country' => 'KZ', 'address' => 'Склад Алматы, ул. Промышленная 12', 'planned_at' => '2026-04-10 08:00', 'arrived_at' => '2026-04-10 08:30', 'status' => 'passed'],
                    ['city' => 'Шымкент', 'country' => 'KZ', 'address' => 'Терминал М-39', 'planned_at' => '2026-04-11 14:00', 'arrived_at' => '2026-04-11 15:20', 'status' => 'passed', 'note' => 'Задержка на 1ч 20м'],
                    ['city' => 'Ташкент', 'country' => 'UZ', 'address' => 'Таможня Гишт-Купрук', 'planned_at' => '2026-04-13 10:00', 'arrived_at' => '2026-04-13 11:00', 'status' => 'passed'],
                    ['city' => 'Ташкент', 'country' => 'UZ', 'address' => 'Склад получателя, ул. Навои 44', 'planned_at' => '2026-04-15 09:00', 'arrived_at' => '2026-04-15 09:45', 'status' => 'passed'],
                ],
            ],
            [
                'key' => 's2',
                'tracking_number' => 'LGX-2026-0498',
                'transport_type' => 'air',
                'status' => 'in_transit',
                'client_key' => 'c2',
                'manager_key' => 'm2',
                'origin' => 'Алматы',
                'destination' => 'Франкфурт',
                'cargo' => 'Медицинское оборудование',
                'weight' => '850 кг',
                'volume' => '6 м³',
                'created_at' => '2026-04-18',
                'estimated_delivery' => '2026-04-20',
                'finance_key' => 'f2',
                'telegram_notifications' => true,
                'checkpoints' => [
                    ['city' => 'Алматы', 'country' => 'KZ', 'address' => 'Аэропорт ALA — карго-терминал', 'planned_at' => '2026-04-18 22:00', 'arrived_at' => '2026-04-18 22:00', 'status' => 'passed'],
                    ['city' => 'Стамбул', 'country' => 'TR', 'address' => 'Аэропорт IST — транзит', 'planned_at' => '2026-04-19 06:30', 'arrived_at' => '2026-04-19 06:45', 'status' => 'passed'],
                    ['city' => 'Франкфурт', 'country' => 'DE', 'address' => 'Аэропорт FRA — таможня', 'planned_at' => '2026-04-19 10:00', 'arrived_at' => null, 'status' => 'current'],
                    ['city' => 'Франкфурт', 'country' => 'DE', 'address' => 'Склад клиента, Hanauer Landstr. 126', 'planned_at' => '2026-04-20 14:00', 'arrived_at' => null, 'status' => 'upcoming'],
                ],
            ],
            [
                'key' => 's3',
                'tracking_number' => 'LGX-2026-0512',
                'transport_type' => 'sea',
                'status' => 'in_transit',
                'client_key' => 'c3',
                'manager_key' => 'm3',
                'origin' => 'Шанхай',
                'destination' => 'Актау',
                'cargo' => 'Промышленные детали',
                'weight' => '18 000 кг',
                'volume' => '42 м³',
                'created_at' => '2026-04-25',
                'estimated_delivery' => '2026-05-28',
                'finance_key' => 'f3',
                'telegram_notifications' => false,
                'checkpoints' => [
                    ['city' => 'Шанхай', 'country' => 'CN', 'address' => 'Порт Yangshan, тер. 4', 'planned_at' => '2026-04-25 10:00', 'arrived_at' => '2026-04-25 10:00', 'status' => 'passed'],
                    ['city' => 'Каспийское море', 'country' => '–', 'address' => 'Транзит', 'planned_at' => '2026-05-15 00:00', 'arrived_at' => null, 'status' => 'current'],
                    ['city' => 'Актау', 'country' => 'KZ', 'address' => 'Порт Актау — причал №3', 'planned_at' => '2026-05-28 08:00', 'arrived_at' => null, 'status' => 'upcoming'],
                ],
            ],
            [
                'key' => 's4',
                'tracking_number' => 'LGX-2026-0387',
                'transport_type' => 'auto',
                'status' => 'delayed',
                'client_key' => 'c4',
                'manager_key' => 'm1',
                'origin' => 'Москва',
                'destination' => 'Алматы',
                'cargo' => 'Стройматериалы',
                'weight' => '12 000 кг',
                'volume' => '56 м³',
                'created_at' => '2026-04-01',
                'estimated_delivery' => '2026-04-10',
                'finance_key' => 'f4',
                'telegram_notifications' => true,
                'checkpoints' => [
                    ['city' => 'Москва', 'country' => 'RU', 'address' => 'Склад Домодедово', 'planned_at' => '2026-04-01 07:00', 'arrived_at' => '2026-04-01 07:30', 'status' => 'passed'],
                    ['city' => 'Оренбург', 'country' => 'RU', 'address' => 'КПП Сагарчин', 'planned_at' => '2026-04-03 18:00', 'arrived_at' => '2026-04-04 09:00', 'status' => 'passed', 'note' => 'Задержка на таможне 15ч'],
                    ['city' => 'Актобе', 'country' => 'KZ', 'address' => 'Терминал Актобе', 'planned_at' => '2026-04-05 12:00', 'arrived_at' => null, 'status' => 'current', 'note' => 'Ожидание документов'],
                    ['city' => 'Алматы', 'country' => 'KZ', 'address' => 'Склад клиента', 'planned_at' => '2026-04-10 09:00', 'arrived_at' => null, 'status' => 'upcoming'],
                ],
            ],
            [
                'key' => 's5',
                'tracking_number' => 'LGX-2026-0533',
                'transport_type' => 'intermodal',
                'status' => 'delivered',
                'client_key' => 'c5',
                'manager_key' => 'm4',
                'origin' => 'Париж',
                'destination' => 'Алматы',
                'cargo' => 'Одежда и текстиль',
                'weight' => '5 200 кг',
                'volume' => '28 м³',
                'created_at' => '2026-05-01',
                'estimated_delivery' => '2026-05-12',
                'finance_key' => 'f5',
                'telegram_notifications' => true,
                'checkpoints' => [
                    ['city' => 'Париж', 'country' => 'FR', 'address' => 'Склад отправителя, Roissy CDG', 'planned_at' => '2026-05-01 08:00', 'arrived_at' => '2026-05-01 08:00', 'status' => 'passed'],
                    ['city' => 'Варшава', 'country' => 'PL', 'address' => 'Ж/Д терминал Малашевиче', 'planned_at' => '2026-05-03 12:00', 'arrived_at' => '2026-05-03 13:00', 'status' => 'passed'],
                    ['city' => 'Алматы', 'country' => 'KZ', 'address' => 'Станция Алматы-1', 'planned_at' => '2026-05-12 07:00', 'arrived_at' => '2026-05-12 07:30', 'status' => 'passed'],
                ],
            ],
            [
                'key' => 's6',
                'tracking_number' => 'LGX-2026-0561',
                'transport_type' => 'air',
                'status' => 'planned',
                'client_key' => 'c1',
                'manager_key' => 'm2',
                'origin' => 'Алматы',
                'destination' => 'Дубай',
                'cargo' => 'Ювелирные изделия',
                'weight' => '120 кг',
                'volume' => '0.8 м³',
                'created_at' => '2026-05-10',
                'estimated_delivery' => '2026-05-14',
                'finance_key' => 'f6',
                'telegram_notifications' => true,
                'checkpoints' => [
                    ['city' => 'Алматы', 'country' => 'KZ', 'address' => 'Аэропорт ALA — карго-терминал', 'planned_at' => '2026-05-13 23:00', 'arrived_at' => null, 'status' => 'upcoming'],
                    ['city' => 'Дубай', 'country' => 'AE', 'address' => 'Аэропорт DXB — таможня', 'planned_at' => '2026-05-14 05:00', 'arrived_at' => null, 'status' => 'upcoming'],
                    ['city' => 'Дубай', 'country' => 'AE', 'address' => 'Склад клиента, Jebel Ali', 'planned_at' => '2026-05-14 12:00', 'arrived_at' => null, 'status' => 'upcoming'],
                ],
            ],
        ];
    }

    /** @return array<string, array<string, mixed>> */
    public static function financeRecords(): array
    {
        return [
            'f1' => [
                'shipment_key' => 's1',
                'client_key' => 'c1',
                'total_amount' => 4800,
                'paid_amount' => 4800,
                'currency' => 'USD',
                'invoice_date' => '2026-04-10',
                'due_date' => '2026-05-10',
                'status' => 'paid',
                'items' => [
                    ['label' => 'Фрахт', 'amount' => 3500],
                    ['label' => 'Таможня', 'amount' => 900],
                    ['label' => 'Страховка', 'amount' => 400],
                ],
            ],
            'f2' => [
                'shipment_key' => 's2',
                'client_key' => 'c2',
                'total_amount' => 12600,
                'paid_amount' => 6000,
                'currency' => 'USD',
                'invoice_date' => '2026-04-18',
                'due_date' => '2026-05-18',
                'status' => 'partial',
                'items' => [
                    ['label' => 'Авиафрахт', 'amount' => 9000],
                    ['label' => 'Таможня', 'amount' => 2100],
                    ['label' => 'Доп. сборы', 'amount' => 1500],
                ],
            ],
            'f3' => [
                'shipment_key' => 's3',
                'client_key' => 'c3',
                'total_amount' => 22000,
                'paid_amount' => 0,
                'currency' => 'USD',
                'invoice_date' => '2026-04-25',
                'due_date' => '2026-05-25',
                'status' => 'unpaid',
                'items' => [
                    ['label' => 'Морской фрахт', 'amount' => 15000],
                    ['label' => 'Таможня', 'amount' => 4500],
                    ['label' => 'Хранение', 'amount' => 2500],
                ],
            ],
            'f4' => [
                'shipment_key' => 's4',
                'client_key' => 'c4',
                'total_amount' => 7200,
                'paid_amount' => 0,
                'currency' => 'USD',
                'invoice_date' => '2026-04-01',
                'due_date' => '2026-05-01',
                'status' => 'overdue',
                'items' => [
                    ['label' => 'Фрахт', 'amount' => 5500],
                    ['label' => 'Таможня', 'amount' => 1200],
                    ['label' => 'Страховка', 'amount' => 500],
                ],
            ],
            'f5' => [
                'shipment_key' => 's5',
                'client_key' => 'c5',
                'total_amount' => 9400,
                'paid_amount' => 9400,
                'currency' => 'USD',
                'invoice_date' => '2026-05-01',
                'due_date' => '2026-06-01',
                'status' => 'paid',
                'items' => [
                    ['label' => 'Интермодал', 'amount' => 7000],
                    ['label' => 'Таможня', 'amount' => 1800],
                    ['label' => 'Страховка', 'amount' => 600],
                ],
            ],
            'f6' => [
                'shipment_key' => 's6',
                'client_key' => 'c1',
                'total_amount' => 5100,
                'paid_amount' => 2000,
                'currency' => 'USD',
                'invoice_date' => '2026-05-10',
                'due_date' => '2026-06-10',
                'status' => 'partial',
                'items' => [
                    ['label' => 'Фрахт', 'amount' => 3800],
                    ['label' => 'Таможня', 'amount' => 900],
                    ['label' => 'Страховка', 'amount' => 400],
                ],
            ],
        ];
    }

    /** @return array<string, mixed> */
    public static function telegramSettings(): array
    {
        return [
            'bot_token' => null,
            'chat_id' => '-1001234567890',
            'connected' => true,
            'event_flags' => [
                'departure' => true,
                'checkpoint' => true,
                'customs' => true,
                'delay' => true,
                'delivery' => true,
                'payment' => false,
                'docs' => false,
            ],
        ];
    }
}
