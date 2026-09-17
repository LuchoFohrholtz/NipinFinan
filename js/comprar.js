const inputMonto = document.getElementById("monto");
const inputCuotas = document.getElementById("cuotas");
const spanSubtotal = document.getElementById("subtotal");

function calcularSubtotal() {
    const monto = parseFloat(inputMonto.value) || 0;
    const cuotas = parseInt(inputCuotas.value) || 0;
    const total = monto * cuotas;
    spanSubtotal.textContent = `$${total.toLocaleString("es-AR")}`;
}

inputMonto.addEventListener("input", calcularSubtotal);
inputCuotas.addEventListener("input", calcularSubtotal);