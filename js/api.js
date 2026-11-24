// Conecta las vistas con api/: prepara HTTP, JSON, sesión, CSRF y errores.
const NipinAPI = (() => {
    // Exige protección CSRF para las operaciones de escritura.
    const CSRF_REQUERIDO = true;
    // Inicia csrfActivado: estado del control CSRF.
    let csrfActivado = CSRF_REQUERIDO;
    // Inicia pedidoSesion: consulta de sesión compartida.
    let pedidoSesion = null;
    // Inicia pedidoCsrf: preparación CSRF compartida.
    let pedidoCsrf = null;
    // Inicia revisionSesion: versión del estado de sesión en JavaScript.
    let revisionSesion = 0;
    // Solo en memoria; nunca en localStorage ni en una cookie JS.
    let csrfToken = null;
    // Inicia movimientosPendientes: identificadores que ya tienen una operación pendiente.
    const movimientosPendientes = new Set();

    // Define la clase ErrorAPI.
    class ErrorAPI extends Error {
        // Inicializa el objeto con las dependencias o datos recibidos.
        constructor(mensaje, status = 0, tipo = "http", errores = null) {
            // Inicializa el error base de JavaScript con el mensaje recibido.
            super(mensaje);
            // Identifica la excepción como un error propio de la aplicación.
            this.name = "ErrorAPI";
            // Conserva el código HTTP o 0 cuando no hubo respuesta HTTP.
            this.status = status;
            // Distingue fallos de red, HTTP, JSON, sesión o validación.
            this.tipo = tipo;
            // Conserva los detalles de validación enviados por la API.
            this.errores = errores;
        }
    }

    // Prepara HTTP y JSON; luego fetch envía el pedido a la URL indicada.
    async function solicitarJSON(url, { method = "GET", datos, privada = false } = {}) {
        // Identifica las operaciones que necesitan token CSRF.
        const modifica = ["POST", "PUT", "DELETE"].includes(method);
        // Espera la preparación del token antes de enviar una escritura.
        if (modifica) await prepararEnvios();
        // Recuerda la versión de sesión antes de esperar una respuesta.
        const revision = revisionSesion;
        // Informa que el cliente espera recibir JSON.
        const headers = { Accept: "application/json" };
        // Configura HTTP, cookies del mismo origen y no usar caché.
        const opciones = { method, headers, credentials: "same-origin", cache: "no-store" };
        // Agrega cuerpo JSON sólo si el llamador proporcionó datos.
        if (datos !== undefined) {
            // Indica que el cuerpo enviado contiene JSON.
            headers["Content-Type"] = "application/json";
            // Convierte los datos a texto JSON para el cuerpo HTTP.
            opciones.body = JSON.stringify(datos);
        }
        // Adjunta CSRF únicamente en escrituras con token disponible.
        if (modifica && csrfToken) {
            // Envía el token que validará config/seguridad.php.
            headers["X-CSRF-Token"] = csrfToken;
        }

        // Declara respuesta: respuesta HTTP del servidor.
        let respuesta;
        // Intenta la operación y permite capturar sus errores.
        try {
            // Envía HTTP a la API y espera la respuesta sin bloquear la página.
            respuesta = await fetch(url, opciones);
        // Captura el error para responder de forma controlada.
        } catch (error) {
            // Interrumpe la función y comunica el error.
            throw new ErrorAPI("Error de conexión con el servidor.", 0, "red");
        }

        // Reconoce una sesión vencida sin alterar una sesión posterior.
        if (privada && respuesta.status === 401 && revision === revisionSesion) {
            // Descarta la consulta compartida para que la próxima obtenga datos actuales.
            pedidoSesion = null;
            // Descarta el token si la identidad de la sesión dejó de ser válida.
            if (csrfActivado) csrfToken = null;
        }
        // Descarta el token rechazado sin afectar un login posterior.
        if (respuesta.status === 403 && csrfActivado && revision === revisionSesion) csrfToken = null;

        // Declara resultado: resultado de la operación.
        let resultado;
        // Intenta la operación y permite capturar sus errores.
        try {
            // Lee el cuerpo JSON y lo convierte en un objeto JavaScript.
            resultado = await respuesta.json();
        // Captura el error para responder de forma controlada.
        } catch (error) {
            // Interrumpe la función y comunica el error.
            throw new ErrorAPI(
                // Elige el mensaje según haya fallado el JSON o el estado HTTP.
                respuesta.ok ? "El servidor devolvió una respuesta JSON inválida." : "Error HTTP " + respuesta.status + ".",
                // Conserva el código HTTP recibido, aunque el cuerpo no sea JSON.
                respuesta.status,
                // Clasifica el fallo como formato JSON o respuesta HTTP de error.
                respuesta.ok ? "json" : "http"
            );
        }

        // Rechaza estados HTTP de error o un fallo informado dentro del JSON.
        if (!respuesta.ok || resultado?.estado === "error") {
            // Comprueba que PHP haya enviado un mensaje de texto no vacío.
            const mensaje = typeof resultado?.mensaje === "string" && resultado.mensaje
                // Usa el mensaje de PHP o, si falta, el código HTTP como explicación.
                ? resultado.mensaje : "Error HTTP " + respuesta.status + ".";
            // Interrumpe la función y comunica el error.
            throw new ErrorAPI(mensaje, respuesta.status, respuesta.ok ? "api" : "http", resultado?.errores);
        }
        // Exige una estructura JSON utilizable, en lugar de un valor vacío o escalar.
        if (!resultado || typeof resultado !== "object") {
            // Interrumpe la función y comunica el error.
            throw new ErrorAPI("El servidor devolvió una respuesta JSON inválida.", respuesta.status, "json");
        }
        // Devuelve resultado de la operación al código que llamó.
        return resultado;
    }

    // Comparte la consulta privada a api/mis_movimientos.php.
    function consultarSesion(recargar = false) {
        // Consulta otra vez si no hay un pedido compartido o se pidió recargar.
        if (!pedidoSesion || recargar) {
            // GET privado: api/mis_movimientos.php devuelve la identidad y los movimientos.
            const pedido = solicitarJSON("api/mis_movimientos.php", { privada: true })
                // Maneja el rechazo de la operación asíncrona.
                .catch(error => {
                    // Representa una sesión anónima como ausencia de usuario.
                    if (error.status === 401) return null;
                    // Libera sólo la consulta fallida actual; conserva una consulta posterior.
                    if (pedidoSesion === pedido) pedidoSesion = null;
                    // Interrumpe la función y comunica el error.
                    throw error;
                });
            // Actualiza consulta de sesión compartida.
            pedidoSesion = pedido;
        }
        // Devuelve consulta de sesión compartida al código que llamó.
        return pedidoSesion;
    }

    // Pide api/sesion.php y guarda el token CSRF de la sesión vigente.
    async function prepararSesion() {
        // Recuerda la versión de sesión antes de esperar una respuesta.
        const revision = revisionSesion;
        // Mantiene activada la protección CSRF.
        csrfActivado = true;
        // Descarta el token guardado en JavaScript; no borra $_SESSION.
        csrfToken = null;
        // GET a api/sesion.php: recibe identidad pública y token CSRF.
        const sesion = await solicitarJSON("api/sesion.php");
        // Descarta un token antiguo si hubo login, logout u otra preparación.
        if (revision !== revisionSesion) {
            // Interrumpe la función y comunica el error.
            throw new ErrorAPI("La sesión cambió. Volvé a intentar la operación.", 0, "sesion");
        }
        // Exige que PHP haya devuelto un token de texto no vacío.
        if (typeof sesion.csrfToken !== "string" || !sesion.csrfToken) {
            // Interrumpe la función y comunica el error.
            throw new ErrorAPI("No se pudo obtener el token de sesión.", 200, "json");
        }
        // Guarda el token que solicitarJSON enviará en X-CSRF-Token.
        csrfToken = sesion.csrfToken;
        // Avanza la versión para descartar respuestas de una sesión anterior.
        revisionSesion++;
        // Descarta la consulta compartida para que la próxima obtenga datos actuales.
        pedidoSesion = null;
        // Devuelve el estado a prepararEnvios; la escritura ya puede usar el token.
        return sesion;
    }

    // Espera el token CSRF antes de permitir POST, PUT o DELETE.
    async function prepararEnvios() {
        // Sale si no hace falta preparar CSRF o ya existe un token.
        if (!csrfActivado || csrfToken) return;
        // Inicia la preparación sólo si no hay otra solicitud de token en curso.
        if (!pedidoCsrf) {
            // Comparte el pedido del token y programa su limpieza al finalizar.
            pedidoCsrf = prepararSesion().finally(() => {
                // Libera la preparación CSRF compartida al terminar.
                pedidoCsrf = null;
            });
        }
        // Espera la preparación compartida antes de continuar con la escritura.
        await pedidoCsrf;
    }

    // Envía el login a api/login.php y conserva su token renovado.
    async function ingresar(datos) {
        // POST a api/login.php: PHP consulta UsuarioModel y verifica BCRYPT.
        const resultado = await solicitarJSON("api/login.php", { method: "POST", datos });
        // Exige nombre y correo válidos en la respuesta del login.
        if (!resultado.usuario || typeof resultado.usuario.nombre !== "string" || typeof resultado.usuario.email !== "string") {
            // Interrumpe la función y comunica el error.
            throw new ErrorAPI("La respuesta de inicio de sesión es inválida.", 200, "json");
        }
        // Guarda el token renovado que devuelve api/login.php, si es válido.
        csrfToken = typeof resultado.csrfToken === "string" && resultado.csrfToken ? resultado.csrfToken : null;
        // Avanza la versión para descartar respuestas de una sesión anterior.
        revisionSesion++;
        // Descarta la consulta compartida para que la próxima obtenga datos actuales.
        pedidoSesion = null;
        // Rechaza un login cuya respuesta no permite preparar escrituras seguras.
        if (csrfActivado && !csrfToken) {
            // Interrumpe la función y comunica el error.
            throw new ErrorAPI("No se pudo renovar el token de sesión.", 200, "json");
        }
        // Devuelve resultado de la operación al código que llamó.
        return resultado;
    }

    // Envía POST a api/logout.php y descarta el token autenticado.
    async function cerrarSesion() {
        // POST a api/logout.php: PHP destruye la sesión autenticada.
        const resultado = await solicitarJSON("api/logout.php", { method: "POST", datos: {} });
        // Descarta el token guardado en JavaScript; no borra $_SESSION.
        csrfToken = null;
        // Avanza la versión para descartar respuestas de una sesión anterior.
        revisionSesion++;
        // Descarta la consulta compartida para que la próxima obtenga datos actuales.
        pedidoSesion = null;
        // Devuelve resultado de la operación al código que llamó.
        return resultado;
    }

    // Envía POST a api/mis_movimientos.php para crear el movimiento.
    async function guardarMovimiento(datos) {
        // POST a api/mis_movimientos.php: servicio valida y modelo guarda.
        const resultado = await solicitarJSON("api/mis_movimientos.php", { method: "POST", datos, privada: true });
        // Descarta la consulta compartida para que la próxima obtenga datos actuales.
        pedidoSesion = null;
        // Devuelve resultado de la operación al código que llamó.
        return resultado;
    }

    // Envía PUT o DELETE a api/mis_movimientos.php con el identificador.
    async function modificarMovimiento(id, method, datos) {
        // Interrumpe la función y comunica el error.
        if (!Number.isSafeInteger(id) || id <= 0) throw new ErrorAPI("El movimiento no es válido.", 0, "entrada");
        // Interrumpe la función y comunica el error.
        if (movimientosPendientes.has(id)) throw new ErrorAPI("Hay una operación pendiente para este movimiento. Esperá y actualizá el listado antes de reintentar.", 0, "entrada");
        // Bloquea otra escritura simultánea sobre el mismo movimiento.
        movimientosPendientes.add(id);
        // Intenta la operación y permite capturar sus errores.
        try {
            // Envía PUT o DELETE; MovimientoModel exige que el recurso sea del usuario.
            const resultado = await solicitarJSON("api/mis_movimientos.php?id=" + id, { method, datos, privada: true });
            // Descarta la consulta compartida para que la próxima obtenga datos actuales.
            pedidoSesion = null;
            // Devuelve resultado de la operación al código que llamó.
            return resultado;
        // Limpia el estado, incluso si la operación falló.
        } finally {
            // Libera el identificador aunque la escritura haya fallado.
            movimientosPendientes.delete(id);
        }
    }

    // Devuelve las funciones o datos públicos al código que llamó.
    return {
        // Expone estas funciones HTTP para acceso.js, app.js y los módulos de vista.
        solicitarJSON, consultarSesion, prepararSesion, prepararEnvios, ingresar, cerrarSesion, guardarMovimiento,
        // Ofrece edición mediante PUT usando el mismo control de escrituras.
        editarMovimiento: (id, datos) => modificarMovimiento(id, "PUT", datos),
        // Ofrece eliminación mediante DELETE con el identificador del movimiento.
        eliminarMovimiento: id => modificarMovimiento(id, "DELETE")
    };
})();
