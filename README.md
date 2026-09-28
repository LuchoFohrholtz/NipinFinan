# NipinFinan

Sistema de Gestión y Análisis de Economía Personal — aplicación web para
registrar, organizar y analizar ingresos y gastos personales, con
presupuestos por categoría, alertas y objetivos de ahorro.

Este repositorio corresponde a la materia **Paradigmas y Lenguajes de
Programación III** — Comisión "A" — Universidad de la Cuenca del Plata.

## Equipo

- Luciano Fohrholtz
- Santiago Gonzalez

## Pantallas

| Archivo               | Descripción                                                |
|------------------------|-------------------------------------------------------------|
| `index.html`           | Portada principal                                           |
| `listado_tabla.html`   | Listado de movimientos guardados (tabla + totales)          |
| `listado_box.html`     | Listado de categorías en formato de tarjetas                |
| `producto.html`        | Ficha detallada de una categoría en particular              |
| `comprar.html`         | Registro de un movimiento + calculadora de tarifas          |
| `cupones.html`         | Validación de cupones de descuento                          |

## AE2 - Calculador de Tarifas, Presupuestos y Descuentos (Opción 5)

El módulo que se enriqueció con JavaScript es el formulario de registro de
movimientos (`comprar.html` + `js/app.js`).

**Cómo funciona:**

1. Al cargar la página se hace un `fetch()` (con `async/await`) a
   `data/tarifas.json`, que tiene la tabla de descuentos por medio de pago,
   el interés por cuotas y los cupones.
2. Con `addEventListener('change', ...)` se escuchan los cambios en el tipo
   de movimiento, el medio de pago y la cantidad de cuotas (y `input` en el
   monto para que se actualice mientras se escribe).
3. Con cada cambio se recalcula el presupuesto de forma condicional:
   - Ingreso: no lleva descuento ni cuotas.
   - Gasto en efectivo / transferencia: se aplica el descuento del JSON.
   - Gasto con tarjeta de crédito: se muestran las cuotas y se suma el
     interés que corresponda.
4. El subtotal, el descuento/recargo, el total y el valor de cada cuota se
   actualizan en el DOM.
5. Al guardar, el movimiento se almacena en `localStorage` y aparece en
   `listado_tabla.html`.

No hay atributos `onclick` ni `onsubmit` en el HTML, todos los eventos se
registran desde los archivos JS.

> Como se usa `fetch()` sobre un archivo local, el proyecto hay que abrirlo
> con un servidor (por ejemplo Live Server de VS Code). Abriendo el HTML con
> doble click el navegador bloquea la petición.

## Fundamentación U1 - Estructura EORM de la Tarifa / Promoción

Se modela la tarifa como un objeto con sus **atributos** (los datos que
vienen del JSON) y su **comportamiento** (las operaciones que se hacen con
esos datos en `app.js`).

### Entidad: Tarifa

| Atributo       | Tipo    | Descripción                                           |
|----------------|---------|-------------------------------------------------------|
| `medios_pago`  | objeto  | Lista de medios de pago, cada uno con su `descuento`  |
| `cuotas`       | objeto  | Cantidad de cuotas → porcentaje de interés            |
| `cupones`      | objeto  | Código de cupón → promoción                           |

### Entidad: MedioPago

| Atributo     | Tipo    | Ejemplo                  |
|--------------|---------|--------------------------|
| nombre       | string  | `"Efectivo"`             |
| `descuento`  | número  | `0.10` (10%)             |

### Entidad: PlanCuotas

| Atributo   | Tipo    | Ejemplo                    |
|------------|---------|----------------------------|
| cantidad   | número  | `3`, `6`, `12`             |
| interés    | número  | `0.08`, `0.18`, `0.35`     |

### Entidad: Promoción (Cupón)

| Atributo     | Tipo     | Ejemplo      |
|--------------|----------|--------------|
| código       | string   | `"UCP10"`    |
| `descuento`  | número   | `0.10`       |
| `vigente`    | booleano | `true`       |

### Comportamiento

| Operación                     | Dónde                | Qué hace                                                  |
|-------------------------------|----------------------|-----------------------------------------------------------|
| `cargarTarifas()`             | `js/app.js`          | Trae la tabla de tarifas con `fetch()`                    |
| `calcular()`                  | `js/app.js`          | Aplica descuento e interés según tipo, medio y cuotas     |
| `mostrarCuotasSiCorresponde()`| `js/app.js`          | Muestra las cuotas solo si es gasto con tarjeta de crédito|
| `actualizarResultado()`       | `js/app.js`          | Escribe subtotal, ajuste, total y valor de cuota en el DOM|
| `validarCupon()`              | `js/cupones.js`      | Verifica si el código existe y está vigente               |

### Relaciones

- Un **Movimiento** (gasto) usa un **MedioPago** y, si es con tarjeta de
  crédito, un **PlanCuotas**.
- La **Tarifa** agrupa todos los medios de pago, planes de cuotas y
  promociones.

**Fórmula usada:**

```
total = monto × (1 − descuento del medio de pago) × (1 + interés de las cuotas)
valor de cuota = total / cantidad de cuotas
```

Ejemplo: $10.000 en efectivo → $9.000. $10.000 con crédito en 12 cuotas →
$13.500 (12 cuotas de $1.125).

## Estructura

```
NipinFinan/
├── css/style.css
├── data/tarifas.json    # tabla de tarifas, cuotas y cupones
├── js/app.js            # calculadora y registro de movimientos
├── js/listado.js        # listado de movimientos (localStorage)
├── js/cupones.js        # validación de cupones
└── *.html
```

## Tecnologías

- HTML5 semántico
- CSS3 (Flexbox, CSS Grid)
- JavaScript (addEventListener, fetch + async/await, localStorage)

## Documento de análisis y diseño

El documento con el análisis funcional y el diseño de la aplicación
(avances) se encuentra adjunto en la entrega del TP correspondiente.
