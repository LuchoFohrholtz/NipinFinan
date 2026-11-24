<?php
// Activa el control estricto de tipos en las llamadas de este archivo.
declare(strict_types=1);

// Continúa en ConexionSingleton.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/ConexionSingleton.php';
// Intenta la operación y permite capturar sus errores.
try {
    // Continúa en ConexionSingleton.php: obtiene o crea la conexión PDO.
    $pdo = Conexion::obtener();
// Captura el error para responder de forma controlada.
} catch (Throwable $error) {
    // Registra el detalle técnico en el servidor sin mostrarlo al usuario.
    error_log('Conexión a MySQL: ' . $error->getMessage());
    // Establece HTTP 500: fallo interno.
    http_response_code(500);
    // Responde JSON con codificación UTF-8.
    header('Content-Type: application/json; charset=utf-8');
    // Envía los datos al navegador en JSON.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Error de conexión con la base de datos.']);
    // Termina la petición.
    exit;
}
