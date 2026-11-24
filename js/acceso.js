// Formularios de index.html: envían registro y login mediante js/api.js.
const NipinAcceso = (() => { // Inicializa NipinAcceso.
    // Conecta los formularios de registro y login con la API.
    const login = document.querySelector("#form-login"); // Localiza "#form-login" en el HTML para controlar ese elemento.
    if (!login) return null; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
    const registro = document.querySelector("#form-registro"); // Localiza "#form-registro" en el HTML para controlar ese elemento.
    const tabIngresar = document.querySelector("#tab-ingresar"); // Localiza "#tab-ingresar" en el HTML para controlar ese elemento.
    const tabCrear = document.querySelector("#tab-crear"); // Localiza "#tab-crear" en el HTML para controlar ese elemento.
    const msgLogin = document.querySelector("#mensaje-login"); // Localiza "#mensaje-login" en el HTML para controlar ese elemento.
    const msgRegistro = document.querySelector("#mensaje-registro"); // Localiza "#mensaje-registro" en el HTML para controlar ese elemento.
    const aviso = document.querySelector("#mensaje-acceso"); // Localiza "#mensaje-acceso" en el HTML para controlar ese elemento.
    const reintentar = document.querySelector("#acceso-reintentar"); // Localiza "#acceso-reintentar" en el HTML para controlar ese elemento.
    const controles = [...login.querySelectorAll("input, button"), ...registro.querySelectorAll("input, button"), tabIngresar, tabCrear]; // Localiza "input, button" en el HTML para controlar ese elemento.
    let ocupado = false; // Inicializa la variable ocupado: estado de operación en curso.
    let preparado = false; // Inicializa la variable preparado: disponibilidad de los datos previos al envío.
    let activa = false; // Inicializa la variable activa: estado de la vista actual.
    let revision = 0; // Inicializa la variable revision: versión usada para descartar respuestas anteriores.

    function bloquear(bloqueado) { // Define bloquear con sus entradas y el resultado que devuelve.
        // Habilita o bloquea los controles durante la operación.
        controles.forEach(control => { // Ejecuta la función indicada para cada elemento de la lista.
            // Actualiza la disponibilidad de los controles afectados.
            control.disabled = bloqueado; // Habilita o bloquea el control según el estado de la operación.
        }); // Cierra la función de respuesta y su registro o llamada.
    } // Finaliza este bloque.

    function mensaje(elemento, texto, tipo = "error") { // Define mensaje con sus entradas y el resultado que devuelve.
        // Actualiza el texto de estado y sus atributos accesibles.
        elemento.textContent = texto; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        elemento.className = "mensaje " + tipo; // Actualiza elemento.className.
    } // Finaliza este bloque.

    function mostrarPestana(ingresar) { // Define mostrarPestana con sus entradas y el resultado que devuelve.
        // Alterna los formularios de acceso y limpia sus contraseñas.
        login.hidden = !ingresar; // Muestra u oculta el elemento según el estado actual.
        registro.hidden = ingresar; // Muestra u oculta el elemento según el estado actual.
        tabIngresar.classList.toggle("secundario", !ingresar); // Ajusta las clases CSS para reflejar el estado visual.
        tabCrear.classList.toggle("secundario", ingresar); // Ajusta las clases CSS para reflejar el estado visual.
        tabIngresar.setAttribute("aria-pressed", String(ingresar)); // Actualiza aria-pressed: propiedad del elemento en el DOM.
        tabCrear.setAttribute("aria-pressed", String(!ingresar)); // Actualiza aria-pressed: propiedad del elemento en el DOM.
        mensaje(msgLogin, ""); // Llama a mensaje con los datos indicados.
        mensaje(msgRegistro, ""); // Llama a mensaje con los datos indicados.
        login.querySelector("#login-pass").value = ""; // Localiza "#login-pass" en el HTML para controlar ese elemento.
        registro.querySelector("#reg-pass").value = ""; // Localiza "#reg-pass" en el HTML para controlar ese elemento.
    } // Finaliza este bloque.

    function limpiar() { // Define limpiar con sus entradas y el resultado que devuelve.
        // Limpia los datos de la vista e invalida las respuestas anteriores.
        login.reset(); // Restaura los valores iniciales del formulario.
        registro.reset(); // Restaura los valores iniciales del formulario.
        mostrarPestana(true); // Llama a mostrarPestana con los datos indicados.
        aviso.textContent = ""; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
    } // Finaliza este bloque.

    async function entrar() { // Define entrar con sus entradas y el resultado que devuelve.
        // Activa la vista y prepara sus datos antes de habilitar controles.
        activa = true; // Actualiza estado de la vista actual.
        if (ocupado) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        const intento = ++revision; // Inicializa intento.
        preparado = false; // Actualiza disponibilidad de los datos previos al envío.
        bloquear(true); // Llama a bloquear con los datos indicados.
        aviso.textContent = "Preparando acceso…"; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        reintentar.hidden = true; // Muestra u oculta el elemento según el estado actual.
        try { // Intenta la operación; catch manejará sus posibles errores.
            // Ejecuta la operación y permite tratar sus errores.
            await NipinAPI.prepararEnvios(); // Continúa en js/api.js: obtiene el token antes de habilitar envíos.
            if (intento !== revision || !activa) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            preparado = true; // Actualiza disponibilidad de los datos previos al envío.
            aviso.textContent = ""; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
            bloquear(false); // Llama a bloquear con los datos indicados.
        } catch (error) { // Recibe el fallo y permite responder sin continuar como si hubiera éxito.
            // Informa el fallo sin sustituir el resultado por un éxito.
            if (intento !== revision || !activa) return; // Informa el fallo sin sustituir el resultado por un éxito.
            aviso.textContent = error.message; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
            reintentar.hidden = false; // Muestra u oculta el elemento según el estado actual.
        } // Finaliza este bloque.
    } // Finaliza este bloque.

    async function enviar(form, elemento, operacion) { // Define enviar con sus entradas y el resultado que devuelve.
        // Ejecuta un envío y restablece los controles al finalizar.
        if (ocupado || !preparado || !activa) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        ocupado = true; // Actualiza estado de operación en curso.
        bloquear(true); // Llama a bloquear con los datos indicados.
        form.setAttribute("aria-busy", "true"); // Actualiza aria-busy: estado de carga para tecnología de asistencia.
        mensaje(elemento, "Enviando…", ""); // Llama a mensaje con los datos indicados.
        try { // Intenta la operación; catch manejará sus posibles errores.
            // Ejecuta la operación y permite tratar sus errores.
            await operacion(); // Espera que termine la operación asíncrona antes de continuar.
            return true; // Devuelve que la comprobación se cumplió.
        } catch (error) { // Recibe el fallo y permite responder sin continuar como si hubiera éxito.
            // Informa el fallo sin sustituir el resultado por un éxito.
            mensaje(elemento, error.message); // Llama a mensaje con los datos indicados.
            if (activa) elemento.focus(); // Lleva el foco al control para continuar con teclado.
            return false; // Devuelve que la comprobación no se cumplió.
        } finally { // Ejecuta la limpieza final aunque la operación haya fallado.
            // Restablece los controles y el estado al finalizar la operación.
            ocupado = false; // Actualiza estado de operación en curso.
            form.setAttribute("aria-busy", "false"); // Actualiza aria-busy: estado de carga para tecnología de asistencia.
            bloquear(!preparado); // Llama a bloquear con los datos indicados.
        } // Finaliza este bloque.
    } // Finaliza este bloque.

    tabIngresar.addEventListener("click", () => mostrarPestana(true)); // Registra la acción que se ejecuta al recibir click.
    tabCrear.addEventListener("click", () => mostrarPestana(false)); // Registra la acción que se ejecuta al recibir click.
    reintentar.addEventListener("click", entrar); // Registra la acción que se ejecuta al recibir click.

    login.addEventListener("submit", evento => { // Registra la acción que se ejecuta al recibir submit.
        // Valida y envía el formulario sin recargar la página.
        evento.preventDefault(); // Evita el envío tradicional del formulario y la recarga completa.
        if (ocupado || !preparado || !activa) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        const email = login.querySelector("#login-email"); // Localiza "#login-email" en el HTML para controlar ese elemento.
        const datos = { email: email.value.trim(), password: login.querySelector("#login-pass").value }; // Localiza "#login-pass" en el HTML para controlar ese elemento.
        if (!datos.email || !email.validity.valid || !datos.password) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            // Informa que faltan credenciales válidas antes de enviarlas.
            mensaje(msgLogin, "Ingresá un correo válido y tu contraseña."); // Llama a mensaje con los datos indicados.
            return; // Sale de esta función sin continuar con las instrucciones siguientes.
        } // Finaliza este bloque.
        enviar(login, msgLogin, async () => { // Llama a enviar con los datos indicados.
            // Autentica la cuenta y vuelve a Inicio con la nueva identidad.
            const resultado = await NipinAPI.ingresar(datos); // Continúa en js/api.js, ingresar, y luego api/login.php.
            NipinSesion.establecer(resultado.usuario); // Continúa en js/app.js: muestra la cuenta y limpia los datos anteriores.
            NipinNavegacion.ir("inicio", { reemplazar: true, recargar: true }); // Continúa en js/navegacion.js: cambia la vista sin recargar el documento.
        }); // Cierra la función de respuesta y su registro o llamada.
    }); // Cierra la función de respuesta y su registro o llamada.

    registro.addEventListener("submit", evento => { // Registra la acción que se ejecuta al recibir submit.
        // Valida y envía el formulario sin recargar la página.
        evento.preventDefault(); // Evita el envío tradicional del formulario y la recarga completa.
        if (ocupado || !preparado || !activa) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        const email = registro.querySelector("#reg-email"); // Localiza "#reg-email" en el HTML para controlar ese elemento.
        const datos = { // Inicializa la variable datos: datos que se van a procesar.
            nombre: registro.querySelector("#reg-nombre").value.trim(), // Localiza "#reg-nombre" en el HTML para controlar ese elemento.
            email: email.value.trim(), // Incluye el correo de la cuenta en esta estructura.
            password: registro.querySelector("#reg-pass").value // Localiza "#reg-pass" en el HTML para controlar ese elemento.
        }; // Completa la estructura o llamada iniciada arriba.
        if (!datos.nombre || Array.from(datos.nombre).length > 100 || !datos.email || datos.email.length > 150 || !email.validity.valid) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            // Rechaza nombre o correo inválidos antes de crear la cuenta.
            mensaje(msgRegistro, "Ingresá tu nombre (hasta 100 caracteres) y un correo válido (hasta 150)."); // Llama a mensaje con los datos indicados.
            return; // Sale de esta función sin continuar con las instrucciones siguientes.
        } // Finaliza este bloque.
        const bytes = new TextEncoder().encode(datos.password).length; // Inicializa bytes.
        if (bytes < 8 || bytes > 72) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            // Rechaza contraseñas fuera del límite de bytes admitido.
            mensaje(msgRegistro, "La contraseña debe tener entre 8 y 72 bytes UTF-8."); // Llama a mensaje con los datos indicados.
            return; // Sale de esta función sin continuar con las instrucciones siguientes.
        } // Finaliza este bloque.
        enviar(registro, msgRegistro, async () => { // Llama a enviar con los datos indicados.
            // Crea la cuenta y prepara el acceso sin iniciar sesión automáticamente.
            await NipinAPI.solicitarJSON("api/registro.php", { method: "POST", datos }); // Prepara HTTP y JSON; luego fetch envía el pedido a la URL indicada.
            registro.reset(); // Restaura los valores iniciales del formulario.
            mostrarPestana(true); // Llama a mostrarPestana con los datos indicados.
            login.querySelector("#login-email").value = datos.email; // Localiza "#login-email" en el HTML para controlar ese elemento.
            mensaje(msgLogin, "Cuenta creada. Ya podés ingresar.", "exito"); // Llama a mensaje con los datos indicados.
        }).then(exito => { // Continúa cuando termina correctamente la operación asíncrona.
            // Los controles vuelven a estar habilitados al terminar enviar().
            if (exito && activa) login.querySelector("#login-email").focus(); // Lleva el foco al control para continuar con teclado.
        }); // Cierra la función de respuesta y su registro o llamada.
    }); // Cierra la función de respuesta y su registro o llamada.

    bloquear(true); // Llama a bloquear con los datos indicados.
    return { // Devuelve las funciones o datos públicos al código que llamó.
        entrar, // Expone estas funciones para utilizarlas desde otros módulos.
        limpiar, // Expone estas funciones para utilizarlas desde otros módulos.
        salir() { // Llama a salir con los datos indicados.
            // Desactiva la vista para que las respuestas pendientes no la actualicen.
            activa = false; // Actualiza estado de la vista actual.
            revision++; // Incrementa versión usada para descartar respuestas anteriores en uno.
            login.querySelector("#login-pass").value = ""; // Localiza "#login-pass" en el HTML para controlar ese elemento.
            registro.querySelector("#reg-pass").value = ""; // Localiza "#reg-pass" en el HTML para controlar ese elemento.
        } // Finaliza este bloque.
    }; // Completa la estructura o llamada iniciada arriba.
})(); // Ejecuta el módulo y conserva sus funciones públicas.
