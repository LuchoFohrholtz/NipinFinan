<?php
declare(strict_types=1); // Activa el control estricto de tipos en las llamadas de este archivo.

// Inicia o recupera la sesión antes de trabajar con su token.
require_once __DIR__ . '/sesion.php'; // Continúa en sesion.php; lo carga una sola vez en esta petición.

// Devuelve un token válido y sólo lo genera cuando falta o es inválido.
function obtenerTokenCsrf(): string // Devuelve el token de sesión y lo crea si falta o es inválido.
{ // Comienza el cuerpo de la función, clase o condición.
    // Comprueba que el token guardado sea una cadena hexadecimal de longitud válida.
    if (!isset($_SESSION['csrf_token']) || !is_string($_SESSION['csrf_token']) // Comprueba que el token guardado sea una cadena hexadecimal de longitud válida.
        || !preg_match('/^[a-f0-9]{64}$/D', $_SESSION['csrf_token'])) { // Agrega otra condición a la comprobación de la línea anterior.
        // Genera treinta y dos bytes aleatorios y guarda su representación hexadecimal.
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32)); // Guarda un token aleatorio de 64 caracteres; api/sesion.php lo entrega al cliente.
    } // Finaliza este bloque.
    return $_SESSION['csrf_token']; // Devuelve el token a api/sesion.php o a la respuesta del login.
} // Finaliza este bloque.

// Comprueba el token de las solicitudes que modifican datos.
function validarTokenCsrf(): void // Compara la cabecera X-CSRF-Token con el token de $_SESSION.
{ // Comienza el cuerpo de la función, clase o condición.
    // Lee el encabezado recibido y el token esperado de la sesión.
    $recibido = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''; // Lee X-CSRF-Token enviado por js/api.js.
    $esperado = $_SESSION['csrf_token'] ?? null; // Obtiene el token esperado desde la sesión del servidor.
    // Rechaza valores ausentes o distintos mediante comparación segura.
    if (!is_string($recibido) || !is_string($esperado) || $esperado === '' // Rechaza valores ausentes o distintos mediante comparación segura.
        || !hash_equals($esperado, $recibido)) { // Compara ambos tokens de forma resistente a diferencias de tiempo.
        http_response_code(403); // Establece HTTP 403: petición no autorizada.
        header('Content-Type: application/json; charset=utf-8'); // Declara que la respuesta contiene JSON con codificación UTF-8.
        echo json_encode(['estado' => 'error', 'mensaje' => 'La verificación de seguridad no es válida.']); // Convierte los datos de PHP a JSON y los envía al navegador.
        exit; // Termina la petición; no ejecuta las operaciones que siguen.
    } // Finaliza este bloque.
} // Finaliza este bloque.
