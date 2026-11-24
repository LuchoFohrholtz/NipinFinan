// Formularios de index.html: envían registro y login mediante js/api.js.
const NipinAcceso = (() => {
    // Localiza "#form-login" en el HTML para controlar ese elemento.
    const login = document.querySelector("#form-login");
    // Comprueba esta condición.
    if (!login) return null;
    // Localiza "#form-registro" en el HTML para controlar ese elemento.
    const registro = document.querySelector("#form-registro");
    // Localiza "#tab-ingresar" en el HTML para controlar ese elemento.
    const tabIngresar = document.querySelector("#tab-ingresar");
    // Localiza "#tab-crear" en el HTML para controlar ese elemento.
    const tabCrear = document.querySelector("#tab-crear");
    // Localiza "#mensaje-login" en el HTML para controlar ese elemento.
    const msgLogin = document.querySelector("#mensaje-login");
    // Localiza "#mensaje-registro" en el HTML para controlar ese elemento.
    const msgRegistro = document.querySelector("#mensaje-registro");
    // Localiza "#mensaje-acceso" en el HTML para controlar ese elemento.
    const aviso = document.querySelector("#mensaje-acceso");
    // Localiza "#acceso-reintentar" en el HTML para controlar ese elemento.
    const reintentar = document.querySelector("#acceso-reintentar");
    // Localiza "input, button" en el HTML para controlar ese elemento.
    const controles = [...login.querySelectorAll("input, button"), ...registro.querySelectorAll("input, button"), tabIngresar, tabCrear];
    // Inicia ocupado: estado de operación en curso.
    let ocupado = false;
    // Inicia preparado: disponibilidad de los datos previos al envío.
    let preparado = false;
    // Inicia activa: estado de la vista actual.
    let activa = false;
    // Inicia revision: versión usada para descartar respuestas anteriores.
    let revision = 0;

    // Define bloquear con sus entradas y el resultado que devuelve.
    function bloquear(bloqueado) {
        // Ejecuta la función indicada para cada elemento de la lista.
        controles.forEach(control => {
            // Habilita o bloquea el control según el estado de la operación.
            control.disabled = bloqueado;
        });
    }

    // Define mensaje con sus entradas y el resultado que devuelve.
    function mensaje(elemento, texto, tipo = "error") {
        // Muestra texto sin interpretarlo como HTML.
        elemento.textContent = texto;
        // Actualiza elemento.className.
        elemento.className = "mensaje " + tipo;
    }

    // Define mostrarPestana con sus entradas y el resultado que devuelve.
    function mostrarPestana(ingresar) {
        // Muestra u oculta el elemento según el estado actual.
        login.hidden = !ingresar;
        // Muestra u oculta el elemento según el estado actual.
        registro.hidden = ingresar;
        // Ajusta las clases CSS para reflejar el estado visual.
        tabIngresar.classList.toggle("secundario", !ingresar);
        // Ajusta las clases CSS para reflejar el estado visual.
        tabCrear.classList.toggle("secundario", ingresar);
        // Actualiza aria-pressed: propiedad del elemento en el DOM.
        tabIngresar.setAttribute("aria-pressed", String(ingresar));
        // Actualiza aria-pressed: propiedad del elemento en el DOM.
        tabCrear.setAttribute("aria-pressed", String(!ingresar));
        // Llama a mensaje con los datos indicados.
        mensaje(msgLogin, "");
        // Llama a mensaje con los datos indicados.
        mensaje(msgRegistro, "");
        // Localiza "#login-pass" en el HTML para controlar ese elemento.
        login.querySelector("#login-pass").value = "";
        // Localiza "#reg-pass" en el HTML para controlar ese elemento.
        registro.querySelector("#reg-pass").value = "";
    }

    // Define limpiar con sus entradas y el resultado que devuelve.
    function limpiar() {
        // Restaura los valores iniciales del formulario.
        login.reset();
        // Restaura los valores iniciales del formulario.
        registro.reset();
        // Llama a mostrarPestana con los datos indicados.
        mostrarPestana(true);
        // Muestra texto sin interpretarlo como HTML.
        aviso.textContent = "";
    }

    // Define entrar con sus entradas y el resultado que devuelve.
    async function entrar() {
        // Actualiza estado de la vista actual.
        activa = true;
        // Comprueba esta condición.
        if (ocupado) return;
        // Inicializa intento.
        const intento = ++revision;
        // Actualiza disponibilidad de los datos previos al envío.
        preparado = false;
        // Llama a bloquear con los datos indicados.
        bloquear(true);
        // Muestra texto sin interpretarlo como HTML.
        aviso.textContent = "Preparando acceso…";
        // Muestra u oculta el elemento según el estado actual.
        reintentar.hidden = true;
        // Intenta la operación y permite capturar sus errores.
        try {
            // Continúa en js/api.js: obtiene el token antes de habilitar envíos.
            await NipinAPI.prepararEnvios();
            // Comprueba esta condición.
            if (intento !== revision || !activa) return;
            // Actualiza disponibilidad de los datos previos al envío.
            preparado = true;
            // Muestra texto sin interpretarlo como HTML.
            aviso.textContent = "";
            // Llama a bloquear con los datos indicados.
            bloquear(false);
        // Captura el error para responder de forma controlada.
        } catch (error) {
            // Informa el fallo sin sustituir el resultado por un éxito.
            if (intento !== revision || !activa) return;
            // Muestra texto sin interpretarlo como HTML.
            aviso.textContent = error.message;
            // Muestra u oculta el elemento según el estado actual.
            reintentar.hidden = false;
        }
    }

    // Define enviar con sus entradas y el resultado que devuelve.
    async function enviar(form, elemento, operacion) {
        // Ejecuta un envío y restablece los controles al finalizar.
        if (ocupado || !preparado || !activa) return;
        // Actualiza estado de operación en curso.
        ocupado = true;
        // Llama a bloquear con los datos indicados.
        bloquear(true);
        // Actualiza aria-busy: estado de carga para tecnología de asistencia.
        form.setAttribute("aria-busy", "true");
        // Llama a mensaje con los datos indicados.
        mensaje(elemento, "Enviando…", "");
        // Intenta la operación y permite capturar sus errores.
        try {
            // Espera que termine la operación asíncrona antes de continuar.
            await operacion();
            // Devuelve que la comprobación se cumplió.
            return true;
        // Captura el error para responder de forma controlada.
        } catch (error) {
            // Llama a mensaje con los datos indicados.
            mensaje(elemento, error.message);
            // Lleva el foco al control.
            if (activa) elemento.focus();
            // Devuelve que la comprobación no se cumplió.
            return false;
        // Limpia el estado, incluso si la operación falló.
        } finally {
            // Actualiza estado de operación en curso.
            ocupado = false;
            // Actualiza aria-busy: estado de carga para tecnología de asistencia.
            form.setAttribute("aria-busy", "false");
            // Llama a bloquear con los datos indicados.
            bloquear(!preparado);
        }
    }

    // Registra la acción que se ejecuta al recibir click.
    tabIngresar.addEventListener("click", () => mostrarPestana(true));
    // Registra la acción que se ejecuta al recibir click.
    tabCrear.addEventListener("click", () => mostrarPestana(false));
    // Registra la acción que se ejecuta al recibir click.
    reintentar.addEventListener("click", entrar);

    // Registra la acción que se ejecuta al recibir submit.
    login.addEventListener("submit", evento => {
        // Evita el envío tradicional del formulario y la recarga completa.
        evento.preventDefault();
        // Comprueba esta condición.
        if (ocupado || !preparado || !activa) return;
        // Localiza "#login-email" en el HTML para controlar ese elemento.
        const email = login.querySelector("#login-email");
        // Localiza "#login-pass" en el HTML para controlar ese elemento.
        const datos = { email: email.value.trim(), password: login.querySelector("#login-pass").value };
        // Comprueba esta condición.
        if (!datos.email || !email.validity.valid || !datos.password) {
            // Llama a mensaje con los datos indicados.
            mensaje(msgLogin, "Ingresá un correo válido y tu contraseña.");
            // Sale de esta función sin continuar con las instrucciones siguientes.
            return;
        }
        // Llama a enviar con los datos indicados.
        enviar(login, msgLogin, async () => {
            // Continúa en js/api.js, ingresar, y luego api/login.php.
            const resultado = await NipinAPI.ingresar(datos);
            // Continúa en js/app.js: muestra la cuenta y limpia los datos anteriores.
            NipinSesion.establecer(resultado.usuario);
            // Continúa en js/navegacion.js: cambia la vista sin recargar el documento.
            NipinNavegacion.ir("inicio", { reemplazar: true, recargar: true });
        });
    });

    // Registra la acción que se ejecuta al recibir submit.
    registro.addEventListener("submit", evento => {
        // Evita el envío tradicional del formulario y la recarga completa.
        evento.preventDefault();
        // Comprueba esta condición.
        if (ocupado || !preparado || !activa) return;
        // Localiza "#reg-email" en el HTML para controlar ese elemento.
        const email = registro.querySelector("#reg-email");
        // Inicia datos: datos que se van a procesar.
        const datos = {
            // Localiza "#reg-nombre" en el HTML para controlar ese elemento.
            nombre: registro.querySelector("#reg-nombre").value.trim(),
            // Incluye el correo de la cuenta.
            email: email.value.trim(),
            // Localiza "#reg-pass" en el HTML para controlar ese elemento.
            password: registro.querySelector("#reg-pass").value
        };
        // Comprueba esta condición.
        if (!datos.nombre || Array.from(datos.nombre).length > 100 || !datos.email || datos.email.length > 150 || !email.validity.valid) {
            // Llama a mensaje con los datos indicados.
            mensaje(msgRegistro, "Ingresá tu nombre (hasta 100 caracteres) y un correo válido (hasta 150).");
            // Sale de esta función sin continuar con las instrucciones siguientes.
            return;
        }
        // Inicializa bytes.
        const bytes = new TextEncoder().encode(datos.password).length;
        // Comprueba esta condición.
        if (bytes < 8 || bytes > 72) {
            // Llama a mensaje con los datos indicados.
            mensaje(msgRegistro, "La contraseña debe tener entre 8 y 72 bytes UTF-8.");
            // Sale de esta función sin continuar con las instrucciones siguientes.
            return;
        }
        // Llama a enviar con los datos indicados.
        enviar(registro, msgRegistro, async () => {
            // Prepara HTTP y JSON; luego fetch envía el pedido a la URL indicada.
            await NipinAPI.solicitarJSON("api/registro.php", { method: "POST", datos });
            // Restaura los valores iniciales del formulario.
            registro.reset();
            // Llama a mostrarPestana con los datos indicados.
            mostrarPestana(true);
            // Localiza "#login-email" en el HTML para controlar ese elemento.
            login.querySelector("#login-email").value = datos.email;
            // Llama a mensaje con los datos indicados.
            mensaje(msgLogin, "Cuenta creada. Ya podés ingresar.", "exito");
        }).then(exito => {
            // Lleva el foco al control.
            if (exito && activa) login.querySelector("#login-email").focus();
        });
    });

    // Llama a bloquear con los datos indicados.
    bloquear(true);
    // Devuelve las funciones o datos públicos al código que llamó.
    return {
        // Expone estas funciones para utilizarlas desde otros módulos.
        entrar,
        // Expone estas funciones para utilizarlas desde otros módulos.
        limpiar,
        // Llama a salir con los datos indicados.
        salir() {
            // Actualiza estado de la vista actual.
            activa = false;
            // Incrementa versión usada para descartar respuestas anteriores en uno.
            revision++;
            // Localiza "#login-pass" en el HTML para controlar ese elemento.
            login.querySelector("#login-pass").value = "";
            // Localiza "#reg-pass" en el HTML para controlar ese elemento.
            registro.querySelector("#reg-pass").value = "";
        }
    };
})();
