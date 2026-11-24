<?php
declare(strict_types=1); // Activa el control estricto de tipos en las llamadas de este archivo.

// Concentra la creación y reutilización de PDO dentro de cada petición.
final class Conexion // Define la clase Conexion.
{ // Comienza el cuerpo de la función, clase o condición.
    // Conserva la instancia única y su conexión PDO.
    private static ?self $instancia = null; // Conserva instancia compartida de Conexion como propiedad del objeto.
    private PDO $pdo; // Conserva conexión PDO con MySQL como propiedad del objeto.

    // Crea PDO con los ajustes generales y los opcionales de esta máquina.
    private function __construct() // Define __construct con sus entradas y el resultado que devuelve.
    { // Comienza el cuerpo de la función, clase o condición.
        // Define los valores predeterminados para el entorno local.
        $configuracion = [ // Guarda parámetros de conexión para las siguientes operaciones.
            'host' => '127.0.0.1', // Incluye el servidor de MySQL en esta estructura.
            'port' => 3306, // Incluye el puerto de MySQL en esta estructura.
            'database' => 'nipinfinan', // Incluye el nombre de la base de datos en esta estructura.
            'user' => 'root', // Incluye el usuario de MySQL en esta estructura.
            'password' => '', // Incluye el hash o valor de contraseña según esta operación en esta estructura.
        ]; // Completa la estructura o llamada iniciada arriba.
        // Permite sustituir ajustes sin publicar credenciales locales.
        $archivoLocal = __DIR__ . '/conexion.local.php'; // Guarda ruta de la configuración exclusiva de esta máquina para las siguientes operaciones.
        if (is_file($archivoLocal)) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            $configuracion = array_replace($configuracion, require $archivoLocal); // Guarda parámetros de conexión para las siguientes operaciones.
        } // Finaliza este bloque.
        // Construye el DSN de MySQL con codificación UTF-8 completa.
        $dsn = sprintf( // Guarda dirección de conexión a MySQL para las siguientes operaciones.
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', // Incluye el campo mysql en esta estructura.
            $configuracion['host'], $configuracion['port'], $configuracion['database'] // Sustituye servidor, puerto y base en el DSN de conexión.
        ); // Completa la estructura o llamada iniciada arriba.
        // Activa excepciones, filas asociativas y consultas preparadas nativas.
        $this->pdo = new PDO($dsn, $configuracion['user'], $configuracion['password'], [ // Abre la conexión MySQL que compartirán los modelos en esta petición.
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, // Hace que los errores PDO lancen excepciones capturables con try/catch.
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, // Devuelve filas indexadas por nombre de columna.
            PDO::ATTR_EMULATE_PREPARES => false, // Usa consultas preparadas nativas de MySQL.
        ]); // Completa la estructura o llamada iniciada arriba.
    } // Finaliza este bloque.

    // Devuelve la conexión existente o la crea si todavía no existe.
    public static function obtener(): PDO // Define obtener con sus entradas y el resultado que devuelve.
    { // Comienza el cuerpo de la función, clase o condición.
        self::$instancia ??= new self(); // Crea la instancia sólo si todavía no existe en esta petición PHP.
        return self::$instancia->pdo; // Entrega PDO a config/conexion.php y después a los modelos.
    } // Finaliza este bloque.
} // Finaliza este bloque.
