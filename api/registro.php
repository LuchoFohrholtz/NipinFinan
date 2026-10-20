<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["estado" => "error", "mensaje" => "Método no permitido."]);
    exit;
}

// Lectura del JSON que manda el fetch() del frontend
$input = json_decode(file_get_contents('php://input'), true);

// El nombre se guarda tal cual lo escribió el usuario: el XSS se evita al
// mostrarlo con textContent en app.js (si lo escapáramos acá con
// htmlspecialchars se vería "&lt;" en pantalla).
$nombre   = trim($input['nombre'] ?? '');
$email    = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

if ($nombre === '' || $email === '' || $password === '') {
    http_response_code(400); // Bad Request
    echo json_encode(["estado" => "error", "mensaje" => "Todos los campos son obligatorios."]);
    exit;
}

if (mb_strlen($nombre) > 100) {
    http_response_code(400);
    echo json_encode(["estado" => "error", "mensaje" => "El nombre puede tener hasta 100 caracteres."]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) {
    http_response_code(400);
    echo json_encode(["estado" => "error", "mensaje" => "Ingresá un correo electrónico válido."]);
    exit;
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(["estado" => "error", "mensaje" => "La contraseña debe tener al menos 6 caracteres."]);
    exit;
}

// Cifrado BCRYPT de la contraseña (nunca se guarda en texto plano)
$passwordHash = password_hash($password, PASSWORD_BCRYPT);

require_once '../config/conexion.php';

try {
    $sql = "INSERT INTO usuarios (nombre, email, password) VALUES (:nombre, :email, :pass)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'nombre' => $nombre,
        'email'  => $email,
        'pass'   => $passwordHash
    ]);

    http_response_code(201); // Created
    echo json_encode(["estado" => "exito", "mensaje" => "Usuario registrado correctamente."]);

} catch (PDOException $e) {
    if ($e->getCode() == 23000) {
        http_response_code(409); // Conflict (email duplicado)
        echo json_encode(["estado" => "error", "mensaje" => "El correo electrónico ya está registrado."]);
    } else {
        http_response_code(500);
        echo json_encode(["estado" => "error", "mensaje" => "Error interno al registrar el usuario."]);
    }
}
