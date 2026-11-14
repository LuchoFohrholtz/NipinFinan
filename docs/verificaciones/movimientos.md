# Verificación de movimientos con modelo

Fecha: 14/11/2026.

## Cambio comprobado

`models/MovimientoModel.php` concentra el SELECT por propietario y el INSERT de movimientos mediante PDO y marcadores nombrados. El controlador `api/mis_movimientos.php` conserva autenticación, validación, cálculo, formato JSON y códigos HTTP. Los nombres de campos y las respuestas usadas por el frontend no cambian. No se modifica el esquema SQL.

## Entorno y resultados

Apache y PHP 8.2.12 de XAMPP con MariaDB 10.4.32 en instancias temporales separadas: HTTP 18173 y MySQL 33173. Se utilizó una copia del proyecto y cuentas generadas para cada ejecución. No se alteraron bases de uso habitual.

Los 21 casos de movimientos pasaron antes y después de la extracción del modelo. También pasaron los 24 casos de autenticación después del cambio. La sintaxis PHP y `git diff --check` resultaron correctos.

| Caso | Resultado |
|---|---|
| GET anónimo retorna 401 | correcto |
| POST anónimo retorna 401 | correcto |
| Cuenta nueva tiene lista vacía | correcto |
| Alta conserva claves y tipos JSON | correcto |
| Efectivo calcula descuento del diez por ciento | correcto |
| Alta queda persistida al consultar nuevamente | correcto |
| Transferencia calcula descuento del cinco por ciento | correcto |
| Crédito tres cuotas calcula interés y valor de cuota | correcto |
| Ingreso conserva monto y una cuota sin descuentos | correcto |
| Listado ordena fecha descendente y luego id | correcto |
| Otra cuenta no ve movimientos ajenos | correcto |
| Propietario enviado por el cliente se ignora | correcto |
| Descripción SQL y comentario se guardan como datos | correcto |
| Respuesta no expone usuario_id ni columnas internas | correcto |
| Servidor ignora importes calculados por el navegador | correcto |
| Monto negativo retorna 400 | correcto |
| Fecha inexistente retorna 400 | correcto |
| Medio de pago inexistente retorna 400 | correcto |
| Descripción vacía retorna 400 | correcto |
| Método no implementado retorna 405 | correcto |
| Fallos PDO en lectura y alta retornan 500 sin detalles internos | correcto |

La simulación de fallo renombró temporalmente la tabla de movimientos exclusivamente en la base de prueba. Se comprobó HTTP 500 con JSON general tanto en GET como en POST y se restauró la tabla en un bloque finally. El registro interno conserva el detalle; la respuesta al cliente no lo expone.

## Alcance y pendientes

Este incremento corresponde a S3/S4 y conserva la validación y el cálculo heredados. No acredita todavía todas las restricciones finales del contrato: faltan revisar tipos de entrada de movimientos, monto y precisión, rango de fechas, categoría por tipo y cuotas inválidas. Tampoco agrega PUT, DELETE, categorías o CSRF. Esas tareas requieren sus propios casos y su integración con la SPA.

La comprobación de un comentario con etiquetas acredita almacenamiento como dato; no demuestra que el frontend prevenga XSS. Eso se verifica revisando el renderizado con textContent y probando la interfaz integrada. No se ejecutó Lighthouse en este bloque.
