<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class OpenApiController extends Controller
{
    public function spec(): JsonResponse
    {
        return response()->json([
            'openapi' => '3.0.3',
            'info' => [
                'title' => 'Library Management System API',
                'version' => '3.0.0',
                'description' => 'API documentation for the Library Management System digital library platform.',
            ],
            'servers' => [
                ['url' => url('/api')],
            ],
            'components' => [
                'securitySchemes' => [
                    'sanctum' => [
                        'type' => 'http',
                        'scheme' => 'bearer',
                    ],
                ],
            ],
            'paths' => [
                '/api/login' => [
                    'post' => [
                        'summary' => 'Authenticate a student or admin.',
                        'tags' => ['Auth'],
                    ],
                ],
                '/api/books' => [
                    'get' => [
                        'summary' => 'List and search books.',
                        'tags' => ['Books'],
                    ],
                    'post' => [
                        'summary' => 'Create a book or digital resource.',
                        'tags' => ['Books'],
                        'security' => [['sanctum' => []]],
                    ],
                ],
                '/api/books/autocomplete' => [
                    'get' => [
                        'summary' => 'Return top book suggestions for search autocomplete.',
                        'tags' => ['Books'],
                    ],
                ],
                '/api/digital-documents' => [
                    'get' => [
                        'summary' => 'List digital library documents with signed access links.',
                        'tags' => ['Digital Library'],
                    ],
                ],
                '/api/reading-progress' => [
                    'get' => [
                        'summary' => 'List current student reading progress records.',
                        'tags' => ['Digital Library'],
                        'security' => [['sanctum' => []]],
                    ],
                ],
                '/api/reading-progress/{book}' => [
                    'get' => [
                        'summary' => 'Get current student reading progress for a digital book.',
                        'tags' => ['Digital Library'],
                        'security' => [['sanctum' => []]],
                    ],
                    'put' => [
                        'summary' => 'Save current student reading progress for a digital book.',
                        'tags' => ['Digital Library'],
                        'security' => [['sanctum' => []]],
                    ],
                ],
                '/api/ai/chat' => [
                    'post' => [
                        'summary' => 'Ask the library AI assistant for book help.',
                        'tags' => ['AI'],
                        'security' => [['sanctum' => []]],
                    ],
                ],
                '/api/ai/recommendations' => [
                    'get' => [
                        'summary' => 'Return personalized AI book recommendations.',
                        'tags' => ['AI'],
                        'security' => [['sanctum' => []]],
                    ],
                ],
                '/api/ai/books/{book}/metadata' => [
                    'post' => [
                        'summary' => 'Generate AI tags and summary for a book.',
                        'tags' => ['AI'],
                        'security' => [['sanctum' => []]],
                    ],
                ],
                '/api/health' => [
                    'get' => [
                        'summary' => 'Report database, cache, queue, storage, and memory health.',
                        'tags' => ['Monitoring'],
                    ],
                ],
                '/api/requests' => [
                    'get' => [
                        'summary' => 'List borrowing requests for admins.',
                        'tags' => ['Borrowing'],
                        'security' => [['sanctum' => []]],
                    ],
                    'post' => [
                        'summary' => 'Create a student borrow request.',
                        'tags' => ['Borrowing'],
                        'security' => [['sanctum' => []]],
                    ],
                ],
                '/api/reports' => [
                    'get' => [
                        'summary' => 'Return advanced admin reporting aggregates.',
                        'tags' => ['Reports'],
                        'security' => [['sanctum' => []]],
                    ],
                ],
            ],
        ]);
    }

    public function ui(): Response
    {
        $html = <<<'HTML'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Book Loan API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  </head>
  <body>
    <h1 style="position:absolute;left:-9999px;">Swagger UI</h1>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "/api/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
      });
    </script>
  </body>
</html>
HTML;

        return response($html, 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }
}
