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

function isOrderAdmin(mysqli $connection, string $username): bool
{
    $stmt = $connection->prepare('SELECT `role` FROM `login` WHERE username = ? LIMIT 1');
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $account = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return ($account['role'] ?? null) === 'admin';
}

function buildSalesReport(
    mysqli $connection,
    string $period,
    DateTimeImmutable $reportDate
): array {
    if ($period === 'week') {
        $periodStart = $reportDate->modify('monday this week');
        $periodEnd = $periodStart->modify('+7 days');
        $periodLabel = 'Minggu';
        $weekdayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
        $buckets = [];

        for ($day = 0; $day < 7; $day++) {
            $date = $periodStart->modify('+' . $day . ' days');
            $buckets[$date->format('Y-m-d')] = [
                'label' => $weekdayLabels[$day],
                'revenue' => 0,
                'orders' => 0,
            ];
        }
    } elseif ($period === 'month') {
        $periodStart = $reportDate->modify('first day of this month');
        $periodEnd = $periodStart->modify('first day of next month');
        $periodLabel = 'Bulan';
        $daysInMonth = (int) $periodStart->format('t');
        $buckets = [];

        for ($startDay = 1; $startDay <= $daysInMonth; $startDay += 7) {
            $endDay = min($startDay + 6, $daysInMonth);
            $bucketNumber = intdiv($startDay - 1, 7) + 1;
            $buckets[(string) $bucketNumber] = [
                'label' => $startDay . '–' . $endDay,
                'revenue' => 0,
                'orders' => 0,
            ];
        }
    } else {
        $periodStart = $reportDate->setDate((int) $reportDate->format('Y'), 1, 1);
        $periodEnd = $periodStart->modify('+1 year');
        $periodLabel = 'Tahun';
        $monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        $buckets = [];

        for ($month = 1; $month <= 12; $month++) {
            $bucketKey = $periodStart->setDate((int) $periodStart->format('Y'), $month, 1)->format('Y-m');
            $buckets[$bucketKey] = [
                'label' => $monthLabels[$month - 1],
                'revenue' => 0,
                'orders' => 0,
            ];
        }
    }

    $startDateTime = $periodStart->format('Y-m-d 00:00:00');
    $endDateTime = $periodEnd->format('Y-m-d 00:00:00');
    $completedStatus = 'Selesai';
    $stmt = $connection->prepare(
        'SELECT DATE(p.dibuat_pada) AS sale_date, SUM(p.total) AS revenue, COUNT(*) AS order_count '
        . 'FROM pesanan p '
        . 'WHERE p.status = ? AND p.dibuat_pada >= ? AND p.dibuat_pada < ? '
        . 'GROUP BY DATE(p.dibuat_pada)'
    );
    $stmt->bind_param('sss', $completedStatus, $startDateTime, $endDateTime);
    $stmt->execute();
    $dailySales = $stmt->get_result();

    while ($row = $dailySales->fetch_assoc()) {
        $saleDate = (string) $row['sale_date'];
        if ($period === 'week') {
            $bucketKey = $saleDate;
        } elseif ($period === 'month') {
            $dayOfMonth = (int) substr($saleDate, 8, 2);
            $bucketKey = (string) (intdiv($dayOfMonth - 1, 7) + 1);
        } else {
            $bucketKey = substr($saleDate, 0, 7);
        }

        if (isset($buckets[$bucketKey])) {
            $buckets[$bucketKey]['revenue'] = (int) $row['revenue'];
            $buckets[$bucketKey]['orders'] = (int) $row['order_count'];
        }
    }
    $stmt->close();

    $stmt = $connection->prepare(
        'SELECT d.kategori, SUM(d.jumlah) AS quantity '
        . 'FROM pesanan p '
        . 'INNER JOIN detail_pesanan d ON d.pesanan_id = p.id '
        . 'WHERE p.status = ? AND p.dibuat_pada >= ? AND p.dibuat_pada < ? '
        . 'GROUP BY d.kategori'
    );
    $stmt->bind_param('sss', $completedStatus, $startDateTime, $endDateTime);
    $stmt->execute();
    $categoryRows = $stmt->get_result();
    $categories = ['coffee' => 0, 'noncoffee' => 0, 'food' => 0];

    while ($row = $categoryRows->fetch_assoc()) {
        $category = mb_strtolower(trim((string) $row['kategori']), 'UTF-8');
        if ($category === 'kopi') {
            $categories['coffee'] = (int) $row['quantity'];
        } elseif ($category === 'non-kopi' || $category === 'non kopi') {
            $categories['noncoffee'] = (int) $row['quantity'];
        } elseif ($category === 'makanan') {
            $categories['food'] = (int) $row['quantity'];
        }
    }
    $stmt->close();

    $stmt = $connection->prepare(
        'SELECT d.nama_menu, SUM(d.jumlah) AS quantity '
        . 'FROM pesanan p '
        . 'INNER JOIN detail_pesanan d ON d.pesanan_id = p.id '
        . 'WHERE p.status = ? AND p.dibuat_pada >= ? AND p.dibuat_pada < ? '
        . 'GROUP BY d.menu_id, d.nama_menu '
        . 'ORDER BY quantity DESC, d.nama_menu ASC LIMIT 1'
    );
    $stmt->bind_param('sss', $completedStatus, $startDateTime, $endDateTime);
    $stmt->execute();
    $bestSeller = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $stmt = $connection->prepare(
        'SELECT HOUR(p.dibuat_pada) AS sale_hour, COUNT(*) AS order_count '
        . 'FROM pesanan p '
        . 'WHERE p.status = ? AND p.dibuat_pada >= ? AND p.dibuat_pada < ? '
        . 'GROUP BY HOUR(p.dibuat_pada) '
        . 'ORDER BY order_count DESC, sale_hour ASC LIMIT 1'
    );
    $stmt->bind_param('sss', $completedStatus, $startDateTime, $endDateTime);
    $stmt->execute();
    $busiestHour = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $totalRevenue = 0;
    $completedOrders = 0;
    foreach ($buckets as $bucket) {
        $totalRevenue += $bucket['revenue'];
        $completedOrders += $bucket['orders'];
    }

    $busyHourLabel = 'Belum ada data';
    if ($busiestHour !== null) {
        $hour = (int) $busiestHour['sale_hour'];
        $busyHourLabel = sprintf('%02d.00 – %02d.00', $hour, ($hour + 1) % 24);
    }

    return [
        'period' => $period,
        'period_label' => $periodLabel,
        'total' => $totalRevenue,
        'completed_orders' => $completedOrders,
        'average_transaction' => $completedOrders > 0
            ? (int) round($totalRevenue / $completedOrders)
            : 0,
        'best_seller' => $bestSeller['nama_menu'] ?? null,
        'busiest_hour' => $busyHourLabel,
        'categories' => $categories,
        'buckets' => array_values($buckets),
    ];
}

