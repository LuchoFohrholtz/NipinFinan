<?php
declare(strict_types=1);

// Reglas compartidas por POST y PUT de api/mis_movimientos.php.
final class MovimientoService
{
    private array $tarifas;
    private array $categorias;

    // Carga tarifas y categorías válidas desde los archivos públicos.
    public function __construct()
    {
        $this->tarifas = $this->leerConfiguracion(__DIR__ . '/../data/tarifas.json');
        $catalogo = $this->leerConfiguracion(__DIR__ . '/../data/categorias.json');
        $this->categorias = [];
        // Construye el catálogo de nombres y tipos admitidos.
        foreach ($catalogo as $categoria) {
            if (!is_array($categoria) || !isset($categoria['nombre'], $categoria['tipo'])
                || !is_string($categoria['nombre'])
                || !in_array($categoria['tipo'], ['ingreso', 'gasto'], true)) {
                throw new RuntimeException('Catálogo de categorías inválido.');
            }
            $this->categorias[$categoria['nombre']] = $categoria['tipo'];
        }
        // Comprueba que las configuraciones requeridas estén completas.
        if ($this->categorias === [] || !isset($this->tarifas['medios_pago'], $this->tarifas['cuotas'])
            || !is_array($this->tarifas['medios_pago']) || !is_array($this->tarifas['cuotas'])) {
            throw new RuntimeException('Configuración de movimientos incompleta.');
        }
    }

    // Lee un JSON de configuración y rechaza archivos inválidos.
    private function leerConfiguracion(string $archivo): array
    {
        // Comprueba que el archivo pueda leerse.
        if (!is_readable($archivo)) {
            throw new RuntimeException('No se puede leer la configuración de movimientos.');
        }
        $contenido = file_get_contents($archivo);
        // Detecta errores al cargar el contenido.
        if ($contenido === false) {
            throw new RuntimeException('No se pudo cargar la configuración de movimientos.');
        }
        // Decodifica el JSON y exige una estructura de arreglo.
        $datos = json_decode($contenido, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($datos)) {
            throw new RuntimeException('La configuración de movimientos no es válida.');
        }
        return $datos;
    }

    // Valida la entrada y calcula importes confiables para persistir.
    public function validarYCalcular(stdClass $entrada): array
    {
        // Verifica los tipos antes de operar con los campos recibidos.
        foreach (['tipo', 'descripcion', 'fecha', 'categoria', 'medioPago'] as $campo) {
            if (!isset($entrada->$campo) || !is_string($entrada->$campo)) {
                throw new InvalidArgumentException('Los campos del movimiento no son válidos.');
            }
        }
        // Exige monto numérico, cuotas enteras y comentario textual.
        if (!isset($entrada->monto, $entrada->cuotas)
            || (!is_int($entrada->monto) && !is_float($entrada->monto))
            || !is_int($entrada->cuotas)
            || (property_exists($entrada, 'comentario') && !is_string($entrada->comentario))) {
            throw new InvalidArgumentException('El monto, las cuotas o el comentario no son válidos.');
        }

        // Normaliza y reúne los valores que se van a validar.
        $tipo = $entrada->tipo;
        $descripcion = trim($entrada->descripcion);
        $monto = (float) $entrada->monto;
        $fecha = $entrada->fecha;
        $categoria = $entrada->categoria;
        $medioPago = $entrada->medioPago;
        $cuotas = $entrada->cuotas;
        $comentario = trim($entrada->comentario ?? '');

        // Acepta únicamente ingresos o gastos.
        if (!in_array($tipo, ['ingreso', 'gasto'], true)) {
            throw new InvalidArgumentException('Tipo de movimiento inválido.');
        }
        // Exige una descripción de uno a ciento cincuenta caracteres.
        if ($descripcion === '' || mb_strlen($descripcion, 'UTF-8') > 150) {
            throw new InvalidArgumentException('Ingresá una descripción de hasta 150 caracteres.');
        }
        // Exige monto positivo, finito, dentro del límite y con dos decimales.
        if (!is_finite($monto) || $monto <= 0 || $monto > 999999999.99 || round($monto, 2) !== $monto) {
            throw new InvalidArgumentException('Ingresá un monto positivo de hasta 999999999.99 y dos decimales.');
        }
        // Comprueba el formato y el intervalo de fecha permitido.
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/D', $fecha)
            || $fecha < '1900-01-01' || $fecha > '2100-12-31') {
            throw new InvalidArgumentException('Seleccioná una fecha entre 1900 y 2100.');
        }
        // Comprueba que el día exista realmente en ese mes y año.
        [$anio, $mes, $dia] = array_map('intval', explode('-', $fecha));
        if (!checkdate($mes, $dia, $anio)) {
            throw new InvalidArgumentException('Seleccioná una fecha válida.');
        }
        // Exige una categoría que corresponda al tipo de movimiento.
        if (($this->categorias[$categoria] ?? null) !== $tipo) {
            throw new InvalidArgumentException('Seleccioná una categoría válida para el tipo de movimiento.');
        }
        // Acepta únicamente medios de pago configurados.
        if (!isset($this->tarifas['medios_pago'][$medioPago])) {
            throw new InvalidArgumentException('Seleccioná un medio de pago válido.');
        }
        // Permite varias cuotas sólo para gastos con tarjeta de crédito.
        $esCredito = $tipo === 'gasto' && $medioPago === 'Tarjeta de crédito';
        if (!in_array($cuotas, [1, 3, 6, 12], true) || (!$esCredito && $cuotas !== 1)) {
            throw new InvalidArgumentException('Las cuotas deben ser 1, 3, 6 o 12 y sólo crédito permite más de una.');
        }
        // Limita el comentario a quinientos caracteres.
        if (mb_strlen($comentario, 'UTF-8') > 500) {
            throw new InvalidArgumentException('El comentario puede tener hasta 500 caracteres.');
        }

        // Recalcula los importes con las tarifas del servidor.
        $descuento = $this->tarifas['medios_pago'][$medioPago]['descuento'] ?? null;
        $interes = $esCredito ? ($this->tarifas['cuotas'][(string) $cuotas] ?? null) : 0;
        // Comprueba que las tasas configuradas sean numéricas y válidas.
        if (!is_numeric($descuento) || $descuento < 0 || $descuento > 1
            || !is_numeric($interes) || $interes < 0) {
            throw new RuntimeException('Las tarifas del movimiento no son válidas.');
        }
        // Conserva el ingreso o aplica descuento e interés al gasto.
        $total = $tipo === 'ingreso'
            ? $monto
            : round($monto * (1 - $descuento) * (1 + $interes), 2, PHP_ROUND_HALF_UP);

        // Devuelve campos normalizados con total, ajuste y valor de cuota.
        return [
            'tipo' => $tipo,
            'descripcion' => $descripcion,
            'monto' => $monto,
            'ajuste' => round($total - $monto, 2, PHP_ROUND_HALF_UP),
            'total' => $total,
            'cuotas' => $cuotas,
            'valor_cuota' => round($total / $cuotas, 2, PHP_ROUND_HALF_UP),
            'fecha' => $fecha,
            'categoria' => $categoria,
            'medio_pago' => $medioPago,
            'comentario' => $comentario,
        ];
    }
}
