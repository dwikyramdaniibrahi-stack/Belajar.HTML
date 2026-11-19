<?php
header('Content-Type: application/json; charset=utf-8');

try {
    require_once __DIR__ . '/Koneksi/Koneksi.php';
    $result = $koneksi->query(
        'SELECT DISTINCT username FROM `login` ORDER BY username LIMIT 4'
    );

    $customers = [];
    while ($row = $result->fetch_assoc()) {
        $customers[] = $row['username'];
    }

    echo json_encode(
        ['customers' => $customers],
        JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
    );
} catch (mysqli_sql_exception $exception) {
    error_log('Customer username query error: ' . $exception->getMessage());
    http_response_code(500);
    echo json_encode(['message' => 'Data username gagal dimuat.']);
}
