<?php
// Activa el control estricto de tipos en las llamadas de este archivo.
declare(strict_types=1);

// Reglas compartidas por POST y PUT de api/mis_movimientos.php.
final class MovimientoService
{
    // Conserva descuentos e intereses configurados como propiedad del objeto.
    private array $tarifas;
    // Conserva categorías admitidas como propiedad del objeto.
    private array $categorias;

    // Carga tarifas y categorías válidas desde los archivos públicos.
    public function __construct()
    {
        // Guarda this->tarifas.
        $this->tarifas = $this->leerConfiguracion(__DIR__ . '/../data/tarifas.json');
        // Guarda catálogo de categorías.
        $catalogo = $this->leerConfiguracion(__DIR__ . '/../data/categorias.json');
        // Guarda this->categorias.
        $this->categorias = [];
        // Recorre los elementos para procesar cada uno dentro del bloque.
        foreach ($catalogo as $categoria) {
            // Comprueba esta condición.
            if (!is_array($categoria) || !isset($categoria['nombre'], $categoria['tipo'])
                // Agrega otra condición a la comprobación de la línea anterior.
                || !is_string($categoria['nombre'])
                // Agrega otra condición a la comprobación de la línea anterior.
                || !in_array($categoria['tipo'], ['ingreso', 'gasto'], true)) {
                // Interrumpe la función y comunica el error.
                throw new RuntimeException('Catálogo de categorías inválido.');
            }
            // Guarda this->categorias[$categoria['nombre']].
            $this->categorias[$categoria['nombre']] = $categoria['tipo'];
        }
        // Comprueba que las configuraciones requeridas estén completas.
        if ($this->categorias === [] || !isset($this->tarifas['medios_pago'], $this->tarifas['cuotas'])
            // Agrega otra condición a la comprobación de la línea anterior.
            || !is_array($this->tarifas['medios_pago']) || !is_array($this->tarifas['cuotas'])) {
            // Interrumpe la función y comunica el error.
            throw new RuntimeException('Configuración de movimientos incompleta.');
        }
    }

    // Carga el archivo JSON y verifica que tenga una estructura válida.
    private function leerConfiguracion(string $archivo): array
    {
        // Comprueba que el archivo pueda leerse.
        if (!is_readable($archivo)) {
            // Interrumpe la función y comunica el error.
            throw new RuntimeException('No se puede leer la configuración de movimientos.');
        }
        // Guarda contenido leído del archivo.
        $contenido = file_get_contents($archivo);
        // Detecta errores al cargar el contenido.
        if ($contenido === false) {
            // Interrumpe la función y comunica el error.
            throw new RuntimeException('No se pudo cargar la configuración de movimientos.');
        }
        // Convierte el JSON recibido o leído a una estructura PHP.
        $datos = json_decode($contenido, true, 512, JSON_THROW_ON_ERROR);
        // Comprueba esta condición.
        if (!is_array($datos)) {
            // Interrumpe la función y comunica el error.
            throw new RuntimeException('La configuración de movimientos no es válida.');
        }
        // Devuelve datos que se van a procesar al código que llamó.
        return $datos;
    }

