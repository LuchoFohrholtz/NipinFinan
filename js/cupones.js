const formularioCupon = document.getElementById("formulario-cupon");

formularioCupon.addEventListener("submit", function (evento) {
    evento.preventDefault();
    validarCupon();
});

function validarCupon() {
    const inputCupon = document.getElementById("cupon");
    const mensajeCupon = document.getElementById("mensaje-cupon");
    const codigo = inputCupon.value.trim().toUpperCase();

    mensajeCupon.classList.remove("mensaje-error", "mensaje-exito");

    if (codigo === "") {
        mensajeCupon.textContent = "Por favor, ingrese un código";
        mensajeCupon.classList.add("mensaje-error");
    } else if (codigo === "UCP10") {
        mensajeCupon.textContent = "¡Cupón aplicado! Tenés un 10% de descuento";
        mensajeCupon.classList.add("mensaje-exito");
    } else {
        mensajeCupon.textContent = "Código inválido o vencido";
        mensajeCupon.classList.add("mensaje-error");
    }
}
