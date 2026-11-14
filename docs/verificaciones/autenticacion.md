# Verificación de autenticación con modelos

Fecha: 14/11/2026.

## Entorno

Apache y PHP 8.2.12 de XAMPP, MariaDB 10.4.32 en una instancia temporal separada. Las pruebas utilizan una copia del proyecto y una base creada para verificación; no modifican bases de uso habitual. Puertos locales de prueba: HTTP 18173 y MySQL 33173.

## Resultados

Se verificaron 24 casos HTTP y de persistencia con resultado correcto. Antes de la refactorización se ejecutaron 14 casos básicos, también correctos. Se comprobó la sintaxis de los archivos PHP y el formato del diff.

| Caso | Resultado |
|---|---|
| Registro rechaza GET | correcto |
| Login rechaza GET | correcto |
| Recurso privado sin sesión | correcto |
| Registro con campos incompletos | correcto |
| Registro con email inválido | correcto |
| Registro válido conserva contrato | correcto |
| Email duplicado | correcto |
| Login con contraseña incorrecta | correcto |
| Login correcto regenera sesión sin exponer contraseña | correcto |
| Sesión permite consultar movimientos propios | correcto |
| Alta de movimiento con sesión y cálculo | correcto |
| Logout | correcto |
| Logout invalida acceso privado | correcto |
| Contraseña almacenada como BCRYPT | correcto |
| JSON malformado en registro | correcto |
| JSON no objeto en registro | correcto |
| Tipos inválidos en registro | correcto |
| Tipos inválidos en login | correcto |
| Contraseña de siete bytes | correcto |
| Contraseña mayor al límite BCRYPT | correcto |
| Contraseña con byte nulo | correcto |
| Nombre demasiado largo | correcto |
| Intento de inyección no autentica | correcto |
| Otra cuenta no recibe los movimientos de la primera | correcto |

## Alcance

La revisión cubre registro e ingreso con UsuarioModel, BCRYPT, renovación de sesión, respuestas JSON, rechazo de entradas inválidas, guardado de un gasto y aislamiento de consulta entre dos cuentas. No es una auditoría integral ni acredita Lighthouse.

Las rutas y el token CSRF, la edición/baja de movimientos y la API de categorías especificadas en el contrato corresponden a incrementos posteriores. El cliente de registro todavía debe adaptar su validación al mínimo de 8 bytes y máximo de 72 bytes del contrato. Los cambios de frontend quedan a cargo de su responsable.
