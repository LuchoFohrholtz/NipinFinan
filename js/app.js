// NipinFinan - AE2
// Calculadora de tarifas: descuento segun medio de pago e interes por cuotas.
// Las tarifas se cargan con fetch desde data/tarifas.json


// =============================
// VARIABLES GLOBALES
// =============================

const CLAVE_STORAGE = "nipinfinan_movimientos";
let tarifas = null; // se completa cuando termina el fetch


// =============================
// ELEMENTOS DEL DOM
// =============================

const form = document.getElementById("form-movimiento");
const inputDescripcion = document.getElementById("descripcion");
const inputMonto = document.getElementById("monto");
const inputFecha = document.getElementById("fecha");
const selectCategoria = document.getElementById("categoria");
const selectPago = document.getElementById("pago");
const selectCuotas = document.getElementById("cuotas");
const filaCuotas = document.getElementById("fila-cuotas");
const radiosTipo = document.querySelectorAll('input[name="tipo"]');
const inputComentario = document.getElementById("comentario");
const btnGuardar = form.querySelector('button[type="submit"]');
const divMensaje = document.getElementById("mensaje");

// Resumen del calculo
const resSubtotal = document.getElementById("res-subtotal");
const resAjuste = document.getElementById("res-ajuste");
const resTotal = document.getElementById("res-total");
const resCuota = document.getElementById("res-cuota");
const resCuotaLinea = document.getElementById("res-cuota-linea");


// =============================
// FUNCIONES AUXILIARES
// =============================

// Mismo formato que en el listado: $1.234 o $1.234,50
function formatearPesos(valor) {
    const decimales = Number.isInteger(valor) ? 0 : 2;
    const texto = Math.abs(valor).toLocaleString("es-AR", {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    });
    return (valor < 0 ? "-$" : "$") + texto;
}

function redondear(valor) {
    return Math.round(valor * 100) / 100;
}

function tipoSeleccionado() {
    return document.querySelector('input[name="tipo"]:checked').value;
}

// Fecha de hoy en hora local (con toISOString sola a la noche da el dia siguiente)
function fechaHoy() {
    const ahora = new Date();
    return new Date(ahora - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function mostrarMensaje(texto, tipo) {
    divMensaje.textContent = texto;
    divMensaje.className = "mensaje " + tipo; // tipo: "exito" o "error"
}


// =============================
// CARGA DE TARIFAS (fetch + async/await)
// =============================

async function cargarTarifas() {
    try {
        const respuesta = await fetch("data/tarifas.json");
        if (!respuesta.ok) throw new Error("HTTP " + respuesta.status);
        tarifas = await respuesta.json();
    } catch (err) {
        console.error("Error al cargar tarifas:", err);
        mostrarMensaje(
            "No se pudieron cargar las tarifas. Abrí el proyecto con un servidor local (Live Server).",
            "error"
        );
        btnGuardar.disabled = true; // sin tarifas el total no seria correcto
    }
}


// =============================
// CALCULO DEL PRESUPUESTO
// =============================

function calcular() {
    const monto = parseFloat(inputMonto.value);
    const vacio = { subtotal: 0, ajuste: 0, total: 0, cuotas: 1, valorCuota: 0 };

    if (!(monto > 0)) return vacio; // vacio, 0 o negativo

    // Si es ingreso no se aplican descuentos ni cuotas
    if (tipoSeleccionado() === "ingreso") {
        return { subtotal: monto, ajuste: 0, total: monto, cuotas: 1, valorCuota: monto };
    }

    // Si es gasto: descuento por medio de pago + interes (solo con credito)
    const medio = selectPago.value;
    const esCredito = medio === "Tarjeta de crédito";
    const cuotas = esCredito ? parseInt(selectCuotas.value, 10) : 1;

    const descuento = tarifas?.medios_pago?.[medio]?.descuento ?? 0;
    const interes = esCredito ? (tarifas?.cuotas?.[cuotas] ?? 0) : 0;

    const base = monto * (1 - descuento);
    const total = redondear(base * (1 + interes));

    return {
        subtotal: monto,
        ajuste: redondear(total - monto), // negativo = descuento, positivo = recargo
        total,
        cuotas,
        valorCuota: redondear(total / cuotas)
    };
}


// =============================
// ACTUALIZACION DEL DOM
// =============================

// Las cuotas solo tienen sentido en un gasto con tarjeta de credito
function mostrarCuotasSiCorresponde() {
    const visible = tipoSeleccionado() === "gasto" && selectPago.value === "Tarjeta de crédito";
    filaCuotas.hidden = !visible;
    selectCuotas.disabled = !visible;
    if (!visible) selectCuotas.value = "1";
}

function actualizarResultado() {
    mostrarCuotasSiCorresponde();
    const r = calcular();

    resSubtotal.textContent = formatearPesos(r.subtotal);
    resAjuste.textContent = (r.ajuste > 0 ? "+" : "") + formatearPesos(r.ajuste);
    resTotal.textContent = formatearPesos(r.total);
    resCuota.textContent = formatearPesos(r.valorCuota);
    resCuotaLinea.hidden = r.cuotas <= 1;
}


// =============================
// GUARDADO (localStorage)
// =============================

function guardarMovimiento(movimiento) {
    const guardados = JSON.parse(localStorage.getItem(CLAVE_STORAGE)) || [];
    guardados.push(movimiento);
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(guardados));
}

function manejarSubmit(e) {
    e.preventDefault();

    const descripcion = inputDescripcion.value.trim();
    const r = calcular();

    // Validaciones
    if (!descripcion) return mostrarMensaje("Ingresá una descripción.", "error");
    if (!(r.subtotal > 0)) return mostrarMensaje("Ingresá un monto mayor a 0.", "error");
    if (!inputFecha.value) return mostrarMensaje("Seleccioná una fecha.", "error");
    if (!selectCategoria.value) return mostrarMensaje("Seleccioná una categoría.", "error");
    if (!selectPago.value) return mostrarMensaje("Seleccioná un medio de pago.", "error");

    const movimiento = {
        id: Date.now(),
        tipo: tipoSeleccionado(),
        descripcion,
        monto: r.subtotal,
        ajuste: r.ajuste,
        total: r.total,
        cuotas: r.cuotas,
        valorCuota: r.valorCuota,
        fecha: inputFecha.value,
        categoria: selectCategoria.value,
        medioPago: selectPago.value,
        comentario: inputComentario.value.trim()
    };

    try {
        guardarMovimiento(movimiento);
    } catch (err) {
        console.error("Error al guardar:", err);
        return mostrarMensaje("No se pudo guardar el movimiento.", "error");
    }

    // Limpio el formulario (reset no dispara eventos, por eso actualizo a mano)
    form.reset();
    inputFecha.value = fechaHoy();
    actualizarResultado();
    mostrarMensaje("Movimiento guardado correctamente.", "exito");
}


// =============================
// INICIO Y EVENTOS
// =============================

document.addEventListener("DOMContentLoaded", async () => {
    inputFecha.value = fechaHoy();
    await cargarTarifas();
    actualizarResultado();

    // Cualquier cambio en monto, tipo, medio de pago o cuotas recalcula el total
    inputMonto.addEventListener("input", actualizarResultado);
    inputMonto.addEventListener("change", actualizarResultado);
    selectPago.addEventListener("change", actualizarResultado);
    selectCuotas.addEventListener("change", actualizarResultado);
    radiosTipo.forEach(radio => radio.addEventListener("change", actualizarResultado));

    form.addEventListener("submit", manejarSubmit);
});
