<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (empty($_SESSION['username']) || !is_string($_SESSION['username'])) {
    respond(401, ['error' => 'Silakan masuk terlebih dahulu untuk memesan.']);
}

$username = $_SESSION['username'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    try {
        require_once __DIR__ . '/Koneksi/Koneksi.php';
        $stmt = $koneksi->prepare(
            'SELECT p.id, p.username, p.total, p.status, p.dibuat_pada, '
            . 'GROUP_CONCAT(CONCAT(d.nama_menu, \' × \', d.jumlah) '
            . 'ORDER BY d.id SEPARATOR \', \') AS ringkasan_menu '
            . 'FROM pesanan p '
            . 'LEFT JOIN detail_pesanan d ON d.pesanan_id = p.id '
            . 'GROUP BY p.id '
            . 'ORDER BY p.dibuat_pada DESC, p.id DESC LIMIT 20'
        );
        $stmt->execute();
        $result = $stmt->get_result();
        $orders = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
    } catch (mysqli_sql_exception $exception) {
        error_log('Order list database error: ' . $exception->getMessage());
        respond(500, ['error' => 'Pesanan belum dapat dimuat.']);
    }

    respond(200, [
        'csrf_token' => $_SESSION['csrf_token'],
        'username' => $username,
        'orders' => $orders,
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: GET, POST');
    respond(405, ['error' => 'Metode permintaan tidak didukung.']);
}

$payload = json_decode(file_get_contents('php://input'), true);
if (!is_array($payload)) {
    respond(400, ['error' => 'Data pesanan tidak valid.']);
}

$csrfToken = $payload['csrf_token'] ?? null;
if (
    !is_string($csrfToken)
    || empty($_SESSION['csrf_token'])
    || !hash_equals($_SESSION['csrf_token'], $csrfToken)
) {
    respond(403, ['error' => 'Sesi pesanan tidak valid. Muat ulang halaman lalu coba lagi.']);
}

$catalog = [
    'kopi-susu-dwiky' => ['name' => 'Kopi Susu Dwiky', 'category' => 'Kopi', 'price' => 18000],
    'butterscoth-mutii' => ['name' => 'Butterscoth Mutii', 'category' => 'Kopi', 'price' => 12000],
    'americano' => ['name' => 'Americano', 'category' => 'Kopi', 'price' => 15000],
    'cappuccino' => ['name' => 'Cappuccino', 'category' => 'Kopi', 'price' => 20000],
    'matcha-latte-suci' => ['name' => 'Matcha Latte Suci', 'category' => 'Non-kopi', 'price' => 22000],
    'cokelat-premium' => ['name' => 'Cokelat Premium', 'category' => 'Non-kopi', 'price' => 20000],
    'taro-latte' => ['name' => 'Taro Latte', 'category' => 'Non-kopi', 'price' => 20000],
    'roti-bakar-cokelat' => ['name' => 'Roti Bakar Cokelat', 'category' => 'Makanan', 'price' => 18000],
    'pisang-goreng' => ['name' => 'Pisang Goreng', 'category' => 'Makanan', 'price' => 15000],
    'kentang-goreng' => ['name' => 'Kentang Goreng', 'category' => 'Makanan', 'price' => 17000],
];

$items = $payload['items'] ?? null;
if (!is_array($items) || count($items) < 1 || count($items) > count($catalog)) {
    respond(422, ['error' => 'Pilih setidaknya satu menu untuk dipesan.']);
}

$validatedItems = [];
$total = 0;
foreach ($items as $item) {
    if (!is_array($item) || !is_string($item['menu_id'] ?? null)) {
        respond(422, ['error' => 'Isi pesanan tidak valid.']);
    }

    $menuId = $item['menu_id'];
    $quantity = $item['jumlah'] ?? null;
    if (
        !isset($catalog[$menuId])
        || !is_int($quantity)
        || $quantity < 1
        || $quantity > 99
        || isset($validatedItems[$menuId])
    ) {
        respond(422, ['error' => 'Menu atau jumlah pesanan tidak valid.']);
    }

    $menu = $catalog[$menuId];
    $lineTotal = $menu['price'] * $quantity;
    $total += $lineTotal;
    $validatedItems[$menuId] = [
        'menu_id' => $menuId,
        'menu' => $menu,
        'quantity' => $quantity,
    ];
}

$transactionStarted = false;
try {
    require_once __DIR__ . '/Koneksi/Koneksi.php';
    $koneksi->begin_transaction();
    $transactionStarted = true;

    $stmt = $koneksi->prepare(
        'INSERT INTO pesanan (username, total) VALUES (?, ?)'
    );
    $stmt->bind_param('si', $username, $total);
    $stmt->execute();
    $orderId = $koneksi->insert_id;
    $stmt->close();

    $stmt = $koneksi->prepare(
        'INSERT INTO detail_pesanan '
        . '(pesanan_id, menu_id, nama_menu, kategori, jumlah, harga_satuan) '
        . 'VALUES (?, ?, ?, ?, ?, ?)'
    );
    foreach ($validatedItems as $item) {
        $menuId = $item['menu_id'];
        $menuName = $item['menu']['name'];
        $category = $item['menu']['category'];
        $quantity = $item['quantity'];
        $price = $item['menu']['price'];
        $stmt->bind_param('isssii', $orderId, $menuId, $menuName, $category, $quantity, $price);
        $stmt->execute();
    }
    $stmt->close();
    $koneksi->commit();
    $transactionStarted = false;
} catch (mysqli_sql_exception $exception) {
    if ($transactionStarted && isset($koneksi) && $koneksi instanceof mysqli) {
        try {
            $koneksi->rollback();
        } catch (mysqli_sql_exception $rollbackException) {
            error_log('Order rollback error: ' . $rollbackException->getMessage());
        }
    }
    error_log('Order save database error: ' . $exception->getMessage());
    respond(500, ['error' => 'Pesanan gagal disimpan. Silakan coba lagi.']);
}

respond(201, [
    'order' => [
        'id' => $orderId,
        'code' => 'DW-' . str_pad((string) $orderId, 6, '0', STR_PAD_LEFT),
        'username' => $username,
        'total' => $total,
        'status' => 'Diproses',
        'dibuat_pada' => date('Y-m-d H:i:s'),
        'ringkasan_menu' => implode(', ', array_map(
            static function (array $item): string {
                return $item['menu']['name'] . ' × ' . $item['quantity'];
            },
            array_values($validatedItems)
        )),
    ],
]);
