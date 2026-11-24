<?php
declare(strict_types=1); // Activa el control estricto de tipos en las llamadas de este archivo.

// Recupera la sesión y prepara la respuesta JSON.
require_once __DIR__ . '/../config/seguridad.php'; // Continúa en ../config/seguridad.php; lo carga una sola vez en esta petición.
header('Content-Type: application/json; charset=utf-8'); // Declara que la respuesta contiene JSON con codificación UTF-8.

// Acepta únicamente solicitudes POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { // Acepta únicamente solicitudes POST.
    http_response_code(405); // Establece HTTP 405: método no permitido.
    header('Allow: POST'); // Informa qué métodos HTTP admite este endpoint.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']); // Convierte los datos de PHP a JSON y los envía al navegador.
    exit; // Termina la petición; no ejecuta las operaciones que siguen.
} // Finaliza este bloque.
// Exige una sesión autenticada para cerrarla.
if (!isset($_SESSION['usuario_id'])) { // Impide acceder al endpoint privado si no hay una cuenta autenticada.
    http_response_code(401); // Establece HTTP 401: autenticación requerida o incorrecta.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Acceso no autorizado. Iniciá sesión.']); // Convierte los datos de PHP a JSON y los envía al navegador.
    exit; // Termina la petición; no ejecuta las operaciones que siguen.
} // Finaliza este bloque.
// Comprueba el token antes de invalidar la sesión.
validarTokenCsrf(); // Continúa en config/seguridad.php; un token inválido termina con HTTP 403.

// Invalida los datos y la cookie de la sesión actual.
$_SESSION = []; // Guarda _SESSION para las siguientes operaciones.
// Vence la cookie conservando sus atributos de alcance y seguridad.
if (ini_get('session.use_cookies')) { // Vence la cookie conservando sus atributos de alcance y seguridad.
    $parametros = session_get_cookie_params(); // Guarda parametros para las siguientes operaciones.
    setcookie(session_name(), '', [ // Actualiza o elimina la cookie del navegador con los parámetros indicados.
        'expires' => time() - 42000, // Incluye el campo expires en esta estructura.
        'path' => $parametros['path'], // Incluye el campo path en esta estructura.
        'domain' => $parametros['domain'], // Incluye el campo domain en esta estructura.
        'secure' => $parametros['secure'], // Incluye el campo secure en esta estructura.
        'httponly' => $parametros['httponly'], // Incluye el campo httponly en esta estructura.
        'samesite' => $parametros['samesite'], // Incluye el campo samesite en esta estructura.
    ]); // Completa la estructura o llamada iniciada arriba.
} // Finaliza este bloque.
// Destruye la sesión del servidor y confirma el cierre.
session_destroy(); // Elimina los datos persistidos de la sesión del servidor.
echo json_encode(['estado' => 'exito', 'mensaje' => 'Sesión cerrada correctamente.']); // Convierte los datos de PHP a JSON y los envía al navegador.
