# NipinFinan

Aplicación web de finanzas personales para registrar ingresos y gastos, consultarlos, editarlos y eliminarlos, y analizarlos por período y por categoría. Trabajo integrador AE4 / TIFAS de **Paradigmas y Lenguajes de Programación III**, Ingeniería en Sistemas de Información, Universidad de la Cuenca del Plata. Profesor: Ing. Dante Sicardi. Comisión A.

## Equipo

| Integrante | Responsabilidad principal en AE4 |
|---|---|
| Santiago Gonzalez | Backend: modelos PDO, API REST, sesión/CSRF, MySQL |
| Luciano Fohrholtz | Frontend: SPA en JavaScript Vanilla e integración con la API |
| Juan Carlos Abente | Calidad: accesibilidad WCAG 2.1, pruebas de integración, documentación e ISO/IEC 25010 |

## Funcionalidades

- Registro de cuenta, inicio y cierre de sesión (contraseñas con BCRYPT).
- **CU-01, registrar movimiento financiero:** alta de ingresos y gastos con medio de pago y cuotas. El servidor calcula el descuento o el interés.
- Listado de movimientos propios con **edición y baja** (CRUD completo).
- **CU-02, consultar categorías y su detalle:** catálogo de categorías con totales reales e historial propio de cada una.
- Resumen de portada por período y categoría, con un modo de demostración separado y señalizado.
- Operable completamente con teclado, con foco visible y anuncios `aria-live` para lectores de pantalla.

Presupuestos, alertas, metas de ahorro y la integración con WhatsApp forman parte de la visión del producto, pero **no están implementados** en esta entrega.

## Arquitectura

MVC desacoplado: la vista es una Single Page Application que se comunica con el servidor únicamente mediante `fetch()` asíncrono y JSON. El HTML no contiene PHP, estilos embebidos ni atributos de eventos.

```text
 Navegador (Vista)                         Servidor PHP (Controlador)            Datos (Modelo)
┌──────────────────────────┐   fetch +    ┌───────────────────────────┐      ┌─────────────────────┐
│ index.html (SPA)         │   JSON       │ api/*.php                 │      │ models/*Model.php   │
│ js/navegacion.js (rutas) │ ───────────► │  · valida sesión (401)    │ ───► │  PDO + consultas    │
│ js/api.js (fetch, CSRF)  │              │  · valida CSRF (403)      │      │  preparadas :campo  │
│ js/app.js, listado.js,   │ ◄─────────── │  · services/ valida y     │ ◄─── │ config/ Singleton   │
│ categorias.js, ...       │   HTTP 2xx/  │    calcula                │      │        │            │
│ css/ (responsive, foco)  │   4xx/500    │  · json_encode + código   │      │   MySQL nipinfinan  │
└──────────────────────────┘              └───────────────────────────┘      └─────────────────────┘
```

```text
NipinFinan/
├── index.html               Documento único de la SPA (HTML5 semántico, ARIA)
├── css/
│   ├── style.css            Layout responsive de AE1 + reglas de accesibilidad (:focus-visible)
│   ├── resumen.css          Tablero de la portada
│   └── vistas.css           Ajustes de las vistas de la SPA
├── js/
│   ├── api.js               Cliente HTTP único: fetch, JSON, sesión y token CSRF
│   ├── navegacion.js        Enrutador por hash (#/inicio, #/movimientos, ...) y gestión del foco
│   ├── app.js               Alta de movimientos y estado de sesión
│   ├── acceso.js            Registro, login y logout
│   ├── listado.js           Listado, edición y baja
│   ├── categorias.js        Catálogo y detalle de categorías
│   └── resumen.js           Resumen por período y modo de demostración
├── api/                     Controladores REST (JSON + códigos HTTP)
│   ├── sesion.php           GET identidad y token CSRF
│   ├── registro.php         POST alta de cuenta
│   ├── login.php            POST autenticación
│   ├── logout.php           POST cierre de sesión
│   ├── mis_movimientos.php  GET / POST / PUT / DELETE de movimientos propios
│   └── categorias.php       GET catálogo con totales y detalle por ID
├── models/                  UsuarioModel, MovimientoModel, CategoriaModel (PDO)
├── services/                Validación, cálculo de tarifas y formato de movimientos
├── config/                  Conexión PDO Singleton, sesión segura y verificación CSRF
├── data/                    Catálogo de categorías, tarifas y datos de demostración
├── sql/nipinfinan.sql       Script de la base de datos
├── tests/                   Pruebas de integración, seguridad, accesibilidad y teclado
├── docs/                    Contrato de API, trazabilidad, calidad y evidencias
└── *.html (otros)           Páginas de AE1 que solo redirigen a la ruta equivalente de la SPA
```

## Instalación en XAMPP (paso a paso)

**Requisitos:** XAMPP con PHP 8.2 o superior (Apache y MySQL/MariaDB), con las extensiones `pdo_mysql` y `mbstring` habilitadas (vienen activas en XAMPP), y un navegador moderno.

1. **Copiar el proyecto** a `C:\xampp\htdocs\NipinFinan`. La carpeta tiene que llamarse así, porque las URLs de abajo usan ese nombre.
   ```powershell
   cd C:\xampp\htdocs
   git clone https://github.com/LuchoFohrholtz/NipinFinan.git
   ```
