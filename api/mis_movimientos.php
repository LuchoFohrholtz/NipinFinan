<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/sesion.php';
header('Content-Type: application/json; charset=utf-8');

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

$metodo = $_SERVER['REQUEST_METHOD'];
if (!in_array($metodo, ['GET', 'POST', 'PUT', 'DELETE'], true)) {
    header('Allow: GET, POST, PUT, DELETE');
    responder(405, ['estado' => 'error', 'mensaje' => 'Método no permitido.']);
}

require_once __DIR__ . '/../config/conexion.php';
require_once __DIR__ . '/../models/MovimientoModel.php';
require_once __DIR__ . '/../services/MovimientoService.php';

$usuarioId = (int) $_SESSION['usuario_id'];
$movimientos = new MovimientoModel($pdo);

function formatearMovimiento(array $fila): array
{
    return [
        'id' => (int) $fila['id'],
        'tipo' => $fila['tipo'],
        'descripcion' => $fila['descripcion'],
        'monto' => (float) $fila['monto'],
        'ajuste' => (float) $fila['ajuste'],
        'total' => (float) $fila['total'],
        'cuotas' => (int) $fila['cuotas'],
        'valorCuota' => (float) $fila['valor_cuota'],
        'fecha' => $fila['fecha'],
        'categoria' => $fila['categoria'],
        'medioPago' => $fila['medio_pago'],
        'comentario' => $fila['comentario'],
    ];
}

function leerIdMovimiento(): int
{
    $valor = $_GET['id'] ?? null;
    if (!is_string($valor)) {
        throw new InvalidArgumentException('Indicá un ID de movimiento válido.');
    }
    $id = filter_var($valor, FILTER_VALIDATE_INT, [
        'options' => ['min_range' => 1, 'max_range' => 4294967295],
    ]);
    if ($id === false) {
        throw new InvalidArgumentException('Indicá un ID de movimiento válido.');
    }
    return $id;
}

function leerEntradaMovimiento(): stdClass
{
    $entrada = json_decode(file_get_contents('php://input'));
    if (json_last_error() !== JSON_ERROR_NONE || !$entrada instanceof stdClass) {
        throw new InvalidArgumentException('Enviá un objeto JSON válido.');
    }
    return $entrada;
}

try {
    if ($metodo === 'GET') {
        $filas = $movimientos->listarPorUsuario($usuarioId);
        responder(200, [
            'estado' => 'exito',
            'usuario' => [
                'nombre' => $_SESSION['usuario_nombre'],
                'email' => $_SESSION['usuario_email'],
            ],
            'movimientos' => array_map('formatearMovimiento', $filas),
        ]);
    }

    if ($metodo === 'DELETE') {
        $id = leerIdMovimiento();
        if (!$movimientos->eliminar($usuarioId, $id)) {
            responder(404, ['estado' => 'error', 'mensaje' => 'Movimiento no encontrado.']);
        }
        responder(200, ['estado' => 'exito', 'mensaje' => 'Movimiento eliminado correctamente.', 'id' => $id]);
    }

    $id = $metodo === 'PUT' ? leerIdMovimiento() : null;
    $entrada = leerEntradaMovimiento();
    $servicio = new MovimientoService();
    $movimiento = $servicio->validarYCalcular($entrada);

    if ($metodo === 'PUT') {
        $actualizado = $movimientos->actualizar($usuarioId, $id, $movimiento);
        if ($actualizado === null) {
            responder(404, ['estado' => 'error', 'mensaje' => 'Movimiento no encontrado.']);
        }
        responder(200, [
            'estado' => 'exito',
            'mensaje' => 'Movimiento actualizado correctamente.',
            'movimiento' => formatearMovimiento($actualizado),
        ]);
    }

    $movimiento['id'] = $movimientos->crear($usuarioId, $movimiento);
    responder(201, [
        'estado' => 'exito',
        'mensaje' => 'Movimiento guardado correctamente.',
        'movimiento' => formatearMovimiento($movimiento),
    ]);
} catch (InvalidArgumentException $error) {
    responder(400, ['estado' => 'error', 'mensaje' => $error->getMessage()]);
} catch (PDOException $error) {
    error_log('Movimientos ' . $metodo . ': ' . $error->getMessage());
    responder(500, ['estado' => 'error', 'mensaje' => 'No se pudo completar la operación de movimientos.']);
} catch (Throwable $error) {
    error_log('Configuración de movimientos: ' . $error->getMessage());
    responder(500, ['estado' => 'error', 'mensaje' => 'Error interno del servidor.']);
}
