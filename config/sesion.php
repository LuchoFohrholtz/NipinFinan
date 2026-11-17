<?php
declare(strict_types=1);

// Configura la cookie antes de recuperar la sesión.
if (session_status() === PHP_SESSION_NONE) {
    // Restringe el uso de sesión a identificadores válidos enviados por cookie.
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    // Configura duración, alcance, HTTPS, HttpOnly y SameSite de la cookie.
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    // Inicia una sesión o recupera sus datos mediante la cookie.
    session_start();
}
// Evita almacenar en caché las respuestas asociadas a la sesión.
header('Cache-Control: no-store');
