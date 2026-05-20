<?php

return [

    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    /*
     * Always allow the local Vite dev server so developers do not need to set
     * FRONTEND_URL during local work.  In production FRONTEND_URL should be
     * set to the deployed Vercel URL (e.g. https://your-app.vercel.app).
     * array_filter removes the null entry when FRONTEND_URL is not set.
     */
    'allowed_origins' => array_filter([
        'http://localhost:5173',
        env('FRONTEND_URL'),
    ]),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
