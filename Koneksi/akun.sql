CREATE DATABASE IF NOT EXISTS kedai_kopi
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE kedai_kopi;

CREATE TABLE IF NOT EXISTS `login` (
    username VARCHAR(100) NOT NULL PRIMARY KEY,
    `password` VARCHAR(255) NOT NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `login`
    MODIFY username VARCHAR(100) NOT NULL,
    MODIFY `password` VARCHAR(255) NOT NULL;

-- Buat hash password dengan PHP:
-- php -r "echo password_hash('password_anda', PASSWORD_DEFAULT), PHP_EOL;"
-- Masukkan hash yang dihasilkan ke kolom `password`:
-- INSERT INTO `login` (username, `password`)
-- VALUES ('nama_pengguna', 'hasil_hash_dari_perintah_php');