2. **Iniciar Apache y MySQL** desde el *XAMPP Control Panel* (botones *Start*).
3. **Crear la base de datos:** abrir `http://localhost/phpmyadmin/`, ir a la pestaña *Importar*, elegir `sql/nipinfinan.sql` y presionar *Importar*. Se crean la base `nipinfinan` y las tablas `usuarios` y `movimientos`. Por consola: `C:\xampp\mysql\bin\mysql -u root < sql\nipinfinan.sql`.
4. **Conexión:** por defecto se usa `127.0.0.1:3306`, usuario `root` y contraseña vacía, igual que XAMPP. Si tu MySQL usa otro puerto o clave, creá `config/conexion.local.php` solo con lo que cambia; ese archivo está excluido de Git.
   ```php
   <?php
   return ['port' => 3307, 'password' => ''];
   ```
5. **Comprobar la API:** abrir `http://localhost/NipinFinan/api/sesion.php`. Tiene que mostrar un JSON con `"usuario":null` y un `csrfToken`.
6. **Usar la aplicación:** abrir `http://localhost/NipinFinan/`, crear una cuenta en *Ingresar → Crear cuenta*, iniciar sesión y registrar un movimiento. No abrir los HTML con doble clic ni con Live Server: PHP tiene que ejecutarse en Apache.

Si Apache usa un puerto distinto de 80, agregarlo a todas las URLs (por ejemplo, `http://localhost:8080/NipinFinan/`).

## API REST

Todas las respuestas son `application/json; charset=utf-8`. El detalle de cuerpos, validaciones y ejemplos está en [docs/contrato-api.md](docs/contrato-api.md).

| Método | Ruta | Acceso | Éxito | Errores |
|---|---|---|---|---|
| GET | `api/sesion.php` | Público | 200 `usuario` (o null) y `csrfToken` | 500 |
| POST | `api/registro.php` | Público + CSRF | 201 | 400, 403, 409, 500 |
| POST | `api/login.php` | Público + CSRF | 200 `usuario` y nuevo `csrfToken` | 400, 401, 403, 500 |
| POST | `api/logout.php` | Sesión + CSRF | 200 | 401, 403 |
| GET | `api/mis_movimientos.php` | Sesión | 200 `movimientos` propios | 401, 500 |
| POST | `api/mis_movimientos.php` | Sesión + CSRF | 201 `movimiento` calculado | 400, 401, 403, 500 |
| PUT | `api/mis_movimientos.php?id={id}` | Sesión + CSRF | 200 `movimiento` actualizado | 400, 401, 403, 404, 500 |
| DELETE | `api/mis_movimientos.php?id={id}` | Sesión + CSRF | 200 `id` eliminado | 400, 401, 403, 404, 500 |
| GET | `api/categorias.php` | Sesión | 200 `categorias` con totales propios | 401, 500 |
| GET | `api/categorias.php?id={slug}` | Sesión | 200 `categoria` y `movimientos` | 400, 401, 404, 500 |

Un método no admitido responde 405. Un recurso de otra cuenta responde 404, igual que uno inexistente.

## Seguridad (OWASP Top 10)

- **A01, control de acceso:** cada endpoint privado obtiene `usuario_id` solo de `$_SESSION`; sin sesión responde 401 y corta la ejecución. Las consultas filtran siempre por `usuario_id`.
- **A02, criptografía:** contraseñas con `password_hash(..., PASSWORD_BCRYPT)` en `VARCHAR(255)` y verificación con `password_verify()`.
- **A03, inyección:** todas las consultas usan PDO con sentencias preparadas y marcadores nombrados. En el DOM, los datos se insertan con `.textContent`.
- **A07, sesiones:** `session_regenerate_id(true)` tras el login, cookie `HttpOnly` y `SameSite=Lax`, y token CSRF por sesión (`random_bytes` + `hash_equals`) en toda escritura.
- **Errores:** `try/catch` de `PDOException` con `error_log` en el servidor; el cliente recibe un 500 con mensaje genérico.

## Accesibilidad (WCAG 2.1)

Lighthouse Accesibilidad **100/100** en todas las vistas (verificación local en [docs/verificaciones/accesibilidad.md](docs/verificaciones/accesibilidad.md)). Incluye enlace para saltar al contenido, HTML nativo (`<button>`, `<a>`, `<label>`, `<fieldset>`), `:focus-visible` con contorno de 3 px, foco movido al título de cada vista, regiones `aria-live="polite"` para los resultados de `fetch`, un diálogo nativo que devuelve el foco al cerrarse, contraste AA y objetivos táctiles de 24 px como mínimo.

## Pruebas

```powershell
# Integración y seguridad de la API (Node 18+, sin dependencias). Usar una base de prueba.
node tests/integracion-seguridad.mjs http://localhost/NipinFinan/

# Helper del cliente HTTP
node --test tests/api-sesion.test.cjs

# Accesibilidad (Lighthouse + axe) y recorrido por teclado (requiere Google Chrome)
cd tests/a11y
npm install
node lighthouse-vistas.mjs http://localhost/NipinFinan/
node teclado.mjs http://localhost/NipinFinan/ cuenta@example.com "Clave-segura-123"
```

Los resultados y las evidencias están en [docs/verificaciones/](docs/verificaciones/). El resumen está en [checklist-pruebas.md](docs/verificaciones/checklist-pruebas.md).

## Documentación

- [Contrato de API](docs/contrato-api.md)
- [Trazabilidad de los casos de uso AE1 → AE4](docs/trazabilidad-ae1.md)
- [Matriz de calidad ISO/IEC 25010](docs/calidad-iso25010.md)
- [Configuración local de la conexión](docs/configuracion-local.md)
- [Integración frontend-backend](docs/integracion-frontend.md)

## Flujo de trabajo Git

Cada integrante trabajó en su rama (`ae4/santi-backend`, `ae4/lucho-spa`, `ae4/juanqui-calidad`) e integró mediante Pull Requests en `ae4-integracion`, con *merge commit* para conservar el historial de los tres. La versión final se fusiona en `main`.
