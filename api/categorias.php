<?php
// Activa el control estricto de tipos en las llamadas de este archivo.
declare(strict_types=1);

// Continúa en ../config/sesion.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../config/sesion.php';
// Responde JSON con codificación UTF-8.
header('Content-Type: application/json; charset=utf-8');
// Impide acceder al endpoint privado si no hay una cuenta autenticada.
if (!isset($_SESSION['usuario_id'])) {
    // Establece HTTP 401: autenticación requerida o incorrecta.
    http_response_code(401);
    // Envía los datos al navegador en JSON.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Acceso no autorizado. Iniciá sesión.']);
    // Termina la petición.
    exit;
}
// Acepta únicamente consultas GET.
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    // Establece HTTP 405: método no permitido.
    http_response_code(405);
    // Informa qué métodos HTTP admite este endpoint.
    header('Allow: GET');
    // Envía los datos al navegador en JSON.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']);
    // Termina la petición.
    exit;
}
// Rechaza identificadores de categoría vacíos o de tipo incorrecto.
if (isset($_GET['id']) && (!is_string($_GET['id']) || $_GET['id'] === '')) {
    // Establece HTTP 400: entrada inválida.
    http_response_code(400);
    // Envía los datos al navegador en JSON.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Indicá un identificador de categoría válido.']);
    // Termina la petición.
    exit;
}

// Continúa en ../config/conexion.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../config/conexion.php';
// Continúa en ../models/CategoriaModel.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../models/CategoriaModel.php';
// Continúa en ../models/MovimientoModel.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../models/MovimientoModel.php';
// Continúa en ../services/MovimientoFormato.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../services/MovimientoFormato.php';

// Intenta la operación y permite capturar sus errores.
try {
    // Guarda identificador del propietario autenticado.
    $usuarioId = (int) $_SESSION['usuario_id'];
    // Guarda categorías admitidas.
    $categorias = new CategoriaModel($pdo);
    // Devuelve todas las categorías con sus totales propios.
    if (!isset($_GET['id'])) {
        // Guarda respuesta HTTP del servidor.
        $respuesta = ['estado' => 'exito', 'categorias' => $categorias->listarPorUsuario($usuarioId)];
    // Ejecuta la alternativa cuando no se cumple la condición anterior.
    } else {
        // Guarda categoría seleccionada.
        $categoria = $categorias->buscarPorId($_GET['id'], $usuarioId);
        // Comprueba esta condición.
        if ($categoria === null) {
            // Establece HTTP 404: recurso no encontrado.
            http_response_code(404);
            // Envía los datos al navegador en JSON.
            echo json_encode(['estado' => 'error', 'mensaje' => 'Categoría no encontrada.']);
            // Termina la petición.
            exit;
        }
        // Entrega PDO a models/MovimientoModel.php para ejecutar el CRUD.
        $movimientos = new MovimientoModel($pdo);
        // Guarda filas obtenidas de la consulta.
        $filas = $movimientos->listarPorCategoria($usuarioId, $categoria['nombre']);
        // Guarda respuesta HTTP del servidor.
        $respuesta = [
            // Incluye el indicador de éxito o error de la respuesta.
            'estado' => 'exito',
            // Incluye la categoría del movimiento.
            'categoria' => $categoria,
            // Incluye la lista de movimientos.
            'movimientos' => array_map([MovimientoFormato::class, 'desdeFila'], $filas),
        ];
    }
    // Envía los datos al navegador en JSON.
    echo json_encode($respuesta, JSON_UNESCAPED_UNICODE);
// Captura el error para responder de forma controlada.
} catch (Throwable $error) {
    // Registra el detalle técnico en el servidor sin mostrarlo al usuario.
    error_log('Consulta de categorías: ' . $error->getMessage());
    // Establece HTTP 500: fallo interno.
    http_response_code(500);
    // Envía los datos al navegador en JSON.
    echo json_encode(['estado' => 'error', 'mensaje' => 'No se pudieron consultar las categorías.']);
}
