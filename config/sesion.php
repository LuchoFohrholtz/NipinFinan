<?php
// Activa el control estricto de tipos en las llamadas de este archivo.
declare(strict_types=1);

// Configura la cookie antes de recuperar la sesión.
if (session_status() === PHP_SESSION_NONE) {
    // Rechaza identificadores de sesión que el servidor no reconoce.
    ini_set('session.use_strict_mode', '1');
    // Transporta el identificador únicamente mediante cookies.
    ini_set('session.use_only_cookies', '1');
    // Llama a session_set_cookie_params con los datos indicados.
    session_set_cookie_params([
        // Crea una cookie de sesión, normalmente hasta cerrar el navegador.
        'lifetime' => 0,
        // Permite enviar la cookie a las rutas de este sitio.
        'path' => '/',
        // Exige HTTPS para enviar la cookie cuando la conexión usa HTTPS.
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        // Impide que JavaScript lea la cookie de sesión.
        'httponly' => true,
        // Limita el envío de la cookie en solicitudes originadas desde otros sitios.
        'samesite' => 'Lax',
    ]);
    // Recupera o crea la sesión del servidor y habilita $_SESSION.
    session_start();
}
// Indica que la respuesta no debe guardarse en caché.
header('Cache-Control: no-store');
