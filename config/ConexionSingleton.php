<?php
declare(strict_types=1);

final class Conexion
{
    private static ?self $instancia = null;
    private PDO $pdo;

    private function __construct()
    {
        $configuracion = [
            'host' => '127.0.0.1',
            'port' => 3306,
            'database' => 'nipinfinan',
            'user' => 'root',
            'password' => '',
        ];
        $archivoLocal = __DIR__ . '/conexion.local.php';
        if (is_file($archivoLocal)) {
            $configuracion = array_replace($configuracion, require $archivoLocal);
        }
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $configuracion['host'], $configuracion['port'], $configuracion['database']
        );
        $this->pdo = new PDO($dsn, $configuracion['user'], $configuracion['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }

    public static function obtener(): PDO
    {
        self::$instancia ??= new self();
        return self::$instancia->pdo;
    }
}
