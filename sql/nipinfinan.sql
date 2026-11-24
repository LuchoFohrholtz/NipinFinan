-- Crea la base y sus tablas al importar este script en MySQL o phpMyAdmin.

-- Crea la base con soporte de caracteres Unicode.
CREATE DATABASE IF NOT EXISTS nipinfinan -- Crea la base NipinFinan si todavía no existe.
    CHARACTER SET utf8mb4 -- Admite Unicode completo con UTF-8 de cuatro bytes.
    COLLATE utf8mb4_unicode_ci; -- Define las reglas de comparación del texto.

-- Selecciona la base donde se crearán las tablas.
USE nipinfinan; -- Selecciona la base para ejecutar las siguientes sentencias.


-- Guarda las cuentas con correo único y espacio suficiente para el hash BCRYPT.

CREATE TABLE IF NOT EXISTS usuarios ( -- Crea la tabla usuarios si falta.
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, -- Genera un identificador único y lo usa como clave primaria.
    nombre     VARCHAR(100) NOT NULL, -- Define nombre y sus restricciones de almacenamiento.
    email      VARCHAR(150) NOT NULL UNIQUE, -- Impide registrar dos cuentas con el mismo correo.
    password   VARCHAR(255) NOT NULL, -- Reserva hasta 255 caracteres para el hash BCRYPT; no guarda la contraseña original.
    creado_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP -- Registra automáticamente la fecha y hora de creación.
) ENGINE=InnoDB; -- Usa InnoDB para transacciones y claves foráneas.


-- Guarda ingresos y gastos vinculados a su usuario mediante una clave foránea.

CREATE TABLE IF NOT EXISTS movimientos ( -- Crea la tabla movimientos si falta.
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, -- Genera un identificador único y lo usa como clave primaria.
    usuario_id   INT UNSIGNED  NOT NULL, -- Guarda la cuenta propietaria del movimiento.
    tipo         ENUM('ingreso', 'gasto') NOT NULL, -- Define tipo de movimiento o error según el contexto y sus restricciones de almacenamiento.
    descripcion  VARCHAR(150)  NOT NULL, -- Define descripción del movimiento y sus restricciones de almacenamiento.
    monto        DECIMAL(12,2) NOT NULL, -- Define importe original del movimiento y sus restricciones de almacenamiento.
    ajuste       DECIMAL(12,2) NOT NULL DEFAULT 0, -- Define ajuste y sus restricciones de almacenamiento.
    total        DECIMAL(12,2) NOT NULL, -- Define importe final calculado y sus restricciones de almacenamiento.
    cuotas       TINYINT UNSIGNED NOT NULL DEFAULT 1, -- Define cantidad de cuotas y sus restricciones de almacenamiento.
    valor_cuota  DECIMAL(12,2) NOT NULL, -- Define valor_cuota y sus restricciones de almacenamiento.
    fecha        DATE          NOT NULL, -- Define fecha del movimiento y sus restricciones de almacenamiento.
    categoria    VARCHAR(50)   NOT NULL, -- Define categoría seleccionada y sus restricciones de almacenamiento.
    medio_pago   VARCHAR(50)   NOT NULL, -- Define medio_pago y sus restricciones de almacenamiento.
    comentario   VARCHAR(500)  NOT NULL DEFAULT '', -- Define comentario opcional del movimiento y sus restricciones de almacenamiento.
    creado_en    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Registra automáticamente la fecha y hora de creación.
    -- Elimina los movimientos asociados si se elimina su usuario.
    CONSTRAINT fk_movimientos_usuario -- Da un nombre a la restricción de integridad referencial.
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) -- Relaciona movimientos.usuario_id con usuarios.id.
        ON DELETE CASCADE -- Elimina los movimientos si se elimina su cuenta propietaria.
) ENGINE=InnoDB; -- Usa InnoDB para transacciones y claves foráneas.
