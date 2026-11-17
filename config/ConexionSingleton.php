<?php
declare(strict_types=1);

// Concentra la creación y reutilización de PDO dentro de cada petición.
final class Conexion
{
    // Conserva la instancia única y su conexión PDO.
    private static ?self $instancia = null;
    private PDO $pdo;

    // Crea PDO con los ajustes generales y los opcionales de esta máquina.
    private function __construct()
    {
        // Define los valores predeterminados para el entorno local.
        $configuracion = [
            'host' => '127.0.0.1',
            'port' => 3306,
            'database' => 'nipinfinan',
            'user' => 'root',
            'password' => '',
        ];
        // Permite sustituir ajustes sin publicar credenciales locales.
        $archivoLocal = __DIR__ . '/conexion.local.php';
        if (is_file($archivoLocal)) {
            $configuracion = array_replace($configuracion, require $archivoLocal);
        }
        // Construye el DSN de MySQL con codificación UTF-8 completa.
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $configuracion['host'], $configuracion['port'], $configuracion['database']
        );
        // Activa excepciones, filas asociativas y consultas preparadas nativas.
        $this->pdo = new PDO($dsn, $configuracion['user'], $configuracion['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }

    // Devuelve la conexión existente o la crea si todavía no existe.
    public static function obtener(): PDO
    {
        self::$instancia ??= new self();
        return self::$instancia->pdo;
    }
}
