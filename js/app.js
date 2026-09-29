// NipinFinan - app.js compartido por el registro y el resumen.
// Cada módulo comprueba que su pantalla esté presente antes de ejecutarse.

(function iniciarRegistro() {
    if (!document.querySelector("#form-movimiento")) return;

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
})();

// NipinFinan - AE2, opción 2 - Luciano Fohrholtz.
// El resumen solo lee movimientos; la demostración usa un JSON separado.
(function iniciarResumen() {
    if (!document.querySelector("#resumen")) return;
    const CLAVE = "nipinfinan_movimientos";
    let modo = "real";
    let movimientos = [];
    let cargando = false;

    const panel = document.querySelector("#resumen");
    const mes = panel.querySelector("#resumen-mes");
    const categoria = panel.querySelector("#resumen-filtro-categoria");
    const botonDemo = panel.querySelector("#resumen-demo");
    const botonActualizar = panel.querySelector("#resumen-actualizar");
    const aviso = panel.querySelector("#resumen-aviso");

    function mesActual() {
        const hoy = new Date();
        return hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0");
    }

    function nombreMes(valor) {
        const [anio, numero] = valor.split("-");
        const nombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        return nombres[Number(numero) - 1] + " de " + anio;
    }

    function mesAnterior(valor) {
        const [anio, numero] = valor.split("-").map(Number);
        return (numero === 1 ? anio - 1 : anio) + "-" + String(numero === 1 ? 12 : numero - 1).padStart(2, "0");
    }

    function pesos(centavos) {
        return (centavos / 100).toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: centavos % 100 === 0 ? 0 : 2 });
    }

    function porcentaje(valor) {
        return valor.toLocaleString("es-AR", { maximumFractionDigits: 1 }) + "%";
    }

    function mostrarAviso(texto, error = false) {
        aviso.textContent = texto;
        aviso.hidden = !texto;
        aviso.classList.toggle("error", error);
    }

    // Validamos sin corregir ni escribir los registros del módulo de Santiago.
    function validarMovimientos(datos) {
        if (!Array.isArray(datos)) throw new Error("Los movimientos no son una lista.");
        return datos.filter(m => {
            if (!m || !["ingreso", "gasto"].includes(m.tipo)) return false;
            if (typeof m.total !== "number" || m.total <= 0 || !Number.isSafeInteger(Math.round(m.total * 100))) return false;
            if (typeof m.categoria !== "string" || !m.categoria.trim()) return false;
            if (typeof m.fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(m.fecha)) return false;
            const [anio, numero, dia] = m.fecha.split("-").map(Number);
            const ultimoDia = new Date(anio, numero, 0).getDate();
            return anio >= 1000 && numero >= 1 && numero <= 12 && dia >= 1 && dia <= ultimoDia;
        });
    }

    function leerMovimientos() {
        const texto = localStorage.getItem(CLAVE);
        return texto === null ? [] : JSON.parse(texto);
    }

    // Una petición HTTP real; los ejemplos nunca se guardan en localStorage.
    async function cargarEjemplo() {
        const respuesta = await fetch("data/metricas.json", { cache: "no-store" });
        if (!respuesta.ok) throw new Error("HTTP " + respuesta.status);
        const datos = await respuesta.json();
        return datos.movimientos;
    }

    function agregarOpcion(select, valor, texto) {
        const opcion = document.createElement("option");
        opcion.value = valor;
        opcion.textContent = texto;
        select.append(opcion);
    }

    function prepararFiltros(reiniciar) {
        const seleccionado = mes.value;
        const seleccionCategoria = categoria.value;
        const meses = [...new Set(movimientos.map(m => m.fecha.slice(0, 7)))];
        if (modo === "real" && !meses.includes(mesActual())) meses.push(mesActual());
        meses.sort().reverse();
        mes.replaceChildren();
        agregarOpcion(mes, "todos", "Todo el período");
        meses.forEach(valor => agregarOpcion(mes, valor, nombreMes(valor)));
        const inicial = modo === "real" ? mesActual() : (meses[0] || "todos");
        mes.value = !reiniciar && (seleccionado === "todos" || meses.includes(seleccionado)) ? seleccionado : inicial;

        const categorias = [...new Set(movimientos.map(m => m.categoria))].sort((a, b) => a.localeCompare(b, "es"));
        categoria.replaceChildren();
        agregarOpcion(categoria, "todas", "Todas las categorías");
        categorias.forEach(valor => agregarOpcion(categoria, valor, valor));
        categoria.value = !reiniciar && categorias.includes(seleccionCategoria) ? seleccionCategoria : "todas";
    }

    function filtrar(periodo) {
        return movimientos.filter(m => (periodo === "todos" || m.fecha.slice(0, 7) === periodo) && (categoria.value === "todas" || m.categoria === categoria.value));
    }

    // Sumamos en centavos y usamos total, sin volver a calcular las cuotas.
    function sumar(lista, tipo) {
        return lista.filter(m => m.tipo === tipo).reduce((total, m) => total + Math.round(m.total * 100), 0);
    }

    function gastosPorCategoria(lista) {
        const grupos = new Map();
        lista.filter(m => m.tipo === "gasto").forEach(m => {
            grupos.set(m.categoria, (grupos.get(m.categoria) || 0) + Math.round(m.total * 100));
        });
        return [...grupos].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
    }

    function mostrarBarras(grupos, gastos) {
        const lista = panel.querySelector("#resumen-barras");
        lista.replaceChildren();
        panel.querySelector("#resumen-sin-gastos").hidden = grupos.length > 0;
        grupos.forEach(([nombre, importe]) => {
            const item = document.createElement("li");
            const texto = document.createElement("div");
            texto.className = "resumen-barra-texto";
            const etiqueta = document.createElement("strong");
            etiqueta.textContent = nombre;
            const detalle = document.createElement("span");
            const parte = importe / gastos * 100;
            detalle.textContent = pesos(importe) + " · " + porcentaje(parte);
            texto.append(etiqueta, detalle);
            const base = document.createElement("div");
            base.className = "resumen-barra-base";
            base.setAttribute("aria-hidden", "true");
            const barra = document.createElement("span");
            barra.className = "resumen-barra-valor";
            barra.style.width = parte + "%";
            base.append(barra);
            item.append(texto, base);
            lista.append(item);
        });
    }

    function diferencia(actual, anterior) {
        const valor = actual - anterior;
        return valor === 0 ? "Sin cambios" : (valor > 0 ? "+" : "−") + pesos(Math.abs(valor));
    }

    function mostrarComparacion(ingresos, gastos) {
        const bloque = panel.querySelector("#resumen-comparacion");
        bloque.hidden = mes.value === "todos";
        if (bloque.hidden) return;
        const anterior = mesAnterior(mes.value);
        const lista = filtrar(anterior);
        panel.querySelector("#resumen-comparacion-titulo").textContent = "Comparación con " + nombreMes(anterior).toLowerCase();
        panel.querySelector("#resumen-diferencia-ingresos").textContent = diferencia(ingresos, sumar(lista, "ingreso"));
        panel.querySelector("#resumen-diferencia-gastos").textContent = diferencia(gastos, sumar(lista, "gasto"));
        panel.querySelector("#resumen-comparacion-nota").textContent = lista.length ? "Diferencia de importes con el mismo filtro de categoría." : "No hay movimientos con estos filtros en el mes anterior; se compara con $0.";
    }

    function mostrarResumen() {
        const lista = filtrar(mes.value);
        const ingresos = sumar(lista, "ingreso");
        const gastos = sumar(lista, "gasto");
        const saldo = ingresos - gastos;
        const grupos = gastosPorCategoria(lista);
        panel.querySelector("#resumen-ingresos").textContent = pesos(ingresos);
        panel.querySelector("#resumen-gastos").textContent = pesos(gastos);
        const disponible = panel.querySelector("#resumen-saldo");
        disponible.textContent = pesos(saldo);
        disponible.classList.toggle("gasto", saldo < 0);
        disponible.classList.toggle("ingreso", saldo > 0);
        panel.querySelector("#resumen-porcentaje").textContent = ingresos ? porcentaje(saldo / ingresos * 100) : "—";
        panel.querySelector("#resumen-cantidad").textContent = lista.length;
        const mayores = grupos.length ? grupos.filter(g => g[1] === grupos[0][1]).map(g => g[0]) : [];
        panel.querySelector("#resumen-categoria-mayor").textContent = mayores.length ? mayores.join(" / ") : "Sin gastos";
        panel.querySelector("#resumen-categoria-importe").textContent = grupos.length ? pesos(grupos[0][1]) + (mayores.length > 1 ? " en cada categoría (empate)" : " en el período") : "Todavía no hay una categoría de mayor gasto.";
        panel.querySelector("#resumen-contexto").textContent = (mes.value === "todos" ? "Todo el período" : nombreMes(mes.value)) + " · " + (categoria.value === "todas" ? "Todas las categorías" : categoria.value);
        panel.querySelector("#resumen-fuente").textContent = modo === "real" ? "Mis movimientos" : "Datos de ejemplo";
        botonDemo.textContent = modo === "real" ? "Ver demostración" : "Volver a mis movimientos";
        botonDemo.setAttribute("aria-pressed", String(modo === "demo"));
        panel.querySelector("#resumen-vacio").hidden = lista.length > 0;
        panel.querySelector("#resumen-vacio-texto").textContent = movimientos.length ? "No hay movimientos para los filtros seleccionados." : "Todavía no hay movimientos para mostrar.";
        panel.querySelector("#resumen-registrar").hidden = modo === "demo";
        mostrarBarras(grupos, gastos);
        mostrarComparacion(ingresos, gastos);
    }

    async function actualizarDatos(destino = modo, reiniciar = false) {
        if (cargando) return;
        cargando = true;
        panel.setAttribute("aria-busy", "true");
        botonDemo.disabled = true;
        botonActualizar.disabled = true;
        mostrarAviso(destino === "demo" ? "Cargando datos de ejemplo…" : "Actualizando resumen…");
        try {
            const datos = destino === "demo" ? await cargarEjemplo() : leerMovimientos();
            const validos = validarMovimientos(datos);
            modo = destino;
            movimientos = validos;
            prepararFiltros(reiniciar);
            mostrarResumen();
            const ignorados = datos.length - validos.length;
            mostrarAviso(ignorados ? "Se omitieron " + ignorados + " movimientos con datos incompletos o inválidos." : "", ignorados > 0);
        } catch (error) {
            // Mantenemos la última vista correcta y ofrecemos reintentar.
            console.warn("No se pudo actualizar el resumen:", error.message);
            mostrarAviso(destino === "demo" ? "No pudimos cargar la demostración. La vista anterior se conserva. Intentá nuevamente." : "No pudimos leer tus movimientos. La vista anterior se conserva. Intentá actualizar nuevamente.", true);
            if (destino === "demo" && modo === "real") botonDemo.textContent = "Reintentar demostración";
        } finally {
            cargando = false;
            panel.setAttribute("aria-busy", "false");
            botonDemo.disabled = false;
            botonActualizar.disabled = false;
        }
    }

    // Todos los eventos se registran desde este app.js, sin atributos on*.
    mes.addEventListener("change", mostrarResumen);
    categoria.addEventListener("change", mostrarResumen);
    botonActualizar.addEventListener("click", () => actualizarDatos());
    botonDemo.addEventListener("click", () => actualizarDatos(modo === "real" ? "demo" : "real", true));
    window.addEventListener("pageshow", () => { if (modo === "real") actualizarDatos(); });
    window.addEventListener("storage", evento => {
        if (modo === "real" && (evento.key === CLAVE || evento.key === null)) actualizarDatos();
    });
    prepararFiltros(true);
    mostrarResumen();
    actualizarDatos();
})();
