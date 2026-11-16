# Checklist de pruebas AE4 y resultados de integración

Fecha: 16/11/2026. Incrementos J4 y J5. Responsable: Juan Carlos Abente.
Versión probada: `ae4-integracion` (`d9b0d0e`) con las correcciones de accesibilidad de `ae4/juanqui-calidad`.

## Entorno

PHP 8.3.6 (servidor de desarrollo) y MariaDB 10.11, con `sql/nipinfinan.sql` importado en una base temporal y cuentas creadas en cada ejecución. Las pruebas finales de la defensa se repiten en XAMPP (ver "Pendiente en XAMPP").

## Cómo reproducir

| Batería | Comando | Resultado |
|---|---|---|
| Integración y seguridad de la API | `node tests/integracion-seguridad.mjs http://localhost/NipinFinan/` | **43/43 correctos** |
| Accesibilidad por vista (Lighthouse + axe) | `cd tests/a11y && npm install && node lighthouse-vistas.mjs http://localhost/NipinFinan/` | **100/100 en las 18 combinaciones** de vista, sesión y dispositivo; axe sin violaciones |
| Recorrido solo con teclado | `node tests/a11y/teclado.mjs http://localhost/NipinFinan/ <email> <clave>` | Recorrido completo, foco visible en cada paso y sin recarga del documento |
| Helper `api.js` (Lucho) | `node --test tests/api-sesion.test.cjs` | 7/7 correctos |

