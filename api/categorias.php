<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/sesion.php';
header('Content-Type: application/json; charset=utf-8');
if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Acceso no autorizado. Iniciá sesión.']);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']);
    exit;
}
if (isset($_GET['id']) && (!is_string($_GET['id']) || $_GET['id'] === '')) {
    http_response_code(400);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Indicá un identificador de categoría válido.']);
    exit;
}

require_once __DIR__ . '/../config/conexion.php';
require_once __DIR__ . '/../models/CategoriaModel.php';
require_once __DIR__ . '/../models/MovimientoModel.php';
require_once __DIR__ . '/../services/MovimientoFormato.php';

try {
    $usuarioId = (int) $_SESSION['usuario_id'];
    $categorias = new CategoriaModel($pdo);
    if (!isset($_GET['id'])) {
        $respuesta = ['estado' => 'exito', 'categorias' => $categorias->listarPorUsuario($usuarioId)];
    } else {
        $categoria = $categorias->buscarPorId($_GET['id'], $usuarioId);
        if ($categoria === null) {
            http_response_code(404);
            echo json_encode(['estado' => 'error', 'mensaje' => 'Categoría no encontrada.']);
            exit;
        }
        $movimientos = new MovimientoModel($pdo);
        $filas = $movimientos->listarPorCategoria($usuarioId, $categoria['nombre']);
        $respuesta = [
            'estado' => 'exito',
            'categoria' => $categoria,
            'movimientos' => array_map([MovimientoFormato::class, 'desdeFila'], $filas),
        ];
    }
    echo json_encode($respuesta, JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    error_log('Consulta de categorías: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['estado' => 'error', 'mensaje' => 'No se pudieron consultar las categorías.']);
}
