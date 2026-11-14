// Capa HTTP compartida. Se carga antes de app.js y los módulos de cada página.
const NipinAPI = (() => {
    let pedidoSesion = null;
    let csrfToken = null; // Solo en memoria; nunca en localStorage ni en una cookie JS.

    class ErrorAPI extends Error {
        constructor(mensaje, status = 0, tipo = "http", errores = null) {
            super(mensaje);
            this.name = "ErrorAPI";
            this.status = status;
            this.tipo = tipo;
            this.errores = errores;
        }
    }

    // Devuelve el JSON original, sin envolver ni renombrar campos del contrato.
    // También sirve para los JSON públicos de tarifas y demostración.
    async function solicitarJSON(url, { method = "GET", datos, privada = false } = {}) {
        const headers = { Accept: "application/json" };
        const opciones = { method, headers, credentials: "same-origin", cache: "no-store" };
        if (datos !== undefined) {
            headers["Content-Type"] = "application/json";
            opciones.body = JSON.stringify(datos);
        }
        if (["POST", "PUT", "DELETE"].includes(method) && csrfToken) {
            headers["X-CSRF-Token"] = csrfToken;
        }

        let respuesta;
        try {
            respuesta = await fetch(url, opciones);
        } catch (error) {
            throw new ErrorAPI("Error de conexión con el servidor.", 0, "red");
        }

        if (privada && respuesta.status === 401) pedidoSesion = null;

        let resultado;
        try {
            resultado = await respuesta.json();
        } catch (error) {
            // Conservamos el código HTTP incluso si PHP/proxy devuelve HTML.
            throw new ErrorAPI(
                respuesta.ok ? "El servidor devolvió una respuesta JSON inválida." : "Error HTTP " + respuesta.status + ".",
                respuesta.status,
                respuesta.ok ? "json" : "http"
            );
        }

        if (!respuesta.ok || resultado?.estado === "error") {
            const mensaje = typeof resultado?.mensaje === "string" && resultado.mensaje
                ? resultado.mensaje : "Error HTTP " + respuesta.status + ".";
            throw new ErrorAPI(mensaje, respuesta.status, respuesta.ok ? "api" : "http", resultado?.errores);
        }
        if (!resultado || typeof resultado !== "object") {
            throw new ErrorAPI("El servidor devolvió una respuesta JSON inválida.", respuesta.status, "json");
        }
        return resultado;
    }

    // Compatibilidad actual: el header y las vistas comparten el primer GET.
    // recargar=true relee el servidor; un error permite reintentar.
    function consultarSesion(recargar = false) {
        if (!pedidoSesion || recargar) {
            const pedido = solicitarJSON("api/mis_movimientos.php", { privada: true })
                .catch(error => {
                    if (error.status === 401) return null;
                    if (pedidoSesion === pedido) pedidoSesion = null;
                    throw error;
                });
            pedidoSesion = pedido;
        }
        return pedidoSesion;
    }

    // Anexo 8.6: al integrar sesion.php, llamar antes de habilitar envíos.
    // L1 no lo ejecuta automáticamente: el backend actual aún no tiene esa ruta.
    // Si falla o falta el token real, el llamador debe mantener los envíos deshabilitados.
    async function prepararSesion() {
        csrfToken = null;
        const sesion = await solicitarJSON("api/sesion.php");
        if (typeof sesion.csrfToken !== "string" || !sesion.csrfToken) {
            throw new ErrorAPI("No se pudo obtener el token de sesión.", 200, "json");
        }
        csrfToken = sesion.csrfToken;
        pedidoSesion = null;
        return sesion;
    }

    async function ingresar(datos) {
        const resultado = await solicitarJSON("api/login.php", { method: "POST", datos });
        // El login actual no trae token; el contrato AE4 lo agrega y lo rota.
        csrfToken = typeof resultado.csrfToken === "string" && resultado.csrfToken ? resultado.csrfToken : null;
        pedidoSesion = null;
        return resultado;
    }

    async function cerrarSesion() {
        const renovarToken = Boolean(csrfToken);
        const resultado = await solicitarJSON("api/logout.php", { method: "POST", datos: {} });
        csrfToken = null;
        pedidoSesion = null;
        if (renovarToken) await prepararSesion();
        return resultado;
    }

    async function guardarMovimiento(datos) {
        const resultado = await solicitarJSON("api/mis_movimientos.php", { method: "POST", datos, privada: true });
        pedidoSesion = null;
        return resultado;
    }

    return { solicitarJSON, consultarSesion, prepararSesion, ingresar, cerrarSesion, guardarMovimiento };
})();
