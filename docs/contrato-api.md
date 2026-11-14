# Contrato API de NipinFinan

## Estado de implementación

Especificación de AE4. Registro y login utilizan UsuarioModel. El listado y el alta de movimientos utilizan MovimientoModel; el controlador conserva validación, cálculos y respuestas. La extracción conserva la validación heredada: la adecuación completa a los límites finales de MovimientoEntrada se verificará en los siguientes incrementos. Las rutas de sesión/token CSRF, PUT, DELETE y categorías están especificadas para los siguientes incrementos y todavía no deben considerarse disponibles. Las respuestas actuales de registro, login y GET/POST de movimientos se conservan.

## Reglas comunes

- Aplicación en `C:/xampp/htdocs/NipinFinan`; entrada `http://localhost/NipinFinan/`, con otro puerto si Apache lo necesita. `index.html` es el documento principal SPA. API relativa `api/`, mismo origen y cookies mediante `credentials: "same-origin"`.
- PHP con MySQL/MariaDB de XAMPP; conservar base `nipinfinan`, tablas `usuarios` y `movimientos` y el script `sql/nipinfinan.sql`. No borrar bases ni datos existentes. La instalación limpia se prueba con una base/copia de prueba independiente.
- Controladores reciben HTTP y devuelven JSON; modelos ejecutan SQL PDO con marcadores nombrados. El HTML no contiene PHP ni atributos de eventos. app.js es la entrada de la dinámica y puede coordinar archivos JS nativos separados.
- Toda respuesta API lleva `Content-Type: application/json; charset=utf-8`. No envolver las respuestas existentes en una nueva clave `datos`.
- Error común: `{"estado":"error","mensaje":"Descripción entendible."}`. Se permite agregar `errores` con mensajes por campo sin eliminar las claves anteriores. No devolver consultas, credenciales ni detalles PDO al cliente.
- 200: consulta, login, edición o baja correctos; 201: alta; 400: JSON/entrada inválida; 401: sin sesión o credenciales incorrectas; 403: CSRF inválido; 404: movimiento propio no disponible/categoría inexistente; 405: método no admitido; 409: correo duplicado; 500: error interno.
- Rutas privadas obtienen usuario_id exclusivamente de `$_SESSION`. Sin sesión: 401 y `exit`. Recurso ajeno: 404, igual que inexistente. Consultas de modificación incluyen ID del recurso y usuario_id en la condición.
- Fechas reales `YYYY-MM-DD` entre 1900-01-01 y 2100-12-31; IDs enteros positivos. Montos JSON numéricos finitos, mayores que cero, hasta 999999999.99 y dos decimales. MySQL conserva DECIMAL(12,2).

### 8.2 Rutas y cuerpos

| Método y ruta | Entrada | Respuesta de éxito |
|---|---|---|
| GET `api/sesion.php` **nuevo** | Sin cuerpo; público | 200: `estado`, `usuario` (nombre/email o null), `csrfToken` |
| POST `api/registro.php` | JSON `nombre`, `email`, `password` | 201: `estado`, `mensaje`; no inicia sesión |
| POST `api/login.php` | JSON `email`, `password` | 200: `estado`, `mensaje`, `usuario` con nombre/email; se agrega `csrfToken` |
| POST `api/logout.php` | `{}` | 200: `estado`, `mensaje`; destruye sesión/cookie |
| GET `api/mis_movimientos.php` | Sin parámetros; privado | 200: `estado`, `usuario`, `movimientos` completos, fecha DESC e id DESC |
| POST `api/mis_movimientos.php` | MovimientoEntrada completo; privado | 201: `estado`, `mensaje`, `movimiento` calculado y guardado |
| PUT `api/mis_movimientos.php?id=41` | MovimientoEntrada completo; privado | 200: `estado`, `mensaje`, `movimiento` actualizado |
| DELETE `api/mis_movimientos.php?id=41` | Sin cuerpo; privado | 200: `estado`, `mensaje`, `id` eliminado |
| GET `api/categorias.php` **nuevo** | Sin parámetros; privado | 200: `estado`, `categorias` con catálogo y resumen propio |
| GET `api/categorias.php?id=alimentacion` | ID de catálogo; privado | 200: `estado`, `categoria`, `movimientos` de esa categoría y esa cuenta |

