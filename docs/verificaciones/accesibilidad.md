# Verificación de accesibilidad (WCAG 2.1) y navegación por teclado

Fecha: 16/11/2026. Incrementos J2, J3 y J5. Responsable: Juan Carlos Abente.

## Entorno

- Rama `ae4/juanqui-calidad`, creada desde `ae4-integracion` (`d9b0d0e`).
- PHP 8.3.6 (servidor de desarrollo) y MariaDB 10.11 con `sql/nipinfinan.sql` importado en una base temporal.
- Google Chrome 153 sin interfaz, Lighthouse 13.6.0 (solo categoría Accesibilidad), axe-core 4.14.1 (reglas WCAG 2.0/2.1 A y AA y buenas prácticas).
- Scripts reproducibles en `tests/a11y/`. **Esta verificación no reemplaza la captura oficial**, que se toma en XAMPP desde Chrome DevTools (ver la sección "Captura oficial").

## Hallazgos iniciales (versión integrada `d9b0d0e`)

| Vista | Puntaje | Problema | Criterio WCAG |
|---|---|---|---|
| Inicio (con y sin sesión) | 96 | Texto secundario `#64748b` sobre `#eff6ff` y `#f5f7fa`: contraste 4,37:1 y 4,43:1 | 1.4.3 Contraste mínimo (4,5:1) |
| Movimientos | 96 | Importes de ingresos `#16a34a` sobre blanco: 3,29:1 | 1.4.3 |
| Detalle de categoría de ingreso (Sueldo) | 96 | Mismo verde en el total de ingresos | 1.4.3 |
| Navegación en móvil | — | Enlaces de 17 px de alto (mínimo 24 px) | 2.5.8 Tamaño del objetivo |
| `index.html` | — | `:focus-visible` y estilos de vistas dentro de un bloque `<style>` del HTML | Consigna 4.A (desacoplamiento) |

## Correcciones

| Commit | Cambio |
|---|---|
| `style(a11y): mover foco visible y estilos de vistas a hojas CSS` | Reglas de foco, salto de contenido y texto para lectores en `css/style.css`; ajustes de vistas en `css/vistas.css`. El HTML queda sin estilos embebidos. |
| `fix(a11y): corregir contraste AA y tamaño táctil de enlaces` | `#64748b` → `#475569` (6,96:1 sobre `#eff6ff`); `#16a34a` → `#15803d` (5,0:1 sobre blanco); enlaces de navegación de 25 px de alto y botones de 24 px como mínimo. |

## Resultado de Lighthouse después de las correcciones

`node tests/a11y/lighthouse-vistas.mjs <URL>`: crea una cuenta de prueba, registra un gasto en efectivo, un ingreso y un gasto en 12 cuotas con marcado HTML en la descripción, y audita cada ruta.

| Ruta | Sin sesión, móvil | Sin sesión, escritorio | Con sesión, móvil | Con sesión, escritorio |
|---|---|---|---|---|
| `#/inicio` | 100 | 100 | 100 | 100 |
| `#/acceso` | 100 | 100 | — | — |
| `#/registrar` | — | — | 100 | 100 |
| `#/movimientos` | — | — | 100 | 100 |
| `#/categorias` | — | — | 100 | 100 |
| `#/categorias/alimentacion` | — | — | 100 | 100 |
| `#/categorias/sueldo` | — | — | 100 | 100 |
| `#/categorias/salud` (sin movimientos) | — | — | 100 | 100 |

axe-core sin violaciones en el listado de movimientos, el formulario de edición abierto, el diálogo de confirmación de baja y el formulario de alta enviado vacío (mensajes de error visibles).

## Recorrido solo con teclado

`node tests/a11y/teclado.mjs <URL> <email> <contraseña>`. Teclas usadas: Tab, Enter, flechas (en listas desplegables) y Escape.

| Paso | Resultado observado |
|---|---|
| Primer Tab | Enfoca "Saltar al contenido", con contorno visible de 3 px |
| Tab hasta "Ingresar" + Enter | Abre `#/acceso` y el foco pasa al título "Mi cuenta" |
| Email, contraseña + Enter | Inicia sesión, vuelve a Inicio y muestra el nombre del usuario |
| Enlace "Registrar" + Enter | Abre `#/registrar` con el foco en el título de la vista |
| Completar el formulario y elegir categoría y medio de pago con flechas + Enter en "Guardar" | La región `aria-live` anuncia "Movimiento guardado correctamente. Total: $1.350." (descuento del 10 % en efectivo) |
| Enlace "Movimientos" + Enter | El nuevo movimiento aparece primero; foco en el título |
| "Eliminar" + Enter | Se abre el diálogo de confirmación con el foco en "Cancelar" |
| Escape | Se cierra el diálogo y el foco vuelve al botón "Eliminar" de origen |
| "Categorías" → tarjeta "Alimentación" + Enter | Abre `#/categorias/alimentacion` con sus totales e historial reales |
| "Cerrar sesión" + Enter | Termina la sesión y vuelve a mostrar "Ingresar" |
| Todo el recorrido | El documento no se recarga: una variable JS creada al inicio se conserva (SPA) |

En todos los pasos, el elemento enfocado tiene contorno (`outline`) sólido de 3 px provisto por `:focus-visible`.

## Prevención de XSS observada desde la interfaz

Un movimiento con la descripción `<img src=x onerror=alert(1)> Heladera` se muestra como texto literal en el listado; no se crea ningún elemento `<img>` en la vista (`.textContent`).

## Capturas finales en XAMPP

El [informe final AE4](../Informe_AE4_NipinFinan.pdf), incorporado el 17/11/2026, contiene las capturas de Chrome DevTools sobre XAMPP: Inicio (página 16), Movimientos (17) y Categorías (18), con Accesibilidad 100. La inspección de red del alta de un movimiento está en la página 20. Estas imágenes complementan la auditoría automatizada documentada arriba; su incorporación no representa una nueva ejecución de las pruebas.

### Cómo repetir la captura

1. Abrir `http://localhost/NipinFinan/` en Chrome, en una ventana de incógnito para que las extensiones no alteren el resultado.
2. F12 → pestaña **Lighthouse** → Mode *Navigation*, Device *Desktop*, Categories: solo **Accessibility** → *Analyze page load*.
3. Repetir en `#/movimientos` y `#/categorias` con la sesión iniciada. Guardar las capturas en `docs/evidencias/`.
