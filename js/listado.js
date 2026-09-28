// NipinFinan - Listado de movimientos
// Muestra en la tabla lo que se guardo en localStorage desde comprar.html


// =============================
// VARIABLES GLOBALES
// =============================

const CLAVE_STORAGE = "nipinfinan_movimientos";


// =============================
// FUNCIONES AUXILIARES
// =============================

// Formato $1.234 (sin ",00" si el monto es entero)
function formatearPesos(valor) {
    const decimales = Number.isInteger(valor) ? 0 : 2;
    return "$" + valor.toLocaleString("es-AR", {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    });
}

// "2026-09-28" -> "28/09/2026" (sin Date para no tener problemas de zona horaria)
function formatearFecha(iso) {
    const [anio, mes, dia] = iso.split("-");
    return `${dia}/${mes}/${anio}`;
}

function leerMovimientos() {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE_STORAGE));
        return Array.isArray(datos) ? datos : [];
    } catch (err) {
        console.error("Error al leer movimientos:", err);
        return [];
    }
}

function sumar(movimientos, tipo) {
    const suma = movimientos
        .filter(m => m.tipo === tipo)
        .reduce((acc, m) => acc + m.total, 0);
    return Math.round(suma * 100) / 100;
}


// =============================
// ARMADO DE LA TABLA
// =============================

// Uso textContent para que no se interprete HTML escrito por el usuario
function crearCelda(texto, clase) {
    const td = document.createElement("td");
    td.textContent = texto;
    if (clase) td.className = clase;
    return td;
}

function crearFila(mov) {
    const esGasto = mov.tipo === "gasto";
    const descripcion = mov.cuotas > 1 ? `${mov.descripcion} (${mov.cuotas} cuotas)` : mov.descripcion;

    const tr = document.createElement("tr");
    tr.append(
        crearCelda(descripcion),
        crearCelda(mov.categoria),
        crearCelda(esGasto ? "Gasto" : "Ingreso"),
        crearCelda(formatearFecha(mov.fecha)),
        crearCelda((esGasto ? "-" : "+") + formatearPesos(mov.total), esGasto ? "gasto" : "ingreso")
    );
    return tr;
}


// =============================
// MOSTRAR MOVIMIENTOS Y TOTALES
// =============================

function mostrarMovimientos() {
    // Ordeno del mas reciente al mas viejo
    const movimientos = leerMovimientos().sort(
        (a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id
    );

    const ingresos = sumar(movimientos, "ingreso");
    const gastos = sumar(movimientos, "gasto");
    const disponible = Math.round((ingresos - gastos) * 100) / 100;

    document.getElementById("total-ingresos").textContent = "+" + formatearPesos(ingresos);
    document.getElementById("total-gastos").textContent = "-" + formatearPesos(gastos);

    const elDisponible = document.getElementById("total-disponible");
    elDisponible.textContent = (disponible < 0 ? "-" : "") + formatearPesos(Math.abs(disponible));
    elDisponible.className = disponible < 0 ? "gasto" : "";

    // Si no hay nada guardado muestro el aviso en vez de la tabla
    const hayMovimientos = movimientos.length > 0;
    document.getElementById("sin-movimientos").hidden = hayMovimientos;
    document.getElementById("tabla-contenedor").hidden = !hayMovimientos;

    document.getElementById("tbody-movimientos").replaceChildren(...movimientos.map(crearFila));
}


// =============================
// INICIO
// =============================

document.addEventListener("DOMContentLoaded", mostrarMovimientos);
