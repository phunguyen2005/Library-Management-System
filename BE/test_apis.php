<?php

$baseUrl = rtrim(getenv('BOOK_LOAN_API_BASE_URL') ?: 'http://127.0.0.1:8000/api', '/');
$demoPassword = getenv('LIBRARY_DEMO_PASSWORD') ?: 'Library@2026';

function apiRequest(string $method, string $path, ?array $data = null, ?string $token = null): array
{
    global $baseUrl;

    $headers = [
        'Accept: application/json',
        'Content-Type: application/json',
    ];

    if ($token) {
        $headers[] = 'Authorization: Bearer '.$token;
    }

    $options = [
        'http' => [
            'method' => $method,
            'header' => implode("\r\n", $headers)."\r\n",
            'ignore_errors' => true,
        ],
    ];

    if ($data !== null) {
        $options['http']['content'] = json_encode($data);
    }

    $url = $baseUrl.$path;
    echo "\n$method $url\n";

    $result = file_get_contents($url, false, stream_context_create($options));
    $statusLine = $http_response_header[0] ?? 'HTTP status unavailable';
    echo $statusLine."\n";
    echo ($result ?: '')."\n";

    $payload = json_decode((string) $result, true);

    if (! is_array($payload)) {
        return [];
    }

    return $payload;
}

function collectionData(array $payload): array
{
    return $payload['data'] ?? (array_is_list($payload) ? $payload : []);
}

$suffix = time();
$studentEmail = "api.smoke.$suffix@student.hcmue.edu.vn";
$studentPassword = 'Student123';

$studentSession = apiRequest('POST', '/register', [
    'name' => 'API Smoke Student',
    'email' => $studentEmail,
    'phone_number' => '0901999000',
    'password' => $studentPassword,
    'password_confirmation' => $studentPassword,
]);
$studentToken = $studentSession['token'] ?? null;

$adminSession = apiRequest('POST', '/login', [
    'role' => 'admin',
    'identifier' => 'nguyen.van.an@hcmue.edu.vn',
    'password' => $demoPassword,
]);
$adminToken = $adminSession['token'] ?? null;

if (! $studentToken || ! $adminToken) {
    fwrite(STDERR, "Unable to authenticate smoke-test users. Check seeded demo accounts and API server.\n");
    exit(1);
}

apiRequest('GET', '/me', null, $studentToken);
apiRequest('GET', '/members?limit=5', null, $adminToken);
apiRequest('GET', '/digital-documents', null, $studentToken);

$booksPayload = apiRequest('GET', '/books?limit=1000', null, $studentToken);
$books = collectionData($booksPayload);
$book = null;

foreach ($books as $candidate) {
    if (($candidate['available_quantity'] ?? 0) > 0) {
        $book = $candidate;
        break;
    }
}

if (! $book) {
    fwrite(STDERR, "No available book found for borrow smoke test.\n");
    exit(1);
}

$borrowResponse = apiRequest('POST', '/requests', [
    'book_id' => $book['book_id'],
], $studentToken);
$loanId = $borrowResponse['loan']['loan_id'] ?? null;

if (! $loanId) {
    fwrite(STDERR, "Borrow request was not created.\n");
    exit(1);
}

apiRequest('GET', '/requests/me?limit=1000', null, $studentToken);
apiRequest('GET', '/requests?limit=1000', null, $adminToken);
apiRequest('POST', "/requests/$loanId/approve", null, $adminToken);
apiRequest('POST', "/requests/$loanId/return", null, $adminToken);
apiRequest('POST', '/logout', null, $studentToken);
apiRequest('POST', '/logout', null, $adminToken);

echo "\nSmoke flow completed.\n";
