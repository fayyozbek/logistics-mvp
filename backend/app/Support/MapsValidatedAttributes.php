<?php

namespace App\Support;

trait MapsValidatedAttributes
{
    /**
     * @param  array<string, mixed>  $validated
     * @param  array<string, string>  $fieldMap
     * @return array<string, mixed>
     */
    protected function mapValidatedAttributes(array $validated, array $fieldMap): array
    {
        $attributes = [];

        foreach ($fieldMap as $input => $column) {
            if (array_key_exists($input, $validated)) {
                $attributes[$column] = $validated[$input];
            }
        }

        return $attributes;
    }
}
