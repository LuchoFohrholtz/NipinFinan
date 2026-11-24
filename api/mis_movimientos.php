<?php
declare(strict_types=1); // Activa el control estricto de tipos en las llamadas de este archivo.

// Recupera la sesión y las funciones de seguridad.
require_once __DIR__ . '/../config/seguridad.php'; // Continúa en ../config/seguridad.php; lo carga una sola vez en esta petición.
header('Content-Type: application/json; charset=utf-8'); // Declara que la respuesta contiene JSON con codificación UTF-8.

// Envía un estado HTTP y su JSON, y termina la petición.
function responder(int $codigo, array $datos): never // Envía el código HTTP y el JSON; exit detiene la petición.
{ // Comienza el cuerpo de la función, clase o condición.
    http_response_code($codigo); // Establece HTTP $codigo: estado de la respuesta.
    echo json_encode($datos, JSON_UNESCAPED_UNICODE); // Convierte los datos de PHP a JSON y los envía al navegador.
    exit; // Termina la petición; no ejecuta las operaciones que siguen.
} // Finaliza este bloque.

// Rechaza el acceso anónimo antes de procesar operaciones privadas.
if (!isset($_SESSION['usuario_id'])) { // Impide acceder al endpoint privado si no hay una cuenta autenticada.
    responder(401, ['estado' => 'error', 'mensaje' => 'Acceso no autorizado. Iniciá sesión.']); // Envía HTTP 401 y JSON al cliente; responder termina la petición.
} // Finaliza este bloque.

// Comprueba que el método pertenezca al CRUD admitido.
$metodo = $_SERVER['REQUEST_METHOD']; // Guarda método HTTP del pedido para las siguientes operaciones.
if (!in_array($metodo, ['GET', 'POST', 'PUT', 'DELETE'], true)) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
    header('Allow: GET, POST, PUT, DELETE'); // Informa qué métodos HTTP admite este endpoint.
    responder(405, ['estado' => 'error', 'mensaje' => 'Método no permitido.']); // Envía HTTP 405 y JSON al cliente; responder termina la petición.
} // Finaliza este bloque.

// Exige CSRF en POST, PUT y DELETE; GET sólo consulta.
if ($metodo !== 'GET') { // Exige CSRF en POST, PUT y DELETE; GET sólo consulta.
    validarTokenCsrf(); // Continúa en config/seguridad.php; un token inválido termina con HTTP 403.
} // Finaliza este bloque.

// Carga PDO, persistencia, reglas y formato de movimientos.
require_once __DIR__ . '/../config/conexion.php'; // Continúa en ../config/conexion.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../models/MovimientoModel.php'; // Continúa en ../models/MovimientoModel.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../services/MovimientoService.php'; // Continúa en ../services/MovimientoService.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../services/MovimientoFormato.php'; // Continúa en ../services/MovimientoFormato.php; lo carga una sola vez en esta petición.

// Obtiene el propietario desde la sesión, nunca desde el JSON.
$usuarioId = (int) $_SESSION['usuario_id']; // Guarda identificador del propietario autenticado para las siguientes operaciones.
$movimientos = new MovimientoModel($pdo); // Entrega PDO a models/MovimientoModel.php para ejecutar el CRUD.

// Valida que el identificador recibido sea un entero positivo permitido.
function leerIdMovimiento(): int // Lee y valida el identificador del movimiento recibido por URL.
{ // Comienza el cuerpo de la función, clase o condición.
    $valor = $_GET['id'] ?? null; // Guarda valor que se va a comprobar para las siguientes operaciones.
    if (!is_string($valor)) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        throw new InvalidArgumentException('Indicá un ID de movimiento válido.'); // Interrumpe el recorrido y comunica el error al código que llamó.
    } // Finaliza este bloque.
    // Limita el identificador al rango de la columna MySQL.
    $id = filter_var($valor, FILTER_VALIDATE_INT, [ // Guarda identificador del recurso para las siguientes operaciones.
        'options' => ['min_range' => 1, 'max_range' => 4294967295], // Incluye el campo options en esta estructura.
    ]); // Completa la estructura o llamada iniciada arriba.
    if ($id === false) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        throw new InvalidArgumentException('Indicá un ID de movimiento válido.'); // Interrumpe el recorrido y comunica el error al código que llamó.
    } // Finaliza este bloque.
    return $id; // Devuelve identificador del recurso al código que llamó.
} // Finaliza este bloque.

// Lee un objeto JSON y rechaza cuerpos mal formados o de otro tipo.
function leerEntradaMovimiento(): stdClass // Lee el cuerpo HTTP y exige un objeto JSON válido.
{ // Comienza el cuerpo de la función, clase o condición.
    $entrada = json_decode(file_get_contents('php://input')); // Convierte el JSON recibido o leído a una estructura PHP.
    if (json_last_error() !== JSON_ERROR_NONE || !$entrada instanceof stdClass) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        throw new InvalidArgumentException('Enviá un objeto JSON válido.'); // Interrumpe el recorrido y comunica el error al código que llamó.
    } // Finaliza este bloque.
    return $entrada; // Devuelve datos recibidos para validar al código que llamó.
} // Finaliza este bloque.

