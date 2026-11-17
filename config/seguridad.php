<?php
declare(strict_types=1);

// Inicia o recupera la sesión antes de trabajar con su token.
require_once __DIR__ . '/sesion.php';

// Devuelve un token válido y sólo lo genera cuando falta o es inválido.
function obtenerTokenCsrf(): string
{
    // Comprueba que el token guardado sea una cadena hexadecimal de longitud válida.
    if (!isset($_SESSION['csrf_token']) || !is_string($_SESSION['csrf_token'])
        || !preg_match('/^[a-f0-9]{64}$/D', $_SESSION['csrf_token'])) {
        // Genera treinta y dos bytes aleatorios y guarda su representación hexadecimal.
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

// Comprueba el token de las solicitudes que modifican datos.
function validarTokenCsrf(): void
{
    // Lee el encabezado recibido y el token esperado de la sesión.
    $recibido = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $esperado = $_SESSION['csrf_token'] ?? null;
    // Rechaza valores ausentes o distintos mediante comparación segura.
    if (!is_string($recibido) || !is_string($esperado) || $esperado === ''
        || !hash_equals($esperado, $recibido)) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['estado' => 'error', 'mensaje' => 'La verificación de seguridad no es válida.']);
        exit;
    }
}
