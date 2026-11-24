<?php
declare(strict_types=1); // Activa el control estricto de tipos en las llamadas de este archivo.

// Declara respuestas JSON UTF-8.
header('Content-Type: application/json; charset=utf-8'); // Declara que la respuesta contiene JSON con codificación UTF-8.

// Acepta únicamente solicitudes POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { // Acepta únicamente solicitudes POST.
    http_response_code(405); // Establece HTTP 405: método no permitido.
    header('Allow: POST'); // Informa qué métodos HTTP admite este endpoint.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']); // Convierte los datos de PHP a JSON y los envía al navegador.
    exit; // Termina la petición; no ejecuta las operaciones que siguen.
} // Finaliza este bloque.

// Recupera la sesión y exige un token CSRF válido.
require_once __DIR__ . '/../config/seguridad.php'; // Continúa en ../config/seguridad.php; lo carga una sola vez en esta petición.
validarTokenCsrf(); // Continúa en config/seguridad.php; un token inválido termina con HTTP 403.

// Lee el JSON y comprueba la presencia y el tipo de los campos.
$input = json_decode(file_get_contents('php://input')); // Convierte el JSON recibido o leído a una estructura PHP.
if (!is_object($input) // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
    || !isset($input->nombre, $input->email, $input->password) // Agrega otra condición a la comprobación de la línea anterior.
    || !is_string($input->nombre) // Agrega otra condición a la comprobación de la línea anterior.
    || !is_string($input->email) // Agrega otra condición a la comprobación de la línea anterior.
    || !is_string($input->password)) { // Agrega otra condición a la comprobación de la línea anterior.
    http_response_code(400); // Establece HTTP 400: entrada inválida.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Los datos de registro no son válidos.']); // Convierte los datos de PHP a JSON y los envía al navegador.
    exit; // Termina la petición; no ejecuta las operaciones que siguen.
} // Finaliza este bloque.

// Quita espacios externos de nombre y correo.
$nombre = trim($input->nombre); // Guarda nombre para las siguientes operaciones.
$email = trim($input->email); // Guarda correo de la cuenta para las siguientes operaciones.
$password = $input->password; // Guarda contraseña ingresada para las siguientes operaciones.

// Rechaza campos obligatorios vacíos.
if ($nombre === '' || $email === '' || $password === '') { // Rechaza campos obligatorios vacíos.
    http_response_code(400); // Establece HTTP 400: entrada inválida.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Todos los campos son obligatorios.']); // Convierte los datos de PHP a JSON y los envía al navegador.
    exit; // Termina la petición; no ejecuta las operaciones que siguen.
} // Finaliza este bloque.

// Limita el nombre a cien caracteres.
if (mb_strlen($nombre) > 100) { // Limita el nombre a cien caracteres.
    http_response_code(400); // Establece HTTP 400: entrada inválida.
    echo json_encode(['estado' => 'error', 'mensaje' => 'El nombre puede tener hasta 100 caracteres.']); // Convierte los datos de PHP a JSON y los envía al navegador.
    exit; // Termina la petición; no ejecuta las operaciones que siguen.
} // Finaliza este bloque.

// Comprueba el formato y la longitud del correo.
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) { // Comprueba el formato y la longitud del correo.
    http_response_code(400); // Establece HTTP 400: entrada inválida.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Ingresá un correo electrónico válido.']); // Convierte los datos de PHP a JSON y los envía al navegador.
    exit; // Termina la petición; no ejecuta las operaciones que siguen.
} // Finaliza este bloque.

// Limita la contraseña a entre ocho y setenta y dos bytes sin nulos.
if (strlen($password) < 8 || strlen($password) > 72 || str_contains($password, "\0")) { // Limita la contraseña a entre ocho y setenta y dos bytes sin nulos.
    http_response_code(400); // Establece HTTP 400: entrada inválida.
    echo json_encode([ // Convierte los datos de PHP a JSON y los envía al navegador.
        'estado' => 'error', // Incluye el indicador de éxito o error de la respuesta en esta estructura.
        'mensaje' => 'La contraseña debe tener entre 8 y 72 bytes y no incluir caracteres nulos.', // Incluye el mensaje de la respuesta en esta estructura.
    ], JSON_UNESCAPED_UNICODE); // Termina el JSON conservando tildes y otros caracteres Unicode.
    exit; // Termina la petición; no ejecuta las operaciones que siguen.
} // Finaliza este bloque.

// Carga PDO y el modelo de usuarios.
require_once __DIR__ . '/../config/conexion.php'; // Continúa en ../config/conexion.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../models/UsuarioModel.php'; // Continúa en ../models/UsuarioModel.php; lo carga una sola vez en esta petición.

// Genera BCRYPT y guarda con UsuarioModel.php; luego se debe iniciar sesión.
try { // Intenta la operación; catch manejará sus posibles errores.
    $usuarios = new UsuarioModel($pdo); // Entrega la conexión existente a models/UsuarioModel.php.
    // Transforma la contraseña en un hash BCRYPT antes de guardarla.
    $passwordHash = password_hash($password, PASSWORD_BCRYPT); // Genera el hash BCRYPT; UsuarioModel::crear lo guarda en usuarios.password.
    $usuarios->crear($nombre, $email, $passwordHash); // Continúa en models/UsuarioModel.php; INSERT parametrizado del hash BCRYPT.

    // Confirma la creación mediante HTTP 201.
    http_response_code(201); // Establece HTTP 201: recurso creado.
    echo json_encode([ // Convierte los datos de PHP a JSON y los envía al navegador.
        'estado' => 'exito', // Incluye el indicador de éxito o error de la respuesta en esta estructura.
        'mensaje' => 'Usuario registrado correctamente.', // Incluye el mensaje de la respuesta en esta estructura.
    ], JSON_UNESCAPED_UNICODE); // Termina el JSON conservando tildes y otros caracteres Unicode.
} catch (PDOException $error) { // Recibe el fallo y permite responder sin continuar como si hubiera éxito.
    // Distingue el correo duplicado de otros errores de base de datos.
    if ($error->getCode() === '23000' && (int) ($error->errorInfo[1] ?? 0) === 1062) { // Distingue el correo duplicado de otros errores de base de datos.
        // Devuelve 409 cuando el correo ya está registrado.
        http_response_code(409); // Establece HTTP 409: conflicto con datos existentes.
        echo json_encode(['estado' => 'error', 'mensaje' => 'El correo electrónico ya está registrado.']); // Convierte los datos de PHP a JSON y los envía al navegador.
    } else { // Ejecuta la alternativa cuando no se cumple la condición anterior.
        // Registra otros fallos de PDO y devuelve un mensaje general.
        error_log('Registro de usuario: ' . $error->getMessage()); // Registra el detalle técnico en el servidor sin mostrarlo al usuario.
        http_response_code(500); // Establece HTTP 500: fallo interno.
        echo json_encode(['estado' => 'error', 'mensaje' => 'Error interno al registrar el usuario.']); // Convierte los datos de PHP a JSON y los envía al navegador.
    } // Finaliza este bloque.
} // Finaliza este bloque.
