# Integración de la SPA con el backend

## Ramas

Backend: `ae4/santi-backend`. Frontend revisado: `origin/ae4/lucho-spa` en `0f6217c`. La combinación se verifica sobre una copia temporal, sin cambiar la rama de Luciano ni mezclar automáticamente en main.

## Activación de sesión y CSRF

En `js/api.js` de la SPA cambiar `const CSRF_REQUERIDO = false;` por `true` al integrar este backend. Su helper ya obtiene la sesión antes de enviar, agrega `X-CSRF-Token`, adopta el token nuevo del login y limpia el anterior al cerrar sesión. No mantener el indicador en false con la validación del servidor activa: los envíos sin token responderán 403.

`GET api/sesion.php` responde con usuario o null y csrfToken real. Es la ruta pública de preparación; GET movimientos sigue siendo privado. Se puede conservar `consultarSesion` basado en GET movimientos porque ese formato no cambió. No sustituir ese resultado por el JSON de sesión sin adaptar los consumidores que esperan `movimientos`.

El token vive en memoria y en la sesión del servidor; no ponerlo en URLs, localStorage ni credenciales de prueba fijas. Todos los POST/PUT/DELETE, incluidos registro y login, envían el token. Los GET no lo necesitan. Un rechazo 401 significa sesión no autenticada; 403 significa verificación CSRF fallida. No reintentar automáticamente una escritura fallida como si no hubiera ocurrido: permitir recuperación y confirmación del usuario.

## Movimientos y categorías

Las rutas, campos y códigos se describen en [contrato-api.md](contrato-api.md). PUT requiere el cuerpo completo y recalcula importes; DELETE usa el id de URL. Después de modificar o eliminar, refrescar movimientos, resumen y vistas dependientes; si se utiliza el helper genérico, invalidar o recargar su consulta compartida.

`GET api/categorias.php` devuelve las diez categorías y sus agregados de la cuenta. `GET api/categorias.php?id=alimentacion` devuelve categoría y movimientos propios. Usar el slug para navegar y el nombre textual para el campo categoria del movimiento. Un catálogo válido sin datos devuelve ceros y lista vacía. No agregar presupuestos inventados.

## Alcance de la interfaz

Los cupones fueron retirados de la aplicación por decisión del equipo; conservar esa eliminación al combinar las ramas. No reincorporar enlaces, páginas, scripts ni datos de promoción. Las tarifas por medio de pago y cuotas siguen vigentes.

La prueba conjunta cubre registro, login, alta y logout desde la SPA y consultas/edición/baja por su helper HTTP. Los controles visuales de categorías, editar y borrar continúan a cargo de la integración del frontend. Los tres integrantes deben recorrer y explicar el funcionamiento completo.

## Resolución del enlace Registrar al combinar ramas

La simulación de unión entre el backend 11c0386 y origin/ae4/lucho-spa 0f6217c detectó un único conflicto de contenido en index.html, limitado al enlace Registrar. Conservar la versión de la SPA:

```html
<li><a href="index.html#/registrar" data-ruta="registrar">Registrar</a></li>
```

No conservar el enlace anterior a comprar.html en ese menú ni reincorporar el módulo retirado. El resto de los archivos se combinó automáticamente en la simulación. No se realizó un merge real ni se modificaron las ramas del compañero o de integración. La vista previa utilizada en las pruebas ya usa ese enlace de la SPA.
