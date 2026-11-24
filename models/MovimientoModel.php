<?php
declare(strict_types=1); // Activa el control estricto de tipos en las llamadas de este archivo.

// Persistencia de api/mis_movimientos.php: SQL preparado y filtro por propietario.
final class MovimientoModel // Define la clase MovimientoModel.
{ // Comienza el cuerpo de la función, clase o condición.
    private PDO $conexion; // Conserva conexión PDO compartida como propiedad del objeto.

    // Recibe la conexión PDO compartida por el controlador.
    public function __construct(PDO $conexion) // Define __construct con sus entradas y el resultado que devuelve.
    { // Comienza el cuerpo de la función, clase o condición.
        $this->conexion = $conexion; // Conserva el mismo objeto PDO; los métodos no abren otra conexión.
    } // Finaliza este bloque.

    // Consulta los movimientos propios del más reciente al más antiguo.
    public function listarPorUsuario(int $usuarioId): array // Consulta únicamente movimientos del propietario autenticado.
    { // Comienza el cuerpo de la función, clase o condición.
        $consulta = $this->conexion->prepare( // Prepara la sentencia SQL; los valores se vinculan después con execute.
            'SELECT id, tipo, descripcion, monto, ajuste, total, cuotas, valor_cuota,
                    fecha, categoria, medio_pago, comentario
             FROM movimientos
             WHERE usuario_id = :usuario_id
             ORDER BY fecha DESC, id DESC' // Ordena el resultado SQL del más reciente al más antiguo.
        ); // Completa la estructura o llamada iniciada arriba.
        // Vincula el usuario autenticado y recupera las filas.
        $consulta->execute(['usuario_id' => $usuarioId]); // Ejecuta SQL vinculando valores separados de las instrucciones.

        return $consulta->fetchAll(PDO::FETCH_ASSOC); // Recupera todas las filas SQL como arrays con nombres de columnas.
    } // Finaliza este bloque.

    // Inserta los importes ya validados y calculados por el servicio.
    public function crear(int $usuarioId, array $movimiento): int // Define crear con sus entradas y el resultado que devuelve.
    { // Comienza el cuerpo de la función, clase o condición.
        $consulta = $this->conexion->prepare( // Prepara la sentencia SQL; los valores se vinculan después con execute.
            'INSERT INTO movimientos
                (usuario_id, tipo, descripcion, monto, ajuste, total, cuotas, valor_cuota,
                 fecha, categoria, medio_pago, comentario)
             VALUES
                (:usuario_id, :tipo, :descripcion, :monto, :ajuste, :total, :cuotas, :valor_cuota,
                 :fecha, :categoria, :medio_pago, :comentario)' // Selecciona este valor cuando no se cumple la condición anterior.
        ); // Completa la estructura o llamada iniciada arriba.
        // Vincula el propietario y los campos del movimiento como parámetros.
        $consulta->execute([ // Ejecuta SQL vinculando valores separados de las instrucciones.
            'usuario_id' => $usuarioId, // Incluye el campo usuario_id en esta estructura.
            'tipo' => $movimiento['tipo'], // Incluye el tipo de movimiento en esta estructura.
            'descripcion' => $movimiento['descripcion'], // Incluye el campo descripcion en esta estructura.
            'monto' => $movimiento['monto'], // Incluye el importe original en esta estructura.
            'ajuste' => $movimiento['ajuste'], // Incluye la diferencia entre importe final y original en esta estructura.
            'total' => $movimiento['total'], // Incluye el importe final en esta estructura.
            'cuotas' => $movimiento['cuotas'], // Incluye la cantidad de cuotas en esta estructura.
            'valor_cuota' => $movimiento['valor_cuota'], // Incluye el importe de cada cuota en esta estructura.
            'fecha' => $movimiento['fecha'], // Incluye la fecha del movimiento en esta estructura.
            'categoria' => $movimiento['categoria'], // Incluye la categoría del movimiento en esta estructura.
            'medio_pago' => $movimiento['medio_pago'], // Incluye el medio de pago en esta estructura.
            'comentario' => $movimiento['comentario'], // Incluye el comentario opcional en esta estructura.
        ]); // Completa la estructura o llamada iniciada arriba.

        // Devuelve el identificador del movimiento creado.
        return (int) $this->conexion->lastInsertId(); // Devuelve al controlador el identificador generado por el INSERT.
    } // Finaliza este bloque.

