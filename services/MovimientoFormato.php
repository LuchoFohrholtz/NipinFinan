<?php
declare(strict_types=1);

final class MovimientoFormato
{
    public static function desdeFila(array $fila): array
    {
        return [
            'id' => (int) $fila['id'],
            'tipo' => $fila['tipo'],
            'descripcion' => $fila['descripcion'],
            'monto' => (float) $fila['monto'],
            'ajuste' => (float) $fila['ajuste'],
            'total' => (float) $fila['total'],
            'cuotas' => (int) $fila['cuotas'],
            'valorCuota' => (float) $fila['valor_cuota'],
            'fecha' => $fila['fecha'],
            'categoria' => $fila['categoria'],
            'medioPago' => $fila['medio_pago'],
            'comentario' => $fila['comentario'],
        ];
    }
}