// Ejecuta el CRUD y transforma los fallos en respuestas HTTP.
try { // Intenta la operación; catch manejará sus posibles errores.
    // Lista únicamente los movimientos de la cuenta autenticada.
    if ($metodo === 'GET') { // Lista únicamente los movimientos de la cuenta autenticada.
        $filas = $movimientos->listarPorUsuario($usuarioId); // Continúa en MovimientoModel::listarPorUsuario; filtra por propietario.
        responder(200, [ // Envía HTTP 200 y JSON al cliente; responder termina la petición.
            'estado' => 'exito', // Incluye el indicador de éxito o error de la respuesta en esta estructura.
            'usuario' => [ // Incluye los datos públicos de la cuenta en esta estructura.
                'nombre' => $_SESSION['usuario_nombre'], // Incluye el nombre de la cuenta en esta estructura.
                'email' => $_SESSION['usuario_email'], // Incluye el correo de la cuenta en esta estructura.
            ], // Completa la estructura o llamada iniciada arriba.
            'movimientos' => array_map([MovimientoFormato::class, 'desdeFila'], $filas), // Incluye la lista de movimientos en esta estructura.
        ]); // Completa la estructura o llamada iniciada arriba.
    } // Finaliza este bloque.

    // Elimina por identificador y propietario, o responde 404.
    if ($metodo === 'DELETE') { // Elimina por identificador y propietario, o responde 404.
        $id = leerIdMovimiento(); // Guarda identificador del recurso para las siguientes operaciones.
        if (!$movimientos->eliminar($usuarioId, $id)) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            responder(404, ['estado' => 'error', 'mensaje' => 'Movimiento no encontrado.']); // Envía HTTP 404 y JSON al cliente; responder termina la petición.
        } // Finaliza este bloque.
        responder(200, ['estado' => 'exito', 'mensaje' => 'Movimiento eliminado correctamente.', 'id' => $id]); // Envía HTTP 200 y JSON al cliente; responder termina la petición.
    } // Finaliza este bloque.

    // POST y PUT comparten las reglas de services/MovimientoService.php.
    $id = $metodo === 'PUT' ? leerIdMovimiento() : null; // Guarda identificador del recurso para las siguientes operaciones.
    $entrada = leerEntradaMovimiento(); // Guarda datos recibidos para validar para las siguientes operaciones.
    $servicio = new MovimientoService(); // Carga services/MovimientoService.php con tarifas y categorías.
    $movimiento = $servicio->validarYCalcular($entrada); // Continúa en MovimientoService.php; valida y recalcula los importes.

    // Actualiza sólo un movimiento propio y devuelve su estado actual.
    if ($metodo === 'PUT') { // Actualiza sólo un movimiento propio y devuelve su estado actual.
        $actualizado = $movimientos->actualizar($usuarioId, $id, $movimiento); // Continúa en MovimientoModel::actualizar; exige ID y propietario coincidentes.
        if ($actualizado === null) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            responder(404, ['estado' => 'error', 'mensaje' => 'Movimiento no encontrado.']); // Envía HTTP 404 y JSON al cliente; responder termina la petición.
        } // Finaliza este bloque.
        responder(200, [ // Envía HTTP 200 y JSON al cliente; responder termina la petición.
            'estado' => 'exito', // Incluye el indicador de éxito o error de la respuesta en esta estructura.
            'mensaje' => 'Movimiento actualizado correctamente.', // Incluye el mensaje de la respuesta en esta estructura.
            'movimiento' => MovimientoFormato::desdeFila($actualizado), // Incluye el movimiento resultante en esta estructura.
        ]); // Completa la estructura o llamada iniciada arriba.
    } // Finaliza este bloque.

    // MovimientoModel.php ejecuta el INSERT; esta API responde 201 con el resultado.
    $movimiento['id'] = $movimientos->crear($usuarioId, $movimiento); // Continúa en MovimientoModel::crear: INSERT y recuperación del identificador.
    responder(201, [ // Devuelve el alta a js/api.js; js/app.js muestra la confirmación.
        'estado' => 'exito', // Incluye el indicador de éxito o error de la respuesta en esta estructura.
        'mensaje' => 'Movimiento guardado correctamente.', // Incluye el mensaje de la respuesta en esta estructura.
        'movimiento' => MovimientoFormato::desdeFila($movimiento), // Incluye el movimiento resultante en esta estructura.
    ]); // Completa la estructura o llamada iniciada arriba.
} catch (InvalidArgumentException $error) { // Recibe el fallo y permite responder sin continuar como si hubiera éxito.
    // Devuelve 400 cuando la entrada no cumple las reglas.
    responder(400, ['estado' => 'error', 'mensaje' => $error->getMessage()]); // Envía HTTP 400 y JSON al cliente; responder termina la petición.
} catch (PDOException $error) { // Recibe el fallo y permite responder sin continuar como si hubiera éxito.
    // Registra fallos de PDO sin exponer SQL al navegador.
    error_log('Movimientos ' . $metodo . ': ' . $error->getMessage()); // Registra el detalle técnico en el servidor sin mostrarlo al usuario.
    responder(500, ['estado' => 'error', 'mensaje' => 'No se pudo completar la operación de movimientos.']); // Envía HTTP 500 y JSON al cliente; responder termina la petición.
} catch (Throwable $error) { // Recibe el fallo y permite responder sin continuar como si hubiera éxito.
    // Captura otros fallos internos y devuelve un error general.
    error_log('Configuración de movimientos: ' . $error->getMessage()); // Registra el detalle técnico en el servidor sin mostrarlo al usuario.
    responder(500, ['estado' => 'error', 'mensaje' => 'Error interno del servidor.']); // Envía HTTP 500 y JSON al cliente; responder termina la petición.
} // Finaliza este bloque.
