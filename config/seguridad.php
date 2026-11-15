<?php
declare(strict_types=1);

require_once __DIR__ . '/sesion.php';

function obtenerTokenCsrf(): string
{
    if (!isset($_SESSION['csrf_token']) || !is_string($_SESSION['csrf_token'])
        || !preg_match('/^[a-f0-9]{64}$/D', $_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function validarTokenCsrf(): void
{
    $recibido = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $esperado = $_SESSION['csrf_token'] ?? null;
    if (!is_string($recibido) || !is_string($esperado) || $esperado === ''
        || !hash_equals($esperado, $recibido)) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['estado' => 'error', 'mensaje' => 'La verificación de seguridad no es válida.']);
        exit;
    }
}
