<?php
// Activa el control estricto de tipos en las llamadas de este archivo.
declare(strict_types=1);

// Continúa en ../config/seguridad.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../config/seguridad.php';
// Responde JSON con codificación UTF-8.
header('Content-Type: application/json; charset=utf-8');

// Envía el código HTTP y el JSON; exit detiene la petición.
function responder(int $codigo, array $datos): never
{
    // Establece HTTP $codigo: estado de la respuesta.
    http_response_code($codigo);
    // Envía los datos al navegador en JSON.
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    // Termina la petición.
    exit;
}

// Impide acceder al endpoint privado si no hay una cuenta autenticada.
if (!isset($_SESSION['usuario_id'])) {
    // Envía HTTP 401 y JSON al cliente; responder termina la petición.
    responder(401, ['estado' => 'error', 'mensaje' => 'Acceso no autorizado. Iniciá sesión.']);
}

// Guarda método HTTP del pedido.
$metodo = $_SERVER['REQUEST_METHOD'];
// Comprueba esta condición.
if (!in_array($metodo, ['GET', 'POST', 'PUT', 'DELETE'], true)) {
    // Informa qué métodos HTTP admite este endpoint.
    header('Allow: GET, POST, PUT, DELETE');
    // Envía HTTP 405 y JSON al cliente; responder termina la petición.
    responder(405, ['estado' => 'error', 'mensaje' => 'Método no permitido.']);
}

// Exige CSRF en POST, PUT y DELETE; GET sólo consulta.
if ($metodo !== 'GET') {
    // Continúa en config/seguridad.php; un token inválido termina con HTTP 403.
    validarTokenCsrf();
}

// Continúa en ../config/conexion.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../config/conexion.php';
// Continúa en ../models/MovimientoModel.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../models/MovimientoModel.php';
// Continúa en ../services/MovimientoService.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../services/MovimientoService.php';
// Continúa en ../services/MovimientoFormato.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../services/MovimientoFormato.php';

// Guarda identificador del propietario autenticado.
$usuarioId = (int) $_SESSION['usuario_id'];
// Entrega PDO a models/MovimientoModel.php para ejecutar el CRUD.
$movimientos = new MovimientoModel($pdo);

// Lee y valida el identificador del movimiento recibido por URL.
function leerIdMovimiento(): int
{
    // Guarda valor que se va a comprobar.
    $valor = $_GET['id'] ?? null;
    // Comprueba esta condición.
    if (!is_string($valor)) {
        // Interrumpe la función y comunica el error.
        throw new InvalidArgumentException('Indicá un ID de movimiento válido.');
    }
    // Guarda identificador del recurso.
    $id = filter_var($valor, FILTER_VALIDATE_INT, [
        // Incluye el campo options.
        'options' => ['min_range' => 1, 'max_range' => 4294967295],
    ]);
    // Comprueba esta condición.
    if ($id === false) {
        // Interrumpe la función y comunica el error.
        throw new InvalidArgumentException('Indicá un ID de movimiento válido.');
    }
    // Devuelve identificador del recurso al código que llamó.
    return $id;
}

// Lee el cuerpo HTTP y exige un objeto JSON válido.
function leerEntradaMovimiento(): stdClass
{
    // Convierte el JSON recibido o leído a una estructura PHP.
    $entrada = json_decode(file_get_contents('php://input'));
    // Comprueba esta condición.
    if (json_last_error() !== JSON_ERROR_NONE || !$entrada instanceof stdClass) {
        // Interrumpe la función y comunica el error.
        throw new InvalidArgumentException('Enviá un objeto JSON válido.');
    }
    // Devuelve datos recibidos para validar al código que llamó.
    return $entrada;
}

