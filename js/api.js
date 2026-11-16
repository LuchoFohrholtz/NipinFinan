// Capa HTTP compartida. Se carga antes de app.js y los módulos de cada página.
const NipinAPI = (() => {
    // Backend integrado: todas las escrituras requieren el token real de sesión.
    // No se configura desde la URL ni se intenta detectar una ruta inexistente.
    const CSRF_REQUERIDO = true;
    let csrfActivado = CSRF_REQUERIDO;
    let pedidoSesion = null;
    let pedidoCsrf = null;
    let revisionSesion = 0;
    let csrfToken = null; // Solo en memoria; nunca en localStorage ni en una cookie JS.
    const movimientosPendientes = new Set();

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
        const modifica = ["POST", "PUT", "DELETE"].includes(method);
        if (modifica) await prepararEnvios();
        const revision = revisionSesion;
        const headers = { Accept: "application/json" };
        const opciones = { method, headers, credentials: "same-origin", cache: "no-store" };
        if (datos !== undefined) {
            headers["Content-Type"] = "application/json";
            opciones.body = JSON.stringify(datos);
        }
        if (modifica && csrfToken) {
            headers["X-CSRF-Token"] = csrfToken;
        }

        let respuesta;
        try {
            respuesta = await fetch(url, opciones);
        } catch (error) {
            throw new ErrorAPI("Error de conexión con el servidor.", 0, "red");
        }

        if (privada && respuesta.status === 401 && revision === revisionSesion) {
            pedidoSesion = null;
            // La identidad pudo vencer: renovar el token antes de otro envío.
            if (csrfActivado) csrfToken = null;
        }
        // Invalidar también ante un 403 con JSON roto, sin tocar una sesión posterior.
        if (respuesta.status === 403 && csrfActivado && revision === revisionSesion) csrfToken = null;

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

    // Anexo 8.6: obtener el token de sesion.php antes de habilitar envíos.
    // Si falla o falta el token real, el llamador debe mantener los envíos deshabilitados.
    async function prepararSesion() {
        const revision = revisionSesion;
        csrfActivado = true;
        csrfToken = null;
        const sesion = await solicitarJSON("api/sesion.php");
        // Una preparación anterior al login/logout no puede reemplazar el token rotado.
        if (revision !== revisionSesion) {
            throw new ErrorAPI("La sesión cambió. Volvé a intentar la operación.", 0, "sesion");
        }
        if (typeof sesion.csrfToken !== "string" || !sesion.csrfToken) {
            throw new ErrorAPI("No se pudo obtener el token de sesión.", 200, "json");
        }
        csrfToken = sesion.csrfToken;
        revisionSesion++;
        pedidoSesion = null;
        return sesion;
    }

    // La UI espera este método antes de habilitar envíos: token real o rechazo.
    async function prepararEnvios() {
        if (!csrfActivado || csrfToken) return;
        if (!pedidoCsrf) {
            pedidoCsrf = prepararSesion().finally(() => { pedidoCsrf = null; });
        }
        await pedidoCsrf;
    }

    async function ingresar(datos) {
        const resultado = await solicitarJSON("api/login.php", { method: "POST", datos });
        if (!resultado.usuario || typeof resultado.usuario.nombre !== "string" || typeof resultado.usuario.email !== "string") {
            throw new ErrorAPI("La respuesta de inicio de sesión es inválida.", 200, "json");
        }
        // El contrato AE4 rota el token junto con el identificador de sesión.
        csrfToken = typeof resultado.csrfToken === "string" && resultado.csrfToken ? resultado.csrfToken : null;
        revisionSesion++;
        pedidoSesion = null;
        if (csrfActivado && !csrfToken) {
            throw new ErrorAPI("No se pudo renovar el token de sesión.", 200, "json");
        }
        return resultado;
    }

    async function cerrarSesion() {
        const resultado = await solicitarJSON("api/logout.php", { method: "POST", datos: {} });
        csrfToken = null;
        revisionSesion++;
        pedidoSesion = null;
        // La UI limpia primero los datos privados y luego prepara la sesión
        // anónima. Si eso falla, el logout ya realizado sigue siendo efectivo.
        return resultado;
    }

    async function guardarMovimiento(datos) {
        const resultado = await solicitarJSON("api/mis_movimientos.php", { method: "POST", datos, privada: true });
        pedidoSesion = null;
        return resultado;
    }

    async function modificarMovimiento(id, method, datos) {
        if (!Number.isSafeInteger(id) || id <= 0) throw new ErrorAPI("El movimiento no es válido.", 0, "entrada");
        // El bloqueo sobrevive a salir y volver a la vista durante un envío.
        if (movimientosPendientes.has(id)) throw new ErrorAPI("Hay una operación pendiente para este movimiento. Esperá y actualizá el listado antes de reintentar.", 0, "entrada");
        movimientosPendientes.add(id);
        try {
            const resultado = await solicitarJSON("api/mis_movimientos.php?id=" + id, { method, datos, privada: true });
            pedidoSesion = null;
            return resultado;
        } finally {
            movimientosPendientes.delete(id);
        }
    }

    return {
        solicitarJSON, consultarSesion, prepararSesion, prepararEnvios, ingresar, cerrarSesion, guardarMovimiento,
        editarMovimiento: (id, datos) => modificarMovimiento(id, "PUT", datos),
        eliminarMovimiento: id => modificarMovimiento(id, "DELETE")
    };
})();
