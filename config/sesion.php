<?php
declare(strict_types=1); // Activa el control estricto de tipos en las llamadas de este archivo.

// Configura la cookie antes de recuperar la sesión.
if (session_status() === PHP_SESSION_NONE) { // Configura e inicia la sesión sólo si aún no está activa.
    // Restringe el uso de sesión a identificadores válidos enviados por cookie.
    ini_set('session.use_strict_mode', '1'); // Rechaza identificadores de sesión que el servidor no reconoce.
    ini_set('session.use_only_cookies', '1'); // Transporta el identificador únicamente mediante cookies.
    // Configura duración, alcance, HTTPS, HttpOnly y SameSite (limita el envio de la cookie en pedidos originados de otros sitios) de la cookie.
    session_set_cookie_params([ // Llama a session_set_cookie_params con los datos indicados.
        'lifetime' => 0, // Crea una cookie de sesión, normalmente hasta cerrar el navegador.
        'path' => '/', // Permite enviar la cookie a las rutas de este sitio.
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', // Exige HTTPS para enviar la cookie cuando la conexión usa HTTPS.
        'httponly' => true, // Impide que JavaScript lea la cookie de sesión.
        'samesite' => 'Lax', // Limita el envío de la cookie en solicitudes originadas desde otros sitios.
    ]); // Completa la estructura o llamada iniciada arriba.
    // Inicia una sesión o recupera sus datos mediante la cookie.
    session_start(); // Recupera o crea la sesión del servidor y habilita $_SESSION.
} // Finaliza este bloque.
// Evita almacenar en caché las respuestas asociadas a la sesión.
header('Cache-Control: no-store'); // Indica que la respuesta no debe guardarse en caché.
