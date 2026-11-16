# Verificación de validación y CRUD de movimientos

Fecha: 14/11/2026. Incremento S5/S6 y cierre de validación de MovimientoEntrada.

## Implementación

- `services/MovimientoService.php`: valida entradas y calcula importes para POST y PUT.
- `data/categorias.json`: catálogo compartido del contrato; aún no es una API de categorías.
- `models/MovimientoModel.php`: UPDATE, consulta posterior y DELETE mediante PDO con condición de ID y propietario.
- `api/mis_movimientos.php`: controla los cuatro métodos, ID, objeto JSON, códigos y errores.
- `config/sesion.php`: comentario abreviado, sin cambios de comportamiento.

Las respuestas GET/POST conservan campos y estructura. PUT devuelve el movimiento persistido con 200; DELETE devuelve el id eliminado con 200. Una edición sin cambios también devuelve 200. Recursos ajenos e inexistentes usan 404; IDs inválidos y entradas incorrectas usan 400. Las consultas toman usuario_id de la sesión.

## Entorno y resultados

Se ejecutaron 134 casos de validación y CRUD y 24 de autenticación, todos correctos. Apache/PHP 8.2.12 de XAMPP y MariaDB 10.4.32 temporal en HTTP 18173 y DB 33173. Copia separada del proyecto, con cuentas de prueba; no se modificaron bases habituales.

Se verificaron tipos, campos requeridos, texto Unicode y sus límites, números positivos finitos con hasta dos decimales, fechas reales de 1900 a 2100, categorías por tipo, medios configurados y cuotas permitidas. También persistencia, recálculo, aislamiento, intentos de modificar propietario, PUT sin cambios, baja definitiva y errores posteriores sobre el recurso eliminado.

Se simularon fallos PDO en GET/POST/PUT/DELETE renombrando la tabla sólo en la base temporal y restaurándola con finally. Se probó un catálogo temporal malformado y se restauró su contenido con finally. Todas las respuestas de fallo fueron JSON con 500 sin detalles internos. Sintaxis PHP y git diff --check correctos.

## Casos ejecutados

