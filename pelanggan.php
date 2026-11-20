<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
    );
    exit;
}

if (!isset($_SESSION['username']) || !is_string($_SESSION['username'])) {
    respond(401, ['error' => 'Masuk sebagai admin untuk melihat daftar pelanggan.']);
}

try {
    require_once __DIR__ . '/Koneksi/Koneksi.php';

    $accountStmt = $koneksi->prepare('SELECT `role` FROM `login` WHERE username = ? LIMIT 1');
    $accountStmt->bind_param('s', $_SESSION['username']);
    $accountStmt->execute();
    $account = $accountStmt->get_result()->fetch_assoc();
    $accountStmt->close();

    if (($account['role'] ?? null) !== 'admin') {
        respond(403, ['error' => 'Hanya admin yang dapat melihat daftar pelanggan.']);
    }

    $result = $koneksi->query(
        'SELECT DISTINCT username FROM `login` ORDER BY username LIMIT 4'
    );

    $customers = [];
    while ($row = $result->fetch_assoc()) {
        $customers[] = $row['username'];
    }

    respond(200, ['customers' => $customers]);
} catch (mysqli_sql_exception $exception) {
    error_log('Customer username query error: ' . $exception->getMessage());
    respond(500, ['error' => 'Data username gagal dimuat.']);
}
