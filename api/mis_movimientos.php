<?php
// Endpoint PRIVADO: movimientos (ingresos y gastos) del usuario logueado.
//   GET  -> datos del usuario + lista de sus movimientos
//   POST -> registra un movimiento nuevo para el usuario
require_once '../config/sesion.php';
header('Content-Type: application/json; charset=utf-8');

// === GUARDIÁN DE SESIÓN ===
// Sin sesión iniciada no se devuelve ningún dato.
if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401); // Unauthorized
    echo json_encode(["estado" => "error", "mensaje" => "Acceso no autorizado. Iniciá sesión."]);
    exit;
}

require_once '../config/conexion.php';

// El id sale siempre de la sesión, nunca de lo que mande el cliente:
// así nadie puede leer ni cargar movimientos de otro usuario.
$usuarioId = $_SESSION['usuario_id'];

function responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

// Convierte una fila de MySQL al mismo formato que usa el frontend
function formatearMovimiento($fila) {
    return [
        "id"          => (int) $fila['id'],
        "tipo"        => $fila['tipo'],
        "descripcion" => $fila['descripcion'],
        "monto"       => (float) $fila['monto'],
        "ajuste"      => (float) $fila['ajuste'],
        "total"       => (float) $fila['total'],
        "cuotas"      => (int) $fila['cuotas'],
        "valorCuota"  => (float) $fila['valor_cuota'],
        "fecha"       => $fila['fecha'],
        "categoria"   => $fila['categoria'],
        "medioPago"   => $fila['medio_pago'],
        "comentario"  => $fila['comentario']
    ];
}


// =============================
// GET: listar mis movimientos
// =============================

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->prepare(
            'SELECT id, tipo, descripcion, monto, ajuste, total, cuotas, valor_cuota,
                    fecha, categoria, medio_pago, comentario
             FROM movimientos
             WHERE usuario_id = :usuario_id
             ORDER BY fecha DESC, id DESC'
        );
        $stmt->execute(['usuario_id' => $usuarioId]);

        responder(200, [
            "estado"  => "exito",
            "usuario" => [
                "nombre" => $_SESSION['usuario_nombre'],
                "email"  => $_SESSION['usuario_email']
            ],
            "movimientos" => array_map('formatearMovimiento', $stmt->fetchAll())
        ]);
    } catch (PDOException $e) {
        responder(500, ["estado" => "error", "mensaje" => "Error al leer los movimientos."]);
    }
}


// =============================
// POST: registrar un movimiento
// =============================

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        responder(400, ["estado" => "error", "mensaje" => "Datos inválidos."]);
    }

    $tipo        = $input['tipo'] ?? '';
    $descripcion = trim($input['descripcion'] ?? '');
    $monto       = $input['monto'] ?? null;
    $fecha       = $input['fecha'] ?? '';
    $categoria   = trim($input['categoria'] ?? '');
    $medioPago   = $input['medioPago'] ?? '';
    $cuotas      = (int) ($input['cuotas'] ?? 1);
    $comentario  = trim($input['comentario'] ?? '');

    // Misma tabla de tarifas que usa la calculadora del frontend
    $tarifas = json_decode(file_get_contents(__DIR__ . '/../data/tarifas.json'), true);

    // Validaciones (no confiamos en lo que calcula el navegador)
    $error = null;
    $partesFecha = explode('-', $fecha);
    if (!in_array($tipo, ['ingreso', 'gasto'], true)) {
        $error = "Tipo de movimiento inválido.";
    } elseif ($descripcion === '' || mb_strlen($descripcion) > 150) {
        $error = "Ingresá una descripción (hasta 150 caracteres).";
    } elseif (!is_numeric($monto) || $monto <= 0 || $monto > 9999999999) {
        $error = "Ingresá un monto mayor a 0.";
    } elseif (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)
              || !checkdate((int) $partesFecha[1], (int) $partesFecha[2], (int) $partesFecha[0])) {
        $error = "Seleccioná una fecha válida.";
    } elseif ($categoria === '' || mb_strlen($categoria) > 50) {
        $error = "Seleccioná una categoría.";
    } elseif (!isset($tarifas['medios_pago'][$medioPago])) {
        $error = "Seleccioná un medio de pago válido.";
    } elseif (mb_strlen($comentario) > 500) {
        $error = "El comentario puede tener hasta 500 caracteres.";
    }

    if ($error) {
        responder(400, ["estado" => "error", "mensaje" => $error]);
    }

    // Cálculo del total (misma fórmula que calcular() en js/app.js)
    $monto = round((float) $monto, 2);
    $esCredito = $tipo === 'gasto' && $medioPago === 'Tarjeta de crédito';

    if (!$esCredito || !isset($tarifas['cuotas'][(string) $cuotas])) {
        $cuotas = 1;
    }

    if ($tipo === 'ingreso') {
        $total = $monto;
    } else {
        $descuento = $tarifas['medios_pago'][$medioPago]['descuento'];
        $interes   = $esCredito ? $tarifas['cuotas'][(string) $cuotas] : 0;
        $total     = round($monto * (1 - $descuento) * (1 + $interes), 2);
    }
    $ajuste     = round($total - $monto, 2);
    $valorCuota = round($total / $cuotas, 2);

    try {
        $stmt = $pdo->prepare(
            'INSERT INTO movimientos
                (usuario_id, tipo, descripcion, monto, ajuste, total, cuotas, valor_cuota,
                 fecha, categoria, medio_pago, comentario)
             VALUES
                (:usuario_id, :tipo, :descripcion, :monto, :ajuste, :total, :cuotas, :valor_cuota,
                 :fecha, :categoria, :medio_pago, :comentario)'
        );
        $stmt->execute([
            'usuario_id'  => $usuarioId,
            'tipo'        => $tipo,
            'descripcion' => $descripcion,
            'monto'       => $monto,
            'ajuste'      => $ajuste,
            'total'       => $total,
            'cuotas'      => $cuotas,
            'valor_cuota' => $valorCuota,
            'fecha'       => $fecha,
            'categoria'   => $categoria,
            'medio_pago'  => $medioPago,
            'comentario'  => $comentario
        ]);

        responder(201, [
            "estado"     => "exito",
            "mensaje"    => "Movimiento guardado correctamente.",
            "movimiento" => formatearMovimiento([
                'id' => $pdo->lastInsertId(), 'tipo' => $tipo, 'descripcion' => $descripcion,
                'monto' => $monto, 'ajuste' => $ajuste, 'total' => $total, 'cuotas' => $cuotas,
                'valor_cuota' => $valorCuota, 'fecha' => $fecha, 'categoria' => $categoria,
                'medio_pago' => $medioPago, 'comentario' => $comentario
            ])
        ]);
    } catch (PDOException $e) {
        responder(500, ["estado" => "error", "mensaje" => "No se pudo guardar el movimiento."]);
    }
}

responder(405, ["estado" => "error", "mensaje" => "Método no permitido."]);
