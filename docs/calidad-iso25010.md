# Ficha de autoevaluación de calidad ISO/IEC 25010

Proyecto: NipinFinan (AE4 / TIFAS). Fecha: 16/11/2026. Versión evaluada: `ae4-integracion` con las correcciones de `ae4/juanqui-calidad`.
Cada característica cita la evidencia en el código y la prueba ejecutada que la respalda. Las pruebas están detalladas en [verificaciones/checklist-pruebas.md](verificaciones/checklist-pruebas.md).

| # | Característica | Evidencia técnica en el código | Prueba que la respalda | Estado |
|---|---|---|---|---|
| 1 | **Adecuación funcional** | CU-01: `POST api/mis_movimientos.php` → `MovimientoService::validarYCalcular` → `MovimientoModel::crear`. Ciclo completo con `listarPorUsuario`, `actualizar` y `eliminar` (CRUD). CU-02: `api/categorias.php` → `CategoriaModel::listarPorUsuario` / `buscarPorId` + `MovimientoModel::listarPorCategoria`. Todo persiste en MySQL (`movimientos`, `usuarios`). Trazabilidad en [trazabilidad-ae1.md](trazabilidad-ae1.md). | CRUD-01 a CRUD-07, CAT-01 a CAT-03; cálculos de tarifas verificados (efectivo −10 %, crédito en 6 cuotas +18 %) | Cumple |
| 2 | **Eficiencia de desempeño** | La SPA carga un único documento (`index.html`, 24 KB); cada vista pide solo su JSON con `fetch` + `async/await` (`js/api.js`, `solicitarJSON`). Una conexión PDO por petición (`config/ConexionSingleton.php`) y consultas filtradas por `usuario_id` (indexado por su clave foránea). | Medición local: GET movimientos 1,7 ms / 1,2 KB; GET categorías 2,9 ms / 1,1 KB; detalle 1,4 ms / 0,4 KB (promedio de 5). Recorrido por teclado sin recarga del documento (UI-01) | Cumple |
| 3 | **Compatibilidad** | Cliente y servidor desacoplados: la SPA en JS Vanilla y la API PHP solo comparten el contrato HTTP/JSON ([contrato-api.md](contrato-api.md)). `Content-Type: application/json; charset=utf-8` en todas las respuestas. HTML5 y CSS3 estándar, sin frameworks; mismo origen, sin CORS abierto. | HTTP-01; la API se probó también desde Node sin navegador (`tests/integracion-seguridad.mjs`), lo que muestra que es independiente de la vista | Cumple |
| 4 | **Fiabilidad** | `try/catch` en cada controlador: `InvalidArgumentException` → 400, `PDOException` → 500 con `error_log` y mensaje genérico (`api/mis_movimientos.php`, `api/login.php`, `api/registro.php`, `api/categorias.php`, `config/conexion.php`). PDO con `ERRMODE_EXCEPTION` y `EMULATE_PREPARES=false`. Códigos semánticos 200/201/400/401/403/404/405/409/500. El cliente muestra estados de error y botones "Reintentar". | VAL-01 a VAL-11; ERR-01 (MySQL detenido → 500 sin detalles internos) | Cumple |
| 5 | **Seguridad (OWASP)** | A02: `password_hash(..., PASSWORD_BCRYPT)` en `api/registro.php` y `password_verify` en `api/login.php`; columna `VARCHAR(255)`. A03: sentencias preparadas con marcadores nombrados en `models/*.php`; `.textContent` en el DOM. A01/A07: `usuario_id` tomado de `$_SESSION` y 401 + `exit` en rutas privadas; `session_regenerate_id(true)` en el login; cookie `HttpOnly`/`SameSite=Lax` (`config/sesion.php`); CSRF con `random_bytes(32)` y `hash_equals` (`config/seguridad.php`). | AUT-01 a AUT-08, ACC-01 a ACC-07, CSRF-01 a CSRF-03, SEG-01 a SEG-04, HTTP-02 | Cumple |
| 6 | **Usabilidad / Accesibilidad** | `:focus-visible` con contorno de 3 px en `css/style.css`; enlace para saltar al contenido; 12 regiones `aria-live="polite"` en `index.html`; foco movido al título de cada vista (`js/navegacion.js`); `<dialog>` nativo para confirmar bajas; etiquetas, `fieldset/legend`, contraste AA y objetivos de 24 px. | Lighthouse Accesibilidad **100/100** en 18 combinaciones de vista, sesión y dispositivo; axe sin violaciones; recorrido completo con Tab/Enter (UI-02 a UI-04). Ver [verificaciones/accesibilidad.md](verificaciones/accesibilidad.md) | Cumple (capturas XAMPP en el informe final) |
| 7 | **Mantenibilidad** | Capas separadas: `api/` (controladores), `services/` (reglas de negocio), `models/` (SQL), `config/` (infraestructura), `js/` en módulos por vista con un único cliente HTTP (`js/api.js`). Nombres expresivos en español. Contrato versionado. Pruebas automatizadas reproducibles. Historial Git con ramas por integrante y PRs con merge commit. | `php -l` y `node --check` sin errores; 3 baterías automatizadas (`tests/`); historial de commits de los tres integrantes | Cumple |

## Característica que requirió mayor refactorización

**Mantenibilidad (y, como consecuencia, Compatibilidad).** En AE2 los endpoints PHP mezclaban la lectura de la petición, la validación, el cálculo de tarifas y el SQL en un mismo archivo, y la interfaz era un conjunto de páginas HTML con llamadas `fetch` dispersas en varios scripts. En AE4:

- Se extrajeron `UsuarioModel`, `MovimientoModel` y `CategoriaModel`, de modo que todo el SQL quedó en una sola capa con sentencias preparadas.
- La validación y el cálculo se movieron a `MovimientoService`, reutilizado por POST y PUT. El backend pasó a ser la única fuente de verdad de los importes.
- Las cinco páginas de AE1 se convirtieron en vistas de una SPA con un enrutador (`js/navegacion.js`) y un único cliente HTTP (`js/api.js`) que centraliza JSON, errores, sesión y CSRF.
- En la etapa de calidad se sacaron del HTML los estilos embebidos y las reglas de foco para dejarlos en `css/`.

Este reordenamiento hizo posible agregar edición, baja, categorías y CSRF sin duplicar lógica. Por eso es la característica que más cambió el código.

## Riesgos y mejoras futuras

- Lighthouse evalúa reglas automáticas; se complementó con el recorrido por teclado, pero conviene una prueba con un lector de pantalla real (NVDA).
- Las pruebas automatizadas no corren en integración continua; un flujo de GitHub Actions sería la siguiente mejora de mantenibilidad.
- Presupuestos, alertas y metas siguen fuera del alcance de esta entrega.
