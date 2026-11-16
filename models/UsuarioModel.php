<?php
declare(strict_types=1);

final class UsuarioModel
{
    private PDO $conexion;

    public function __construct(PDO $conexion)
    {
        $this->conexion = $conexion;
    }

    public function buscarPorEmail(string $email): ?array
    {
        $consulta = $this->conexion->prepare(
            'SELECT id, nombre, email, password FROM usuarios WHERE email = :email'
        );
        $consulta->execute(['email' => $email]);
        $usuario = $consulta->fetch(PDO::FETCH_ASSOC);

        if ($usuario === false) {
            return null;
        }

        $usuario['id'] = (int) $usuario['id'];
        return $usuario;
    }

    public function crear(string $nombre, string $email, string $passwordHash): int
    {
        $consulta = $this->conexion->prepare(
            'INSERT INTO usuarios (nombre, email, password) VALUES (:nombre, :email, :password)'
        );
        $consulta->execute([
            'nombre' => $nombre,
            'email' => $email,
            'password' => $passwordHash,
        ]);

        return (int) $this->conexion->lastInsertId();
    }
}
