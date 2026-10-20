-- NipinFinan - Base de datos
-- Importar desde phpMyAdmin (pestaña "Importar") o con:
--   mysql -u root < sql/nipinfinan.sql

CREATE DATABASE IF NOT EXISTS nipinfinan
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE nipinfinan;


-- =============================
-- USUARIOS
-- =============================
-- password es VARCHAR(255) para guardar el hash BCRYPT de password_hash()
-- (hoy ocupa 60 caracteres, pero PHP recomienda dejar margen).

CREATE TABLE IF NOT EXISTS usuarios (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre     VARCHAR(100) NOT NULL,
    email      VARCHAR(150) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    creado_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- =============================
-- MOVIMIENTOS (ingresos y gastos de cada usuario)
-- =============================
-- Reemplaza al localStorage: cada movimiento pertenece a un usuario.

CREATE TABLE IF NOT EXISTS movimientos (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id   INT UNSIGNED  NOT NULL,
    tipo         ENUM('ingreso', 'gasto') NOT NULL,
    descripcion  VARCHAR(150)  NOT NULL,
    monto        DECIMAL(12,2) NOT NULL,
    ajuste       DECIMAL(12,2) NOT NULL DEFAULT 0,
    total        DECIMAL(12,2) NOT NULL,
    cuotas       TINYINT UNSIGNED NOT NULL DEFAULT 1,
    valor_cuota  DECIMAL(12,2) NOT NULL,
    fecha        DATE          NOT NULL,
    categoria    VARCHAR(50)   NOT NULL,
    medio_pago   VARCHAR(50)   NOT NULL,
    comentario   VARCHAR(500)  NOT NULL DEFAULT '',
    creado_en    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_movimientos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;
