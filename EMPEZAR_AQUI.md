# Empezar por acá: recorrido del proyecto

Abrir **NipinFinan.code-workspace** en VS Code con **Archivo → Abrir área de trabajo desde archivo**. El explorador muestra las capas numeradas en el orden de lectura. Los nombres reales, rutas HTTP y dependencias se conservan.

## Qué representa cada grupo

| Grupo del explorador | Carpeta real | Responsabilidad |
| --- | --- | --- |
| 00 Inicio | raíz | `index.html` contiene las vistas; README explica la instalación. |
| 01 y 02 Vista | `css/`, `js/` | Presentación, formularios, navegación y cliente HTTP. |
| 03 Controladores | `api/` | Reciben HTTP, verifican seguridad y responden JSON. |
| 04 Reglas de negocio | `services/` | Validan y calculan los datos definitivos. |
| 05 Modelos | `models/` | Ejecutan SQL parametrizado mediante PDO. |
| 06 Infraestructura | `config/` | Prepara conexión, sesión y token CSRF. |
| 07 Datos públicos | `data/` | Categorías, tarifas y demostración. |
| 08 Base | `sql/` | Crea `usuarios` y `movimientos`. |
| 09 y 10 Apoyo | `docs/`, `tests/` | Informe, evidencias y verificaciones. |

Las carpetas aparecen una sola vez en esta vista. Los cinco HTML anteriores se ocultan en el explorador del área de trabajo porque redirigen a la SPA; siguen existiendo y sus enlaces funcionan. Al abrir la carpeta normalmente se ve el árbol completo.

## Recorrido 1: guardar un movimiento

1. [index.html](index.html): buscar `form-movimiento`. Es la vista que recibe los campos.
2. [js/app.js](js/app.js): buscar `form.addEventListener('submit'`. Valida la entrada y arma el objeto.
3. [js/api.js](js/api.js): buscar `guardarMovimiento` y luego `solicitarJSON`. Envía POST, JSON y token.
4. [api/mis_movimientos.php](api/mis_movimientos.php): revisar sesión, `validarTokenCsrf`, `validarYCalcular` y la llamada a `crear`.
5. [services/MovimientoService.php](services/MovimientoService.php): buscar `validarYCalcular`. Valida y recalcula los importes.
6. [models/MovimientoModel.php](models/MovimientoModel.php): buscar `public function crear`. El INSERT guarda en MySQL y devuelve el id.
7. Volver al controlador: `responder(201, ...)` devuelve JSON; `app.js` muestra la confirmación.

**Para explicar:** la vista toma datos; la API controla; el servicio valida/calcula; el modelo guarda; la respuesta vuelve a la pantalla.

## Recorrido 2: comprobar una contraseña

1. [js/acceso.js](js/acceso.js): buscar `login.addEventListener`. Toma correo y contraseña.
2. [js/api.js](js/api.js): `ingresar` envía POST a `api/login.php`.
3. [api/login.php](api/login.php): `buscarPorEmail` obtiene la cuenta y `password_verify` comprueba el hash.
4. [models/UsuarioModel.php](models/UsuarioModel.php): `buscarPorEmail` muestra SELECT, `prepare`, `execute` y `fetch`.
5. Volver a `login.php`: `session_regenerate_id` y `$_SESSION` establecen el contexto autenticado.

Para mostrar dónde se genera y guarda el hash: [api/registro.php](api/registro.php), `password_hash` → `UsuarioModel::crear` → tabla `usuarios`, columna `password`.

## Recorrido 3: mostrar PDO y SQL sin buscar al azar

- [config/ConexionSingleton.php](config/ConexionSingleton.php): buscar `new PDO`. Crea la conexión.
- [config/conexion.php](config/conexion.php): obtiene `$pdo` para el controlador.
- [models/UsuarioModel.php](models/UsuarioModel.php): buscar `buscarPorEmail`. `prepare` separa SQL y marcadores; `execute` enlaza valores; `fetch` recupera una fila.
- En PHP, ese `fetch` recupera resultados SQL. En JavaScript, `fetch` envía HTTP: son operaciones distintas.

## Recorrido 4: token y accesibilidad

- CSRF: [config/seguridad.php](config/seguridad.php), `obtenerTokenCsrf` y `validarTokenCsrf` → [api/sesion.php](api/sesion.php) entrega el token → [js/api.js](js/api.js) lo envía en `X-CSRF-Token`.
- Región viva: [index.html](index.html), `id="mensaje"` → [js/app.js](js/app.js), `mostrarMensaje`, cambia texto y prioridad.
- Foco: [css/style.css](css/style.css), `:focus-visible` → [js/navegacion.js](js/navegacion.js), `enfocarContenido`.

**Búsqueda rápida:** Ctrl+P abre un archivo; Ctrl+F encuentra una función; Ctrl+Shift+F busca en el proyecto. Explicar qué recibe, qué hace y qué devuelve cada bloque.

El detalle de todos los archivos está en [docs/mapa-proyecto.md](docs/mapa-proyecto.md). La aplicación se ejecuta con XAMPP siguiendo el [README](README.md).