Antecedentes de los autores: Santiago, 219 comprobaciones de backend (`sesion_categorias.md`, `crud_movimientos.md`, `autenticacion.md`); Luciano, 24 grupos de pruebas de la SPA integrada (PR #3). Esta verificación repite sobre la versión integrada lo que afecta al recorrido completo, sin reemplazar esas baterías.

## Checklist

| ID | Área | Caso | Esperado | Resultado |
|---|---|---|---|---|
| AUT-01 | Registro | Cuenta nueva | 201 JSON | ✅ |
| AUT-02 | Login | Credenciales correctas | 200, usuario y token CSRF nuevo | ✅ |
| AUT-03 | Sesión (A07) | Identificador antes y después del login | Cambia (`session_regenerate_id(true)`) | ✅ |
| AUT-04 | Registro | Correo duplicado | 409 | ✅ |
| AUT-05 | Login | Contraseña incorrecta | 401 con mensaje genérico | ✅ |
| AUT-06 | Registro | Contraseña de 7 caracteres | 400 (mínimo 8) | ✅ |
| AUT-07 | Logout | Usar la sesión después de cerrarla | 200 y luego 401 | ✅ |
| AUT-08 | BCRYPT (A02) | Columna `password` en MySQL | Hash `$2y$10$`, 60 caracteres, en `VARCHAR(255)` | ✅ consulta directa a la base |
| ACC-01/02 | Acceso (A01) | GET movimientos / categorías sin sesión | 401 | ✅ |
| ACC-03 | Acceso | POST sin sesión | 401 antes que CSRF | ✅ |
| ACC-04 | Aislamiento | La cuenta B lista sus movimientos | No ve los de A | ✅ |
| ACC-05/06 | Aislamiento | B edita o elimina un movimiento de A | 404, igual que inexistente | ✅ |
| ACC-07 | Aislamiento | Detalle de categoría de B | Sin datos de A | ✅ |
| CSRF-01/02 | CSRF | Escritura sin token o con token falso | 403 | ✅ |
| CSRF-03 | CSRF | Token emitido antes del login | 403 (rotado) | ✅ |
| CRUD-01 | Alta | 10000 en efectivo enviando un `total` falso | 201, total 9000, ajuste −1000 (recalcula el servidor) | ✅ |
| CRUD-02 | Alta | 1000 con crédito en 6 cuotas | Total 1180, cuota 196,67 | ✅ |
| CRUD-03 | Alta | Ingreso de 150000 | Sin descuento: 150000 | ✅ |
| CRUD-04 | Consulta | Listado propio | 200 con los 3 movimientos | ✅ |
| CRUD-05 | Edición | PUT a 20000 por transferencia | 200, total 19000 | ✅ |
| CRUD-06/07 | Baja | DELETE propio y repetido | 200 con id; después 404 | ✅ |
| CAT-01 | CU-02 | Detalle de Alimentación después de editar | Gastos 19000 y 1 movimiento | ✅ |
| CAT-02 | CU-02 FA-1 | Categoría sin movimientos | Totales 0 e historial vacío | ✅ |
| CAT-03 | CU-02 | ID inexistente | 404 | ✅ |
| VAL-01…08 | Validación | Monto negativo, con 3 decimales o como texto; fecha 30/02; categoría de otro tipo; cuotas sin crédito; medio de pago desconocido; descripción vacía | 400 `estado: error` | ✅ 8/8 |
| VAL-09 | Validación | JSON mal formado | 400 | ✅ |
| VAL-10 | HTTP | Método PATCH | 405 | ✅ |
| VAL-11 | Validación | `?id=abc` | 400 | ✅ |
| SEG-01 | SQLi (A03) | `' OR '1'='1' -- ` en el login | No autentica (400/401, sin usuario) | ✅ |
| SEG-02 | SQLi | Inyección en el ID de categoría | 400/404, sin datos | ✅ |
| SEG-03 | XSS (A03) | Descripción `<script>…` | Se guarda como texto y la API la devuelve como JSON | ✅ |
| SEG-04 | XSS en la interfaz | Descripción `<img src=x onerror=…>` en el listado | Se ve como texto; no se crea ningún `<img>` | ✅ (`lighthouse-vistas.mjs`) |
| ERR-01 | Fiabilidad | MySQL detenido durante un login | 500 con mensaje genérico; sin rutas, consultas ni detalle PDO | ✅ manual |
| HTTP-01 | API REST | `Content-Type` de las respuestas | `application/json; charset=utf-8` | ✅ |
| HTTP-02 | Sesión | Cookie de sesión | `HttpOnly` y `SameSite=Lax` | ✅ |
| UI-01 | SPA | Navegar por las vistas | Sin recarga del documento | ✅ |
| UI-02 | Teclado | Recorrido completo con Tab/Enter | Operable; foco visible de 3 px | ✅ |
| UI-03 | `aria-live` | Alta de movimiento | Anuncia "Movimiento guardado correctamente. Total: $1.350." | ✅ |
| UI-04 | Diálogo | Eliminar → Escape | Se cierra y el foco vuelve al botón de origen | ✅ |
| UI-05 | Responsive | Vistas a 390 px y 1280 px | Sin desbordes; navegación en varias líneas en móvil | ✅ capturas |
| A11Y-01 | Lighthouse | Accesibilidad en todas las vistas | 100/100 | ✅ local, ⏳ captura XAMPP |

## Defectos encontrados en la integración

| Defecto | Responsable | Estado |
|---|---|---|
| Contraste insuficiente del texto secundario y de los importes de ingresos (Lighthouse 96) | Juan Carlos (CSS) | Corregido en `fix(a11y): corregir contraste AA y tamaño táctil de enlaces` |
| Enlaces de navegación de 17 px de alto en móvil | Juan Carlos (CSS) | Corregido en el mismo commit |
| Estilos y `:focus-visible` dentro de `<style>` en `index.html` | Juan Carlos (CSS) | Movidos a `css/style.css` y `css/vistas.css` |

No se encontraron defectos funcionales ni de seguridad en la API ni en la SPA integradas.

## Pendiente en XAMPP (antes de entregar)

- [ ] Instalación limpia siguiendo solo el README e importando `sql/nipinfinan.sql`.
- [ ] `node tests/integracion-seguridad.mjs http://localhost/NipinFinan/` en XAMPP.
- [ ] Capturas de Lighthouse 100/100 desde Chrome DevTools en `docs/evidencias/`.
- [ ] Captura de la pestaña Network con una petición `fetch` JSON (por ejemplo, POST `mis_movimientos.php` → 201).
