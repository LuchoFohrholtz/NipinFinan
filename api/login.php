<?php
declare(strict_types=1);

// Declara que las respuestas contienen JSON UTF-8.
header('Content-Type: application/json; charset=utf-8');

// Acepta únicamente solicitudes POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']);
    exit;
}

// Recupera la sesión y comprueba el token CSRF.
require_once __DIR__ . '/../config/seguridad.php';
validarTokenCsrf();

// Lee el cuerpo JSON y comprueba los tipos de los campos.
$input = json_decode(file_get_contents('php://input'));
if (!is_object($input)
    || !isset($input->email, $input->password)
    || !is_string($input->email)
    || !is_string($input->password)) {
    http_response_code(400);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Los datos de acceso no son válidos.']);
    exit;
}

// Normaliza el correo y conserva la contraseña tal como se recibió.
$email = trim($input->email);
$password = $input->password;

// Rechaza campos obligatorios vacíos.
if ($email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Ingresá correo y contraseña.']);
    exit;
}

// Carga PDO y el modelo que consulta usuarios.
require_once __DIR__ . '/../config/conexion.php';
require_once __DIR__ . '/../models/UsuarioModel.php';

// Busca la cuenta y procesa la autenticación.
try {
    $usuarios = new UsuarioModel($pdo);
    $usuario = $usuarios->buscarPorEmail($email);

    // Verifica la contraseña contra el hash BCRYPT guardado.
    if ($usuario !== null && password_verify($password, $usuario['password'])) {
        require_once __DIR__ . '/../config/sesion.php';
        // Renueva el identificador y el token al autenticar la cuenta.
        session_regenerate_id(true);
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

        // Guarda la identidad autenticada en la sesión del servidor.
        $_SESSION['usuario_id'] = $usuario['id'];
        $_SESSION['usuario_nombre'] = $usuario['nombre'];
        $_SESSION['usuario_email'] = $usuario['email'];

        // Devuelve la identidad pública y el nuevo token al navegador.
        http_response_code(200);
        echo json_encode([
            'estado' => 'exito',
            'mensaje' => 'Autenticación exitosa.',
            'csrfToken' => obtenerTokenCsrf(),
            'usuario' => [
                'nombre' => $usuario['nombre'],
                'email' => $usuario['email'],
            ],
        ], JSON_UNESCAPED_UNICODE);
    } else {
        // Rechaza credenciales incorrectas sin revelar qué dato falló.
        http_response_code(401);
        echo json_encode(['estado' => 'error', 'mensaje' => 'Correo o contraseña incorrectos.']);
    }
} catch (PDOException $error) {
    // Registra el error de base de datos y devuelve un mensaje general.
    error_log('Inicio de sesión: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Error interno del servidor.']);
}
