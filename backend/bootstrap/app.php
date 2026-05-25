<?php

use App\Http\Middleware\SetApiLocale;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            SetApiLocale::class,
        ]);

        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureUserHasRole::class,
        ]);

        $middleware->redirectGuestsTo(function (Request $request): ?string {
            return $request->is('api/*') ? null : '/login';
        });
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (ValidationException $exception, Request $request): ?Response {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'message' => 'Проверьте введённые данные.',
                'errors' => $exception->errors(),
            ], 422);
        });

        $exceptions->render(function (NotFoundHttpException|ModelNotFoundException $exception, Request $request): ?Response {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'message' => 'Запись не найдена.',
            ], 404);
        });

        $exceptions->render(function (\Throwable $exception, Request $request): ?Response {
            if (! $request->is('api/*')) {
                return null;
            }

            if ($exception instanceof HttpExceptionInterface && $exception->getStatusCode() >= 500) {
                return response()->json([
                    'message' => 'Внутренняя ошибка сервера.',
                ], 500);
            }

            return null;
        });
    })->create();
