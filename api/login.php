<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["estado" => "error", "mensaje" => "Método no permitido."]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$email    = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

if ($email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(["estado" => "error", "mensaje" => "Ingresá correo y contraseña."]);
    exit;
}

require_once '../config/conexion.php';

try {
    $stmt = $pdo->prepare('SELECT id, nombre, email, password FROM usuarios WHERE email = :email');
    $stmt->execute(['email' => $email]);
    $usuario = $stmt->fetch();

    // password_verify compara la contraseña con el hash BCRYPT guardado
    if ($usuario && password_verify($password, $usuario['password'])) {
        require_once '../config/sesion.php'; // session_start()

        // Nuevo id de sesión para evitar fijación de sesión (session fixation)
        session_regenerate_id(true);

        $_SESSION['usuario_id']     = $usuario['id'];
        $_SESSION['usuario_nombre'] = $usuario['nombre'];
        $_SESSION['usuario_email']  = $usuario['email'];

        http_response_code(200);
        echo json_encode([
            "estado"  => "exito",
            "mensaje" => "Autenticación exitosa.",
            "usuario" => [
                "nombre" => $usuario['nombre'],
                "email"  => $usuario['email']
            ]
        ], JSON_UNESCAPED_UNICODE);
    } else {
        // Mismo mensaje si falla el correo o la contraseña (no damos pistas)
        http_response_code(401); // Unauthorized
        echo json_encode(["estado" => "error", "mensaje" => "Correo o contraseña incorrectos."]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["estado" => "error", "mensaje" => "Error interno del servidor."]);
}
