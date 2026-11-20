USE kedai_kopi;

CREATE TABLE IF NOT EXISTS pesanan (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL,
    total INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('Diproses', 'Selesai', 'Dibatalkan') NOT NULL DEFAULT 'Diproses',
    dibuat_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_pesanan_username (username),
    KEY idx_pesanan_dibuat_pada (dibuat_pada)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS detail_pesanan (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    pesanan_id BIGINT UNSIGNED NOT NULL,
    menu_id VARCHAR(60) NOT NULL,
    nama_menu VARCHAR(120) NOT NULL,
    kategori VARCHAR(30) NOT NULL,
    jumlah SMALLINT UNSIGNED NOT NULL,
    harga_satuan INT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    KEY idx_detail_pesanan_id (pesanan_id),
    CONSTRAINT fk_detail_pesanan
        FOREIGN KEY (pesanan_id) REFERENCES pesanan (id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
