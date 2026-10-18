<?php
session_start();

function redirectToLogin(string $status): void
{
    header('Location: Belajar2.HTML?login=' . urlencode($status));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: Belajar2.HTML');
    exit;
}

$submittedUsername = $_POST['username'] ?? '';
$password = $_POST['password'] ?? '';

if (!is_string($submittedUsername) || !is_string($password)) {
    redirectToLogin('invalid');
}

$username = trim($submittedUsername);
if ($username === '' || $password === '') {
    redirectToLogin('invalid');
}

try {
    require_once __DIR__ . '/Koneksi/Koneksi.php';
    $stmt = $koneksi->prepare(
        'SELECT username, `password` FROM `login` WHERE username = ? LIMIT 1'
    );
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $account = $stmt->get_result()->fetch_assoc();
    $stmt->close();
} catch (mysqli_sql_exception $exception) {
    error_log('Login database error: ' . $exception->getMessage());
    redirectToLogin('error');
}

$passwordMatches = false;
if ($account) {
    $storedPassword = $account['password'];
    $passwordInfo = password_get_info($storedPassword);
    $passwordMatches = $passwordInfo['algo'] !== null
        ? password_verify($password, $storedPassword)
        : hash_equals($storedPassword, $password);
}

if (!$account || !$passwordMatches) {
    redirectToLogin('invalid');
}

session_regenerate_id(true);
$_SESSION['username'] = $account['username'];

header('Location: Beranda.HTML');
exit;
