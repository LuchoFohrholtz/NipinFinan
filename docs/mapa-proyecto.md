# Mapa de carpetas y archivos de NipinFinan

Esta guía explica qué responsabilidad tiene cada parte y qué abrir durante la defensa. Los comentarios del código orientan la lectura de cada bloque; para explicarlo hay que poder seguir sus datos y sus llamadas. Los números de línea cambian al editar: buscar primero el archivo y luego la función o el identificador indicado.

## 1. Recorrido general y arquitectura

**Navegador → JavaScript → controlador PHP → servicio/modelo → MySQL → JSON → JavaScript → pantalla.**

La **Vista** es `index.html` con CSS y JavaScript. Los **Controladores** de `api/` reciben peticiones HTTP y responden con JSON. Los **Modelos** de `models/` ejecutan consultas SQL mediante PDO. Los **Servicios** de `services/` separan validación, cálculos y formato. `config/` prepara conexión, sesión y seguridad. Una carpeta organiza responsabilidades; lo que demuestra MVC es cómo colaboran sus archivos.

**Ejemplo:** al guardar un gasto, `js/app.js` toma los campos y usa `js/api.js`; este envía un POST a `api/mis_movimientos.php`. El controlador verifica sesión y CSRF, llama a `MovimientoService::validarYCalcular()` y luego a `MovimientoModel::crear()`. MySQL guarda el registro; PHP responde 201 con JSON y JavaScript muestra la confirmación.

## 2. Raíz: entrada, accesos anteriores y repositorio

- **`index.html`:** documento principal de la SPA. Contiene encabezado, navegación, estado de sesión y seis vistas: Inicio, acceso, registrar movimiento, listado, catálogo y detalle de categoría. También contiene formularios, regiones `aria-live`, tabla y diálogo de baja. Las vistas se muestran u ocultan con JavaScript. Los scripts se cargan con `defer`, después de analizar el HTML y respetando su orden.
- **`comprar.html`:** acceso compatible al antiguo formulario; `data-registro-antiguo` hace que `navegacion.js` lo redirija a `index.html#/registrar`. El nombre histórico no significa que ahora exista una compra de productos.
- **`login.html`:** acceso anterior que redirige a `#/acceso`; el formulario vigente está en `index.html`.
- **`listado_tabla.html`:** acceso anterior que redirige a `#/movimientos`; la tabla real pertenece a la SPA.
- **`listado_box.html`:** acceso anterior que redirige al catálogo `#/categorias`.
- **`producto.html`:** acceso anterior al detalle de categoría. El router conserva un parámetro `id` válido y lo transforma en `#/categorias/ID`; no representa productos de una tienda.
- **`README.md`:** presentación del sistema, integrantes, arquitectura, instalación con XAMPP, API y comandos de prueba. Es la primera guía para quien descarga el repositorio.
- **`.gitignore`:** indica qué archivos locales no debe incorporar Git: configuración privada y dependencias de las auditorías. No borra esos archivos de la computadora.
- **`.git/`:** carpeta interna creada por Git con historial, referencias de ramas y configuración del repositorio. No pertenece a MVC ni se edita para cambiar la aplicación.

**Para mostrar HTML y accesibilidad:** buscar `form-login`, `form-registro`, `form-movimiento`, `registro-estado`, `movimientos-estado`, `tabindex` y `confirmar-eliminacion` en `index.html`.

## 3. `api/`: controladores HTTP

Esta carpeta recibe las solicitudes del navegador. Cada archivo comprueba las condiciones de su operación y construye una respuesta; no dibuja las vistas ni concentra las consultas SQL.

