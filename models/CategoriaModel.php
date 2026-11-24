<?php
declare(strict_types=1); // Activa el control estricto de tipos en las llamadas de este archivo.

// Combina el catálogo público con los movimientos privados de cada usuario.
final class CategoriaModel // Define la clase CategoriaModel.
{ // Comienza el cuerpo de la función, clase o condición.
    private PDO $conexion; // Conserva conexión PDO compartida como propiedad del objeto.
    private array $catalogo; // Conserva catálogo de categorías como propiedad del objeto.

    // Recibe PDO y carga el catálogo de categorías desde JSON.
    public function __construct(PDO $conexion) // Define __construct con sus entradas y el resultado que devuelve.
    { // Comienza el cuerpo de la función, clase o condición.
        $this->conexion = $conexion; // Conserva el mismo objeto PDO; los métodos no abren otra conexión.
        $archivo = __DIR__ . '/../data/categorias.json'; // Guarda archivo para las siguientes operaciones.
        // Rechaza un catálogo que no pueda leerse.
        if (!is_readable($archivo)) { // Rechaza un catálogo que no pueda leerse.
            throw new RuntimeException('No se puede leer el catálogo de categorías.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        $contenido = file_get_contents($archivo); // Guarda contenido leído del archivo para las siguientes operaciones.
        // Detecta fallos al cargar el archivo de categorías.
        if ($contenido === false) { // Detecta fallos al cargar el archivo de categorías.
            throw new RuntimeException('No se pudo cargar el catálogo de categorías.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        // Decodifica y valida que el catálogo sea una lista no vacía.
        $catalogo = json_decode($contenido, true, 512, JSON_THROW_ON_ERROR); // Convierte el JSON recibido o leído a una estructura PHP.
        if (!is_array($catalogo) || array_values($catalogo) !== $catalogo || $catalogo === []) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            throw new RuntimeException('Catálogo de categorías inválido.'); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        // Comprueba los campos y tipos de cada categoría del catálogo.
        foreach ($catalogo as $categoria) { // Recorre los elementos para procesar cada uno dentro del bloque.
            if (!is_array($categoria) || !isset($categoria['id'], $categoria['nombre'], $categoria['tipo']) // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                || !is_string($categoria['id']) || !is_string($categoria['nombre']) // Agrega otra condición a la comprobación de la línea anterior.
                || !in_array($categoria['tipo'], ['ingreso', 'gasto'], true)) { // Agrega otra condición a la comprobación de la línea anterior.
                throw new RuntimeException('Catálogo de categorías inválido.'); // Interrumpe el recorrido y comunica el error al código que llamó.
            } // Finaliza este bloque.
        } // Finaliza este bloque.
        $this->catalogo = $catalogo; // Guarda this->catalogo para las siguientes operaciones.
    } // Finaliza este bloque.

    // Agrupa importes y cantidades por categoría y tipo para una cuenta.
    public function listarPorUsuario(int $usuarioId): array // Consulta únicamente movimientos del propietario autenticado.
    { // Comienza el cuerpo de la función, clase o condición.
        $consulta = $this->conexion->prepare( // Prepara la sentencia SQL; los valores se vinculan después con execute.
            'SELECT BINARY categoria AS categoria, tipo, SUM(total) AS importe, COUNT(*) AS cantidad
             FROM movimientos WHERE usuario_id = :usuario_id
             GROUP BY BINARY categoria, tipo' // Agrupa importes por nombre exacto de categoría y tipo de movimiento.
        ); // Completa la estructura o llamada iniciada arriba.
        // Vincula el usuario antes de ejecutar la consulta preparada.
        $consulta->execute(['usuario_id' => $usuarioId]); // Ejecuta SQL vinculando valores separados de las instrucciones.
        $resumen = []; // Guarda resumen para las siguientes operaciones.
        // Organiza los agregados por nombre de categoría y tipo de movimiento.
        foreach ($consulta->fetchAll(PDO::FETCH_ASSOC) as $fila) { // Recupera todas las filas SQL como arrays con nombres de columnas.
            $resumen[$fila['categoria']][$fila['tipo']] = $fila; // Guarda resumen[$fila['categoria']][$fila['tipo']] para las siguientes operaciones.
        } // Finaliza este bloque.

        $categorias = []; // Guarda categorías admitidas para las siguientes operaciones.
        // Completa el catálogo con ingresos, gastos, saldo y cantidad, incluso en cero.
        foreach ($this->catalogo as $categoria) { // Recorre los elementos para procesar cada uno dentro del bloque.
            $datos = $resumen[$categoria['nombre']] ?? []; // Guarda datos que se van a procesar para las siguientes operaciones.
            $ingresos = (float) ($datos['ingreso']['importe'] ?? 0); // Guarda ingresos para las siguientes operaciones.
            $gastos = (float) ($datos['gasto']['importe'] ?? 0); // Guarda gastos para las siguientes operaciones.
            $categorias[] = $categoria + [ // Guarda categorias[] para las siguientes operaciones.
                'ingresos' => $ingresos, // Incluye el campo ingresos en esta estructura.
                'gastos' => $gastos, // Incluye el campo gastos en esta estructura.
                'saldo' => round($ingresos - $gastos, 2), // Incluye el campo saldo en esta estructura.
                'cantidad' => (int) ($datos['ingreso']['cantidad'] ?? 0) + (int) ($datos['gasto']['cantidad'] ?? 0), // Incluye el campo cantidad en esta estructura.
            ]; // Completa la estructura o llamada iniciada arriba.
        } // Finaliza este bloque.
        return $categorias; // Devuelve categorías admitidas al código que llamó.
    } // Finaliza este bloque.

    // Busca el identificador público dentro del catálogo con totales propios.
    public function buscarPorId(string $id, int $usuarioId): ?array // Define buscarPorId con sus entradas y el resultado que devuelve.
    { // Comienza el cuerpo de la función, clase o condición.
        foreach ($this->listarPorUsuario($usuarioId) as $categoria) { // Recorre los elementos para procesar cada uno dentro del bloque.
            if ($categoria['id'] === $id) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                return $categoria; // Devuelve categoría seleccionada al código que llamó.
            } // Finaliza este bloque.
        } // Finaliza este bloque.
        return null; // Devuelve ausencia de resultado al código que llamó.
    } // Finaliza este bloque.
} // Finaliza este bloque.
