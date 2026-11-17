<?php
declare(strict_types=1);

// Recupera la sesión y prepara la respuesta JSON.
require_once __DIR__ . '/../config/seguridad.php';
header('Content-Type: application/json; charset=utf-8');

// Acepta únicamente solicitudes POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']);
    exit;
}
// Exige una sesión autenticada para cerrarla.
if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Acceso no autorizado. Iniciá sesión.']);
    exit;
}
// Comprueba el token antes de invalidar la sesión.
validarTokenCsrf();

// Invalida los datos y la cookie de la sesión actual.
$_SESSION = [];
// Vence la cookie conservando sus atributos de alcance y seguridad.
if (ini_get('session.use_cookies')) {
    $parametros = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 42000,
        'path' => $parametros['path'],
        'domain' => $parametros['domain'],
        'secure' => $parametros['secure'],
        'httponly' => $parametros['httponly'],
        'samesite' => $parametros['samesite'],
    ]);
}
// Destruye la sesión del servidor y confirma el cierre.
session_destroy();
echo json_encode(['estado' => 'exito', 'mensaje' => 'Sesión cerrada correctamente.']);