| Caso | Resultado |
|---|---|
| GET anónimo 401 | correcto |
| POST anónimo 401 | correcto |
| PUT anónimo 401 | correcto |
| DELETE anónimo 401 | correcto |
| Lista vacía inicial | correcto |
| Alta persiste y calcula efectivo | correcto |
| GET aísla dos cuentas | correcto |
| PUT ajeno devuelve 404 | correcto |
| PUT inexistente devuelve 404 | correcto |
| DELETE ajeno devuelve 404 | correcto |
| DELETE inexistente devuelve 404 | correcto |
| Intentos ajenos no alteran datos de la otra cuenta | correcto |
| PUT rechaza ID ausente | correcto |
| DELETE rechaza ID ausente | correcto |
| PUT rechaza ID ?id=0 | correcto |
| DELETE rechaza ID ?id=0 | correcto |
| PUT rechaza ID ?id=-1 | correcto |
| DELETE rechaza ID ?id=-1 | correcto |
| PUT rechaza ID ?id=1.5 | correcto |
| DELETE rechaza ID ?id=1.5 | correcto |
| PUT rechaza ID ?id=abc | correcto |
| DELETE rechaza ID ?id=abc | correcto |
| PUT rechaza ID ?id=4294967296 | correcto |
| DELETE rechaza ID ?id=4294967296 | correcto |
| PUT rechaza ID ?id[]=1 | correcto |
| DELETE rechaza ID ?id[]=1 | correcto |
| PUT rechaza ID ?id=1%20OR%201=1 | correcto |
| DELETE rechaza ID ?id=1%20OR%201=1 | correcto |
| POST rechaza tipo inválido | correcto |
| PUT rechaza tipo inválido | correcto |
| POST rechaza tipo array | correcto |
| PUT rechaza tipo array | correcto |
| POST rechaza descripción array | correcto |
| PUT rechaza descripción array | correcto |
| POST rechaza descripción vacía | correcto |
| PUT rechaza descripción vacía | correcto |
| POST rechaza descripción larga | correcto |
| PUT rechaza descripción larga | correcto |
| POST rechaza monto cadena | correcto |
| PUT rechaza monto cadena | correcto |
| POST rechaza monto booleano | correcto |
| PUT rechaza monto booleano | correcto |
| POST rechaza monto objeto | correcto |
| PUT rechaza monto objeto | correcto |
| POST rechaza monto cero | correcto |
| PUT rechaza monto cero | correcto |
| POST rechaza monto negativo | correcto |
| PUT rechaza monto negativo | correcto |
| POST rechaza monto superior | correcto |
| PUT rechaza monto superior | correcto |
| POST rechaza tres decimales | correcto |
| PUT rechaza tres decimales | correcto |
| POST rechaza monto diminuto | correcto |
| PUT rechaza monto diminuto | correcto |
| POST rechaza fecha array | correcto |
| PUT rechaza fecha array | correcto |
| POST rechaza fecha inexistente | correcto |
| PUT rechaza fecha inexistente | correcto |
| POST rechaza fecha no bisiesta | correcto |
| PUT rechaza fecha no bisiesta | correcto |
| POST rechaza fecha antigua | correcto |
| PUT rechaza fecha antigua | correcto |
| POST rechaza fecha posterior | correcto |
| PUT rechaza fecha posterior | correcto |
| POST rechaza fecha sin formato | correcto |
| PUT rechaza fecha sin formato | correcto |
| POST rechaza categoría desconocida | correcto |
| PUT rechaza categoría desconocida | correcto |
| POST rechaza categoría de otro tipo | correcto |
| PUT rechaza categoría de otro tipo | correcto |
| POST rechaza categoría array | correcto |
| PUT rechaza categoría array | correcto |
| POST rechaza medio desconocido | correcto |
| PUT rechaza medio desconocido | correcto |
| POST rechaza medio array | correcto |
| PUT rechaza medio array | correcto |
| POST rechaza cuotas cadena | correcto |
| PUT rechaza cuotas cadena | correcto |
| POST rechaza cuotas no permitidas | correcto |
| PUT rechaza cuotas no permitidas | correcto |
| POST rechaza cuotas fuera de crédito | correcto |
| PUT rechaza cuotas fuera de crédito | correcto |
| POST rechaza comentario largo | correcto |
| PUT rechaza comentario largo | correcto |
| POST rechaza comentario nulo | correcto |
| PUT rechaza comentario nulo | correcto |
| POST exige tipo | correcto |
| PUT exige tipo | correcto |
| POST exige descripcion | correcto |
| PUT exige descripcion | correcto |
| POST exige monto | correcto |
| PUT exige monto | correcto |
| POST exige fecha | correcto |
| PUT exige fecha | correcto |
| POST exige categoria | correcto |
| PUT exige categoria | correcto |
| POST exige medioPago | correcto |
| PUT exige medioPago | correcto |
| POST exige cuotas | correcto |
| PUT exige cuotas | correcto |
| POST rechaza cuerpo b'{invalido' | correcto |
| PUT rechaza cuerpo b'{invalido' | correcto |
| POST rechaza cuerpo b'[]' | correcto |
| PUT rechaza cuerpo b'[]' | correcto |
| POST rechaza cuerpo b'null' | correcto |
| PUT rechaza cuerpo b'null' | correcto |
| POST rechaza cuerpo b'"texto"' | correcto |
| PUT rechaza cuerpo b'"texto"' | correcto |
| POST rechaza cuerpo b'' | correcto |
| PUT rechaza cuerpo b'' | correcto |
| POST rechaza cuerpo b'{"monto":1e400}' | correcto |
| PUT rechaza cuerpo b'{"monto":1e400}' | correcto |
| Rechazos no insertan ni cambian el movimiento | correcto |
| Límites válidos de monto fecha y texto | correcto |
| Comentario omitido se completa vacío | correcto |
| Crédito en 1 cuotas | correcto |
| Crédito en 3 cuotas | correcto |
| Crédito en 6 cuotas | correcto |
| Crédito en 12 cuotas | correcto |
| Ingreso no permite varias cuotas | correcto |
| PUT conserva id y recalcula todos los importes | correcto |
| PUT devuelve campos completos y persistidos | correcto |
| PUT ignora intento de cambiar propietario | correcto |
| PUT idéntico sigue devolviendo 200 | correcto |
| PUT parcial se rechaza | correcto |
| Orden fecha e id descendentes | correcto |
| PATCH no admitido | correcto |
| Las cuatro operaciones controlan fallos PDO sin detalles internos | correcto |
| Configuración inválida retorna 500 y se restaura | correcto |
| DELETE propio retorna id | correcto |
| DELETE persiste la eliminación | correcto |
| Segundo DELETE devuelve 404 | correcto |
| PUT sobre eliminado devuelve 404 | correcto |
| Eliminación no afecta otra cuenta | correcto |

## Límites y pendientes

La comprobación es de API, no de controles de edición y baja en la SPA. El frontend aún debe integrar esas operaciones, refrescar los datos y verificar teclado y mensajes accesibles. No se ejecutó Lighthouse ni se acredita WCAG completa.

CSRF y su endpoint de sesión siguen pendientes del incremento S7 y requieren integración coordinada con el cliente. La API de categorías sigue pendiente de S8. El catálogo está disponible como configuración, sin nuevas tablas ni modificación del esquema SQL. Datos históricos fuera del catálogo siguen en GET; un alta o edición nueva debe usar categorías válidas.

Las validaciones ahora rechazan entradas heredadas que el contrato considera incorrectas, como montos en cadenas, cuotas distintas de una fuera de gastos con crédito o categorías ajenas al tipo. El cliente debe enviar los tipos del contrato; no se corrigen silenciosamente esos datos.
