<?php
declare(strict_types=1); // Activa el control estricto de tipos en las llamadas de este archivo.

// Carga el proveedor compartido de conexiones PDO.
require_once __DIR__ . '/ConexionSingleton.php'; // Continúa en ConexionSingleton.php; lo carga una sola vez en esta petición.
// Obtiene PDO y deja la variable disponible para el controlador.
try { // Intenta la operación; catch manejará sus posibles errores.
    $pdo = Conexion::obtener(); // Continúa en ConexionSingleton.php: obtiene o crea la conexión PDO.
} catch (Throwable $error) { // Recibe el fallo y permite responder sin continuar como si hubiera éxito.
    // Registra el fallo y responde 500 sin revelar credenciales.
    error_log('Conexión a MySQL: ' . $error->getMessage()); // Registra el detalle técnico en el servidor sin mostrarlo al usuario.
    http_response_code(500); // Establece HTTP 500: fallo interno.
    header('Content-Type: application/json; charset=utf-8'); // Declara que la respuesta contiene JSON con codificación UTF-8.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Error de conexión con la base de datos.']); // Convierte los datos de PHP a JSON y los envía al navegador.
    exit; // Termina la petición; no ejecuta las operaciones que siguen.
} // Finaliza este bloque.
