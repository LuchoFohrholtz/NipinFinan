<?php
declare(strict_types=1);

// Carga el proveedor compartido de conexiones PDO.
require_once __DIR__ . '/ConexionSingleton.php';
// Obtiene PDO y deja la variable disponible para el controlador.
try {
    $pdo = Conexion::obtener();
} catch (Throwable $error) {
    // Registra el fallo y responde 500 sin revelar credenciales.
    error_log('Conexión a MySQL: ' . $error->getMessage());
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['estado' => 'error', 'mensaje' => 'Error de conexión con la base de datos.']);
    exit;
}