El catálogo y su detalle son parte de S8. No agregan tablas ni CRUD de categorías en esta entrega. El resumen sigue usando GET movimientos; no necesita otro endpoint. El archivo público `data/tarifas.json` conserva su estructura actual y se consume con fetch; no es una ruta privada con datos personales.

**Registro:** nombre de 1 a 100 caracteres; email válido hasta 150; password de 8 a 72 bytes UTF-8 (sin truncar). Actualizar el mensaje y validación frontend al pasar del mínimo anterior de 6 a 8. Guardar BCRYPT con password_hash y verificar con password_verify; columna password VARCHAR(255). No almacenar ni devolver texto plano.

**MovimientoEntrada:** `tipo`, `descripcion`, `monto`, `fecha`, `categoria`, `medioPago`, `cuotas`, `comentario`. Todos requeridos salvo comentario, que por defecto es vacío. tipo ingreso/gasto; descripción 1-150; comentario hasta 500. Categoría es el **nombre** exacto del catálogo y del tipo correspondiente. medioPago usa las claves exactas de tarifas.json. Cuotas permitidas 1/3/6/12; fuera de gasto con crédito debe ser 1. Datos inválidos: 400.

PUT reemplaza todos los campos editables, no es PATCH. El formulario de edición toma el movimiento del listado por id y envía el objeto completo. El backend recalcula `ajuste`, `total` y `valorCuota`, ignorando esos importes si el cliente intenta enviarlos. En éxito devuelve los valores persistidos. No se cambia el propietario.

### 8.3 JSON de referencia

Alta/edición de movimiento:

```json
{
  "tipo": "gasto",
  "descripcion": "Supermercado",
  "monto": 10000,
  "fecha": "2026-11-14",
  "categoria": "Alimentación",
  "medioPago": "Efectivo",
  "cuotas": 1,
  "comentario": ""
}
```

Respuesta de alta (201); PUT conserva el mismo formato con 200:

```json
{
  "estado": "exito",
  "mensaje": "Movimiento guardado correctamente.",
  "movimiento": {
    "id": 41,
    "tipo": "gasto",
    "descripcion": "Supermercado",
    "monto": 10000,
    "ajuste": -1000,
    "total": 9000,
    "cuotas": 1,
    "valorCuota": 9000,
    "fecha": "2026-11-14",
    "categoria": "Alimentación",
    "medioPago": "Efectivo",
    "comentario": ""
  }
}
```

GET movimientos devuelve `{"estado":"exito","usuario":{"nombre":"Usuario de prueba","email":"prueba@example.com"},"movimientos":[...]}`, donde cada elemento tiene exactamente el formato de `movimiento`. Sin movimientos: arreglo vacío, no error. DELETE devuelve `{"estado":"exito","mensaje":"Movimiento eliminado correctamente.","id":41}`.

### 8.4 Catálogo y detalle sin cifras inventadas

Santi define el catálogo en `data/categorias.json` y lo lee mediante `models/CategoriaModel.php`. Usa estas entradas estables:

| id | nombre | tipo |
|---|---|---|
| alimentacion | Alimentación | gasto |
| transporte | Transporte | gasto |
| entretenimiento | Entretenimiento | gasto |
| servicios | Servicios | gasto |
| salud | Salud | gasto |
| educacion | Educación | gasto |
| alquiler | Alquiler | gasto |
| indumentaria | Indumentaria | gasto |
| sueldo | Sueldo | ingreso |
| freelance | Freelance | ingreso |

