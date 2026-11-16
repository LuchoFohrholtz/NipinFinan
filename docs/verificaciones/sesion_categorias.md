# Verificación de sesión CSRF y categorías

Fecha: 15/11/2026. Incrementos S7 y S8.

## Resultado

Se verificaron 219 casos o comprobaciones, todos correctos, distribuidos entre cinco baterías. Apache/PHP 8.2.12 de XAMPP y MariaDB 10.4.32 aislada en HTTP 18173 y DB 33173. Las cuentas y los cambios de base corresponden a un entorno temporal separado de las bases habituales.

| Batería | Correctos | Total |
|---|---|---|
| Sesión y categorías | 44 | 44 |
| CRUD con token real | 134 | 134 |
| Autenticación con token real | 24 | 24 |
| SPA de Luciano | 9 | 9 |
| Instalación limpia y Singleton | 8 | 8 |

## Alcance

- Sesión pública, token estable por sesión y distinto entre clientes, HttpOnly/SameSite y no-store.
- Rechazo 403 sin token o con token incorrecto/ajeno; rechazo 401 anterior a CSRF en recursos privados anónimos.
- Login rota token e identificador; logout invalida sesión y permite obtener una sesión anónima nueva.
- Regresión de las validaciones y del CRUD completo enviando token real en cada escritura.
- Categorías con total calculado desde total persistido, todos los períodos, detalle, orden, estados vacíos e aislamiento entre dos cuentas.
- Edición/baja se reflejan en los agregados; categorías históricas no reconocidas siguen en listado general y no se inventan nuevas entradas de catálogo.
- PDO Singleton con constructor privado y mismo objeto en dos llamadas de una petición de prueba.
- Importación del SQL en una base nueva temporal, alta de cuenta, login, consulta vacía, movimiento, categoría y logout. La configuración se restauró y sólo esa base nueva se eliminó al terminar.
- Fallos PDO de categorías y detalle simulados en la base temporal y restaurados con finally.

## Integración con frontend

Se revisó origin/ae4/lucho-spa en 0f6217c y se copiaron sus cambios de interfaz a una vista previa temporal con este backend. Sólo en esa copia se configuró CSRF_REQUERIDO=true. En Chrome sin interfaz se probó registro, login, alta y logout desde los controles, y categorías/PUT/DELETE desde su helper HTTP, sin errores JavaScript sin capturar. No se modificó la rama del compañero ni se hizo merge a main.

Un primer intento de la herramienta de prueba esperaba una URL hash con una barra incorrecta; se corrigió el patrón de espera. Un dato histórico generado por consola tenía una diferencia de codificación; se corrigió esa fixture. Las baterías finales indicadas arriba pasaron completas. No se atribuyeron esos ajustes a cambios funcionales de la aplicación.

## Pendiente compartido

Al unir ramas activar CSRF en el helper real y repetir los flujos integrados. Los controles visuales de edición/baja y categorías no se consideran terminados por haber usado sus endpoints desde el helper. Faltan auditoría final de accesibilidad, matriz, PDF y ZIP. No se ejecutó Lighthouse en este incremento. La importación limpia comprueba backend y esquema; no acredita la instalación final de todas las vistas en htdocs.