- **`sesion.php`:** admite GET y devuelve la identidad pública o `usuario: null`, junto con `csrfToken`. Permite preparar también una sesión anónima antes de registro o login. No inicia sesión con una cuenta ni consulta su contraseña.
- **`registro.php`:** admite POST; comprueba CSRF, estructura JSON, nombre, correo y contraseña. Genera `password_hash($password, PASSWORD_BCRYPT)` y llama a `UsuarioModel::crear()`. Responde 201 si crea la cuenta y 409 si el correo está duplicado. **Crear la cuenta no autentica automáticamente.**
- **`login.php`:** admite POST y comprueba CSRF. Busca el correo, usa `password_verify()` contra el hash guardado y, si coincide, regenera el identificador de sesión, renueva el token y guarda `usuario_id`, nombre y correo en `$_SESSION`. Devuelve identidad pública y token, nunca el hash.
- **`logout.php`:** admite POST y exige autenticación y CSRF. Vacía `$_SESSION`, vence la cookie y destruye la sesión. No elimina la cuenta ni sus movimientos.
- **`mis_movimientos.php`:** controlador del CRUD privado. GET lista; POST crea; PUT edita; DELETE elimina. Toma el usuario de la sesión, exige token en escrituras, delega reglas al servicio y persistencia al modelo. `responder()` fija HTTP/JSON y termina; `leerIdMovimiento()` valida el identificador; `leerEntradaMovimiento()` exige un objeto JSON.
- **`categorias.php`:** admite GET autenticado. Sin `id`, devuelve catálogo y totales propios; con `id`, devuelve una categoría y su historial. Una categoría sin registros tiene ceros e historial vacío; un identificador inexistente devuelve 404.

**Códigos para explicar:** 200 éxito; 201 creación; 400 entrada inválida; 401 falta de autenticación o credenciales incorrectas; 403 CSRF rechazado; 404 recurso inexistente o ajeno; 405 método no admitido; 409 correo duplicado; 500 fallo interno. Su significado concreto debe cotejarse con cada endpoint.

## 4. `config/`: infraestructura compartida

- **`sesion.php`:** configura la cookie antes de `session_start()`. Activa modo estricto, uso de cookies, `HttpOnly`, `SameSite=Lax` y `Secure` cuando hay HTTPS. Recupera o inicia la sesión y envía `Cache-Control: no-store`. `HttpOnly` impide que JavaScript lea la cookie; no impide que el navegador la envíe en peticiones permitidas.
- **`seguridad.php`:** incluye la sesión. `obtenerTokenCsrf()` genera un token con `bin2hex(random_bytes(32))` cuando falta o es inválido y lo conserva en `$_SESSION['csrf_token']`. `validarTokenCsrf()` lee `HTTP_X_CSRF_TOKEN`, lo compara mediante `hash_equals()` y rechaza con 403 si no coincide. La renovación al autenticar está además en `api/login.php`.
- **`ConexionSingleton.php`:** define la clase `Conexion`. Su constructor privado combina valores locales, construye el DSN y crea PDO con excepciones, filas asociativas y consultas preparadas nativas. `obtener()` reutiliza la instancia **dentro de una petición PHP**, no una conexión global para todos los usuarios.
- **`conexion.php`:** obtiene `$pdo` mediante `Conexion::obtener()`. Si falla, registra el detalle en el servidor y responde 500 con un mensaje general.
- **`conexion.local.php`, si existe:** archivo opcional e ignorado por Git para cambiar ajustes de una máquina, como el puerto 3307. No debe publicarse con credenciales ni suponerse que los compañeros lo tienen. La guía de instalación explica cómo crearlo.

**Para defender CSRF:** abrir `seguridad.php` para generación y validación, `api/sesion.php` para entrega, `js/api.js` para recepción/envío y `api/mis_movimientos.php` para la llamada que exige validación.

## 5. `models/`: persistencia con PDO

- **`UsuarioModel.php`:** recibe PDO por el constructor. `buscarPorEmail()` prepara un SELECT con `:email` y devuelve una cuenta o null. `crear()` ejecuta un INSERT de nombre, correo y **hash** y devuelve el identificador. No calcula BCRYPT: recibe el hash producido por el controlador.
- **`MovimientoModel.php`:** `listarPorUsuario()` consulta registros propios; `crear()` inserta los importes calculados; `actualizar()` edita usando identificador y propietario y consulta el resultado, incluso si los valores no cambiaron; `eliminar()` informa si eliminó una fila propia; `listarPorCategoria()` filtra cuenta y categoría. El `usuario_id` de las consultas procede de la sesión a través del controlador.
- **`CategoriaModel.php`:** valida `data/categorias.json` y combina su catálogo fijo con agregados SQL de movimientos propios. `listarPorUsuario()` usa SUM, COUNT y agrupación para calcular ingresos, gastos, saldo y cantidad por categoría. `buscarPorId()` obtiene una categoría con esos totales. **No existe una tabla `categorias` en esta versión.**

**Para defender PDO:** abrir `UsuarioModel::buscarPorEmail()`: `prepare()` define SQL con marcadores, `execute()` entrega los valores por separado y `fetch(PDO::FETCH_ASSOC)` obtiene una fila con claves de columna. En `MovimientoModel::eliminar()`, señalar `WHERE id = :id AND usuario_id = :usuario_id`: conocer un identificador no autoriza a borrar un recurso ajeno.

