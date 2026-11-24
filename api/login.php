<?php
declare(strict_types=1); // Activa el control estricto de tipos en las llamadas de este archivo.

// Declara que las respuestas contienen JSON UTF-8.
header('Content-Type: application/json; charset=utf-8'); // Declara que la respuesta contiene JSON con codificación UTF-8.

// Acepta únicamente solicitudes POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { // Acepta únicamente solicitudes POST.
    http_response_code(405); // Establece HTTP 405: método no permitido.
    header('Allow: POST'); // Informa qué métodos HTTP admite este endpoint.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Método no permitido.']); // Convierte los datos de PHP a JSON y los envía al navegador.
    exit; // Termina la petición; no ejecuta las operaciones que siguen.
} // Finaliza este bloque.

// Recupera la sesión y comprueba el token CSRF.
require_once __DIR__ . '/../config/seguridad.php'; // Continúa en ../config/seguridad.php; lo carga una sola vez en esta petición.
validarTokenCsrf(); // Continúa en config/seguridad.php; un token inválido termina con HTTP 403.

// Lee el cuerpo JSON y comprueba los tipos de los campos.
$input = json_decode(file_get_contents('php://input')); // Convierte el JSON recibido o leído a una estructura PHP.
if (!is_object($input) // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
    || !isset($input->email, $input->password) // Agrega otra condición a la comprobación de la línea anterior.
    || !is_string($input->email) // Agrega otra condición a la comprobación de la línea anterior.
    || !is_string($input->password)) { // Agrega otra condición a la comprobación de la línea anterior.
    http_response_code(400); // Establece HTTP 400: entrada inválida.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Los datos de acceso no son válidos.']); // Convierte los datos de PHP a JSON y los envía al navegador.
    exit; // Termina la petición; no ejecuta las operaciones que siguen.
} // Finaliza este bloque.

// Normaliza el correo y conserva la contraseña tal como se recibió.
$email = trim($input->email); // Guarda correo de la cuenta para las siguientes operaciones.
$password = $input->password; // Guarda contraseña ingresada para las siguientes operaciones.

// Rechaza campos obligatorios vacíos.
if ($email === '' || $password === '') { // Rechaza campos obligatorios vacíos.
    http_response_code(400); // Establece HTTP 400: entrada inválida.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Ingresá correo y contraseña.']); // Convierte los datos de PHP a JSON y los envía al navegador.
    exit; // Termina la petición; no ejecuta las operaciones que siguen.
} // Finaliza este bloque.

// Carga PDO y el modelo que consulta usuarios.
require_once __DIR__ . '/../config/conexion.php'; // Continúa en ../config/conexion.php; lo carga una sola vez en esta petición.
require_once __DIR__ . '/../models/UsuarioModel.php'; // Continúa en ../models/UsuarioModel.php; lo carga una sola vez en esta petición.

// Consulta UsuarioModel.php; luego verifica el hash y establece la sesión.
try { // Intenta la operación; catch manejará sus posibles errores.
    $usuarios = new UsuarioModel($pdo); // Entrega la conexión existente a models/UsuarioModel.php.
    $usuario = $usuarios->buscarPorEmail($email); // Continúa en UsuarioModel::buscarPorEmail: SELECT, execute y fetch.

    // Verifica la contraseña contra el hash BCRYPT guardado.
    if ($usuario !== null && password_verify($password, $usuario['password'])) { // Exige una cuenta existente y una contraseña que coincida con el hash BCRYPT.
        require_once __DIR__ . '/../config/sesion.php'; // Continúa en ../config/sesion.php; lo carga una sola vez en esta petición.
        // Renueva el identificador y el token al autenticar la cuenta.
        session_regenerate_id(true); // Renueva el identificador y elimina la sesión anterior al autenticar.
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32)); // Guarda un token aleatorio de 64 caracteres; api/sesion.php lo entrega al cliente.

        // Guarda la identidad autenticada en la sesión del servidor.
        $_SESSION['usuario_id'] = $usuario['id']; // Guarda el propietario; las API privadas lo usan para autorizar y filtrar SQL.
        $_SESSION['usuario_nombre'] = $usuario['nombre']; // Guarda el nombre en la sesión del servidor.
        $_SESSION['usuario_email'] = $usuario['email']; // Guarda el correo en la sesión del servidor.

        // Devuelve la identidad pública y el nuevo token al navegador.
        http_response_code(200); // Establece HTTP 200: operación correcta.
        echo json_encode([ // Convierte los datos de PHP a JSON y los envía al navegador.
            'estado' => 'exito', // Incluye el indicador de éxito o error de la respuesta en esta estructura.
            'mensaje' => 'Autenticación exitosa.', // Incluye el mensaje de la respuesta en esta estructura.
            'csrfToken' => obtenerTokenCsrf(), // Incluye el token que js/api.js guardará para las siguientes escrituras.
            'usuario' => [ // Incluye los datos públicos de la cuenta en esta estructura.
                'nombre' => $usuario['nombre'], // Incluye el nombre de la cuenta en esta estructura.
                'email' => $usuario['email'], // Incluye el correo de la cuenta en esta estructura.
            ], // Completa la estructura o llamada iniciada arriba.
        ], JSON_UNESCAPED_UNICODE); // Termina el JSON conservando tildes y otros caracteres Unicode.
    } else { // Ejecuta la alternativa cuando no se cumple la condición anterior.
        // Rechaza credenciales incorrectas sin revelar qué dato falló.
        http_response_code(401); // Establece HTTP 401: autenticación requerida o incorrecta.
        echo json_encode(['estado' => 'error', 'mensaje' => 'Correo o contraseña incorrectos.']); // Convierte los datos de PHP a JSON y los envía al navegador.
    } // Finaliza este bloque.
} catch (PDOException $error) { // Recibe el fallo y permite responder sin continuar como si hubiera éxito.
    // Registra el error de base de datos y devuelve un mensaje general.
    error_log('Inicio de sesión: ' . $error->getMessage()); // Registra el detalle técnico en el servidor sin mostrarlo al usuario.
    http_response_code(500); // Establece HTTP 500: fallo interno.
    echo json_encode(['estado' => 'error', 'mensaje' => 'Error interno del servidor.']); // Convierte los datos de PHP a JSON y los envía al navegador.
} // Finaliza este bloque.
