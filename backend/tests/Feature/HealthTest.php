<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_api_health_endpoint_returns_ok(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertExactJson(['status' => 'ok']);
    }

    public function test_api_health_allows_frontend_origin(): void
    {
        $origin = config('cors.allowed_origins')[0] ?? 'http://localhost:5173';

        $this->withHeader('Origin', $origin)
            ->getJson('/api/health')
            ->assertOk()
            ->assertHeader('Access-Control-Allow-Origin', $origin);
    }
}
