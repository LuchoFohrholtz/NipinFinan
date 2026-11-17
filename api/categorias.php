<?php
declare(strict_types=1);

// Recupera la sesión y declara respuestas JSON.
require_once __DIR__ . '/../config/sesion.php';
header('Content-Type: application/json; charset=utf-8');
// Exige una cuenta autenticada antes de consultar datos privados.
if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Acceso no autorizado. Iniciá sesión.']);
    exit;
}
// Acepta únicamente consultas GET.
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']);
    exit;
}
// Rechaza identificadores de categoría vacíos o de tipo incorrecto.
if (isset($_GET['id']) && (!is_string($_GET['id']) || $_GET['id'] === '')) {
    http_response_code(400);
    echo json_encode(['estado' => 'error', 'mensaje' => 'Indicá un identificador de categoría válido.']);
    exit;
}

// Carga la conexión, los modelos y el formato de salida.
require_once __DIR__ . '/../config/conexion.php';
require_once __DIR__ . '/../models/CategoriaModel.php';
require_once __DIR__ . '/../models/MovimientoModel.php';
require_once __DIR__ . '/../services/MovimientoFormato.php';

// Consulta el catálogo o su detalle para el usuario de la sesión.
try {
    $usuarioId = (int) $_SESSION['usuario_id'];
    $categorias = new CategoriaModel($pdo);
    // Devuelve todas las categorías con sus totales propios.
    if (!isset($_GET['id'])) {
        $respuesta = ['estado' => 'exito', 'categorias' => $categorias->listarPorUsuario($usuarioId)];
    } else {
        // Busca una categoría concreta y comprueba su existencia.
        $categoria = $categorias->buscarPorId($_GET['id'], $usuarioId);
        if ($categoria === null) {
            http_response_code(404);
            echo json_encode(['estado' => 'error', 'mensaje' => 'Categoría no encontrada.']);
            exit;
        }
        // Consulta y formatea el historial de esa categoría.
        $movimientos = new MovimientoModel($pdo);
        $filas = $movimientos->listarPorCategoria($usuarioId, $categoria['nombre']);
        $respuesta = [
            'estado' => 'exito',
            'categoria' => $categoria,
            'movimientos' => array_map([MovimientoFormato::class, 'desdeFila'], $filas),
        ];
    }
    // Envía el resultado como JSON con caracteres Unicode.
    echo json_encode($respuesta, JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    // Registra el fallo interno y responde sin exponer detalles técnicos.
    error_log('Consulta de categorías: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['estado' => 'error', 'mensaje' => 'No se pudieron consultar las categorías.']);
}