    // Valida la entrada y recalcula importes antes de llamar al modelo.
    public function validarYCalcular(stdClass $entrada): array
    {
        // Recorre los elementos para procesar cada uno dentro del bloque.
        foreach (['tipo', 'descripcion', 'fecha', 'categoria', 'medioPago'] as $campo) {
            // Comprueba esta condición.
            if (!isset($entrada->$campo) || !is_string($entrada->$campo)) {
                // Interrumpe la función y comunica el error.
                throw new InvalidArgumentException('Los campos del movimiento no son válidos.');
            }
        }
        // Exige monto numérico, cuotas enteras y comentario textual.
        if (!isset($entrada->monto, $entrada->cuotas)
            // Agrega otra condición a la comprobación de la línea anterior.
            || (!is_int($entrada->monto) && !is_float($entrada->monto))
            // Agrega otra condición a la comprobación de la línea anterior.
            || !is_int($entrada->cuotas)
            // Agrega otra condición a la comprobación de la línea anterior.
            || (property_exists($entrada, 'comentario') && !is_string($entrada->comentario))) {
            // Interrumpe la función y comunica el error.
            throw new InvalidArgumentException('El monto, las cuotas o el comentario no son válidos.');
        }

        // Guarda tipo de movimiento o error según el contexto.
        $tipo = $entrada->tipo;
        // Guarda descripción del movimiento.
        $descripcion = trim($entrada->descripcion);
        // Guarda importe original del movimiento.
        $monto = (float) $entrada->monto;
        // Guarda fecha del movimiento.
        $fecha = $entrada->fecha;
        // Guarda categoría seleccionada.
        $categoria = $entrada->categoria;
        // Guarda medio de pago seleccionado.
        $medioPago = $entrada->medioPago;
        // Guarda cantidad de cuotas.
        $cuotas = $entrada->cuotas;
        // Guarda comentario opcional del movimiento.
        $comentario = trim($entrada->comentario ?? '');

        // Acepta únicamente ingresos o gastos.
        if (!in_array($tipo, ['ingreso', 'gasto'], true)) {
            // Interrumpe la función y comunica el error.
            throw new InvalidArgumentException('Tipo de movimiento inválido.');
        }
        // Exige una descripción de uno a ciento cincuenta caracteres.
        if ($descripcion === '' || mb_strlen($descripcion, 'UTF-8') > 150) {
            // Interrumpe la función y comunica el error.
            throw new InvalidArgumentException('Ingresá una descripción de hasta 150 caracteres.');
        }
        // Exige monto positivo, finito, dentro del límite y con dos decimales.
        if (!is_finite($monto) || $monto <= 0 || $monto > 999999999.99 || round($monto, 2) !== $monto) {
            // Interrumpe la función y comunica el error.
            throw new InvalidArgumentException('Ingresá un monto positivo de hasta 999999999.99 y dos decimales.');
        }
        // Comprueba el formato y el intervalo de fecha permitido.
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/D', $fecha)
            // Agrega otra condición a la comprobación de la línea anterior.
            || $fecha < '1900-01-01' || $fecha > '2100-12-31') {
            // Interrumpe la función y comunica el error.
            throw new InvalidArgumentException('Seleccioná una fecha entre 1900 y 2100.');
        }
        // Separa año, mes y día como enteros para verificar la fecha real.
        [$anio, $mes, $dia] = array_map('intval', explode('-', $fecha));
        // Comprueba esta condición.
        if (!checkdate($mes, $dia, $anio)) {
            // Interrumpe la función y comunica el error.
            throw new InvalidArgumentException('Seleccioná una fecha válida.');
        }
        // Exige una categoría que corresponda al tipo de movimiento.
        if (($this->categorias[$categoria] ?? null) !== $tipo) {
            // Interrumpe la función y comunica el error.
            throw new InvalidArgumentException('Seleccioná una categoría válida para el tipo de movimiento.');
        }
        // Acepta únicamente medios de pago configurados.
        if (!isset($this->tarifas['medios_pago'][$medioPago])) {
            // Interrumpe la función y comunica el error.
            throw new InvalidArgumentException('Seleccioná un medio de pago válido.');
        }
        // Guarda si es un gasto con tarjeta de crédito.
        $esCredito = $tipo === 'gasto' && $medioPago === 'Tarjeta de crédito';
        // Comprueba esta condición.
        if (!in_array($cuotas, [1, 3, 6, 12], true) || (!$esCredito && $cuotas !== 1)) {
            // Interrumpe la función y comunica el error.
            throw new InvalidArgumentException('Las cuotas deben ser 1, 3, 6 o 12 y sólo crédito permite más de una.');
        }
        // Limita el comentario a quinientos caracteres.
        if (mb_strlen($comentario, 'UTF-8') > 500) {
            // Interrumpe la función y comunica el error.
            throw new InvalidArgumentException('El comentario puede tener hasta 500 caracteres.');
        }

        // Guarda tasa de descuento del medio de pago.
        $descuento = $this->tarifas['medios_pago'][$medioPago]['descuento'] ?? null;
        // Guarda tasa de interés de las cuotas.
        $interes = $esCredito ? ($this->tarifas['cuotas'][(string) $cuotas] ?? null) : 0;
        // Comprueba que las tasas configuradas sean numéricas y válidas.
        if (!is_numeric($descuento) || $descuento < 0 || $descuento > 1
            // Agrega otra condición a la comprobación de la línea anterior.
            || !is_numeric($interes) || $interes < 0) {
            // Interrumpe la función y comunica el error.
            throw new RuntimeException('Las tarifas del movimiento no son válidas.');
        }
        // Guarda importe final calculado.
        $total = $tipo === 'ingreso'
            // Selecciona este valor si se cumple la condición anterior.
            ? $monto
            // Selecciona este valor cuando no se cumple la condición anterior.
            : round($monto * (1 - $descuento) * (1 + $interes), 2, PHP_ROUND_HALF_UP);

        // Devuelve [ al código que llamó.
        return [
            // Incluye el tipo de movimiento.
            'tipo' => $tipo,
            // Incluye el campo descripcion.
            'descripcion' => $descripcion,
            // Incluye el importe original.
            'monto' => $monto,
            // Incluye la diferencia entre importe final y original.
            'ajuste' => round($total - $monto, 2, PHP_ROUND_HALF_UP),
            // Incluye el importe final.
            'total' => $total,
            // Incluye la cantidad de cuotas.
            'cuotas' => $cuotas,
            // Incluye el importe de cada cuota.
            'valor_cuota' => round($total / $cuotas, 2, PHP_ROUND_HALF_UP),
            // Incluye la fecha del movimiento.
            'fecha' => $fecha,
            // Incluye la categoría del movimiento.
            'categoria' => $categoria,
            // Incluye el medio de pago.
            'medio_pago' => $medioPago,
            // Incluye el comentario opcional.
            'comentario' => $comentario,
        ];
    }
}
