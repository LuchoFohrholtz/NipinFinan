<?php
declare(strict_types=1);

// Declara respuestas JSON y acepta únicamente GET.
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']);
    exit;
}

// Recupera una sesión existente o prepara una sesión anónima.
require_once __DIR__ . '/../config/seguridad.php';
// Expone sólo nombre y correo cuando existe una cuenta autenticada.
$usuario = isset($_SESSION['usuario_id']) ? [
    'nombre' => $_SESSION['usuario_nombre'],
    'email' => $_SESSION['usuario_email'],
] : null;

// Entrega el estado público y el token para preparar futuras escrituras.
echo json_encode([
    'estado' => 'exito',
    'usuario' => $usuario,
    'csrfToken' => obtenerTokenCsrf(),
], JSON_UNESCAPED_UNICODE);
