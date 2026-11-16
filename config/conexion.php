<?php
declare(strict_types=1);

require_once __DIR__ . '/ConexionSingleton.php';
try {
    $pdo = Conexion::obtener();
} catch (Throwable $error) {
    error_log('Conexión a MySQL: ' . $error->getMessage());
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['estado' => 'error', 'mensaje' => 'Error de conexión con la base de datos.']);
    exit;
}