## 6. `services/`: reglas y representación

- **`MovimientoService.php`:** carga tarifas y categorías al construirse. `leerConfiguracion()` lee y valida JSON. `validarYCalcular()` verifica tipos, descripción, monto, fecha real, categoría compatible, medio de pago, cuotas y comentario. Calcula en el servidor descuento, interés, ajuste, total y valor de cuota. No confía en un total enviado por el navegador ni ejecuta SQL.
- **`MovimientoFormato.php`:** `desdeFila()` convierte una fila interna al contrato público: números con tipos adecuados y nombres como `medioPago` y `valorCuota`, aunque MySQL use `medio_pago` y `valor_cuota`. No vuelve a calcular ni guarda datos.

**Ejemplo:** $10.000 en efectivo con descuento 0,10 da total $9.000 y ajuste −$1.000. El cliente lo anticipa y el servicio vuelve a calcularlo antes de guardar.

## 7. `js/`: interfaz, navegación y cliente HTTP

- **`api.js`:** define `NipinAPI`. `solicitarJSON()` centraliza fetch, método HTTP, JSON, cookies del mismo origen, CSRF y errores. `prepararSesion()` solicita el token a `api/sesion.php`; `prepararEnvios()` espera su disponibilidad. `ingresar()` conserva el token renovado; `cerrarSesion()` lo descarta. Las operaciones de movimientos invalidan lecturas previas y evitan cambios simultáneos sobre el mismo registro. Los tokens permanecen en memoria, sin localStorage.
- **`app.js`:** contiene `NipinSesion`, la fábrica `crearFormularioMovimiento()` y `NipinRegistro`. Coordina identidad visible y limpieza al cambiar de cuenta. Reutiliza cálculo, validación, mensajes y envío del formulario para alta y edición. Guarda un borrador sólo en las condiciones permitidas de la misma cuenta. El resultado del cliente es una vista previa; la autoridad final de cálculo es PHP.
- **`acceso.js`:** define `NipinAcceso`. Alterna login/registro, escucha submit, valida, bloquea envíos duplicados y llama a la API. Tras crear una cuenta prepara el login; tras autenticar actualiza la identidad y navega a Inicio.
- **`listado.js`:** define `NipinListado`. Crea filas con `textContent`, calcula los totales visibles y ofrece Editar/Eliminar. Clona el formulario con prefijos `editar-` para no repetir reglas ni duplicar IDs. Usa un diálogo nativo para confirmar la baja, devuelve el foco al cerrar y actualiza listado/resumen después de modificar datos.
- **`categorias.js`:** define `NipinCategorias`. Valida las respuestas y crea catálogo e historial mediante texto seguro. `crearVista()` comparte la lógica de carga, estados y errores. Comprueba que una respuesta siga perteneciendo a la cuenta y vista vigentes antes de mostrarla.
- **`resumen.js`:** define `NipinResumen`. Carga movimientos reales o `metricas.json`, conserva filtros separados, suma en centavos, calcula saldo, agrupa gastos y compara períodos. Genera barras, indicadores y estados vacíos. La demostración no guarda movimientos privados; una lectura tardía no debe restaurar una cuenta cerrada.
- **`navegacion.js`:** define `NipinNavegacion`. `resolver()` interpreta el hash; `mostrarRuta()` oculta/muestra vistas, coordina entrar/salir, título y `aria-current`; `enfocarContenido()` enfoca el h1; `ir()` cambia la ruta. También redirige los HTML anteriores. El hash cambia dentro del documento sin descargar toda la página nuevamente.

**Para defender asincronía:** buscar `solicitarJSON()` y `await fetch()` en `api.js`. Después mostrar quién llama al helper y qué hace con el JSON. `async` crea una función que devuelve una promesa; `await` espera ese resultado sin bloquear toda la interfaz.

## 8. `css/`: diseño y accesibilidad visual

- **`style.css`:** base visual compartida: tipografía, contenedores, navegación, botones, tarjetas, tablas, categorías, formularios y mensajes. Las media queries adaptan la disposición hasta 700 px. Incluye el enlace de salto, texto sólo para lectores, `[hidden]`, `:focus-visible` y página activa.
- **`resumen.css`:** ajustes limitados a `#resumen`: filtros, avisos, tarjetas, barras, comparaciones y adaptación móvil. Sus selectores evitan cambiar por accidente otros módulos.
- **`vistas.css`:** ajustes finales de listado, diálogo modal, catálogo, detalle y distinción del modo demostración. Se carga al final para conservar la cascada prevista. Controla textos largos y contenido ancho.

