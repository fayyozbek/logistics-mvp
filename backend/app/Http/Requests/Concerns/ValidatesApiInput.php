<?php

namespace App\Http\Requests\Concerns;

trait ValidatesApiInput
{
    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return array_merge($this->baseApiAttributes(), $this->extraApiAttributes());
    }

    /**
     * @return array<string, string>
     */
    protected function baseApiAttributes(): array
    {
        return [
            'clientId' => 'клиент',
            'managerId' => 'менеджер',
            'type' => 'тип перевозки',
            'status' => 'статус',
            'origin' => 'откуда',
            'destination' => 'куда',
            'cargo' => 'груз',
            'cargoName' => 'груз',
            'weight' => 'вес',
            'weightUnit' => 'единица веса',
            'volume' => 'объём',
            'volumeUnit' => 'единица объёма',
            'estimatedDelivery' => 'плановая доставка',
            'plannedPickup' => 'плановый забор',
            'plannedDelivery' => 'плановая доставка',
            'telegramNotifications' => 'Telegram-уведомления',
            'trackingNumber' => 'номер отслеживания',
            'company' => 'компания',
            'contact' => 'контактное лицо',
            'name' => 'имя',
            'email' => 'email',
            'phone' => 'телефон',
            'country' => 'страна',
            'city' => 'город',
            'address' => 'адрес',
            'telegramId' => 'Telegram',
            'region' => 'регион',
            'role' => 'роль',
            'department' => 'отдел',
            'plannedAt' => 'плановое время',
            'arrivedAt' => 'время прибытия',
            'note' => 'примечание',
            'insertAfter' => 'позиция вставки',
            'checkpoints' => 'контрольные точки',
            'checkpoints.*.city' => 'город точки',
            'checkpoints.*.address' => 'адрес точки',
            'checkpoints.*.plannedAt' => 'время точки',
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function extraApiAttributes(): array
    {
        return [];
    }
}
