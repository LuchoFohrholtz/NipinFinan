-- Crea la base NipinFinan si todavía no existe.
CREATE DATABASE IF NOT EXISTS nipinfinan
    -- Admite Unicode completo con UTF-8 de cuatro bytes.
    CHARACTER SET utf8mb4
    -- Define las reglas de comparación del texto.
    COLLATE utf8mb4_unicode_ci;

-- Selecciona la base donde se crearán las tablas.
USE nipinfinan;

-- Crea la tabla usuarios si falta.
CREATE TABLE IF NOT EXISTS usuarios (
    -- Genera un identificador único y lo usa como clave primaria.
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    -- Define nombre y sus restricciones de almacenamiento.
    nombre     VARCHAR(100) NOT NULL,
    -- Impide registrar dos cuentas con el mismo correo.
    email      VARCHAR(150) NOT NULL UNIQUE,
    -- Reserva hasta 255 caracteres para el hash BCRYPT; no guarda la contraseña original.
    password   VARCHAR(255) NOT NULL,
    -- Registra automáticamente la fecha y hora de creación.
    creado_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Crea la tabla movimientos si falta.
CREATE TABLE IF NOT EXISTS movimientos (
    -- Genera un identificador único y lo usa como clave primaria.
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    -- Guarda la cuenta propietaria del movimiento.
    usuario_id   INT UNSIGNED  NOT NULL,
    -- Define tipo de movimiento o error según el contexto y sus restricciones de almacenamiento.
    tipo         ENUM('ingreso', 'gasto') NOT NULL,
    -- Define descripción del movimiento y sus restricciones de almacenamiento.
    descripcion  VARCHAR(150)  NOT NULL,
    -- Define importe original del movimiento y sus restricciones de almacenamiento.
    monto        DECIMAL(12,2) NOT NULL,
    -- Define ajuste y sus restricciones de almacenamiento.
    ajuste       DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- Define importe final calculado y sus restricciones de almacenamiento.
    total        DECIMAL(12,2) NOT NULL,
    -- Define cantidad de cuotas y sus restricciones de almacenamiento.
    cuotas       TINYINT UNSIGNED NOT NULL DEFAULT 1,
    -- Define valor_cuota y sus restricciones de almacenamiento.
    valor_cuota  DECIMAL(12,2) NOT NULL,
    -- Define fecha del movimiento y sus restricciones de almacenamiento.
    fecha        DATE          NOT NULL,
    -- Define categoría seleccionada y sus restricciones de almacenamiento.
    categoria    VARCHAR(50)   NOT NULL,
    -- Define medio_pago y sus restricciones de almacenamiento.
    medio_pago   VARCHAR(50)   NOT NULL,
    -- Define comentario opcional del movimiento y sus restricciones de almacenamiento.
    comentario   VARCHAR(500)  NOT NULL DEFAULT '',
    -- Registra automáticamente la fecha y hora de creación.
    creado_en    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Da un nombre a la restricción de integridad referencial.
    CONSTRAINT fk_movimientos_usuario
        -- Relaciona movimientos.usuario_id con usuarios.id.
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        -- Elimina los movimientos si se elimina su cuenta propietaria.
        ON DELETE CASCADE
) ENGINE=InnoDB;