    // Actualiza sólo el movimiento que coincide con identificador y usuario.
    public function actualizar(int $usuarioId, int $id, array $movimiento): ?array // Define actualizar con sus entradas y el resultado que devuelve.
    { // Comienza el cuerpo de la función, clase o condición.
        $consulta = $this->conexion->prepare( // Prepara la sentencia SQL; los valores se vinculan después con execute.
            'UPDATE movimientos SET tipo = :tipo, descripcion = :descripcion,
                monto = :monto, ajuste = :ajuste, total = :total, cuotas = :cuotas,
                valor_cuota = :valor_cuota, fecha = :fecha, categoria = :categoria,
                medio_pago = :medio_pago, comentario = :comentario
             WHERE id = :id AND usuario_id = :usuario_id' // Restringe la consulta SQL al identificador y propietario solicitados.
        ); // Completa la estructura o llamada iniciada arriba.
        // Vincula los datos editables junto con el identificador y propietario.
        $consulta->execute([ // Ejecuta SQL vinculando valores separados de las instrucciones.
            'id' => $id, // Incluye el identificador del recurso en esta estructura.
            'usuario_id' => $usuarioId, // Incluye el campo usuario_id en esta estructura.
            'tipo' => $movimiento['tipo'], // Incluye el tipo de movimiento en esta estructura.
            'descripcion' => $movimiento['descripcion'], // Incluye el campo descripcion en esta estructura.
            'monto' => $movimiento['monto'], // Incluye el importe original en esta estructura.
            'ajuste' => $movimiento['ajuste'], // Incluye la diferencia entre importe final y original en esta estructura.
            'total' => $movimiento['total'], // Incluye el importe final en esta estructura.
            'cuotas' => $movimiento['cuotas'], // Incluye la cantidad de cuotas en esta estructura.
            'valor_cuota' => $movimiento['valor_cuota'], // Incluye el importe de cada cuota en esta estructura.
            'fecha' => $movimiento['fecha'], // Incluye la fecha del movimiento en esta estructura.
            'categoria' => $movimiento['categoria'], // Incluye la categoría del movimiento en esta estructura.
            'medio_pago' => $movimiento['medio_pago'], // Incluye el medio de pago en esta estructura.
            'comentario' => $movimiento['comentario'], // Incluye el comentario opcional en esta estructura.
        ]); // Completa la estructura o llamada iniciada arriba.

        // Recupera también los movimientos guardados sin cambios de valores.
        $consulta = $this->conexion->prepare( // Prepara la sentencia SQL; los valores se vinculan después con execute.
            'SELECT id, tipo, descripcion, monto, ajuste, total, cuotas, valor_cuota,
                    fecha, categoria, medio_pago, comentario
             FROM movimientos WHERE id = :id AND usuario_id = :usuario_id' // Consulta únicamente el movimiento que pertenece al usuario autenticado.
        ); // Completa la estructura o llamada iniciada arriba.
        // Consulta la fila actual y devuelve null si el recurso no pertenece al usuario.
        $consulta->execute(['id' => $id, 'usuario_id' => $usuarioId]); // Ejecuta SQL vinculando valores separados de las instrucciones.
        $fila = $consulta->fetch(PDO::FETCH_ASSOC); // Recupera una fila SQL; este fetch de PDO no envía HTTP.
        return $fila === false ? null : $fila; // Devuelve fila === false ? null : $fila al código que llamó.
    } // Finaliza este bloque.

    // Elimina únicamente un movimiento propio e informa si existía.
    public function eliminar(int $usuarioId, int $id): bool // Define eliminar con sus entradas y el resultado que devuelve.
    { // Comienza el cuerpo de la función, clase o condición.
        $consulta = $this->conexion->prepare( // Prepara la sentencia SQL; los valores se vinculan después con execute.
            'DELETE FROM movimientos WHERE id = :id AND usuario_id = :usuario_id' // Define la baja SQL filtrada por identificador y propietario.
        ); // Completa la estructura o llamada iniciada arriba.
        $consulta->execute(['id' => $id, 'usuario_id' => $usuarioId]); // Ejecuta SQL vinculando valores separados de las instrucciones.
        return $consulta->rowCount() === 1; // Indica si se eliminó exactamente un movimiento propio.
    } // Finaliza este bloque.

    // Consulta el historial propio de una categoría con coincidencia exacta.
    public function listarPorCategoria(int $usuarioId, string $categoria): array // Consulta el historial propio de la categoría solicitada.
    { // Comienza el cuerpo de la función, clase o condición.
        $consulta = $this->conexion->prepare( // Prepara la sentencia SQL; los valores se vinculan después con execute.
            'SELECT id, tipo, descripcion, monto, ajuste, total, cuotas, valor_cuota,
                    fecha, categoria, medio_pago, comentario
             FROM movimientos
             WHERE usuario_id = :usuario_id AND BINARY categoria = :categoria
             ORDER BY fecha DESC, id DESC' // Ordena el resultado SQL del más reciente al más antiguo.
        ); // Completa la estructura o llamada iniciada arriba.
        // Vincula cuenta y categoría antes de recuperar el historial.
        $consulta->execute(['usuario_id' => $usuarioId, 'categoria' => $categoria]); // Ejecuta SQL vinculando valores separados de las instrucciones.
        return $consulta->fetchAll(PDO::FETCH_ASSOC); // Recupera todas las filas SQL como arrays con nombres de columnas.
    } // Finaliza este bloque.
} // Finaliza este bloque.
