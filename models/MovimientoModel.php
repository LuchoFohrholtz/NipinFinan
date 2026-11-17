<?php
declare(strict_types=1);

// Encapsula el CRUD y filtra siempre los movimientos por propietario.
final class MovimientoModel
{
    private PDO $conexion;

    // Recibe la conexión PDO compartida por el controlador.
    public function __construct(PDO $conexion)
    {
        $this->conexion = $conexion;
    }

    // Consulta los movimientos propios del más reciente al más antiguo.
    public function listarPorUsuario(int $usuarioId): array
    {
        $consulta = $this->conexion->prepare(
            'SELECT id, tipo, descripcion, monto, ajuste, total, cuotas, valor_cuota,
                    fecha, categoria, medio_pago, comentario
             FROM movimientos
             WHERE usuario_id = :usuario_id
             ORDER BY fecha DESC, id DESC'
        );
        // Vincula el usuario autenticado y recupera las filas.
        $consulta->execute(['usuario_id' => $usuarioId]);

        return $consulta->fetchAll(PDO::FETCH_ASSOC);
    }

    // Inserta los importes ya validados y calculados por el servicio.
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
        // Vincula el propietario y los campos del movimiento como parámetros.
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

        // Devuelve el identificador del movimiento creado.
        return (int) $this->conexion->lastInsertId();
    }

    // Actualiza sólo el movimiento que coincide con identificador y usuario.
    public function actualizar(int $usuarioId, int $id, array $movimiento): ?array
    {
        $consulta = $this->conexion->prepare(
            'UPDATE movimientos SET tipo = :tipo, descripcion = :descripcion,
                monto = :monto, ajuste = :ajuste, total = :total, cuotas = :cuotas,
                valor_cuota = :valor_cuota, fecha = :fecha, categoria = :categoria,
                medio_pago = :medio_pago, comentario = :comentario
             WHERE id = :id AND usuario_id = :usuario_id'
        );
        // Vincula los datos editables junto con el identificador y propietario.
        $consulta->execute([
            'id' => $id,
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

        // Recupera también los movimientos guardados sin cambios de valores.
        $consulta = $this->conexion->prepare(
            'SELECT id, tipo, descripcion, monto, ajuste, total, cuotas, valor_cuota,
                    fecha, categoria, medio_pago, comentario
             FROM movimientos WHERE id = :id AND usuario_id = :usuario_id'
        );
        // Consulta la fila actual y devuelve null si el recurso no pertenece al usuario.
        $consulta->execute(['id' => $id, 'usuario_id' => $usuarioId]);
        $fila = $consulta->fetch(PDO::FETCH_ASSOC);
        return $fila === false ? null : $fila;
    }

    // Elimina únicamente un movimiento propio e informa si existía.
    public function eliminar(int $usuarioId, int $id): bool
    {
        $consulta = $this->conexion->prepare(
            'DELETE FROM movimientos WHERE id = :id AND usuario_id = :usuario_id'
        );
        $consulta->execute(['id' => $id, 'usuario_id' => $usuarioId]);
        return $consulta->rowCount() === 1;
    }

    // Consulta el historial propio de una categoría con coincidencia exacta.
    public function listarPorCategoria(int $usuarioId, string $categoria): array
    {
        $consulta = $this->conexion->prepare(
            'SELECT id, tipo, descripcion, monto, ajuste, total, cuotas, valor_cuota,
                    fecha, categoria, medio_pago, comentario
             FROM movimientos
             WHERE usuario_id = :usuario_id AND BINARY categoria = :categoria
             ORDER BY fecha DESC, id DESC'
        );
        // Vincula cuenta y categoría antes de recuperar el historial.
        $consulta->execute(['usuario_id' => $usuarioId, 'categoria' => $categoria]);
        return $consulta->fetchAll(PDO::FETCH_ASSOC);
    }
}
