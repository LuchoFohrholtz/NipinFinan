-- Crea la base y sus tablas al importar este script en MySQL o phpMyAdmin.

-- Crea la base con soporte de caracteres Unicode.
CREATE DATABASE IF NOT EXISTS nipinfinan
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Selecciona la base donde se crearán las tablas.
USE nipinfinan;


-- Guarda las cuentas con correo único y espacio suficiente para el hash BCRYPT.

CREATE TABLE IF NOT EXISTS usuarios (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre     VARCHAR(100) NOT NULL,
    email      VARCHAR(150) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    creado_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- Guarda ingresos y gastos vinculados a su usuario mediante una clave foránea.

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
    -- Elimina los movimientos asociados si se elimina su usuario.
    CONSTRAINT fk_movimientos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;
