<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidPositiveMeasurement implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return;
        }

        if (! is_string($value)) {
            $fail('The :attribute must be a valid measurement.');

            return;
        }

        $trimmed = trim($value);

        if ($trimmed === '') {
            return;
        }

        if (! preg_match('/^([\d\s.,]+)(.*)?$/u', $trimmed, $matches)) {
            $fail('The :attribute must start with a positive number.');

            return;
        }

        $normalized = str_replace([' ', ','], ['', '.'], $matches[1]);

        if ($normalized === '' || ! is_numeric($normalized)) {
            $fail('The :attribute must contain a valid number.');

            return;
        }

        if ((float) $normalized <= 0) {
            $fail('The :attribute must be greater than zero.');
        }
    }
}
