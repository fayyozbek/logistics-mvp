<?php

namespace App\Support;

final class CsvExporter
{
    /**
     * @param  list<string>  $headers
     * @param  iterable<int, list<string|int|float|null>>  $rows
     */
    public static function build(array $headers, iterable $rows): string
    {
        $handle = fopen('php://temp', 'r+');
        if ($handle === false) {
            return '';
        }

        fputcsv($handle, $headers);

        foreach ($rows as $row) {
            fputcsv($handle, array_map(
                static fn ($value) => $value === null ? '' : (string) $value,
                $row,
            ));
        }

        rewind($handle);
        $csv = stream_get_contents($handle) ?: '';
        fclose($handle);

        return "\xEF\xBB\xBF".$csv;
    }
}
