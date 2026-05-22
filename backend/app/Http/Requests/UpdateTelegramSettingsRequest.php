<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTelegramSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $merge = [];

        $aliases = [
            'display_name' => 'displayName',
            'telegram_chat_id' => 'telegramChatId',
            'telegram_username' => 'telegramUsername',
            'notifications_enabled' => 'notificationsEnabled',
            'notify_shipment_created' => 'notifyShipmentCreated',
            'notify_status_changed' => 'notifyStatusChanged',
            'notify_checkpoint_added' => 'notifyCheckpointAdded',
            'chatId' => 'telegramChatId',
            'connected' => 'enabled',
        ];

        foreach ($aliases as $from => $to) {
            if ($this->has($from) && ! $this->has($to)) {
                $merge[$to] = $this->input($from);
            }
        }

        if ($this->has('eventFlags') && is_array($this->input('eventFlags'))) {
            $flags = $this->input('eventFlags');
            if (array_key_exists('departure', $flags) && ! $this->has('notifyShipmentCreated')) {
                $merge['notifyShipmentCreated'] = (bool) $flags['departure'];
            }
            if (array_key_exists('checkpoint', $flags) && ! $this->has('notifyCheckpointAdded')) {
                $merge['notifyCheckpointAdded'] = (bool) $flags['checkpoint'];
            }
            if (! $this->has('notifyStatusChanged')) {
                $statusFlags = (bool) (
                    ($flags['delivery'] ?? false)
                    || ($flags['delay'] ?? false)
                    || ($flags['customs'] ?? false)
                );
                if ($statusFlags || array_key_exists('departure', $flags)) {
                    $merge['notifyStatusChanged'] = $statusFlags || (bool) ($flags['departure'] ?? false);
                }
            }
        }

        if ($merge !== []) {
            $this->merge($merge);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'displayName' => ['sometimes', 'nullable', 'string', 'max:255'],
            'telegramChatId' => ['sometimes', 'nullable', 'string', 'max:64'],
            'telegramUsername' => ['sometimes', 'nullable', 'string', 'max:255'],
            'enabled' => ['sometimes', 'boolean'],
            'notificationsEnabled' => ['sometimes', 'boolean'],
            'notifyShipmentCreated' => ['sometimes', 'boolean'],
            'notifyStatusChanged' => ['sometimes', 'boolean'],
            'notifyCheckpointAdded' => ['sometimes', 'boolean'],
            'botToken' => ['prohibited'],
            'bot_token' => ['prohibited'],
            'eventFlags' => ['prohibited'],
        ];
    }
}
