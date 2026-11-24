<?php
declare(strict_types=1); // Activa el control estricto de tipos en las llamadas de este archivo.

// Adapta los nombres y tipos internos al contrato JSON de la API.
final class MovimientoFormato // Define la clase MovimientoFormato.
{ // Comienza el cuerpo de la función, clase o condición.
    // Transforma una fila de MySQL en los campos públicos del movimiento.
    public static function desdeFila(array $fila): array // Convierte los campos de MySQL al formato JSON del contrato.
    { // Comienza el cuerpo de la función, clase o condición.
        return [ // Devuelve [ al código que llamó.
            'id' => (int) $fila['id'], // Incluye el identificador del recurso en esta estructura.
            'tipo' => $fila['tipo'], // Incluye el tipo de movimiento en esta estructura.
            'descripcion' => $fila['descripcion'], // Incluye el campo descripcion en esta estructura.
            'monto' => (float) $fila['monto'], // Incluye el importe original en esta estructura.
            'ajuste' => (float) $fila['ajuste'], // Incluye la diferencia entre importe final y original en esta estructura.
            'total' => (float) $fila['total'], // Incluye el importe final en esta estructura.
            'cuotas' => (int) $fila['cuotas'], // Incluye la cantidad de cuotas en esta estructura.
            'valorCuota' => (float) $fila['valor_cuota'], // Incluye el campo valorCuota en esta estructura.
            'fecha' => $fila['fecha'], // Incluye la fecha del movimiento en esta estructura.
            'categoria' => $fila['categoria'], // Incluye la categoría del movimiento en esta estructura.
            'medioPago' => $fila['medio_pago'], // Incluye el campo medioPago en esta estructura.
            'comentario' => $fila['comentario'], // Incluye el comentario opcional en esta estructura.
        ]; // Completa la estructura o llamada iniciada arriba.
    } // Finaliza este bloque.
} // Finaliza este bloque.
