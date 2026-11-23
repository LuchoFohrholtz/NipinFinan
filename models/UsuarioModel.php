<?php
declare(strict_types=1);

// Encapsula las consultas de usuarios sin generar HTML ni respuestas HTTP.
final class UsuarioModel
{
    private PDO $conexion;

    // Recibe la conexión PDO sin crear otra dentro del modelo.
    public function __construct(PDO $conexion)
    {
        $this->conexion = $conexion;
    }

    // SELECT usado por api/login.php; recibe correo y devuelve una cuenta o null.
    public function buscarPorEmail(string $email): ?array
    {
        $consulta = $this->conexion->prepare(
            'SELECT id, nombre, email, password FROM usuarios WHERE email = :email'
        );
        // Vincula el correo como dato y recupera una fila asociativa.
        $consulta->execute(['email' => $email]);
        $usuario = $consulta->fetch(PDO::FETCH_ASSOC);

        // Indica que no existe una cuenta con ese correo.
        if ($usuario === false) {
            return null;
        }

        // Normaliza el identificador antes de devolver la cuenta.
        $usuario['id'] = (int) $usuario['id'];
        return $usuario;
    }

    // Inserta nombre, correo y hash mediante parámetros SQL.
    public function crear(string $nombre, string $email, string $passwordHash): int
    {
        $consulta = $this->conexion->prepare(
            'INSERT INTO usuarios (nombre, email, password) VALUES (:nombre, :email, :password)'
        );
        // Vincula los datos sin concatenarlos a la sentencia SQL.
        $consulta->execute([
            'nombre' => $nombre,
            'email' => $email,
            'password' => $passwordHash,
        ]);

        // Devuelve el identificador generado por MySQL.
        return (int) $this->conexion->lastInsertId();
    }
}
