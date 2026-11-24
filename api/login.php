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
    || !isset($input->email, $input->password)
    // Agrega otra condición a la comprobación de la línea anterior.
    || !is_string($input->email)
    // Agrega otra condición a la comprobación de la línea anterior.
    || !is_string($input->password)) {
    // Establece HTTP 400: entrada inválida.
    http_response_code(400);
    // Envía los datos al navegador en JSON.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Los datos de acceso no son válidos.']);
    // Termina la petición.
    exit;
}

// Guarda correo de la cuenta.
$email = trim($input->email);
// Guarda contraseña ingresada.
$password = $input->password;

// Rechaza campos obligatorios vacíos.
if ($email === '' || $password === '') {
    // Establece HTTP 400: entrada inválida.
    http_response_code(400);
    // Envía los datos al navegador en JSON.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Ingresá correo y contraseña.']);
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
    // Continúa en UsuarioModel::buscarPorEmail: SELECT, execute y fetch.
    $usuario = $usuarios->buscarPorEmail($email);

    // Exige una cuenta existente y una contraseña que coincida con el hash BCRYPT.
    if ($usuario !== null && password_verify($password, $usuario['password'])) {
        // Continúa en ../config/sesion.php; lo carga una sola vez en esta petición.
        require_once __DIR__ . '/../config/sesion.php';
        // Renueva el identificador y elimina la sesión anterior al autenticar.
        session_regenerate_id(true);
        // Guarda el token aleatorio; api/sesion.php lo entrega al cliente.
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

        // Guarda el propietario; las API privadas lo usan para autorizar y filtrar SQL.
        $_SESSION['usuario_id'] = $usuario['id'];
        // Guarda el nombre en la sesión del servidor.
        $_SESSION['usuario_nombre'] = $usuario['nombre'];
        // Guarda el correo en la sesión del servidor.
        $_SESSION['usuario_email'] = $usuario['email'];

        // Establece HTTP 200: operación correcta.
        http_response_code(200);
        // Envía los datos al navegador en JSON.
        echo json_encode([
            // Incluye el indicador de éxito o error de la respuesta.
            'estado' => 'exito',
            // Incluye el mensaje de la respuesta.
            'mensaje' => 'Autenticación exitosa.',
            // Incluye el token que js/api.js guardará para las siguientes escrituras.
            'csrfToken' => obtenerTokenCsrf(),
            // Incluye los datos públicos de la cuenta.
            'usuario' => [
                // Incluye el nombre de la cuenta.
                'nombre' => $usuario['nombre'],
                // Incluye el correo de la cuenta.
                'email' => $usuario['email'],
            ],
        ], JSON_UNESCAPED_UNICODE);
    // Ejecuta la alternativa cuando no se cumple la condición anterior.
    } else {
        // Establece HTTP 401: autenticación requerida o incorrecta.
        http_response_code(401);
        // Envía los datos al navegador en JSON.
        echo json_encode(['estado' => 'error', 'mensaje' => 'Correo o contraseña incorrectos.']);
    }
// Captura el error para responder de forma controlada.
} catch (PDOException $error) {
    // Registra el detalle técnico en el servidor sin mostrarlo al usuario.
    error_log('Inicio de sesión: ' . $error->getMessage());
    // Establece HTTP 500: fallo interno.
    http_response_code(500);
    // Envía los datos al navegador en JSON.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Error interno del servidor.']);
}
