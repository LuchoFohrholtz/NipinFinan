// Conecta las vistas con api/: prepara HTTP, JSON, sesión, CSRF y errores.
const NipinAPI = (() => { // Inicializa NipinAPI.
    // Exige el token real de sesión en todas las escrituras.
    const CSRF_REQUERIDO = true; // Exige protección CSRF para las operaciones de escritura.
    let csrfActivado = CSRF_REQUERIDO; // Inicializa la variable csrfActivado: estado del control CSRF.
    let pedidoSesion = null; // Inicializa la variable pedidoSesion: consulta de sesión compartida.
    let pedidoCsrf = null; // Inicializa la variable pedidoCsrf: preparación CSRF compartida.
    let revisionSesion = 0; // Inicializa la variable revisionSesion: versión del estado de sesión en JavaScript.
    let csrfToken = null; // Solo en memoria; nunca en localStorage ni en una cookie JS.
    const movimientosPendientes = new Set(); // Inicializa la variable movimientosPendientes: identificadores que ya tienen una operación pendiente.

    class ErrorAPI extends Error { // Define la clase ErrorAPI.
        constructor(mensaje, status = 0, tipo = "http", errores = null) { // Inicializa el objeto con las dependencias o datos recibidos.
            // Inicializa el estado de esta instancia.
            super(mensaje); // Inicializa el error base de JavaScript con el mensaje recibido.
            this.name = "ErrorAPI"; // Identifica la excepción como un error propio de la aplicación.
            this.status = status; // Conserva el código HTTP o 0 cuando no hubo respuesta HTTP.
            this.tipo = tipo; // Distingue fallos de red, HTTP, JSON, sesión o validación.
            this.errores = errores; // Conserva los detalles de validación enviados por la API.
        } // Finaliza este bloque.
    } // Finaliza este bloque.

    // Devuelve el JSON del contrato para endpoints y archivos públicos.
    async function solicitarJSON(url, { method = "GET", datos, privada = false } = {}) { // Prepara HTTP y JSON; luego fetch envía el pedido a la URL indicada.
        // Envía HTTP con JSON, cookies y CSRF, y comprueba la respuesta.
        const modifica = ["POST", "PUT", "DELETE"].includes(method); // Identifica las operaciones que necesitan token CSRF.
        if (modifica) await prepararEnvios(); // Espera la preparación del token antes de enviar una escritura.
        const revision = revisionSesion; // Recuerda la versión de sesión antes de esperar una respuesta.
        const headers = { Accept: "application/json" }; // Informa que el cliente espera recibir JSON.
        const opciones = { method, headers, credentials: "same-origin", cache: "no-store" }; // Configura método, cabeceras, cookies del mismo origen y ausencia de caché.
        if (datos !== undefined) { // Agrega cuerpo JSON sólo si el llamador proporcionó datos.
            // Identifica el cuerpo enviado como JSON.
            headers["Content-Type"] = "application/json"; // Indica que el cuerpo enviado contiene JSON.
            opciones.body = JSON.stringify(datos); // Convierte los datos a texto JSON para el cuerpo HTTP.
        } // Finaliza este bloque.
        if (modifica && csrfToken) { // Adjunta CSRF únicamente en escrituras con token disponible.
            // Adjunta el token de sesión a la escritura HTTP.
            headers["X-CSRF-Token"] = csrfToken; // Envía el token que validará config/seguridad.php.
        } // Finaliza este bloque.

        let respuesta; // Declara la variable respuesta: respuesta HTTP del servidor.
        try { // Intenta la operación; catch manejará sus posibles errores.
            // Ejecuta la operación y permite tratar sus errores. Envía la petición HTTP y espera la respuesta del servidor.
            respuesta = await fetch(url, opciones); // Envía HTTP a la API y espera la respuesta sin bloquear la página.
        } catch (error) { // Recibe el fallo y permite responder sin continuar como si hubiera éxito.
            // Informa el fallo sin sustituir el resultado por un éxito.
            throw new ErrorAPI("Error de conexión con el servidor.", 0, "red"); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.

        if (privada && respuesta.status === 401 && revision === revisionSesion) { // Reconoce una sesión vencida sin alterar una sesión posterior.
            // Mantiene el resultado sólo para la vista o sesión vigente.
            pedidoSesion = null; // Descarta la consulta compartida para que la próxima obtenga datos actuales.
            // La identidad pudo vencer: renovar el token antes de otro envío.
            if (csrfActivado) csrfToken = null; // Descarta el token si la identidad de la sesión dejó de ser válida.
        } // Finaliza este bloque.
        // Invalidar también ante un 403 con JSON roto, sin tocar una sesión posterior.
        if (respuesta.status === 403 && csrfActivado && revision === revisionSesion) csrfToken = null; // Descarta el token rechazado sin afectar un login posterior.

        let resultado; // Declara la variable resultado: resultado de la operación.
        try { // Intenta la operación; catch manejará sus posibles errores.
            // Ejecuta la operación y permite tratar sus errores.
            resultado = await respuesta.json(); // Lee el cuerpo JSON y lo convierte en un objeto JavaScript.
        } catch (error) { // Recibe el fallo y permite responder sin continuar como si hubiera éxito.
            // Conservamos el código HTTP incluso si PHP/proxy devuelve HTML.
            throw new ErrorAPI( // Interrumpe el recorrido y comunica el error al código que llamó.
                respuesta.ok ? "El servidor devolvió una respuesta JSON inválida." : "Error HTTP " + respuesta.status + ".", // Elige el mensaje según haya fallado el JSON o el estado HTTP.
                respuesta.status, // Conserva el código HTTP recibido, aunque el cuerpo no sea JSON.
                respuesta.ok ? "json" : "http" // Clasifica el fallo como formato JSON o respuesta HTTP de error.
            ); // Completa la estructura o llamada iniciada arriba.
        } // Finaliza este bloque.

        if (!respuesta.ok || resultado?.estado === "error") { // Rechaza estados HTTP de error o un fallo informado dentro del JSON.
            // Conserva el mensaje de la API o usa el código HTTP como alternativa.
            const mensaje = typeof resultado?.mensaje === "string" && resultado.mensaje // Comprueba que PHP haya enviado un mensaje de texto no vacío.
                ? resultado.mensaje : "Error HTTP " + respuesta.status + "."; // Usa el mensaje de PHP o, si falta, el código HTTP como explicación.
            throw new ErrorAPI(mensaje, respuesta.status, respuesta.ok ? "api" : "http", resultado?.errores); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        if (!resultado || typeof resultado !== "object") { // Exige una estructura JSON utilizable, en lugar de un valor vacío o escalar.
            // Rechaza los datos que no cumplen esta validación.
            throw new ErrorAPI("El servidor devolvió una respuesta JSON inválida.", respuesta.status, "json"); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        return resultado; // Devuelve resultado de la operación al código que llamó.
    } // Finaliza este bloque.

    // Comparte la consulta de sesión y permite recargarla o reintentar ante un fallo.
    function consultarSesion(recargar = false) { // Comparte la consulta privada a api/mis_movimientos.php.
        // Comparte la consulta de movimientos usada para conocer la sesión.
        if (!pedidoSesion || recargar) { // Consulta otra vez si no hay un pedido compartido o se pidió recargar.
            // Devuelve el resultado correspondiente a esta condición.
            const pedido = solicitarJSON("api/mis_movimientos.php", { privada: true }) // GET privado: api/mis_movimientos.php devuelve la identidad y los movimientos.
                .catch(error => { // Maneja el rechazo de la operación asíncrona.
                    // Devuelve el resultado correspondiente a esta condición.
                    if (error.status === 401) return null; // Representa una sesión anónima como ausencia de usuario.
                    if (pedidoSesion === pedido) pedidoSesion = null; // Libera sólo la consulta fallida actual; conserva una consulta posterior.
                    throw error; // Interrumpe el recorrido y comunica el error al código que llamó.
                }); // Cierra la función de respuesta y su registro o llamada.
            pedidoSesion = pedido; // Actualiza consulta de sesión compartida.
        } // Finaliza este bloque.
        return pedidoSesion; // Devuelve consulta de sesión compartida al código que llamó.
    } // Finaliza este bloque.

    // Obtiene el token real antes de habilitar envíos.
    async function prepararSesion() { // Pide api/sesion.php y guarda el token CSRF de la sesión vigente.
        // Obtiene el token del servidor sin reemplazar una sesión posterior.
        const revision = revisionSesion; // Recuerda la versión de sesión antes de esperar una respuesta.
        csrfActivado = true; // Mantiene activada la protección CSRF.
        csrfToken = null; // Descarta el token guardado en JavaScript; no borra $_SESSION.
        const sesion = await solicitarJSON("api/sesion.php"); // GET a api/sesion.php: recibe identidad pública y token CSRF.
        // Una preparación anterior al login/logout no puede reemplazar el token rotado.
        if (revision !== revisionSesion) { // Descarta un token antiguo si hubo login, logout u otra preparación.
            // Rechaza los datos que no cumplen esta validación.
            throw new ErrorAPI("La sesión cambió. Volvé a intentar la operación.", 0, "sesion"); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        if (typeof sesion.csrfToken !== "string" || !sesion.csrfToken) { // Exige que PHP haya devuelto un token de texto no vacío.
            // Rechaza los datos que no cumplen esta validación.
            throw new ErrorAPI("No se pudo obtener el token de sesión.", 200, "json"); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        csrfToken = sesion.csrfToken; // Guarda el token que solicitarJSON enviará en X-CSRF-Token.
        revisionSesion++; // Avanza la versión para descartar respuestas de una sesión anterior.
        pedidoSesion = null; // Descarta la consulta compartida para que la próxima obtenga datos actuales.
        return sesion; // Devuelve el estado a prepararEnvios; la escritura ya puede usar el token.
    } // Finaliza este bloque.

    // La UI espera este método antes de habilitar envíos: token real o rechazo.
    async function prepararEnvios() { // Espera el token CSRF antes de permitir POST, PUT o DELETE.
        // Espera un token válido antes de permitir escrituras.
        if (!csrfActivado || csrfToken) return; // Sale si no hace falta preparar CSRF o ya existe un token.
        if (!pedidoCsrf) { // Inicia la preparación sólo si no hay otra solicitud de token en curso.
            // Comparte la preparación pendiente para no pedir varios tokens simultáneos.
            pedidoCsrf = prepararSesion().finally(() => { // Comparte el pedido del token y programa su limpieza al finalizar.
                // Libera la preparación pendiente al terminar, incluso si falló.
                pedidoCsrf = null; // Libera la preparación CSRF compartida al terminar.
            }); // Cierra la función de respuesta y su registro o llamada.
        } // Finaliza este bloque.
        await pedidoCsrf; // Espera la preparación compartida antes de continuar con la escritura.
    } // Finaliza este bloque.

    async function ingresar(datos) { // Envía el login a api/login.php y conserva su token renovado.
        // Envía el login y conserva el token renovado por el servidor.
        const resultado = await solicitarJSON("api/login.php", { method: "POST", datos }); // POST a api/login.php: PHP consulta UsuarioModel y verifica BCRYPT.
        if (!resultado.usuario || typeof resultado.usuario.nombre !== "string" || typeof resultado.usuario.email !== "string") { // Exige nombre y correo válidos en la respuesta del login.
            // Rechaza los datos que no cumplen esta validación.
            throw new ErrorAPI("La respuesta de inicio de sesión es inválida.", 200, "json"); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        // El contrato AE4 rota el token junto con el identificador de sesión.
        csrfToken = typeof resultado.csrfToken === "string" && resultado.csrfToken ? resultado.csrfToken : null; // Guarda el token renovado que devuelve api/login.php, si es válido.
        revisionSesion++; // Avanza la versión para descartar respuestas de una sesión anterior.
        pedidoSesion = null; // Descarta la consulta compartida para que la próxima obtenga datos actuales.
        if (csrfActivado && !csrfToken) { // Rechaza un login cuya respuesta no permite preparar escrituras seguras.
            // Rechaza los datos que no cumplen esta validación.
            throw new ErrorAPI("No se pudo renovar el token de sesión.", 200, "json"); // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        return resultado; // Devuelve resultado de la operación al código que llamó.
    } // Finaliza este bloque.

    async function cerrarSesion() { // Envía POST a api/logout.php y descarta el token autenticado.
        // Solicita el cierre de sesión y descarta el token autenticado.
        const resultado = await solicitarJSON("api/logout.php", { method: "POST", datos: {} }); // POST a api/logout.php: PHP destruye la sesión autenticada.
        csrfToken = null; // Descarta el token guardado en JavaScript; no borra $_SESSION.
        revisionSesion++; // Avanza la versión para descartar respuestas de una sesión anterior.
        pedidoSesion = null; // Descarta la consulta compartida para que la próxima obtenga datos actuales.
        // Conserva el logout realizado aunque falle preparar la nueva sesión anónima.
        return resultado; // Devuelve resultado de la operación al código que llamó.
    } // Finaliza este bloque.

    async function guardarMovimiento(datos) { // Envía POST a api/mis_movimientos.php para crear el movimiento.
        // Crea un movimiento e invalida el listado almacenado en memoria.
        const resultado = await solicitarJSON("api/mis_movimientos.php", { method: "POST", datos, privada: true }); // POST a api/mis_movimientos.php: servicio valida y modelo guarda.
        pedidoSesion = null; // Descarta la consulta compartida para que la próxima obtenga datos actuales.
        return resultado; // Devuelve resultado de la operación al código que llamó.
    } // Finaliza este bloque.

    async function modificarMovimiento(id, method, datos) { // Envía PUT o DELETE a api/mis_movimientos.php con el identificador.
        // Edita o elimina evitando operaciones simultáneas sobre el mismo movimiento.
        if (!Number.isSafeInteger(id) || id <= 0) throw new ErrorAPI("El movimiento no es válido.", 0, "entrada"); // Interrumpe el recorrido y comunica el error al código que llamó.
        // El bloqueo sobrevive a salir y volver a la vista durante un envío.
        if (movimientosPendientes.has(id)) throw new ErrorAPI("Hay una operación pendiente para este movimiento. Esperá y actualizá el listado antes de reintentar.", 0, "entrada"); // Interrumpe el recorrido y comunica el error al código que llamó.
        movimientosPendientes.add(id); // Bloquea otra escritura simultánea sobre el mismo movimiento.
        try { // Intenta la operación; catch manejará sus posibles errores.
            // Ejecuta la operación y permite tratar sus errores.
            const resultado = await solicitarJSON("api/mis_movimientos.php?id=" + id, { method, datos, privada: true }); // Envía PUT o DELETE; MovimientoModel exige que el recurso sea del usuario.
            pedidoSesion = null; // Descarta la consulta compartida para que la próxima obtenga datos actuales.
            return resultado; // Devuelve resultado de la operación al código que llamó.
        } finally { // Ejecuta la limpieza final aunque la operación haya fallado.
            // Restablece los controles y el estado al finalizar la operación.
            movimientosPendientes.delete(id); // Libera el identificador aunque la escritura haya fallado.
        } // Finaliza este bloque.
    } // Finaliza este bloque.

    return { // Devuelve las funciones o datos públicos al código que llamó.
        solicitarJSON, consultarSesion, prepararSesion, prepararEnvios, ingresar, cerrarSesion, guardarMovimiento, // Expone estas funciones HTTP para acceso.js, app.js y los módulos de vista.
        editarMovimiento: (id, datos) => modificarMovimiento(id, "PUT", datos), // Ofrece edición mediante PUT usando el mismo control de escrituras.
        eliminarMovimiento: id => modificarMovimiento(id, "DELETE") // Ofrece eliminación mediante DELETE con el identificador del movimiento.
    }; // Completa la estructura o llamada iniciada arriba.
})(); // Ejecuta el módulo y conserva sus funciones públicas.
