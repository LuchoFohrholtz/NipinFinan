<?php
declare(strict_types=1); // Activa el control estricto de tipos en las llamadas de este archivo.

// Reglas compartidas por POST y PUT de api/mis_movimientos.php.
final class MovimientoService // Define la clase MovimientoService.
{ // Comienza el cuerpo de la función, clase o condición.
    private array $tarifas; // Conserva descuentos e intereses configurados como propiedad del objeto.
    private array $categorias; // Conserva categorías admitidas como propiedad del objeto.

    // Carga tarifas y categorías válidas desde los archivos públicos.
    public function __construct() // Define __construct con sus entradas y el resultado que devuelve.
    { // Comienza el cuerpo de la función, clase o condición.
        $this->tarifas = $this->leerConfiguracion(__DIR__ . '/../data/tarifas.json'); // Guarda this->tarifas para las siguientes operaciones.
        $catalogo = $this->leerConfiguracion(__DIR__ . '/../data/categorias.json'); // Guarda catálogo de categorías para las siguientes operaciones.
        $this->categorias = []; // Guarda this->categorias para las siguientes operaciones.
        // Construye el catálogo de nombres y tipos admitidos.
        foreach ($catalogo as $categoria) { // Recorre los elementos para procesar cada uno dentro del bloque.
            if (!is_array($categoria) || !isset($categoria['nombre'], $categoria['tipo']) // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                || !is_string($categoria['nombre']) // Agrega otra condición a la comprobación de la línea anterior.
                || !in_array($categoria['tipo'], ['ingreso', 'gasto'], true)) { // Agrega otra condición a la comprobación de la línea anterior.
                throw new RuntimeException('Catálogo de categorías inválido.'); // Interrumpe el recorrido y comunica el error al código que llamó.
            } // Finaliza este bloque.
            $this->categorias[$categoria['nombre']] = $categoria['tipo']; // Guarda this->categorias[$categoria['nombre']] para las siguientes operaciones.
        } // Finaliza este bloque.
        // Comprueba que las configuraciones requeridas estén completas.
        if ($this->categorias === [] || !isset($this->tarifas['medios_pago'], $this->tarifas['cuotas']) // Comprueba que las configuraciones requeridas estén completas.
            || !is_array($this->tarifas['medios_pago']) || !is_array($this->tarifas['cuotas'])) { // Agrega otra condición a la comprobación de la línea anterior.
            throw new RuntimeException('Configuración de movimientos incompleta.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
    } // Finaliza este bloque.

    // Lee un JSON de configuración y rechaza archivos inválidos.
    private function leerConfiguracion(string $archivo): array // Carga el archivo JSON y verifica que tenga una estructura válida.
    { // Comienza el cuerpo de la función, clase o condición.
        // Comprueba que el archivo pueda leerse.
        if (!is_readable($archivo)) { // Comprueba que el archivo pueda leerse.
            throw new RuntimeException('No se puede leer la configuración de movimientos.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        $contenido = file_get_contents($archivo); // Guarda contenido leído del archivo para las siguientes operaciones.
        // Detecta errores al cargar el contenido.
        if ($contenido === false) { // Detecta errores al cargar el contenido.
            throw new RuntimeException('No se pudo cargar la configuración de movimientos.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        // Decodifica el JSON y exige una estructura de arreglo.
        $datos = json_decode($contenido, true, 512, JSON_THROW_ON_ERROR); // Convierte el JSON recibido o leído a una estructura PHP.
        if (!is_array($datos)) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            throw new RuntimeException('La configuración de movimientos no es válida.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        return $datos; // Devuelve datos que se van a procesar al código que llamó.
    } // Finaliza este bloque.

    // Valida la entrada y calcula importes confiables para persistir.
    public function validarYCalcular(stdClass $entrada): array // Valida la entrada y recalcula importes antes de llamar al modelo.
    { // Comienza el cuerpo de la función, clase o condición.
        // Verifica los tipos antes de operar con los campos recibidos.
        foreach (['tipo', 'descripcion', 'fecha', 'categoria', 'medioPago'] as $campo) { // Recorre los elementos para procesar cada uno dentro del bloque.
            if (!isset($entrada->$campo) || !is_string($entrada->$campo)) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                throw new InvalidArgumentException('Los campos del movimiento no son válidos.'); // Interrumpe el recorrido y comunica el error al código que llamó.
            } // Finaliza este bloque.
        } // Finaliza este bloque.
        // Exige monto numérico, cuotas enteras y comentario textual.
        if (!isset($entrada->monto, $entrada->cuotas) // Exige monto numérico, cuotas enteras y comentario textual.
            || (!is_int($entrada->monto) && !is_float($entrada->monto)) // Agrega otra condición a la comprobación de la línea anterior.
            || !is_int($entrada->cuotas) // Agrega otra condición a la comprobación de la línea anterior.
            || (property_exists($entrada, 'comentario') && !is_string($entrada->comentario))) { // Agrega otra condición a la comprobación de la línea anterior.
            throw new InvalidArgumentException('El monto, las cuotas o el comentario no son válidos.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.

        // Normaliza y reúne los valores que se van a validar.
        $tipo = $entrada->tipo; // Guarda tipo de movimiento o error según el contexto para las siguientes operaciones.
        $descripcion = trim($entrada->descripcion); // Guarda descripción del movimiento para las siguientes operaciones.
        $monto = (float) $entrada->monto; // Guarda importe original del movimiento para las siguientes operaciones.
        $fecha = $entrada->fecha; // Guarda fecha del movimiento para las siguientes operaciones.
        $categoria = $entrada->categoria; // Guarda categoría seleccionada para las siguientes operaciones.
        $medioPago = $entrada->medioPago; // Guarda medio de pago seleccionado para las siguientes operaciones.
        $cuotas = $entrada->cuotas; // Guarda cantidad de cuotas para las siguientes operaciones.
        $comentario = trim($entrada->comentario ?? ''); // Guarda comentario opcional del movimiento para las siguientes operaciones.

        // Acepta únicamente ingresos o gastos.
        if (!in_array($tipo, ['ingreso', 'gasto'], true)) { // Acepta únicamente ingresos o gastos.
            throw new InvalidArgumentException('Tipo de movimiento inválido.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        // Exige una descripción de uno a ciento cincuenta caracteres.
        if ($descripcion === '' || mb_strlen($descripcion, 'UTF-8') > 150) { // Exige una descripción de uno a ciento cincuenta caracteres.
            throw new InvalidArgumentException('Ingresá una descripción de hasta 150 caracteres.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        // Exige monto positivo, finito, dentro del límite y con dos decimales.
        if (!is_finite($monto) || $monto <= 0 || $monto > 999999999.99 || round($monto, 2) !== $monto) { // Exige monto positivo, finito, dentro del límite y con dos decimales.
            throw new InvalidArgumentException('Ingresá un monto positivo de hasta 999999999.99 y dos decimales.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        // Comprueba el formato y el intervalo de fecha permitido.
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/D', $fecha) // Comprueba el formato y el intervalo de fecha permitido.
            || $fecha < '1900-01-01' || $fecha > '2100-12-31') { // Agrega otra condición a la comprobación de la línea anterior.
            throw new InvalidArgumentException('Seleccioná una fecha entre 1900 y 2100.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        // Comprueba que el día exista realmente en ese mes y año.
        [$anio, $mes, $dia] = array_map('intval', explode('-', $fecha)); // Separa año, mes y día como enteros para verificar la fecha real.
        if (!checkdate($mes, $dia, $anio)) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            throw new InvalidArgumentException('Seleccioná una fecha válida.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        // Exige una categoría que corresponda al tipo de movimiento.
        if (($this->categorias[$categoria] ?? null) !== $tipo) { // Exige una categoría que corresponda al tipo de movimiento.
            throw new InvalidArgumentException('Seleccioná una categoría válida para el tipo de movimiento.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        // Acepta únicamente medios de pago configurados.
        if (!isset($this->tarifas['medios_pago'][$medioPago])) { // Acepta únicamente medios de pago configurados.
            throw new InvalidArgumentException('Seleccioná un medio de pago válido.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        // Permite varias cuotas sólo para gastos con tarjeta de crédito.
        $esCredito = $tipo === 'gasto' && $medioPago === 'Tarjeta de crédito'; // Guarda si es un gasto con tarjeta de crédito para las siguientes operaciones.
        if (!in_array($cuotas, [1, 3, 6, 12], true) || (!$esCredito && $cuotas !== 1)) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            throw new InvalidArgumentException('Las cuotas deben ser 1, 3, 6 o 12 y sólo crédito permite más de una.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        // Limita el comentario a quinientos caracteres.
        if (mb_strlen($comentario, 'UTF-8') > 500) { // Limita el comentario a quinientos caracteres.
            throw new InvalidArgumentException('El comentario puede tener hasta 500 caracteres.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.

        // Recalcula los importes con las tarifas del servidor.
        $descuento = $this->tarifas['medios_pago'][$medioPago]['descuento'] ?? null; // Guarda tasa de descuento del medio de pago para las siguientes operaciones.
        $interes = $esCredito ? ($this->tarifas['cuotas'][(string) $cuotas] ?? null) : 0; // Guarda tasa de interés de las cuotas para las siguientes operaciones.
        // Comprueba que las tasas configuradas sean numéricas y válidas.
        if (!is_numeric($descuento) || $descuento < 0 || $descuento > 1 // Comprueba que las tasas configuradas sean numéricas y válidas.
            || !is_numeric($interes) || $interes < 0) { // Agrega otra condición a la comprobación de la línea anterior.
            throw new RuntimeException('Las tarifas del movimiento no son válidas.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        // Conserva el ingreso o aplica descuento e interés al gasto.
        $total = $tipo === 'ingreso' // Guarda importe final calculado para las siguientes operaciones.
            ? $monto // Selecciona este valor si se cumple la condición anterior.
            : round($monto * (1 - $descuento) * (1 + $interes), 2, PHP_ROUND_HALF_UP); // Selecciona este valor cuando no se cumple la condición anterior.

        // Devuelve campos normalizados con total, ajuste y valor de cuota.
        return [ // Devuelve [ al código que llamó.
            'tipo' => $tipo, // Incluye el tipo de movimiento en esta estructura.
            'descripcion' => $descripcion, // Incluye el campo descripcion en esta estructura.
            'monto' => $monto, // Incluye el importe original en esta estructura.
            'ajuste' => round($total - $monto, 2, PHP_ROUND_HALF_UP), // Incluye la diferencia entre importe final y original en esta estructura.
            'total' => $total, // Incluye el importe final en esta estructura.
            'cuotas' => $cuotas, // Incluye la cantidad de cuotas en esta estructura.
            'valor_cuota' => round($total / $cuotas, 2, PHP_ROUND_HALF_UP), // Incluye el importe de cada cuota en esta estructura.
            'fecha' => $fecha, // Incluye la fecha del movimiento en esta estructura.
            'categoria' => $categoria, // Incluye la categoría del movimiento en esta estructura.
            'medio_pago' => $medioPago, // Incluye el medio de pago en esta estructura.
            'comentario' => $comentario, // Incluye el comentario opcional en esta estructura.
        ]; // Completa la estructura o llamada iniciada arriba.
    } // Finaliza este bloque.
} // Finaliza este bloque.
