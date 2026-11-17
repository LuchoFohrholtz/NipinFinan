<?php
declare(strict_types=1);

// Combina el catálogo público con los movimientos privados de cada usuario.
final class CategoriaModel
{
    private PDO $conexion;
    private array $catalogo;

    // Recibe PDO y carga el catálogo de categorías desde JSON.
    public function __construct(PDO $conexion)
    {
        $this->conexion = $conexion;
        $archivo = __DIR__ . '/../data/categorias.json';
        // Rechaza un catálogo que no pueda leerse.
        if (!is_readable($archivo)) {
            throw new RuntimeException('No se puede leer el catálogo de categorías.');
        }
        $contenido = file_get_contents($archivo);
        // Detecta fallos al cargar el archivo de categorías.
        if ($contenido === false) {
            throw new RuntimeException('No se pudo cargar el catálogo de categorías.');
        }
        // Decodifica y valida que el catálogo sea una lista no vacía.
        $catalogo = json_decode($contenido, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($catalogo) || array_values($catalogo) !== $catalogo || $catalogo === []) {
            throw new RuntimeException('Catálogo de categorías inválido.');
        }
        // Comprueba los campos y tipos de cada categoría del catálogo.
        foreach ($catalogo as $categoria) {
            if (!is_array($categoria) || !isset($categoria['id'], $categoria['nombre'], $categoria['tipo'])
                || !is_string($categoria['id']) || !is_string($categoria['nombre'])
                || !in_array($categoria['tipo'], ['ingreso', 'gasto'], true)) {
                throw new RuntimeException('Catálogo de categorías inválido.');
            }
        }
        $this->catalogo = $catalogo;
    }

    // Agrupa importes y cantidades por categoría y tipo para una cuenta.
    public function listarPorUsuario(int $usuarioId): array
    {
        $consulta = $this->conexion->prepare(
            'SELECT BINARY categoria AS categoria, tipo, SUM(total) AS importe, COUNT(*) AS cantidad
             FROM movimientos WHERE usuario_id = :usuario_id
             GROUP BY BINARY categoria, tipo'
        );
        // Vincula el usuario antes de ejecutar la consulta preparada.
        $consulta->execute(['usuario_id' => $usuarioId]);
        $resumen = [];
        // Organiza los agregados por nombre de categoría y tipo de movimiento.
        foreach ($consulta->fetchAll(PDO::FETCH_ASSOC) as $fila) {
            $resumen[$fila['categoria']][$fila['tipo']] = $fila;
        }

        $categorias = [];
        // Completa el catálogo con ingresos, gastos, saldo y cantidad, incluso en cero.
        foreach ($this->catalogo as $categoria) {
            $datos = $resumen[$categoria['nombre']] ?? [];
            $ingresos = (float) ($datos['ingreso']['importe'] ?? 0);
            $gastos = (float) ($datos['gasto']['importe'] ?? 0);
            $categorias[] = $categoria + [
                'ingresos' => $ingresos,
                'gastos' => $gastos,
                'saldo' => round($ingresos - $gastos, 2),
                'cantidad' => (int) ($datos['ingreso']['cantidad'] ?? 0) + (int) ($datos['gasto']['cantidad'] ?? 0),
            ];
        }
        return $categorias;
    }

    // Busca el identificador público dentro del catálogo con totales propios.
    public function buscarPorId(string $id, int $usuarioId): ?array
    {
        foreach ($this->listarPorUsuario($usuarioId) as $categoria) {
            if ($categoria['id'] === $id) {
                return $categoria;
            }
        }
        return null;
    }
}
