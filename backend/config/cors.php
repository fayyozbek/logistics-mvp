<?php

$normalizeOrigin = static function (?string $url): ?string {
    if (! is_string($url) || trim($url) === '') {
        return null;
    }

    return rtrim(trim($url), '/');
};

return [

    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    /*
     * Local Vite dev servers are always allowed.
     * Production: set FRONTEND_URL on Render (no trailing slash), e.g.
     * https://logistics-mvp-sigma.vercel.app
     */
    'allowed_origins' => array_values(array_unique(array_filter([
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        $normalizeOrigin(env('FRONTEND_URL')),
    ]))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