**Responsive** significa adaptar el diseño al espacio disponible. **Cascada CSS** es el mecanismo que decide qué regla gana según origen, importancia, especificidad y orden. **`:focus-visible`** aplica el indicador visual de foco; no crea por sí solo el orden de Tab.

## 9. `data/`: archivos JSON públicos

JSON no permite comentarios. Por eso sus explicaciones están aquí, sin añadir campos artificiales ni cambiar su estructura.

- **`categorias.json`:** lista de diez categorías permitidas. `id` es el identificador de URL; `nombre` es el texto usado en movimientos; `tipo` distingue ingreso/gasto. PHP lo usa para validar y construir el catálogo. No contiene información privada de las cuentas.
- **`tarifas.json`:** `medios_pago` indica el descuento por medio; `cuotas` indica el interés para 1, 3, 6 y 12 cuotas. Por ejemplo, 0,10 equivale al 10 %, y 0,18 al 18 %. Lo leen el cliente para anticipar y PHP para calcular de forma confiable.
- **`metricas.json`:** contiene una descripción y movimientos ficticios para el resumen demostrativo. Cada ejemplo aporta identificador, tipo, descripción, fecha, categoría y total. No sustituye la tabla MySQL ni representa movimientos privados reales.

## 10. `sql/`: estructura persistente

- **`nipinfinan.sql`:** crea/selecciona la base y crea dos tablas con InnoDB. `usuarios` guarda identificador, nombre, correo único, hash y fecha de creación. `movimientos` guarda propietario, tipo, descripción, importes, cuotas, fecha, categoría, medio y comentario. La clave foránea vincula `usuario_id` con `usuarios.id`; ON DELETE CASCADE elimina movimientos si se elimina su usuario. El proyecto no ofrece actualmente un caso de uso para eliminar cuentas.

Un **script SQL** es un archivo de instrucciones para MySQL. Una **clave primaria** identifica una fila; una **clave foránea** relaciona tablas; DECIMAL conserva importes con decimales definidos. El script crea estructura, no inicia Apache ni contiene contraseñas de usuarios en texto plano.

## 11. `tests/`: verificaciones, no código de producción

- **`api-sesion.test.cjs`:** siete pruebas unitarias del helper con `node:test`, respuestas HTTP simuladas y promesas controlables. Comprueba espera/rotación de tokens, respuestas tardías, errores y ausencia de reenvíos automáticos. No ejecuta PHP ni MySQL.
- **`integracion-seguridad.mjs`:** usa fetch de Node contra la API real. Crea cuentas de prueba y comprueba autenticación, CSRF, CRUD, categorías, validaciones, aislamiento y cabeceras. Modifica la base indicada: debe ejecutarse en un entorno de prueba. No acredita por sí solo cómo se renderiza el texto en el DOM.
- **`a11y/`:** agrupa herramientas de auditoría y recorrido de teclado, separadas de la aplicación que sirve XAMPP.
- **`a11y/package.json`:** declara scripts y dependencias de desarrollo: Lighthouse, axe y puppeteer-core. `type: module` habilita módulos ES. `private: true` evita publicar este paquete accidentalmente en npm. También es JSON y no admite comentarios.
- **`a11y/lighthouse-vistas.mjs`:** abre Chrome automatizado, crea datos de prueba y mide accesibilidad por vista/dispositivo/sesión. Ejecuta axe en estados seleccionados como editor y diálogo. Usa la ruta de Chrome configurada o una predeterminada. No sustituye la captura oficial del entorno de exposición.
- **`a11y/teclado.mjs`:** usa una cuenta existente de prueba y recorre acceso, alta, listado, diálogo, categorías y logout con teclado. Registra foco, contorno y persistencia del documento SPA. También usa flechas y Escape según los controles nativos; no debe presentarse como prueba de lector de pantalla.
- **`a11y/node_modules/`, si existe:** dependencias descargadas mediante npm; no es código propio y está ignorado por Git.
- **`a11y/package-lock.json`, si existe:** registra las versiones resueltas por npm; el repositorio actual lo excluye mediante `.gitignore`.

## 12. `docs/`: contratos, trazabilidad y evidencias

