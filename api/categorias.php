<?php
declare(strict_types=1); // Activa el control estricto de tipos en las llamadas de este archivo.

// Recupera la sesión y declara respuestas JSON.
require_once __DIR__ . '/../config/sesion.php'; // Continúa en ../config/sesion.php; lo carga una sola vez en esta petición.
header('Content-Type: application/json; charset=utf-8'); // Declara que la respuesta contiene JSON con codificación UTF-8.
// Exige una cuenta autenticada antes de consultar datos privados.
if (!isset($_SESSION['usuario_id'])) { // Impide acceder al endpoint privado si no hay una cuenta autenticada.
    http_response_code(401); // Establece HTTP 401: autenticación requerida o incorrecta.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Acceso no autorizado. Iniciá sesión.']); // Convierte los datos de PHP a JSON y los envía al navegador.
    exit; // Termina la petición; no ejecuta las operaciones que siguen.
} // Finaliza este bloque.
// Acepta únicamente consultas GET.
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { // Acepta únicamente consultas GET.
    http_response_code(405); // Establece HTTP 405: método no permitido.
    header('Allow: GET'); // Informa qué métodos HTTP admite este endpoint.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']); // Convierte los datos de PHP a JSON y los envía al navegador.
    exit; // Termina la petición; no ejecuta las operaciones que siguen.
} // Finaliza este bloque.
// Rechaza identificadores de categoría vacíos o de tipo incorrecto.
if (isset($_GET['id']) && (!is_string($_GET['id']) || $_GET['id'] === '')) { // Rechaza identificadores de categoría vacíos o de tipo incorrecto.
    http_response_code(400); // Establece HTTP 400: entrada inválida.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Indicá un identificador de categoría válido.']); // Convierte los datos de PHP a JSON y los envía al navegador.
    exit; // Termina la petición; no ejecuta las operaciones que siguen.
} // Finaliza este bloque.

// Carga la conexión, los modelos y el formato de salida.
require_once __DIR__ . '/../config/conexion.php'; // Continúa en ../config/conexion.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../models/CategoriaModel.php'; // Continúa en ../models/CategoriaModel.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../models/MovimientoModel.php'; // Continúa en ../models/MovimientoModel.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../services/MovimientoFormato.php'; // Continúa en ../services/MovimientoFormato.php; lo carga una sola vez en esta petición.

// CategoriaModel.php calcula totales; MovimientoModel.php obtiene el historial propio.
try { // Intenta la operación; catch manejará sus posibles errores.
    $usuarioId = (int) $_SESSION['usuario_id']; // Guarda identificador del propietario autenticado para las siguientes operaciones.
    $categorias = new CategoriaModel($pdo); // Guarda categorías admitidas para las siguientes operaciones.
    // Devuelve todas las categorías con sus totales propios.
    if (!isset($_GET['id'])) { // Devuelve todas las categorías con sus totales propios.
        $respuesta = ['estado' => 'exito', 'categorias' => $categorias->listarPorUsuario($usuarioId)]; // Guarda respuesta HTTP del servidor para las siguientes operaciones.
    } else { // Ejecuta la alternativa cuando no se cumple la condición anterior.
        // Busca una categoría concreta y comprueba su existencia.
        $categoria = $categorias->buscarPorId($_GET['id'], $usuarioId); // Guarda categoría seleccionada para las siguientes operaciones.
        if ($categoria === null) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            http_response_code(404); // Establece HTTP 404: recurso no encontrado.
            echo json_encode(['estado' => 'error', 'mensaje' => 'Categoría no encontrada.']); // Convierte los datos de PHP a JSON y los envía al navegador.
            exit; // Termina la petición; no ejecuta las operaciones que siguen.
        } // Finaliza este bloque.
        // Consulta y formatea el historial de esa categoría.
        $movimientos = new MovimientoModel($pdo); // Entrega PDO a models/MovimientoModel.php para ejecutar el CRUD.
        $filas = $movimientos->listarPorCategoria($usuarioId, $categoria['nombre']); // Guarda filas obtenidas de la consulta para las siguientes operaciones.
        $respuesta = [ // Guarda respuesta HTTP del servidor para las siguientes operaciones.
            'estado' => 'exito', // Incluye el indicador de éxito o error de la respuesta en esta estructura.
            'categoria' => $categoria, // Incluye la categoría del movimiento en esta estructura.
            'movimientos' => array_map([MovimientoFormato::class, 'desdeFila'], $filas), // Incluye la lista de movimientos en esta estructura.
        ]; // Completa la estructura o llamada iniciada arriba.
    } // Finaliza este bloque.
    // Envía el resultado como JSON con caracteres Unicode.
    echo json_encode($respuesta, JSON_UNESCAPED_UNICODE); // Convierte los datos de PHP a JSON y los envía al navegador.
} catch (Throwable $error) { // Recibe el fallo y permite responder sin continuar como si hubiera éxito.
    // Registra el fallo interno y responde sin exponer detalles técnicos.
    error_log('Consulta de categorías: ' . $error->getMessage()); // Registra el detalle técnico en el servidor sin mostrarlo al usuario.
    http_response_code(500); // Establece HTTP 500: fallo interno.
    echo json_encode(['estado' => 'error', 'mensaje' => 'No se pudieron consultar las categorías.']); // Convierte los datos de PHP a JSON y los envía al navegador.
} // Finaliza este bloque.
