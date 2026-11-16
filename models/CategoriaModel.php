<?php
declare(strict_types=1);

final class CategoriaModel
{
    private PDO $conexion;
    private array $catalogo;

    public function __construct(PDO $conexion)
    {
        $this->conexion = $conexion;
        $archivo = __DIR__ . '/../data/categorias.json';
        if (!is_readable($archivo)) {
            throw new RuntimeException('No se puede leer el catálogo de categorías.');
        }
        $contenido = file_get_contents($archivo);
        if ($contenido === false) {
            throw new RuntimeException('No se pudo cargar el catálogo de categorías.');
        }
        $catalogo = json_decode($contenido, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($catalogo) || array_values($catalogo) !== $catalogo || $catalogo === []) {
            throw new RuntimeException('Catálogo de categorías inválido.');
        }
        foreach ($catalogo as $categoria) {
            if (!is_array($categoria) || !isset($categoria['id'], $categoria['nombre'], $categoria['tipo'])
                || !is_string($categoria['id']) || !is_string($categoria['nombre'])
                || !in_array($categoria['tipo'], ['ingreso', 'gasto'], true)) {
                throw new RuntimeException('Catálogo de categorías inválido.');
            }
        }
        $this->catalogo = $catalogo;
    }

    public function listarPorUsuario(int $usuarioId): array
    {
        $consulta = $this->conexion->prepare(
            'SELECT BINARY categoria AS categoria, tipo, SUM(total) AS importe, COUNT(*) AS cantidad
             FROM movimientos WHERE usuario_id = :usuario_id
             GROUP BY BINARY categoria, tipo'
        );
        $consulta->execute(['usuario_id' => $usuarioId]);
        $resumen = [];
        foreach ($consulta->fetchAll(PDO::FETCH_ASSOC) as $fila) {
            $resumen[$fila['categoria']][$fila['tipo']] = $fila;
        }

        $categorias = [];
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
