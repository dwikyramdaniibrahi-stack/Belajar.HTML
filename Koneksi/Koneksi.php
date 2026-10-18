<?php
$host = "localhost";
$user = "root";
$dbPassword = "";
$database = "kedai_kopi";

$koneksi = new mysqli($host, $user, $dbPassword, $database);
$koneksi->set_charset("utf8mb4");
?>