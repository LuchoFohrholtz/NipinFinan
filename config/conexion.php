<?php

$configuracion = [
    'host' => '127.0.0.1',
    'port' => 3306,
    'database' => 'nipinfinan',
    'user' => 'root',
    'password' => '',
];

$archivoLocal = __DIR__ . '/conexion.local.php';
if (is_file($archivoLocal)) {
    $configuracion = array_replace($configuracion, require $archivoLocal);
}

$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
    $configuracion['host'],
    $configuracion['port'],
    $configuracion['database']
);
$opciones = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $configuracion['user'], $configuracion['password'], $opciones);
} catch (PDOException $error) {
    error_log('Conexión a MySQL: ' . $error->getMessage());
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['estado' => 'error', 'mensaje' => 'Error de conexión con la base de datos.']);
    exit;
}
