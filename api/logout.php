<?php
// Activa el control estricto de tipos en las llamadas de este archivo.
declare(strict_types=1);

// Continúa en ../config/seguridad.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../config/seguridad.php';
// Responde JSON con codificación UTF-8.
header('Content-Type: application/json; charset=utf-8');

// Acepta únicamente solicitudes POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    // Establece HTTP 405: método no permitido.
    http_response_code(405);
    // Informa qué métodos HTTP admite este endpoint.
    header('Allow: POST');
    // Envía los datos al navegador en JSON.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']);
    // Termina la petición.
    exit;
}
// Impide acceder al endpoint privado si no hay una cuenta autenticada.
if (!isset($_SESSION['usuario_id'])) {
    // Establece HTTP 401: autenticación requerida o incorrecta.
    http_response_code(401);
    // Envía los datos al navegador en JSON.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Acceso no autorizado. Iniciá sesión.']);
    // Termina la petición.
    exit;
}
// Continúa en config/seguridad.php; un token inválido termina con HTTP 403.
validarTokenCsrf();

// Guarda _SESSION.
$_SESSION = [];
// Vence la cookie conservando sus atributos de alcance y seguridad.
if (ini_get('session.use_cookies')) {
    // Guarda parametros.
    $parametros = session_get_cookie_params();
    // Actualiza o elimina la cookie del navegador con los parámetros indicados.
    setcookie(session_name(), '', [
        // Incluye el campo expires.
        'expires' => time() - 42000,
        // Incluye el campo path.
        'path' => $parametros['path'],
        // Incluye el campo domain.
        'domain' => $parametros['domain'],
        // Incluye el campo secure.
        'secure' => $parametros['secure'],
        // Incluye el campo httponly.
        'httponly' => $parametros['httponly'],
        // Incluye el campo samesite.
        'samesite' => $parametros['samesite'],
    ]);
}
// Elimina los datos persistidos de la sesión del servidor.
session_destroy();
// Envía los datos al navegador en JSON.
echo json_encode(['estado' => 'exito', 'mensaje' => 'Sesión cerrada correctamente.']);
