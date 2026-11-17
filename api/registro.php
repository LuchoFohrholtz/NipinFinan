<?php
declare(strict_types=1);

// Declara respuestas JSON UTF-8.
header('Content-Type: application/json; charset=utf-8');

// Acepta únicamente solicitudes POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']);
    exit;
}

// Recupera la sesión y exige un token CSRF válido.
require_once __DIR__ . '/../config/seguridad.php';
validarTokenCsrf();

// Lee el JSON y comprueba la presencia y el tipo de los campos.
$input = json_decode(file_get_contents('php://input'));
if (!is_object($input)
    || !isset($input->nombre, $input->email, $input->password)
    || !is_string($input->nombre)
    || !is_string($input->email)
    || !is_string($input->password)) {
    http_response_code(400);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Los datos de registro no son válidos.']);
    exit;
}

// Quita espacios externos de nombre y correo.
$nombre = trim($input->nombre);
$email = trim($input->email);
$password = $input->password;

// Rechaza campos obligatorios vacíos.
if ($nombre === '' || $email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Todos los campos son obligatorios.']);
    exit;
}

// Limita el nombre a cien caracteres.
if (mb_strlen($nombre) > 100) {
    http_response_code(400);
    echo json_encode(['estado' => 'error', 'mensaje' => 'El nombre puede tener hasta 100 caracteres.']);
    exit;
}

// Comprueba el formato y la longitud del correo.
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) {
    http_response_code(400);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Ingresá un correo electrónico válido.']);
    exit;
}

// Limita la contraseña a entre ocho y setenta y dos bytes sin nulos.
if (strlen($password) < 8 || strlen($password) > 72 || str_contains($password, "\0")) {
    http_response_code(400);
    echo json_encode([
        'estado' => 'error',
        'mensaje' => 'La contraseña debe tener entre 8 y 72 bytes y no incluir caracteres nulos.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Carga PDO y el modelo de usuarios.
require_once __DIR__ . '/../config/conexion.php';
require_once __DIR__ . '/../models/UsuarioModel.php';

// Genera el hash y persiste la cuenta sin iniciar sesión automáticamente.
try {
    $usuarios = new UsuarioModel($pdo);
    // Transforma la contraseña en un hash BCRYPT antes de guardarla.
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $usuarios->crear($nombre, $email, $passwordHash);

    // Confirma la creación mediante HTTP 201.
    http_response_code(201);
    echo json_encode([
        'estado' => 'exito',
        'mensaje' => 'Usuario registrado correctamente.',
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $error) {
    // Distingue el correo duplicado de otros errores de base de datos.
    if ($error->getCode() === '23000' && (int) ($error->errorInfo[1] ?? 0) === 1062) {
        // Devuelve 409 cuando el correo ya está registrado.
        http_response_code(409);
        echo json_encode(['estado' => 'error', 'mensaje' => 'El correo electrónico ya está registrado.']);
    } else {
        // Registra otros fallos de PDO y devuelve un mensaje general.
        error_log('Registro de usuario: ' . $error->getMessage());
        http_response_code(500);
        echo json_encode(['estado' => 'error', 'mensaje' => 'Error interno al registrar el usuario.']);
    }
}