$isAuthenticated = isset($_SESSION['username']) && is_string($_SESSION['username']);
$username = $isAuthenticated ? $_SESSION['username'] : null;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    try {
        require_once __DIR__ . '/Koneksi/Koneksi.php';
        $canManageOrders = $isAuthenticated && is_string($username)
            ? isOrderAdmin($koneksi, $username)
            : false;
        $orders = [];
        $salesReport = null;

        if ($canManageOrders) {
            $period = $_GET['period'] ?? 'month';
            $reportDateValue = $_GET['date'] ?? date('Y-m-d');
            if (
                !is_string($period)
                || !in_array($period, ['week', 'month', 'year'], true)
                || !is_string($reportDateValue)
            ) {
                respond(422, ['error' => 'Periode laporan tidak valid.']);
            }

            $reportDate = DateTimeImmutable::createFromFormat('!Y-m-d', $reportDateValue);
            $dateErrors = DateTimeImmutable::getLastErrors();
            if (
                $reportDate === false
                || ($dateErrors !== false && ($dateErrors['warning_count'] > 0 || $dateErrors['error_count'] > 0))
                || $reportDate->format('Y-m-d') !== $reportDateValue
            ) {
                respond(422, ['error' => 'Tanggal laporan tidak valid.']);
            }

            $salesReport = buildSalesReport($koneksi, $period, $reportDate);
            $query = 'SELECT p.id, p.username, p.nama_pesanan, p.total, p.status, p.dibuat_pada, '
                . 'GROUP_CONCAT(CONCAT(d.nama_menu, \' × \', d.jumlah) '
                . 'ORDER BY d.id SEPARATOR \', \') AS ringkasan_menu '
                . 'FROM pesanan p '
                . 'LEFT JOIN detail_pesanan d ON d.pesanan_id = p.id '
                . 'GROUP BY p.id ORDER BY p.dibuat_pada DESC, p.id DESC LIMIT 20';
            $stmt = $koneksi->prepare($query);
            $stmt->execute();
            $result = $stmt->get_result();
            $orders = $result->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
        }
    } catch (mysqli_sql_exception $exception) {
        error_log('Order list database error: ' . $exception->getMessage());
        respond(500, ['error' => 'Pesanan belum dapat dimuat.']);
    }

    respond(200, [
        'csrf_token' => $_SESSION['csrf_token'],
        'authenticated' => $isAuthenticated,
        'can_manage_orders' => $canManageOrders,
        'role' => !$isAuthenticated ? 'tamu' : ($canManageOrders ? 'admin' : 'pelanggan'),
        'username' => $username,
        'orders' => $orders,
        'sales' => $salesReport,
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

if (($payload['action'] ?? null) === 'update_status') {
    if (!$isAuthenticated || !is_string($username)) {
        respond(401, ['error' => 'Masuk sebagai admin untuk mengubah status pesanan.']);
    }

    $orderId = $payload['order_id'] ?? null;
    $newStatus = $payload['status'] ?? null;
    if (
        !is_int($orderId)
        || $orderId < 1
        || !is_string($newStatus)
        || !in_array($newStatus, ['Diproses', 'Selesai', 'Dibatalkan'], true)
    ) {
        respond(422, ['error' => 'Status atau pesanan tidak valid.']);
    }

    try {
        require_once __DIR__ . '/Koneksi/Koneksi.php';
        if (!isOrderAdmin($koneksi, $username)) {
            respond(403, ['error' => 'Hanya admin yang dapat mengubah status pesanan.']);
        }

        $stmt = $koneksi->prepare('UPDATE pesanan SET status = ? WHERE id = ?');
        $stmt->bind_param('si', $newStatus, $orderId);
        $stmt->execute();
        $changedRows = $stmt->affected_rows;
        $stmt->close();

        if ($changedRows === 0) {
            $stmt = $koneksi->prepare('SELECT id FROM pesanan WHERE id = ? LIMIT 1');
            $stmt->bind_param('i', $orderId);
            $stmt->execute();
            $orderExists = $stmt->get_result()->fetch_assoc() !== null;
            $stmt->close();
            if (!$orderExists) {
                respond(404, ['error' => 'Pesanan tidak ditemukan.']);
            }
        }
    } catch (mysqli_sql_exception $exception) {
        error_log('Order status update database error: ' . $exception->getMessage());
        respond(500, ['error' => 'Status pesanan gagal diperbarui.']);
    }

    respond(200, [
        'order' => [
            'id' => $orderId,
            'status' => $newStatus,
        ],
    ]);
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

$orderUsername = $username;
$guestSessionId = null;
if (!$isAuthenticated) {
    $customerName = $payload['customer_name'] ?? 'Pelanggan';
    if (!is_string($customerName)) {
        respond(422, ['error' => 'Nama pemesan tidak valid.']);
    }

    $orderUsername = trim($customerName);
    if ($orderUsername === '') {
        $orderUsername = 'Pelanggan';
    }
    if (mb_strlen($orderUsername, 'UTF-8') > 100) {
        respond(422, ['error' => 'Nama pemesan maksimal 100 karakter.']);
    }
    $guestSessionId = session_id();
}

$orderName = $payload['order_name'] ?? null;
if ($orderName !== null && !is_string($orderName)) {
    respond(422, ['error' => 'Nama pesanan tidak valid.']);
}
if (is_string($orderName)) {
    $orderName = trim($orderName);
    if (mb_strlen($orderName, 'UTF-8') > 100) {
        respond(422, ['error' => 'Nama pesanan maksimal 100 karakter.']);
    }
    if ($orderName === '') {
        $orderName = null;
    }
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
        'INSERT INTO pesanan (username, total, guest_session_id, nama_pesanan) VALUES (?, ?, ?, ?)'
    );
    $stmt->bind_param('siss', $orderUsername, $total, $guestSessionId, $orderName);
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
        'username' => $orderUsername,
        'nama_pesanan' => $orderName,
        'authenticated' => $isAuthenticated,
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
