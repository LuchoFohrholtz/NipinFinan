// NipinFinan - Validacion de cupones
// Los cupones se leen de data/tarifas.json (misma tabla que usa la calculadora)


// =============================
// ELEMENTOS DEL DOM
// =============================

const formularioCupon = document.getElementById("formulario-cupon");
const inputCupon = document.getElementById("cupon");
const mensajeCupon = document.getElementById("mensaje-cupon");


// =============================
// CARGA DE CUPONES (fetch)
// =============================

async function obtenerCupones() {
    const respuesta = await fetch("data/tarifas.json");
    if (!respuesta.ok) throw new Error("HTTP " + respuesta.status);
    const datos = await respuesta.json();
    return datos.cupones || {};
}


// =============================
// MENSAJES
// =============================

function mostrarMensajeCupon(texto, tipo) {
    mensajeCupon.textContent = texto;
    mensajeCupon.className = "mensaje-" + tipo; // "mensaje-exito" o "mensaje-error"
}


// =============================
// VALIDACION DEL CUPON
// =============================

async function validarCupon() {
    const codigo = inputCupon.value.trim().toUpperCase();

    if (codigo === "") {
        return mostrarMensajeCupon("Por favor, ingrese un código", "error");
    }

    try {
        const cupones = await obtenerCupones();
        const cupon = cupones[codigo];

        if (cupon && cupon.vigente) {
            const porcentaje = Math.round(cupon.descuento * 100);
            mostrarMensajeCupon(`¡Cupón aplicado! Tenés un ${porcentaje}% de descuento`, "exito");
        } else {
            mostrarMensajeCupon("Código inválido o vencido", "error");
        }
    } catch (err) {
        console.error("Error al cargar cupones:", err);
        mostrarMensajeCupon("No se pudieron cargar los cupones. Intentá más tarde.", "error");
    }
}


// =============================
// EVENTOS
// =============================

formularioCupon.addEventListener("submit", function (evento) {
    evento.preventDefault();
    validarCupon();
});
