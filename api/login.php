<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'));
if (!is_object($input)
    || !isset($input->email, $input->password)
    || !is_string($input->email)
    || !is_string($input->password)) {
    http_response_code(400);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Los datos de acceso no son válidos.']);
    exit;
}

$email = trim($input->email);
$password = $input->password;

if ($email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Ingresá correo y contraseña.']);
    exit;
}

require_once __DIR__ . '/../config/conexion.php';
require_once __DIR__ . '/../models/UsuarioModel.php';

try {
    $usuarios = new UsuarioModel($pdo);
    $usuario = $usuarios->buscarPorEmail($email);

    if ($usuario !== null && password_verify($password, $usuario['password'])) {
        require_once __DIR__ . '/../config/sesion.php';
        session_regenerate_id(true);

        $_SESSION['usuario_id'] = $usuario['id'];
        $_SESSION['usuario_nombre'] = $usuario['nombre'];
        $_SESSION['usuario_email'] = $usuario['email'];

        http_response_code(200);
        echo json_encode([
            'estado' => 'exito',
            'mensaje' => 'Autenticación exitosa.',
            'usuario' => [
                'nombre' => $usuario['nombre'],
                'email' => $usuario['email'],
            ],
        ], JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(401);
        echo json_encode(['estado' => 'error', 'mensaje' => 'Correo o contraseña incorrectos.']);
    }
} catch (PDOException $error) {
    error_log('Inicio de sesión: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Error interno del servidor.']);
}
