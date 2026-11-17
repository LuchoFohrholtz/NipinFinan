<?php
declare(strict_types=1);

// Recupera la sesión y las funciones de seguridad.
require_once __DIR__ . '/../config/seguridad.php';
header('Content-Type: application/json; charset=utf-8');

// Envía un estado HTTP y su JSON, y termina la petición.
function responder(int $codigo, array $datos): never
{
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

// Rechaza el acceso anónimo antes de procesar operaciones privadas.
if (!isset($_SESSION['usuario_id'])) {
    responder(401, ['estado' => 'error', 'mensaje' => 'Acceso no autorizado. Iniciá sesión.']);
}

// Comprueba que el método pertenezca al CRUD admitido.
$metodo = $_SERVER['REQUEST_METHOD'];
if (!in_array($metodo, ['GET', 'POST', 'PUT', 'DELETE'], true)) {
    header('Allow: GET, POST, PUT, DELETE');
    responder(405, ['estado' => 'error', 'mensaje' => 'Método no permitido.']);
}

// Exige CSRF en POST, PUT y DELETE; GET sólo consulta.
if ($metodo !== 'GET') {
    validarTokenCsrf();
}

// Carga PDO, persistencia, reglas y formato de movimientos.
require_once __DIR__ . '/../config/conexion.php';
require_once __DIR__ . '/../models/MovimientoModel.php';
require_once __DIR__ . '/../services/MovimientoService.php';
require_once __DIR__ . '/../services/MovimientoFormato.php';

// Obtiene el propietario desde la sesión, nunca desde el JSON.
$usuarioId = (int) $_SESSION['usuario_id'];
$movimientos = new MovimientoModel($pdo);

// Valida que el identificador recibido sea un entero positivo permitido.
function leerIdMovimiento(): int
{
    $valor = $_GET['id'] ?? null;
    if (!is_string($valor)) {
        throw new InvalidArgumentException('Indicá un ID de movimiento válido.');
    }
    // Limita el identificador al rango de la columna MySQL.
    $id = filter_var($valor, FILTER_VALIDATE_INT, [
        'options' => ['min_range' => 1, 'max_range' => 4294967295],
    ]);
    if ($id === false) {
        throw new InvalidArgumentException('Indicá un ID de movimiento válido.');
    }
    return $id;
}

// Lee un objeto JSON y rechaza cuerpos mal formados o de otro tipo.
function leerEntradaMovimiento(): stdClass
{
    $entrada = json_decode(file_get_contents('php://input'));
    if (json_last_error() !== JSON_ERROR_NONE || !$entrada instanceof stdClass) {
        throw new InvalidArgumentException('Enviá un objeto JSON válido.');
    }
    return $entrada;
}

// Ejecuta el CRUD y transforma los fallos en respuestas HTTP.
try {
    // Lista únicamente los movimientos de la cuenta autenticada.
    if ($metodo === 'GET') {
        $filas = $movimientos->listarPorUsuario($usuarioId);
        responder(200, [
            'estado' => 'exito',
            'usuario' => [
                'nombre' => $_SESSION['usuario_nombre'],
                'email' => $_SESSION['usuario_email'],
            ],
            'movimientos' => array_map([MovimientoFormato::class, 'desdeFila'], $filas),
        ]);
    }

    // Elimina por identificador y propietario, o responde 404.
    if ($metodo === 'DELETE') {
        $id = leerIdMovimiento();
        if (!$movimientos->eliminar($usuarioId, $id)) {
            responder(404, ['estado' => 'error', 'mensaje' => 'Movimiento no encontrado.']);
        }
        responder(200, ['estado' => 'exito', 'mensaje' => 'Movimiento eliminado correctamente.', 'id' => $id]);
    }

    // Lee y recalcula los datos tanto para alta como para edición.
    $id = $metodo === 'PUT' ? leerIdMovimiento() : null;
    $entrada = leerEntradaMovimiento();
    $servicio = new MovimientoService();
    $movimiento = $servicio->validarYCalcular($entrada);

    // Actualiza sólo un movimiento propio y devuelve su estado actual.
    if ($metodo === 'PUT') {
        $actualizado = $movimientos->actualizar($usuarioId, $id, $movimiento);
        if ($actualizado === null) {
            responder(404, ['estado' => 'error', 'mensaje' => 'Movimiento no encontrado.']);
        }
        responder(200, [
            'estado' => 'exito',
            'mensaje' => 'Movimiento actualizado correctamente.',
            'movimiento' => MovimientoFormato::desdeFila($actualizado),
        ]);
    }

    // Inserta un movimiento propio y responde 201 con sus datos.
    $movimiento['id'] = $movimientos->crear($usuarioId, $movimiento);
    responder(201, [
        'estado' => 'exito',
        'mensaje' => 'Movimiento guardado correctamente.',
        'movimiento' => MovimientoFormato::desdeFila($movimiento),
    ]);
} catch (InvalidArgumentException $error) {
    // Devuelve 400 cuando la entrada no cumple las reglas.
    responder(400, ['estado' => 'error', 'mensaje' => $error->getMessage()]);
} catch (PDOException $error) {
    // Registra fallos de PDO sin exponer SQL al navegador.
    error_log('Movimientos ' . $metodo . ': ' . $error->getMessage());
    responder(500, ['estado' => 'error', 'mensaje' => 'No se pudo completar la operación de movimientos.']);
} catch (Throwable $error) {
    // Captura otros fallos internos y devuelve un error general.
    error_log('Configuración de movimientos: ' . $error->getMessage());
    responder(500, ['estado' => 'error', 'mensaje' => 'Error interno del servidor.']);
}
