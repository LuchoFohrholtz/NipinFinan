<?php
// Activa el control estricto de tipos en las llamadas de este archivo.
declare(strict_types=1);

// Combina el catálogo público con los movimientos privados de cada usuario.
final class CategoriaModel
{
    // Conserva conexión PDO compartida como propiedad del objeto.
    private PDO $conexion;
    // Conserva catálogo de categorías como propiedad del objeto.
    private array $catalogo;

    // Recibe PDO y carga el catálogo de categorías desde JSON.
    public function __construct(PDO $conexion)
    {
        // Conserva el mismo objeto PDO; los métodos no abren otra conexión.
        $this->conexion = $conexion;
        // Guarda archivo.
        $archivo = __DIR__ . '/../data/categorias.json';
        // Rechaza un catálogo que no pueda leerse.
        if (!is_readable($archivo)) {
            // Interrumpe la función y comunica el error.
            throw new RuntimeException('No se puede leer el catálogo de categorías.');
        }
        // Guarda contenido leído del archivo.
        $contenido = file_get_contents($archivo);
        // Detecta fallos al cargar el archivo de categorías.
        if ($contenido === false) {
            // Interrumpe la función y comunica el error.
            throw new RuntimeException('No se pudo cargar el catálogo de categorías.');
        }
        // Convierte el JSON recibido o leído a una estructura PHP.
        $catalogo = json_decode($contenido, true, 512, JSON_THROW_ON_ERROR);
        // Comprueba esta condición.
        if (!is_array($catalogo) || array_values($catalogo) !== $catalogo || $catalogo === []) {
            // Interrumpe la función y comunica el error.
            throw new RuntimeException('Catálogo de categorías inválido.');
        }
        // Recorre los elementos para procesar cada uno dentro del bloque.
        foreach ($catalogo as $categoria) {
            // Comprueba esta condición.
            if (!is_array($categoria) || !isset($categoria['id'], $categoria['nombre'], $categoria['tipo'])
                // Agrega otra condición a la comprobación de la línea anterior.
                || !is_string($categoria['id']) || !is_string($categoria['nombre'])
                // Agrega otra condición a la comprobación de la línea anterior.
                || !in_array($categoria['tipo'], ['ingreso', 'gasto'], true)) {
                // Interrumpe la función y comunica el error.
                throw new RuntimeException('Catálogo de categorías inválido.');
            }
        }
        // Guarda this->catalogo.
        $this->catalogo = $catalogo;
    }

    // Consulta únicamente movimientos del propietario autenticado.
    public function listarPorUsuario(int $usuarioId): array
    {
        // Prepara la sentencia SQL; los valores se vinculan después con execute.
        $consulta = $this->conexion->prepare(
            'SELECT BINARY categoria AS categoria, tipo, SUM(total) AS importe, COUNT(*) AS cantidad
             FROM movimientos WHERE usuario_id = :usuario_id
             GROUP BY BINARY categoria, tipo'
        );
        // Ejecuta SQL vinculando valores separados de las instrucciones.
        $consulta->execute(['usuario_id' => $usuarioId]);
        // Guarda resumen.
        $resumen = [];
        // Recupera todas las filas SQL como arrays con nombres de columnas.
        foreach ($consulta->fetchAll(PDO::FETCH_ASSOC) as $fila) {
            // Guarda resumen[$fila['categoria']][$fila['tipo']].
            $resumen[$fila['categoria']][$fila['tipo']] = $fila;
        }

        // Guarda categorías admitidas.
        $categorias = [];
        // Recorre los elementos para procesar cada uno dentro del bloque.
        foreach ($this->catalogo as $categoria) {
            // Guarda datos que se van a procesar.
            $datos = $resumen[$categoria['nombre']] ?? [];
            // Guarda ingresos.
            $ingresos = (float) ($datos['ingreso']['importe'] ?? 0);
            // Guarda gastos.
            $gastos = (float) ($datos['gasto']['importe'] ?? 0);
            // Guarda categorias[].
            $categorias[] = $categoria + [
                // Incluye el campo ingresos.
                'ingresos' => $ingresos,
                // Incluye el campo gastos.
                'gastos' => $gastos,
                // Incluye el campo saldo.
                'saldo' => round($ingresos - $gastos, 2),
                // Incluye el campo cantidad.
                'cantidad' => (int) ($datos['ingreso']['cantidad'] ?? 0) + (int) ($datos['gasto']['cantidad'] ?? 0),
            ];
        }
        // Devuelve categorías admitidas al código que llamó.
        return $categorias;
    }

    // Busca el identificador público dentro del catálogo con totales propios.
    public function buscarPorId(string $id, int $usuarioId): ?array
    {
        // Recorre los elementos para procesar cada uno dentro del bloque.
        foreach ($this->listarPorUsuario($usuarioId) as $categoria) {
            // Comprueba esta condición.
            if ($categoria['id'] === $id) {
                // Devuelve categoría seleccionada al código que llamó.
                return $categoria;
            }
        }
        // Devuelve ausencia de resultado al código que llamó.
        return null;
    }
}
