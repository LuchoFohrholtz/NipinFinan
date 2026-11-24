<?php
// Activa el control estricto de tipos en las llamadas de este archivo.
declare(strict_types=1);

// Persistencia de api/mis_movimientos.php: SQL preparado y filtro por propietario.
final class MovimientoModel
{
    // Conserva conexión PDO compartida como propiedad del objeto.
    private PDO $conexion;

    // Recibe la conexión PDO compartida por el controlador.
    public function __construct(PDO $conexion)
    {
        // Conserva el mismo objeto PDO; los métodos no abren otra conexión.
        $this->conexion = $conexion;
    }

    // Consulta únicamente movimientos del propietario autenticado.
    public function listarPorUsuario(int $usuarioId): array
    {
        // Prepara la sentencia SQL; los valores se vinculan después con execute.
        $consulta = $this->conexion->prepare(
            'SELECT id, tipo, descripcion, monto, ajuste, total, cuotas, valor_cuota,
                    fecha, categoria, medio_pago, comentario
             FROM movimientos
             WHERE usuario_id = :usuario_id
             ORDER BY fecha DESC, id DESC'
        );
        // Ejecuta SQL vinculando valores separados de las instrucciones.
        $consulta->execute(['usuario_id' => $usuarioId]);

        // Recupera todas las filas SQL como arrays con nombres de columnas.
        return $consulta->fetchAll(PDO::FETCH_ASSOC);
    }

    // Inserta los importes ya validados y calculados por el servicio.
    public function crear(int $usuarioId, array $movimiento): int
    {
        // Prepara la sentencia SQL; los valores se vinculan después con execute.
        $consulta = $this->conexion->prepare(
            'INSERT INTO movimientos
                (usuario_id, tipo, descripcion, monto, ajuste, total, cuotas, valor_cuota,
                 fecha, categoria, medio_pago, comentario)
             VALUES
                (:usuario_id, :tipo, :descripcion, :monto, :ajuste, :total, :cuotas, :valor_cuota,
                 :fecha, :categoria, :medio_pago, :comentario)'
        );
        // Ejecuta SQL vinculando valores separados de las instrucciones.
        $consulta->execute([
            // Incluye el campo usuario_id.
            'usuario_id' => $usuarioId,
            // Incluye el tipo de movimiento.
            'tipo' => $movimiento['tipo'],
            // Incluye el campo descripcion.
            'descripcion' => $movimiento['descripcion'],
            // Incluye el importe original.
            'monto' => $movimiento['monto'],
            // Incluye la diferencia entre importe final y original.
            'ajuste' => $movimiento['ajuste'],
            // Incluye el importe final.
            'total' => $movimiento['total'],
            // Incluye la cantidad de cuotas.
            'cuotas' => $movimiento['cuotas'],
            // Incluye el importe de cada cuota.
            'valor_cuota' => $movimiento['valor_cuota'],
            // Incluye la fecha del movimiento.
            'fecha' => $movimiento['fecha'],
            // Incluye la categoría del movimiento.
            'categoria' => $movimiento['categoria'],
            // Incluye el medio de pago.
            'medio_pago' => $movimiento['medio_pago'],
            // Incluye el comentario opcional.
            'comentario' => $movimiento['comentario'],
        ]);

        // Devuelve al controlador el identificador generado por el INSERT.
        return (int) $this->conexion->lastInsertId();
    }

    // Actualiza sólo el movimiento que coincide con identificador y usuario.
    public function actualizar(int $usuarioId, int $id, array $movimiento): ?array
    {
        // Prepara la sentencia SQL; los valores se vinculan después con execute.
        $consulta = $this->conexion->prepare(
            'UPDATE movimientos SET tipo = :tipo, descripcion = :descripcion,
                monto = :monto, ajuste = :ajuste, total = :total, cuotas = :cuotas,
                valor_cuota = :valor_cuota, fecha = :fecha, categoria = :categoria,
                medio_pago = :medio_pago, comentario = :comentario
             WHERE id = :id AND usuario_id = :usuario_id'
        );
        // Ejecuta SQL vinculando valores separados de las instrucciones.
        $consulta->execute([
            // Incluye el identificador del recurso.
            'id' => $id,
            // Incluye el campo usuario_id.
            'usuario_id' => $usuarioId,
            // Incluye el tipo de movimiento.
            'tipo' => $movimiento['tipo'],
            // Incluye el campo descripcion.
            'descripcion' => $movimiento['descripcion'],
            // Incluye el importe original.
            'monto' => $movimiento['monto'],
            // Incluye la diferencia entre importe final y original.
            'ajuste' => $movimiento['ajuste'],
            // Incluye el importe final.
            'total' => $movimiento['total'],
            // Incluye la cantidad de cuotas.
            'cuotas' => $movimiento['cuotas'],
            // Incluye el importe de cada cuota.
            'valor_cuota' => $movimiento['valor_cuota'],
            // Incluye la fecha del movimiento.
            'fecha' => $movimiento['fecha'],
            // Incluye la categoría del movimiento.
            'categoria' => $movimiento['categoria'],
            // Incluye el medio de pago.
            'medio_pago' => $movimiento['medio_pago'],
            // Incluye el comentario opcional.
            'comentario' => $movimiento['comentario'],
        ]);

        // Prepara la sentencia SQL; los valores se vinculan después con execute.
        $consulta = $this->conexion->prepare(
            'SELECT id, tipo, descripcion, monto, ajuste, total, cuotas, valor_cuota,
                    fecha, categoria, medio_pago, comentario
             FROM movimientos WHERE id = :id AND usuario_id = :usuario_id'
        );
        // Ejecuta SQL vinculando valores separados de las instrucciones.
        $consulta->execute(['id' => $id, 'usuario_id' => $usuarioId]);
        // Recupera una fila SQL; este fetch de PDO no envía HTTP.
        $fila = $consulta->fetch(PDO::FETCH_ASSOC);
        // Devuelve fila === false ? null : $fila al código que llamó.
        return $fila === false ? null : $fila;
    }

    // Elimina únicamente un movimiento propio e informa si existía.
    public function eliminar(int $usuarioId, int $id): bool
    {
        // Prepara la sentencia SQL; los valores se vinculan después con execute.
        $consulta = $this->conexion->prepare(
            // Define la baja SQL filtrada por identificador y propietario.
            'DELETE FROM movimientos WHERE id = :id AND usuario_id = :usuario_id'
        );
        // Ejecuta SQL vinculando valores separados de las instrucciones.
        $consulta->execute(['id' => $id, 'usuario_id' => $usuarioId]);
        // Indica si se eliminó exactamente un movimiento propio.
        return $consulta->rowCount() === 1;
    }

    // Consulta el historial propio de la categoría solicitada.
    public function listarPorCategoria(int $usuarioId, string $categoria): array
    {
        // Prepara la sentencia SQL; los valores se vinculan después con execute.
        $consulta = $this->conexion->prepare(
            'SELECT id, tipo, descripcion, monto, ajuste, total, cuotas, valor_cuota,
                    fecha, categoria, medio_pago, comentario
             FROM movimientos
             WHERE usuario_id = :usuario_id AND BINARY categoria = :categoria
             ORDER BY fecha DESC, id DESC'
        );
        // Ejecuta SQL vinculando valores separados de las instrucciones.
        $consulta->execute(['usuario_id' => $usuarioId, 'categoria' => $categoria]);
        // Recupera todas las filas SQL como arrays con nombres de columnas.
        return $consulta->fetchAll(PDO::FETCH_ASSOC);
    }
}