- **`mapa-proyecto.md`:** esta explicación del papel de carpetas, archivos y recorridos.
- **`contrato-api.md`:** acuerdo de métodos, rutas, campos, JSON y códigos HTTP. Permite desarrollar frontend/backend sin adivinar qué envía cada parte.
- **`configuracion-local.md`:** explica los ajustes locales de conexión y cómo mantenerlos fuera de Git.
- **`integracion-frontend.md`:** documenta el enlace entre helper, vistas y backend, incluyendo condiciones y comprobaciones de integración. Los estados históricos deben leerse junto al código final.
- **`trazabilidad-ae1.md`:** conecta los casos principales de AE1 con vistas, endpoints, modelos y datos de AE4; explica la evolución hacia la SPA.
- **`calidad-iso25010.md`:** matriz de las siete características solicitadas, evidencias, comprobaciones y justificación de mantenibilidad como mayor refactorización. Es una auditoría académica, no una certificación ISO.
- **`verificaciones/`:** registros de pruebas realizadas en distintos momentos; la fecha y versión de cada documento importan.
- **`verificaciones/autenticacion.md`:** comprobaciones de registro, login, contraseñas, sesión y errores.
- **`verificaciones/movimientos.md`:** evidencia de validación, cálculo y persistencia inicial de movimientos.
- **`verificaciones/crud_movimientos.md`:** evidencia del CRUD, reglas, propiedad y pruebas posteriores de movimientos.
- **`verificaciones/sesion_categorias.md`:** evidencia de sesión, catálogo, detalle, agregados y separación entre cuentas.
- **`verificaciones/checklist-pruebas.md`:** lista consolidada de casos, resultados y correcciones de la integración.
- **`verificaciones/accesibilidad.md`:** entorno y resultados de Lighthouse, axe, contraste y teclado. Documenta 100/100 en 18 combinaciones y distingue la captura oficial pendiente en XAMPP. Un comentario nuevo no constituye una nueva auditoría.

Los Markdown ya son documentación legible: sus títulos y párrafos cumplen la función explicativa. No se agregan comentarios ocultos a cada párrafo porque no son bloques de código ejecutable.

## 13. Qué abrir según la pregunta del profesor

| Pregunta | Archivos y búsqueda |
| --- | --- |
| ¿Cómo se registra y dónde va la contraseña? | `index.html`: `form-registro` → `acceso.js`: evento submit → `api.js`: `solicitarJSON` → `registro.php`: `password_hash` → `UsuarioModel.php`: `crear`. |
| ¿Cómo inicia sesión y quién conserva la identidad? | `acceso.js` → `api.js`: `ingresar` → `login.php`: `password_verify`, `session_regenerate_id`, `$_SESSION`. |
| ¿Dónde está el token CSRF? | `seguridad.php`: `obtenerTokenCsrf`/`validarTokenCsrf`; `api/sesion.php`; `api.js`: `prepararSesion` y `X-CSRF-Token`; `login.php`: renovación. |
| ¿Dónde hay una consulta preparada? | `UsuarioModel.php`: `buscarPorEmail`; explicar `prepare`, marcadores, `execute` y `fetch`. |
| ¿Cómo impiden borrar movimientos ajenos? | `mis_movimientos.php`: usuario de sesión → `MovimientoModel.php`: `eliminar` y filtro por id/usuario. |
| ¿Dónde calculan el total definitivo? | `MovimientoService.php`: `validarYCalcular`; distinguirlo de `app.js`: `calcular`. |
| ¿Dónde está fetch y qué hace con JSON? | `api.js`: `solicitarJSON`, `JSON.stringify`, `await fetch`, `respuesta.json`. |
| ¿Dónde está aria-live y quién lo modifica? | `index.html`: `registro-estado`/`mensaje` → `app.js`: `mostrarMensaje`; `listado.js`: `mensaje`. |
| ¿Cómo manejan Tab y foco visible? | `index.html`: controles nativos y `tabindex`; `navegacion.js`: `enfocarContenido`; `style.css`: `:focus-visible`. |
| ¿Qué evidencia ISO y Lighthouse tienen? | `docs/calidad-iso25010.md` y `docs/verificaciones/accesibilidad.md`; contrastar con el capítulo 3 del PDF presentado. |

Para explicar cualquier bloque: **qué recibe → qué comprueba o transforma → a quién llama → qué devuelve o modifica**. Si aparece un error, señalar también cómo se informa y qué datos se conservan o descartan.
