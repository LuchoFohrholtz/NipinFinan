<?php
// Inicia la sesión con una cookie más segura:
// - httponly: JavaScript no puede leer la cookie (si hubiera un XSS no la roba)
// - samesite Lax: el navegador no la manda en POST desde otros sitios (CSRF)
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();
