<?php
// Activa el control estricto de tipos en las llamadas de este archivo.
declare(strict_types=1);

// Responde JSON con codificación UTF-8.
header('Content-Type: application/json; charset=utf-8');
// Comprueba esta condición.
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    // Establece HTTP 405: método no permitido.
    http_response_code(405);
    // Informa qué métodos HTTP admite este endpoint.
    header('Allow: GET');
    // Envía los datos al navegador en JSON.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']);
    // Termina la petición.
    exit;
}

// Continúa en ../config/seguridad.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../config/seguridad.php';
// Guarda identidad del usuario.
$usuario = isset($_SESSION['usuario_id']) ? [
    // Incluye el nombre de la cuenta.
    'nombre' => $_SESSION['usuario_nombre'],
    // Incluye el correo de la cuenta.
    'email' => $_SESSION['usuario_email'],
] : null;

// Envía los datos al navegador en JSON.
echo json_encode([
    // Incluye el indicador de éxito o error de la respuesta.
    'estado' => 'exito',
    // Incluye los datos públicos de la cuenta.
    'usuario' => $usuario,
    // Incluye el token que js/api.js guardará para las siguientes escrituras.
    'csrfToken' => obtenerTokenCsrf(),
], JSON_UNESCAPED_UNICODE);
