// Formularios persistentes de la SPA: un evento por formulario y un solo envío.
const NipinAcceso = (() => {
    const login = document.querySelector("#form-login");
    if (!login) return null;
    const registro = document.querySelector("#form-registro");
    const tabIngresar = document.querySelector("#tab-ingresar");
    const tabCrear = document.querySelector("#tab-crear");
    const msgLogin = document.querySelector("#mensaje-login");
    const msgRegistro = document.querySelector("#mensaje-registro");
    const aviso = document.querySelector("#mensaje-acceso");
    const reintentar = document.querySelector("#acceso-reintentar");
    const controles = [...login.querySelectorAll("input, button"), ...registro.querySelectorAll("input, button"), tabIngresar, tabCrear];
    let ocupado = false;
    let preparado = false;
    let activa = false;
    let revision = 0;

    function bloquear(bloqueado) {
        controles.forEach(control => { control.disabled = bloqueado; });
    }

    function mensaje(elemento, texto, tipo = "error") {
        elemento.textContent = texto;
        elemento.className = "mensaje " + tipo;
    }

    function mostrarPestana(ingresar) {
        login.hidden = !ingresar;
        registro.hidden = ingresar;
        tabIngresar.classList.toggle("secundario", !ingresar);
        tabCrear.classList.toggle("secundario", ingresar);
        tabIngresar.setAttribute("aria-pressed", String(ingresar));
        tabCrear.setAttribute("aria-pressed", String(!ingresar));
        mensaje(msgLogin, "");
        mensaje(msgRegistro, "");
        login.querySelector("#login-pass").value = "";
        registro.querySelector("#reg-pass").value = "";
    }

    function limpiar() {
        login.reset();
        registro.reset();
        mostrarPestana(true);
        aviso.textContent = "";
    }

    async function entrar() {
        activa = true;
        if (ocupado) return;
        const intento = ++revision;
        preparado = false;
        bloquear(true);
        aviso.textContent = "Preparando acceso…";
        reintentar.hidden = true;
        try {
            await NipinAPI.prepararEnvios();
            if (intento !== revision || !activa) return;
            preparado = true;
            aviso.textContent = "";
            bloquear(false);
        } catch (error) {
            if (intento !== revision || !activa) return;
            aviso.textContent = error.message;
            reintentar.hidden = false;
        }
    }

    async function enviar(form, elemento, operacion) {
        if (ocupado || !preparado || !activa) return;
        ocupado = true;
        bloquear(true);
        form.setAttribute("aria-busy", "true");
        mensaje(elemento, "Enviando…", "");
        try {
            await operacion();
            return true;
        } catch (error) {
            mensaje(elemento, error.message);
            if (activa) elemento.focus();
            return false;
        } finally {
            ocupado = false;
            form.setAttribute("aria-busy", "false");
            bloquear(!preparado);
        }
    }

    tabIngresar.addEventListener("click", () => mostrarPestana(true));
    tabCrear.addEventListener("click", () => mostrarPestana(false));
    reintentar.addEventListener("click", entrar);

    login.addEventListener("submit", evento => {
        evento.preventDefault();
        if (ocupado || !preparado || !activa) return;
        const email = login.querySelector("#login-email");
        const datos = { email: email.value.trim(), password: login.querySelector("#login-pass").value };
        if (!datos.email || !email.validity.valid || !datos.password) {
            mensaje(msgLogin, "Ingresá un correo válido y tu contraseña.");
            return;
        }
        enviar(login, msgLogin, async () => {
            const resultado = await NipinAPI.ingresar(datos);
            NipinSesion.establecer(resultado.usuario);
            NipinNavegacion.ir("inicio", { reemplazar: true, recargar: true });
        });
    });

    registro.addEventListener("submit", evento => {
        evento.preventDefault();
        if (ocupado || !preparado || !activa) return;
        const email = registro.querySelector("#reg-email");
        const datos = {
            nombre: registro.querySelector("#reg-nombre").value.trim(),
            email: email.value.trim(),
            password: registro.querySelector("#reg-pass").value
        };
        if (!datos.nombre || Array.from(datos.nombre).length > 100 || !datos.email || datos.email.length > 150 || !email.validity.valid) {
            mensaje(msgRegistro, "Ingresá tu nombre (hasta 100 caracteres) y un correo válido (hasta 150).");
            return;
        }
        const bytes = new TextEncoder().encode(datos.password).length;
        if (bytes < 8 || bytes > 72) {
            mensaje(msgRegistro, "La contraseña debe tener entre 8 y 72 bytes UTF-8.");
            return;
        }
        enviar(registro, msgRegistro, async () => {
            await NipinAPI.solicitarJSON("api/registro.php", { method: "POST", datos });
            registro.reset();
            mostrarPestana(true);
            login.querySelector("#login-email").value = datos.email;
            mensaje(msgLogin, "Cuenta creada. Ya podés ingresar.", "exito");
        }).then(exito => {
            // Los controles vuelven a estar habilitados al terminar enviar().
            if (exito && activa) login.querySelector("#login-email").focus();
        });
    });

    bloquear(true);
    return {
        entrar,
        limpiar,
        salir() {
            activa = false;
            revision++;
            login.querySelector("#login-pass").value = "";
            registro.querySelector("#reg-pass").value = "";
        }
    };
})();
