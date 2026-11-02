<?php
header('Content-Type: application/json; charset=utf-8');

$type = $_GET['type'] ?? '';
if ($type === 'provinces') {
    $path = '/api/provinces.json';
} elseif ($type === 'regencies' && preg_match('/^\d{2}$/', $_GET['province'] ?? '')) {
    $path = '/api/regencies/' . $_GET['province'] . '.json';
} else {
    http_response_code(400);
    echo json_encode(['message' => 'Permintaan data wilayah tidak valid.']);
    exit;
}

$curl = curl_init('https://wilayah.id' . $path);
curl_setopt_array($curl, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
]);

$response = curl_exec($curl);
$status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
$error = curl_error($curl);
curl_close($curl);

if ($response === false || $status !== 200) {
    error_log('Wilayah API request failed: ' . $error);
    http_response_code(502);
    echo json_encode(['message' => 'Data wilayah sementara tidak tersedia.']);
    exit;
}

echo $response;