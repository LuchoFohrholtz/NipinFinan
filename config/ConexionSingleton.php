<?php
// Activa el control estricto de tipos en las llamadas de este archivo.
declare(strict_types=1);

// Concentra la creación y reutilización de PDO dentro de cada petición.
final class Conexion
{
    // Conserva instancia compartida de Conexion como propiedad del objeto.
    private static ?self $instancia = null;
    // Conserva conexión PDO con MySQL como propiedad del objeto.
    private PDO $pdo;

    // Crea PDO con los ajustes generales y los opcionales de esta máquina.
    private function __construct()
    {
        // Guarda parámetros de conexión.
        $configuracion = [
            // Incluye el servidor de MySQL.
            'host' => '127.0.0.1',
            // Incluye el puerto de MySQL.
            'port' => 3306,
            // Incluye el nombre de la base de datos.
            'database' => 'nipinfinan',
            // Incluye el usuario de MySQL.
            'user' => 'root',
            // Incluye el hash o valor de contraseña según esta operación.
            'password' => '',
        ];
        // Guarda ruta de la configuración exclusiva de esta máquina.
        $archivoLocal = __DIR__ . '/conexion.local.php';
        // Comprueba esta condición.
        if (is_file($archivoLocal)) {
            // Guarda parámetros de conexión.
            $configuracion = array_replace($configuracion, require $archivoLocal);
        }
        // Guarda dirección de conexión a MySQL.
        $dsn = sprintf(
            // Incluye el campo mysql.
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            // Sustituye servidor, puerto y base en el DSN de conexión.
            $configuracion['host'], $configuracion['port'], $configuracion['database']
        );
        // Abre la conexión MySQL que compartirán los modelos en esta petición.
        $this->pdo = new PDO($dsn, $configuracion['user'], $configuracion['password'], [
            // Hace que los errores PDO lancen excepciones capturables con try/catch.
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            // Devuelve filas indexadas por nombre de columna.
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            // Usa consultas preparadas nativas de MySQL.
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }

    // Devuelve la conexión existente o la crea si todavía no existe.
    public static function obtener(): PDO
    {
        // Crea la instancia sólo si todavía no existe en esta petición PHP.
        self::$instancia ??= new self();
        // Entrega PDO a config/conexion.php y después a los modelos.
        return self::$instancia->pdo;
    }
}
