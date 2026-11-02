<?php
function redirectToRegister(string $status): void
{
    header('Location: Belajar2.HTML?register=' . urlencode($status));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: Belajar2.HTML');
    exit;
}

$submittedUsername = $_POST['username'] ?? '';
$password = $_POST['password'] ?? '';
$province = $_POST['province'] ?? '';
$submittedRegion = $_POST['region_name'] ?? '';

if (
    !is_string($submittedUsername) || !is_string($password) ||
    !is_string($province) || !is_string($submittedRegion)
) {
    redirectToRegister('invalid');
}

$username = trim($submittedUsername);
$regionName = trim($submittedRegion);

if (
    $username === '' || strlen($username) > 100 ||
    strlen($password) < 8 || $province === '' || strlen($province) > 100 ||
    $regionName === '' || strlen($regionName) > 150
) {
    redirectToRegister('invalid');
}

try {
    require __DIR__ . '/Koneksi/Koneksi.php';
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $koneksi->prepare(
        'INSERT INTO `login` (username, `password`, province, `Kabupaten`) VALUES (?, ?, ?, ?)'
    );
    $stmt->bind_param('ssss', $username, $passwordHash, $province, $regionName);
    $stmt->execute();
    $stmt->close();
} catch (mysqli_sql_exception $exception) {
    if ($exception->getCode() === 1062) {
        redirectToRegister('exists');
    }

    error_log('Registration database error: ' . $exception->getMessage());
    redirectToRegister('error');
}

redirectToRegister('success');