Cada objeto Categoria devuelto tiene `id`, `nombre`, `tipo`, `ingresos`, `gastos`, `saldo`, `cantidad`. Los cuatro últimos se calculan con movimientos **del usuario de sesión**, usando `total`, sin filtro temporal: saldo=ingresos-gastos. No hay presupuesto real en este contrato; retirar cifras fijas de presupuesto o marcarlas expresamente como función futura. No simular alertas personales.

Ejemplo GET categorías: `{"estado":"exito","categorias":[{"id":"alimentacion","nombre":"Alimentación","tipo":"gasto","ingresos":0,"gastos":9000,"saldo":-9000,"cantidad":1},...]}`.

Ejemplo detalle: `{"estado":"exito","categoria":{"id":"alimentacion","nombre":"Alimentación","tipo":"gasto","ingresos":0,"gastos":9000,"saldo":-9000,"cantidad":1},"movimientos":[...]}`. Un catálogo válido sin movimientos devuelve totales cero y lista vacía. La categoría se selecciona por ID, nunca se abre siempre Alimentación. Sus movimientos conservan la estructura de 8.3.

El catálogo es configuración del dominio, no información privada. El endpoint es privado porque también calcula importes/historial. No se usan archivos JSON públicos para guardar movimientos. Para no ocultar datos previos, no borrar movimientos que tengan una categoría histórica no reconocida: siguen en listado y resumen general; los nuevos y editados respetan el catálogo.

### 8.5 Cálculos conservados de AE2

- Efectivo: 10 % de descuento. Transferencia: 5 %. Tarjeta de débito / Mercado Pago / Tarjeta de crédito: 0 %.
- Crédito en 1/3/6/12 cuotas: interés 0/8/18/35 %. Ingresos sin descuento ni interés y con una cuota.
- `total = redondear(monto * (1 - descuento) * (1 + interes), 2)`; `ajuste = total - monto`; `valorCuota = redondear(total / cuotas, 2)`. Backend autoritativo; redondeo a centavos con mitades hacia arriba en PHP y frontend para importes no negativos. No duplicar valores de tarifas en una segunda configuración.
- Resumen suma `total` de los movimientos filtrados, no monto original ni total multiplicado por cuotas. La fecha del movimiento determina el período. Sumas de interfaz en centavos.
- Mantener demostración separada y señalizada. Los cupones solo verifican vigencia: no aplican descuento al movimiento en esta versión. Cambiar “Cupón aplicado” por “Cupón válido” si no hay aplicación efectiva.

### 8.6 Sesión y CSRF compatibles por adición

Santi incorpora GET `api/sesion.php`, que inicia o recupera la sesión y responde también sin usuario: `{"estado":"exito","usuario":null,"csrfToken":"token generado por el servidor"}`. Con sesión autenticada usuario incluye nombre/email. El token real se genera con `bin2hex(random_bytes(32))`, se guarda en sesión y no es el texto de ejemplo.

Lucho solicita esa ruta antes de habilitar envíos y guarda el token solo en memoria. Las peticiones POST/PUT/DELETE del frontend, incluido registro y login, envían `X-CSRF-Token`. PHP compara con `hash_equals`; falla=403 y mensaje genérico. En rutas privadas primero se comprueba identidad (401), después token (403). GET movimientos conserva su 401 anónimo actual. No habilitar controles con tokens ficticios.

Login exitoso regenera el ID con `session_regenerate_id(true)`, rota el token y lo agrega a la respuesta actual. El frontend actualiza el token. Logout destruye sesión/cookie y luego el cliente obtiene una sesión anónima nueva. Cookie HttpOnly, SameSite=Lax y Secure cuando se usa HTTPS. Mantener mismo origen; no agregar CORS abierto.

Las claves y respuestas previas permanecen; el endpoint/token son adiciones coordinadas. Lucho puede desarrollar el helper y el flujo con ejemplos mientras Santi los implementa. Antes de integrar S7 se prueban ambos lados juntos.

