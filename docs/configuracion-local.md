# Configuración de la conexión local

El proyecto usa MySQL en `127.0.0.1:3306`, base `nipinfinan`, usuario `root` y contraseña vacía como valores iniciales para XAMPP.

Si una instalación tiene otro puerto o credenciales, crear `config/conexion.local.php`:

```php
<?php
return [
    'port' => 3307,
];
```

Se pueden reemplazar también `host`, `database`, `user` y `password`. Incluir únicamente los valores que cambian. Este archivo está excluido de Git y no debe agregarse al repositorio ni al ZIP con credenciales personales.

Para ejecutar la aplicación, iniciar Apache y MySQL en XAMPP, importar `sql/nipinfinan.sql` y servir el proyecto desde Apache. Los cambios de puerto de una computadora no deben trasladarse a la configuración compartida de los demás integrantes.
