<?php
declare(strict_types=1); // Activa el control estricto de tipos en las llamadas de este archivo.

// Declara respuestas JSON y acepta únicamente GET.
header('Content-Type: application/json; charset=utf-8'); // Declara que la respuesta contiene JSON con codificación UTF-8.
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
    http_response_code(405); // Establece HTTP 405: método no permitido.
    header('Allow: GET'); // Informa qué métodos HTTP admite este endpoint.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']); // Convierte los datos de PHP a JSON y los envía al navegador.
    exit; // Termina la petición; no ejecuta las operaciones que siguen.
} // Finaliza este bloque.

// Recupera una sesión existente o prepara una sesión anónima.
require_once __DIR__ . '/../config/seguridad.php'; // Continúa en ../config/seguridad.php; lo carga una sola vez en esta petición.
// Expone sólo nombre y correo cuando existe una cuenta autenticada.
$usuario = isset($_SESSION['usuario_id']) ? [ // Guarda identidad del usuario para las siguientes operaciones.
    'nombre' => $_SESSION['usuario_nombre'], // Incluye el nombre de la cuenta en esta estructura.
    'email' => $_SESSION['usuario_email'], // Incluye el correo de la cuenta en esta estructura.
] : null; // Devuelve ausencia de identidad cuando no hay usuario autenticado.

// Devuelve JSON a js/api.js; el token se obtiene de config/seguridad.php.
echo json_encode([ // Convierte los datos de PHP a JSON y los envía al navegador.
    'estado' => 'exito', // Incluye el indicador de éxito o error de la respuesta en esta estructura.
    'usuario' => $usuario, // Incluye los datos públicos de la cuenta en esta estructura.
    'csrfToken' => obtenerTokenCsrf(), // Incluye el token que js/api.js guardará para las siguientes escrituras.
], JSON_UNESCAPED_UNICODE); // Termina el JSON conservando tildes y otros caracteres Unicode.
