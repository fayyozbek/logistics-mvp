<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesApiInput;
use App\Models\FinanceRecord;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFinanceStatusRequest extends FormRequest
{
    use ValidatesApiInput;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', 'string', Rule::in(FinanceRecord::STATUSES)],
        ];
    }
}
