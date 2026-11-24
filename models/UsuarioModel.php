<?php
// Activa el control estricto de tipos en las llamadas de este archivo.
declare(strict_types=1);

// Encapsula las consultas de usuarios sin generar HTML ni respuestas HTTP.
final class UsuarioModel
{
    // Conserva conexión PDO compartida como propiedad del objeto.
    private PDO $conexion;

    // Recibe la conexión PDO sin crear otra dentro del modelo.
    public function __construct(PDO $conexion)
    {
        // Conserva el mismo objeto PDO; los métodos no abren otra conexión.
        $this->conexion = $conexion;
    }

    // Consulta usuarios con PDO y devuelve una cuenta o null a api/login.php.
    public function buscarPorEmail(string $email): ?array
    {
        // Prepara la sentencia SQL; los valores se vinculan después con execute.
        $consulta = $this->conexion->prepare(
            // Define la consulta SQL y sus marcadores de parámetros.
            'SELECT id, nombre, email, password FROM usuarios WHERE email = :email'
        );
        // Ejecuta SQL vinculando valores separados de las instrucciones.
        $consulta->execute(['email' => $email]);
        // Recupera una fila SQL; este fetch de PDO no envía HTTP.
        $usuario = $consulta->fetch(PDO::FETCH_ASSOC);

        // Indica que no existe una cuenta con ese correo.
        if ($usuario === false) {
            // Devuelve ausencia de resultado al código que llamó.
            return null;
        }

        // Guarda usuario['id'].
        $usuario['id'] = (int) $usuario['id'];
        // Devuelve la cuenta a api/login.php para comprobar password_verify.
        return $usuario;
    }

    // Inserta nombre, correo y hash mediante parámetros SQL.
    public function crear(string $nombre, string $email, string $passwordHash): int
    {
        // Prepara la sentencia SQL; los valores se vinculan después con execute.
        $consulta = $this->conexion->prepare(
            // Define la inserción SQL sin concatenar datos del usuario.
            'INSERT INTO usuarios (nombre, email, password) VALUES (:nombre, :email, :password)'
        );
        // Ejecuta SQL vinculando valores separados de las instrucciones.
        $consulta->execute([
            // Incluye el nombre de la cuenta.
            'nombre' => $nombre,
            // Incluye el correo de la cuenta.
            'email' => $email,
            // Vincula el hash BCRYPT con la columna usuarios.password.
            'password' => $passwordHash,
        ]);

        // Devuelve el ID creado a api/registro.php; el hash queda en usuarios.password.
        return (int) $this->conexion->lastInsertId();
    }
}
