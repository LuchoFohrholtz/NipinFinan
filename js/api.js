// Capa HTTP compartida. Se carga antes de app.js y los módulos de cada página.
const NipinAPI = (() => {
    // Exige el token real de sesión en todas las escrituras.
    const CSRF_REQUERIDO = true;
    let csrfActivado = CSRF_REQUERIDO;
    let pedidoSesion = null;
    let pedidoCsrf = null;
    let revisionSesion = 0;
    let csrfToken = null; // Solo en memoria; nunca en localStorage ni en una cookie JS.
    const movimientosPendientes = new Set();

    class ErrorAPI extends Error {
        constructor(mensaje, status = 0, tipo = "http", errores = null) {
            // Inicializa el estado de esta instancia.
            super(mensaje);
            this.name = "ErrorAPI";
            this.status = status;
            this.tipo = tipo;
            this.errores = errores;
        }
    }

    // Devuelve el JSON del contrato para endpoints y archivos públicos.
    async function solicitarJSON(url, { method = "GET", datos, privada = false } = {}) {
        // Envía HTTP con JSON, cookies y CSRF, y comprueba la respuesta.
        const modifica = ["POST", "PUT", "DELETE"].includes(method);
        if (modifica) await prepararEnvios();
        const revision = revisionSesion;
        const headers = { Accept: "application/json" };
        const opciones = { method, headers, credentials: "same-origin", cache: "no-store" };
        if (datos !== undefined) {
            // Identifica el cuerpo enviado como JSON.
            headers["Content-Type"] = "application/json";
            opciones.body = JSON.stringify(datos);
        }
        if (modifica && csrfToken) {
            // Adjunta el token de sesión a la escritura HTTP.
            headers["X-CSRF-Token"] = csrfToken;
        }

        let respuesta;
        try {
            // Ejecuta la operación y permite tratar sus errores.
            respuesta = await fetch(url, opciones);
        } catch (error) {
            // Informa el fallo sin sustituir el resultado por un éxito.
            throw new ErrorAPI("Error de conexión con el servidor.", 0, "red");
        }

        if (privada && respuesta.status === 401 && revision === revisionSesion) {
            // Mantiene el resultado sólo para la vista o sesión vigente.
            pedidoSesion = null;
            // La identidad pudo vencer: renovar el token antes de otro envío.
            if (csrfActivado) csrfToken = null;
        }
        // Invalidar también ante un 403 con JSON roto, sin tocar una sesión posterior.
        if (respuesta.status === 403 && csrfActivado && revision === revisionSesion) csrfToken = null;

        let resultado;
        try {
            // Ejecuta la operación y permite tratar sus errores.
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
            // Conserva el mensaje de la API o usa el código HTTP como alternativa.
            const mensaje = typeof resultado?.mensaje === "string" && resultado.mensaje
                ? resultado.mensaje : "Error HTTP " + respuesta.status + ".";
            throw new ErrorAPI(mensaje, respuesta.status, respuesta.ok ? "api" : "http", resultado?.errores);
        }
        if (!resultado || typeof resultado !== "object") {
            // Rechaza los datos que no cumplen esta validación.
            throw new ErrorAPI("El servidor devolvió una respuesta JSON inválida.", respuesta.status, "json");
        }
        return resultado;
    }

    // Comparte la consulta de sesión y permite recargarla o reintentar ante un fallo.
    function consultarSesion(recargar = false) {
        // Comparte la consulta de movimientos usada para conocer la sesión.
        if (!pedidoSesion || recargar) {
            // Devuelve el resultado correspondiente a esta condición.
            const pedido = solicitarJSON("api/mis_movimientos.php", { privada: true })
                .catch(error => {
                    // Devuelve el resultado correspondiente a esta condición.
                    if (error.status === 401) return null;
                    if (pedidoSesion === pedido) pedidoSesion = null;
                    throw error;
                });
            pedidoSesion = pedido;
        }
        return pedidoSesion;
    }

    // Obtiene el token real antes de habilitar envíos.
    async function prepararSesion() {
        // Obtiene el token del servidor sin reemplazar una sesión posterior.
        const revision = revisionSesion;
        csrfActivado = true;
        csrfToken = null;
        const sesion = await solicitarJSON("api/sesion.php");
        // Una preparación anterior al login/logout no puede reemplazar el token rotado.
        if (revision !== revisionSesion) {
            // Rechaza los datos que no cumplen esta validación.
            throw new ErrorAPI("La sesión cambió. Volvé a intentar la operación.", 0, "sesion");
        }
        if (typeof sesion.csrfToken !== "string" || !sesion.csrfToken) {
            // Rechaza los datos que no cumplen esta validación.
            throw new ErrorAPI("No se pudo obtener el token de sesión.", 200, "json");
        }
        csrfToken = sesion.csrfToken;
        revisionSesion++;
        pedidoSesion = null;
        return sesion;
    }

    // La UI espera este método antes de habilitar envíos: token real o rechazo.
    async function prepararEnvios() {
        // Espera un token válido antes de permitir escrituras.
        if (!csrfActivado || csrfToken) return;
        if (!pedidoCsrf) {
            // Comparte la preparación pendiente para no pedir varios tokens simultáneos.
            pedidoCsrf = prepararSesion().finally(() => {
                // Libera la preparación pendiente al terminar, incluso si falló.
                pedidoCsrf = null;
            });
        }
        await pedidoCsrf;
    }

    async function ingresar(datos) {
        // Envía el login y conserva el token renovado por el servidor.
        const resultado = await solicitarJSON("api/login.php", { method: "POST", datos });
        if (!resultado.usuario || typeof resultado.usuario.nombre !== "string" || typeof resultado.usuario.email !== "string") {
            // Rechaza los datos que no cumplen esta validación.
            throw new ErrorAPI("La respuesta de inicio de sesión es inválida.", 200, "json");
        }
        // El contrato AE4 rota el token junto con el identificador de sesión.
        csrfToken = typeof resultado.csrfToken === "string" && resultado.csrfToken ? resultado.csrfToken : null;
        revisionSesion++;
        pedidoSesion = null;
        if (csrfActivado && !csrfToken) {
            // Rechaza los datos que no cumplen esta validación.
            throw new ErrorAPI("No se pudo renovar el token de sesión.", 200, "json");
        }
        return resultado;
    }

    async function cerrarSesion() {
        // Solicita el cierre de sesión y descarta el token autenticado.
        const resultado = await solicitarJSON("api/logout.php", { method: "POST", datos: {} });
        csrfToken = null;
        revisionSesion++;
        pedidoSesion = null;
        // Conserva el logout realizado aunque falle preparar la nueva sesión anónima.
        return resultado;
    }

    async function guardarMovimiento(datos) {
        // Crea un movimiento e invalida el listado almacenado en memoria.
        const resultado = await solicitarJSON("api/mis_movimientos.php", { method: "POST", datos, privada: true });
        pedidoSesion = null;
        return resultado;
    }

    async function modificarMovimiento(id, method, datos) {
        // Edita o elimina evitando operaciones simultáneas sobre el mismo movimiento.
        if (!Number.isSafeInteger(id) || id <= 0) throw new ErrorAPI("El movimiento no es válido.", 0, "entrada");
        // El bloqueo sobrevive a salir y volver a la vista durante un envío.
        if (movimientosPendientes.has(id)) throw new ErrorAPI("Hay una operación pendiente para este movimiento. Esperá y actualizá el listado antes de reintentar.", 0, "entrada");
        movimientosPendientes.add(id);
        try {
            // Ejecuta la operación y permite tratar sus errores.
            const resultado = await solicitarJSON("api/mis_movimientos.php?id=" + id, { method, datos, privada: true });
            pedidoSesion = null;
            return resultado;
        } finally {
            // Restablece los controles y el estado al finalizar la operación.
            movimientosPendientes.delete(id);
        }
    }

    return {
        solicitarJSON, consultarSesion, prepararSesion, prepararEnvios, ingresar, cerrarSesion, guardarMovimiento,
        editarMovimiento: (id, datos) => modificarMovimiento(id, "PUT", datos),
        eliminarMovimiento: id => modificarMovimiento(id, "DELETE")
    };
})();
