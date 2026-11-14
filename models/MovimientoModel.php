<?php
declare(strict_types=1);

final class MovimientoModel
{
    private PDO $conexion;

    public function __construct(PDO $conexion)
    {
        $this->conexion = $conexion;
    }

    public function listarPorUsuario(int $usuarioId): array
    {
        $consulta = $this->conexion->prepare(
            'SELECT id, tipo, descripcion, monto, ajuste, total, cuotas, valor_cuota,
                    fecha, categoria, medio_pago, comentario
             FROM movimientos
             WHERE usuario_id = :usuario_id
             ORDER BY fecha DESC, id DESC'
        );
        $consulta->execute(['usuario_id' => $usuarioId]);

        return $consulta->fetchAll(PDO::FETCH_ASSOC);
    }

    public function crear(int $usuarioId, array $movimiento): int
    {
        $consulta = $this->conexion->prepare(
            'INSERT INTO movimientos
                (usuario_id, tipo, descripcion, monto, ajuste, total, cuotas, valor_cuota,
                 fecha, categoria, medio_pago, comentario)
             VALUES
                (:usuario_id, :tipo, :descripcion, :monto, :ajuste, :total, :cuotas, :valor_cuota,
                 :fecha, :categoria, :medio_pago, :comentario)'
        );
        $consulta->execute([
            'usuario_id' => $usuarioId,
            'tipo' => $movimiento['tipo'],
            'descripcion' => $movimiento['descripcion'],
            'monto' => $movimiento['monto'],
            'ajuste' => $movimiento['ajuste'],
            'total' => $movimiento['total'],
            'cuotas' => $movimiento['cuotas'],
            'valor_cuota' => $movimiento['valor_cuota'],
            'fecha' => $movimiento['fecha'],
            'categoria' => $movimiento['categoria'],
            'medio_pago' => $movimiento['medio_pago'],
            'comentario' => $movimiento['comentario'],
        ]);

        return (int) $this->conexion->lastInsertId();
    }
}
