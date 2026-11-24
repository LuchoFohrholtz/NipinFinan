<?php
// Activa el control estricto de tipos en las llamadas de este archivo.
declare(strict_types=1);

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

// Continúa en ../config/seguridad.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../config/seguridad.php';
// Continúa en config/seguridad.php; un token inválido termina con HTTP 403.
validarTokenCsrf();

// Convierte el JSON recibido o leído a una estructura PHP.
$input = json_decode(file_get_contents('php://input'));
// Comprueba esta condición.
if (!is_object($input)
    // Agrega otra condición a la comprobación de la línea anterior.
    || !isset($input->nombre, $input->email, $input->password)
    // Agrega otra condición a la comprobación de la línea anterior.
    || !is_string($input->nombre)
    // Agrega otra condición a la comprobación de la línea anterior.
    || !is_string($input->email)
    // Agrega otra condición a la comprobación de la línea anterior.
    || !is_string($input->password)) {
    // Establece HTTP 400: entrada inválida.
    http_response_code(400);
    // Envía los datos al navegador en JSON.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Los datos de registro no son válidos.']);
    // Termina la petición.
    exit;
}

// Guarda nombre.
$nombre = trim($input->nombre);
// Guarda correo de la cuenta.
$email = trim($input->email);
// Guarda contraseña ingresada.
$password = $input->password;

// Rechaza campos obligatorios vacíos.
if ($nombre === '' || $email === '' || $password === '') {
    // Establece HTTP 400: entrada inválida.
    http_response_code(400);
    // Envía los datos al navegador en JSON.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Todos los campos son obligatorios.']);
    // Termina la petición.
    exit;
}

// Limita el nombre a cien caracteres.
if (mb_strlen($nombre) > 100) {
    // Establece HTTP 400: entrada inválida.
    http_response_code(400);
    // Envía los datos al navegador en JSON.
    echo json_encode(['estado' => 'error', 'mensaje' => 'El nombre puede tener hasta 100 caracteres.']);
    // Termina la petición.
    exit;
}

// Comprueba el formato y la longitud del correo.
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) {
    // Establece HTTP 400: entrada inválida.
    http_response_code(400);
    // Envía los datos al navegador en JSON.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Ingresá un correo electrónico válido.']);
    // Termina la petición.
    exit;
}

// Limita la contraseña a entre ocho y setenta y dos bytes sin nulos.
if (strlen($password) < 8 || strlen($password) > 72 || str_contains($password, "\0")) {
    // Establece HTTP 400: entrada inválida.
    http_response_code(400);
    // Envía los datos al navegador en JSON.
    echo json_encode([
        // Incluye el indicador de éxito o error de la respuesta.
        'estado' => 'error',
        // Incluye el mensaje de la respuesta.
        'mensaje' => 'La contraseña debe tener entre 8 y 72 bytes y no incluir caracteres nulos.',
    ], JSON_UNESCAPED_UNICODE);
    // Termina la petición.
    exit;
}

// Continúa en ../config/conexion.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../config/conexion.php';
// Continúa en ../models/UsuarioModel.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../models/UsuarioModel.php';

// Intenta la operación y permite capturar sus errores.
try {
    // Entrega la conexión existente a models/UsuarioModel.php.
    $usuarios = new UsuarioModel($pdo);
    // Genera el hash BCRYPT; UsuarioModel::crear lo guarda en usuarios.password.
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    // Continúa en models/UsuarioModel.php; INSERT parametrizado del hash BCRYPT.
    $usuarios->crear($nombre, $email, $passwordHash);

    // Establece HTTP 201: recurso creado.
    http_response_code(201);
    // Envía los datos al navegador en JSON.
    echo json_encode([
        // Incluye el indicador de éxito o error de la respuesta.
        'estado' => 'exito',
        // Incluye el mensaje de la respuesta.
        'mensaje' => 'Usuario registrado correctamente.',
    ], JSON_UNESCAPED_UNICODE);
// Captura el error para responder de forma controlada.
} catch (PDOException $error) {
    // Distingue el correo duplicado de otros errores de base de datos.
    if ($error->getCode() === '23000' && (int) ($error->errorInfo[1] ?? 0) === 1062) {
        // Establece HTTP 409: conflicto con datos existentes.
        http_response_code(409);
        // Envía los datos al navegador en JSON.
        echo json_encode(['estado' => 'error', 'mensaje' => 'El correo electrónico ya está registrado.']);
    // Ejecuta la alternativa cuando no se cumple la condición anterior.
    } else {
        // Registra el detalle técnico en el servidor sin mostrarlo al usuario.
        error_log('Registro de usuario: ' . $error->getMessage());
        // Establece HTTP 500: fallo interno.
        http_response_code(500);
        // Envía los datos al navegador en JSON.
        echo json_encode(['estado' => 'error', 'mensaje' => 'Error interno al registrar el usuario.']);
    }
}
