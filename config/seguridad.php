<?php
// Activa el control estricto de tipos en las llamadas de este archivo.
declare(strict_types=1);

// Continúa en sesion.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/sesion.php';

// Devuelve el token de sesión y lo crea si falta o es inválido.
function obtenerTokenCsrf(): string
{
    // Comprueba que el token guardado sea una cadena hexadecimal de longitud válida.
    if (!isset($_SESSION['csrf_token']) || !is_string($_SESSION['csrf_token'])
        // Agrega otra condición a la comprobación de la línea anterior.
        || !preg_match('/^[a-f0-9]{64}$/D', $_SESSION['csrf_token'])) {
        // Guarda el token aleatorio; api/sesion.php lo entrega al cliente.
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    // Devuelve el token a api/sesion.php o a la respuesta del login.
    return $_SESSION['csrf_token'];
}

// Compara la cabecera X-CSRF-Token con el token de $_SESSION.
function validarTokenCsrf(): void
{
    // Lee X-CSRF-Token enviado por js/api.js.
    $recibido = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    // Obtiene el token esperado desde la sesión del servidor.
    $esperado = $_SESSION['csrf_token'] ?? null;
    // Rechaza valores ausentes o distintos mediante comparación segura.
    if (!is_string($recibido) || !is_string($esperado) || $esperado === ''
        // Compara ambos tokens de forma resistente a diferencias de tiempo.
        || !hash_equals($esperado, $recibido)) {
        // Establece HTTP 403: petición no autorizada.
        http_response_code(403);
        // Responde JSON con codificación UTF-8.
        header('Content-Type: application/json; charset=utf-8');
        // Envía los datos al navegador en JSON.
        echo json_encode(['estado' => 'error', 'mensaje' => 'La verificación de seguridad no es válida.']);
        // Termina la petición.
        exit;
    }
}
