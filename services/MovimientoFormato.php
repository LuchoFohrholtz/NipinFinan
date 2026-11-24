<?php
// Activa el control estricto de tipos en las llamadas de este archivo.
declare(strict_types=1);

// Adapta los nombres y tipos internos al contrato JSON de la API.
final class MovimientoFormato
{
    // Convierte los campos de MySQL al formato JSON del contrato.
    public static function desdeFila(array $fila): array
    {
        // Devuelve [ al código que llamó.
        return [
            // Incluye el identificador del recurso.
            'id' => (int) $fila['id'],
            // Incluye el tipo de movimiento.
            'tipo' => $fila['tipo'],
            // Incluye el campo descripcion.
            'descripcion' => $fila['descripcion'],
            // Incluye el importe original.
            'monto' => (float) $fila['monto'],
            // Incluye la diferencia entre importe final y original.
            'ajuste' => (float) $fila['ajuste'],
            // Incluye el importe final.
            'total' => (float) $fila['total'],
            // Incluye la cantidad de cuotas.
            'cuotas' => (int) $fila['cuotas'],
            // Incluye el campo valorCuota.
            'valorCuota' => (float) $fila['valor_cuota'],
            // Incluye la fecha del movimiento.
            'fecha' => $fila['fecha'],
            // Incluye la categoría del movimiento.
            'categoria' => $fila['categoria'],
            // Incluye el campo medioPago.
            'medioPago' => $fila['medio_pago'],
            // Incluye el comentario opcional.
            'comentario' => $fila['comentario'],
        ];
    }
}