// Intenta la operación y permite capturar sus errores.
try {
    // Lista únicamente los movimientos de la cuenta autenticada.
    if ($metodo === 'GET') {
        // Continúa en MovimientoModel::listarPorUsuario; filtra por propietario.
        $filas = $movimientos->listarPorUsuario($usuarioId);
        // Envía HTTP 200 y JSON al cliente; responder termina la petición.
        responder(200, [
            // Incluye el indicador de éxito o error de la respuesta.
            'estado' => 'exito',
            // Incluye los datos públicos de la cuenta.
            'usuario' => [
                // Incluye el nombre de la cuenta.
                'nombre' => $_SESSION['usuario_nombre'],
                // Incluye el correo de la cuenta.
                'email' => $_SESSION['usuario_email'],
            ],
            // Incluye la lista de movimientos.
            'movimientos' => array_map([MovimientoFormato::class, 'desdeFila'], $filas),
        ]);
    }

    // Elimina por identificador y propietario, o responde 404.
    if ($metodo === 'DELETE') {
        // Guarda identificador del recurso.
        $id = leerIdMovimiento();
        // Comprueba esta condición.
        if (!$movimientos->eliminar($usuarioId, $id)) {
            // Envía HTTP 404 y JSON al cliente; responder termina la petición.
            responder(404, ['estado' => 'error', 'mensaje' => 'Movimiento no encontrado.']);
        }
        // Envía HTTP 200 y JSON al cliente; responder termina la petición.
        responder(200, ['estado' => 'exito', 'mensaje' => 'Movimiento eliminado correctamente.', 'id' => $id]);
    }

    // Guarda identificador del recurso.
    $id = $metodo === 'PUT' ? leerIdMovimiento() : null;
    // Guarda datos recibidos para validar.
    $entrada = leerEntradaMovimiento();
    // Carga services/MovimientoService.php con tarifas y categorías.
    $servicio = new MovimientoService();
    // Continúa en MovimientoService.php; valida y recalcula los importes.
    $movimiento = $servicio->validarYCalcular($entrada);

    // Actualiza sólo un movimiento propio y devuelve su estado actual.
    if ($metodo === 'PUT') {
        // Continúa en MovimientoModel::actualizar; exige ID y propietario coincidentes.
        $actualizado = $movimientos->actualizar($usuarioId, $id, $movimiento);
        // Comprueba esta condición.
        if ($actualizado === null) {
            // Envía HTTP 404 y JSON al cliente; responder termina la petición.
            responder(404, ['estado' => 'error', 'mensaje' => 'Movimiento no encontrado.']);
        }
        // Envía HTTP 200 y JSON al cliente; responder termina la petición.
        responder(200, [
            // Incluye el indicador de éxito o error de la respuesta.
            'estado' => 'exito',
            // Incluye el mensaje de la respuesta.
            'mensaje' => 'Movimiento actualizado correctamente.',
            // Incluye el movimiento resultante.
            'movimiento' => MovimientoFormato::desdeFila($actualizado),
        ]);
    }

    // Continúa en MovimientoModel::crear: INSERT y recuperación del identificador.
    $movimiento['id'] = $movimientos->crear($usuarioId, $movimiento);
    // Devuelve el alta a js/api.js; js/app.js muestra la confirmación.
    responder(201, [
        // Incluye el indicador de éxito o error de la respuesta.
        'estado' => 'exito',
        // Incluye el mensaje de la respuesta.
        'mensaje' => 'Movimiento guardado correctamente.',
        // Incluye el movimiento resultante.
        'movimiento' => MovimientoFormato::desdeFila($movimiento),
    ]);
// Captura el error para responder de forma controlada.
} catch (InvalidArgumentException $error) {
    // Envía HTTP 400 y JSON al cliente; responder termina la petición.
    responder(400, ['estado' => 'error', 'mensaje' => $error->getMessage()]);
// Captura el error para responder de forma controlada.
} catch (PDOException $error) {
    // Registra el detalle técnico en el servidor sin mostrarlo al usuario.
    error_log('Movimientos ' . $metodo . ': ' . $error->getMessage());
    // Envía HTTP 500 y JSON al cliente; responder termina la petición.
    responder(500, ['estado' => 'error', 'mensaje' => 'No se pudo completar la operación de movimientos.']);
// Captura el error para responder de forma controlada.
} catch (Throwable $error) {
    // Registra el detalle técnico en el servidor sin mostrarlo al usuario.
    error_log('Configuración de movimientos: ' . $error->getMessage());
    // Envía HTTP 500 y JSON al cliente; responder termina la petición.
    responder(500, ['estado' => 'error', 'mensaje' => 'Error interno del servidor.']);
}
