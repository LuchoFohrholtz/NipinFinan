# Trazabilidad AE1 → AE4

Fuente: *AE1 - NipinFinan_Analisis_Correcciones - Fohrholtz_Gonzalez.pdf*, septiembre de 2026. Requisito funcional **RF01, registrar y consultar movimientos financieros**, con dos casos de uso: **CU-01, registrar movimiento financiero**, y **CU-02, consultar categorías y su detalle**. El actor principal es el Usuario.

En AE1 los cinco HTML eran un prototipo visual con datos de ejemplo. AE4 conserva su estructura semántica y sus estilos, pero cada pantalla pasa a ser una vista de la SPA alimentada por la API PHP.

## Pantallas AE1 → vistas de la SPA

| Pantalla AE1 | Vista AE4 en `index.html` | Módulo JS | Qué cambió |
|---|---|---|---|
| `index.html` (portada) | `#/inicio` (`#vista-inicio`) | `js/resumen.js` | Indicadores de ejemplo reemplazados por un resumen real por período y categoría; la demostración queda separada y señalizada |
| `listado_tabla.html` | `#/movimientos` (`#vista-movimientos`) | `js/listado.js` | Tabla de movimientos propios con acciones Editar y Eliminar |
| `listado_box.html` | `#/categorias` (`#vista-categorias`) | `js/categorias.js` | Tarjetas del catálogo con totales reales de la cuenta |
| `producto.html` (ficha fija de Alimentación) | `#/categorias/{id}` (`#vista-categoria`) | `js/categorias.js` | Detalle elegido por ID, con historial propio; no abre siempre la misma ficha |
| `comprar.html` | `#/registrar` (`#vista-registrar`) | `js/app.js` | Formulario con `fetch` POST y cálculo de tarifas |
| — (no existía) | `#/acceso` (`#vista-acceso`) | `js/acceso.js` | Registro, inicio y cierre de sesión |

Los HTML anteriores se conservan solo como redirecciones a la ruta equivalente de la SPA (`js/navegacion.js`), para que los enlaces antiguos sigan funcionando.

## Caso de uso → vista → API → modelo → tabla

| Caso de uso | Paso o flujo | Vista | Endpoint | Modelo / servicio | Tabla |
|---|---|---|---|---|---|
| Precondición común: usuario identificado | Registrarse e iniciar sesión | `#/acceso` | `GET api/sesion.php`, `POST api/registro.php`, `POST api/login.php`, `POST api/logout.php` | `UsuarioModel` | `usuarios` |
| **CU-01** Registrar movimiento | Pasos 6 a 10: completar y guardar | `#/registrar` | `POST api/mis_movimientos.php` (201) | `MovimientoService` (validación y cálculo) + `MovimientoModel::crear` | `movimientos` |
| CU-01 | FA-1: falta un campo obligatorio | `#/registrar` | Validación HTML5 en el cliente y del servidor: 400 con `mensaje` | `MovimientoService` | — |
| CU-01 | FA-2: salir sin guardar | Cualquier enlace de la navegación; no se envía nada | — | — | — |
| CU-01, ampliación del ciclo | Consultar los movimientos registrados | `#/movimientos` | `GET api/mis_movimientos.php` | `MovimientoModel::listarPorUsuario` | `movimientos` |
| CU-01, ampliación del ciclo | Editar un movimiento propio | `#/movimientos` (formulario de edición) | `PUT api/mis_movimientos.php?id=` | `MovimientoService` + `MovimientoModel::actualizar` | `movimientos` |
| CU-01, ampliación del ciclo | Eliminar un movimiento propio | `#/movimientos` (diálogo de confirmación) | `DELETE api/mis_movimientos.php?id=` | `MovimientoModel::eliminar` | `movimientos` |
| **CU-02** Consultar categorías | Pasos 1 y 2: listado con totales | `#/categorias` | `GET api/categorias.php` | `CategoriaModel::listarPorUsuario` (catálogo `data/categorias.json` + totales SQL) | `movimientos` |
| CU-02 | Pasos 3 y 4: detalle de la categoría elegida | `#/categorias/{id}` | `GET api/categorias.php?id={id}` | `CategoriaModel::buscarPorId` + `MovimientoModel::listarPorCategoria` | `movimientos` |
| CU-02 | FA-1: categoría sin movimientos | `#/categorias/{id}` | Mismo endpoint, totales 0 e historial vacío | `CategoriaModel` | — |
| CU-02 → CU-01 | Paso 5: registrar desde el detalle | Botón "Registrar movimiento" del detalle | Deriva en CU-01 | — | — |
| Resumen de portada (RF01, consultar) | Ingresos, gastos y saldo por período | `#/inicio` | `GET api/mis_movimientos.php` (sin endpoint adicional) | — | `movimientos` |

## Diferencias justificadas respecto de AE1

- **Datos personales del formulario.** En AE1, `comprar.html` pedía nombre, dirección, teléfono y e-mail en cada movimiento. En AE4 la identidad sale de la sesión (`$_SESSION`), y cada movimiento se asocia por `usuario_id`. Así se evita repetir datos personales y se cumple OWASP A01: cada usuario accede solo a lo suyo.
- **Presupuesto por categoría.** La postcondición de AE1 mencionaba actualizar un presupuesto, pero ese presupuesto era un valor fijo de la maqueta. AE4 no inventa cifras: el detalle muestra ingresos, gastos, saldo, cantidad e historial calculados a partir de los movimientos reales. Presupuestos, alertas y metas quedan como trabajo futuro.
- **Medio de pago y cuotas.** Se conservan las tarifas de AE2 (`data/tarifas.json`). El backend recalcula `ajuste`, `total` y `valorCuota`, y no acepta importes enviados por el cliente.
- **Requisitos no funcionales de AE1.** RNF03 (responsividad), RNF04 (estilos centralizados en `css/`) y RNF05 (etiquetas, fieldset/legend y elementos decorativos ocultos) se mantienen y se amplían con WCAG 2.1 en AE4 (ver `docs/calidad-iso25010.md`).
