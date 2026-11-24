// Estado de sesión y formulario compartido: el envío continúa en js/api.js.
const NipinSesion = (() => { // Inicializa NipinSesion.
    // Coordina la identidad visible y la limpieza de datos privados.
    const caja = document.querySelector('#sesion'); // Localiza '#sesion' en el HTML para controlar ese elemento.
    const mensaje = document.querySelector('#mensaje-sesion') || document.createElement('p'); // Localiza '#mensaje-sesion' en el HTML para controlar ese elemento.
    if (caja && !mensaje.id) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        // Crea el contenedor accesible de errores si falta en el documento.
        mensaje.id = 'mensaje-sesion'; // Actualiza mensaje.id.
        mensaje.className = 'mensaje error'; // Actualiza mensaje.className.
        mensaje.setAttribute('role', 'alert'); // Actualiza role: función accesible del elemento.
        caja.after(mensaje); // Inserta los elementos construidos en la estructura del documento.
    } // Finaliza este bloque.
    let usuario = null; // Inicializa la variable usuario: identidad del usuario.
    let revision = 0; // Inicializa la variable revision: versión usada para descartar respuestas anteriores.
    let errorConsulta = false; // Inicializa la variable errorConsulta: si falló la consulta de identidad.

    function mostrar() { // Define mostrar con sus entradas y el resultado que devuelve.
        // Actualiza la presentación con los datos recibidos.
        if (!caja) return; // Actualiza la presentación con los datos recibidos.
        caja.querySelector('#sesion-ingresar').hidden = Boolean(usuario); // Localiza '#sesion-ingresar' en el HTML para controlar ese elemento.
        caja.querySelector('#sesion-usuario').hidden = !usuario; // Localiza '#sesion-usuario' en el HTML para controlar ese elemento.
        caja.querySelector('#sesion-salir').hidden = !usuario; // Localiza '#sesion-salir' en el HTML para controlar ese elemento.
        caja.querySelector('#sesion-nombre').textContent = usuario ? usuario.nombre : ''; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
    } // Finaliza este bloque.

    function establecer(nuevoUsuario, { conservarBorrador = false } = {}) { // Actualiza la identidad visible y limpia datos de la sesión anterior.
        // Cambia la cuenta visible y limpia los datos de la sesión anterior.
        revision++; // Incrementa versión usada para descartar respuestas anteriores en uno.
        usuario = nuevoUsuario; // Actualiza identidad del usuario.
        errorConsulta = false; // Actualiza si falló la consulta de identidad.
        mensaje.textContent = ''; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        if (document.querySelector('#resumen')) NipinResumen.limpiar(nuevoUsuario); // Localiza '#resumen' en el HTML para controlar ese elemento.
        if (document.querySelector('#form-login')) NipinAcceso.limpiar(); // Localiza '#form-login' en el HTML para controlar ese elemento.
        if (document.querySelector('#form-movimiento')) NipinRegistro.cambiarSesion(nuevoUsuario, conservarBorrador); // Localiza '#form-movimiento' en el HTML para controlar ese elemento.
        if (document.querySelector('#vista-movimientos')) NipinListado.limpiar(nuevoUsuario); // Localiza '#vista-movimientos' en el HTML para controlar ese elemento.
        if (document.querySelector('#vista-categorias')) NipinCategorias.limpiar(nuevoUsuario); // Localiza '#vista-categorias' en el HTML para controlar ese elemento.
        mostrar(); // Llama a mostrar con los datos indicados.
    } // Finaliza este bloque.

    async function consultar(recargar = false) { // Define consultar con sus entradas y el resultado que devuelve.
        // Consulta la identidad e ignora respuestas de una sesión anterior.
        const consulta = revision; // Inicializa la variable consulta: consulta preparada.
        let sesion; // Declara la variable sesion: datos de sesión recibidos de PHP.
        try { // Intenta la operación; catch manejará sus posibles errores.
            // Ejecuta la operación y permite tratar sus errores.
            sesion = await NipinAPI.consultarSesion(recargar); // Comparte la consulta privada a api/mis_movimientos.php.
        } catch (error) { // Recibe el fallo y permite responder sin continuar como si hubiera éxito.
            // Informa el fallo sin sustituir el resultado por un éxito.
            if (consulta === revision) { // Informa el fallo sin sustituir el resultado por un éxito.
                // Mantiene el resultado sólo para la vista o sesión vigente.
                errorConsulta = true; // Actualiza si falló la consulta de identidad.
                mensaje.textContent = error.message; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
            } // Finaliza este bloque.
            throw error; // Interrumpe el recorrido y comunica el error al código que llamó.
        } // Finaliza este bloque.
        if (consulta !== revision) return null; // Respuesta anterior a login/logout.
        if (errorConsulta) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            // Limpia el error de una consulta anterior que ya se recuperó.
            errorConsulta = false; // Actualiza si falló la consulta de identidad.
            mensaje.textContent = ''; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        } // Finaliza este bloque.
        if (usuario && usuario.email !== sesion?.usuario?.email) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            // Ajusta los datos según la identidad de la sesión comprobada.
            establecer(sesion ? sesion.usuario : null, { conservarBorrador: !sesion }); // Llama a establecer con los datos indicados.
        } // Finaliza este bloque.
        else { // Ejecuta la alternativa cuando no se cumple la condición anterior.
            // Ajusta los datos según la identidad de la sesión comprobada.
            usuario = sesion ? sesion.usuario : null; // Actualiza identidad del usuario.
            mostrar(); // Llama a mostrar con los datos indicados.
        } // Finaliza este bloque.
        return sesion; // Devuelve datos de sesión recibidos de PHP al código que llamó.
    } // Finaliza este bloque.

    if (caja) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        // Conecta el botón de cierre con la limpieza de la sesión.
        const salir = caja.querySelector('#sesion-salir'); // Localiza '#sesion-salir' en el HTML para controlar ese elemento.
        salir.addEventListener('click', async () => { // Registra la acción que se ejecuta al recibir click.
            // Procesa la acción del control y actualiza su estado.
            if (salir.disabled) return; // Procesa la acción del control y actualiza su estado.
            salir.disabled = true; // Habilita o bloquea el control según el estado de la operación.
            errorConsulta = false; // Actualiza si falló la consulta de identidad.
            mensaje.textContent = 'Cerrando sesión…'; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
            try { // Intenta la operación; catch manejará sus posibles errores.
                // Ejecuta la operación y permite tratar sus errores.
                await NipinAPI.cerrarSesion(); // Envía POST a api/logout.php y descarta el token autenticado.
                establecer(null); // Llama a establecer con los datos indicados.
                mensaje.textContent = ''; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
                if (document.querySelector('#contenido')) { // Localiza '#contenido' en el HTML para controlar ese elemento.
                    // Vuelve a Inicio después del cierre de sesión.
                    NipinNavegacion.ir('inicio', { reemplazar: true, recargar: true }); // Continúa en js/navegacion.js: cambia la vista sin recargar el documento.
                    // Prepara un token anónimo después de cerrar la sesión autenticada.
                    await NipinAPI.prepararEnvios(); // Continúa en js/api.js: obtiene el token antes de habilitar envíos.
                } else location.href = 'index.html'; // Ejecuta la alternativa cuando no se cumple la condición anterior.
            } catch (error) { // Recibe el fallo y permite responder sin continuar como si hubiera éxito.
                // Informa el fallo sin sustituir el resultado por un éxito.
                mensaje.textContent = error.message; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
            } finally { // Ejecuta la limpieza final aunque la operación haya fallado.
                // Restablece los controles y el estado al finalizar la operación.
                salir.disabled = false; // Habilita o bloquea el control según el estado de la operación.
            } // Finaliza este bloque.
        }); // Cierra la función de respuesta y su registro o llamada.
    } // Finaliza este bloque.
    mostrar(); // Permite acceder también si la primera consulta falla por red.
    return { consultar, establecer, esUsuario: email => usuario?.email === email }; // Devuelve las funciones o datos públicos al código que llamó.
})(); // Ejecuta el módulo y conserva sus funciones públicas.

if (document.querySelector('#sesion')) { // Localiza '#sesion' en el HTML para controlar ese elemento.
    // Ajusta los datos según la identidad de la sesión comprobada.
    NipinSesion.consultar().catch(() => { // Maneja el rechazo de la operación asíncrona.
        // Finaliza este callback sin acciones adicionales.
        }); // El módulo ya muestra el error.
} // Finaliza este bloque.

// Reutiliza alta y edición con controles, estado y borradores independientes.
function crearFormularioMovimiento({ form, avisoSesion, estado, reintentar, prefijo = '', alGuardar = null, alNoDisponible = null, alSesionVencida = null }) { // Construye el formulario reutilizado para alta y edición.
    // Prepara controles, cálculos y eventos reutilizables para alta y edición.
    const elemento = id => form.querySelector('#' + prefijo + id); // Localiza '#' + prefijo + id en el HTML para controlar ese elemento.
    const campos = Object.fromEntries(['descripcion', 'monto', 'fecha', 'categoria', 'pago', 'cuotas', 'comentario'].map(id => [id, elemento(id)])); // Inicializa la variable campos: campos del movimiento.
    const radios = [...form.querySelectorAll('input[type="radio"]')]; // Localiza 'input[type="radio"]' en el HTML para controlar ese elemento.
    const controles = [...form.querySelectorAll('input, select, textarea, button')]; // Localiza 'input, select, textarea, button' en el HTML para controlar ese elemento.
    const filaCuotas = elemento('fila-cuotas'); // Inicializa filaCuotas.
    const mensaje = elemento('mensaje'); // Inicializa la variable mensaje: texto o contenedor de retroalimentación.
    // El catálogo textual ya existente en el HTML coincide con el anexo 8.
    const categorias = Object.fromEntries([...campos.categoria.querySelectorAll('optgroup')].map(grupo => [grupo.dataset.tipo, new Set([...grupo.querySelectorAll('option')].map(opcion => opcion.value))])); // Localiza 'optgroup' en el HTML para controlar ese elemento.
    const medios = [...campos.pago.options].map(opcion => opcion.value).filter(Boolean); // Inicializa medios.
    const cuotasPermitidas = new Set([...campos.cuotas.options].map(opcion => Number(opcion.value))); // Inicializa cuotasPermitidas.
    let tarifas = null, pedidoTarifas = null; // Inicializa la variable tarifas: descuentos e intereses configurados.
    let activa = false, preparado = false, enviando = false; // Inicializa la variable activa: estado de la vista actual.
    let entrada = 0, revisionDatos = 0; // Inicializa la variable entrada: datos recibidos para validar.
    let propietario = null, pendiente = null; // Inicializa la variable propietario: cuenta asociada al formulario.
    let original = null; // Inicializa original.

    function tipoSeleccionado() { // Define tipoSeleccionado con sus entradas y el resultado que devuelve.
        // Obtiene el tipo de movimiento seleccionado en los botones de opción.
        return radios.find(radio => radio.checked)?.value || ''; // Devuelve radios.find(radio => radio.checked)?.value || '' al código que llamó.
    } // Finaliza este bloque.

    function fechaHoy() { // Define fechaHoy con sus entradas y el resultado que devuelve.
        // Obtiene la fecha local en formato año-mes-día.
        const ahora = new Date(); // Inicializa ahora.
        return new Date(ahora - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 10); // Devuelve new Date(ahora - ahora.getTimezoneOffset() * 60000).toISOString().sli… al código que llamó.
    } // Finaliza este bloque.

    function formatearPesos(valor) { // Define formatearPesos con sus entradas y el resultado que devuelve.
        // Presenta un importe en pesos con los decimales necesarios.
        const decimales = Number.isInteger(valor) ? 0 : 2; // Inicializa decimales.
        return (valor < 0 ? '-$' : '$') + Math.abs(valor).toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }); // Devuelve (valor < 0 ? '-$' : '$') + Math.abs(valor).toLocaleString('es-AR', { … al código que llamó.
    } // Finaliza este bloque.

    function montoValido() { // Define montoValido con sus entradas y el resultado que devuelve.
        // Comprueba que el monto sea positivo y tenga como máximo dos decimales.
        const monto = Number(campos.monto.value); // Inicializa la variable monto: importe original del movimiento.
        return /^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(campos.monto.value) && Number.isFinite(monto) && monto > 0 && monto <= 999999999.99; // Devuelve /^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(campos.monto.value) && Numbe… al código que llamó.
    } // Finaliza este bloque.

    function calcular() { // Define calcular con sus entradas y el resultado que devuelve.
        // Calcula la vista previa del total y las cuotas con las tarifas cargadas.
        const vacio = { subtotal: 0, ajuste: 0, total: 0, cuotas: 1, valorCuota: 0 }; // Inicializa vacio.
        if (!montoValido()) return vacio; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        const monto = Number(campos.monto.value); // Inicializa la variable monto: importe original del movimiento.
        const sinAjuste = { subtotal: monto, ajuste: 0, total: monto, cuotas: 1, valorCuota: monto }; // Inicializa sinAjuste.
        if (tipoSeleccionado() === 'ingreso') return sinAjuste; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        if (!tarifas || !Object.hasOwn(tarifas.medios_pago, campos.pago.value)) return sinAjuste; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        const esCredito = campos.pago.value === 'Tarjeta de crédito'; // Actualiza el valor visible del campo del formulario.
        const cuotas = esCredito ? Number(campos.cuotas.value) : 1; // Inicializa la variable cuotas: cantidad de cuotas.
        if (!cuotasPermitidas.has(cuotas)) return vacio; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        // Calcula en centavos para redondear importes sin errores binarios.
        const centavos = Math.round(monto * 100); // Inicializa centavos.
        const descuento = Math.round(tarifas.medios_pago[campos.pago.value].descuento * 100); // Inicializa la variable descuento: tasa de descuento del medio de pago.
        const interes = esCredito ? Math.round(tarifas.cuotas[cuotas] * 100) : 0; // Inicializa la variable interes: tasa de interés de las cuotas.
        const totalCentavos = Math.floor((centavos * (100 - descuento) * (100 + interes) + 5000) / 10000); // Inicializa totalCentavos.
        return { subtotal: monto, ajuste: (totalCentavos - centavos) / 100, total: totalCentavos / 100, cuotas, valorCuota: Math.floor((totalCentavos + cuotas / 2) / cuotas) / 100 }; // Devuelve las funciones o datos públicos al código que llamó.
    } // Finaliza este bloque.

    function bloquear(bloqueado) { // Define bloquear con sus entradas y el resultado que devuelve.
        // Habilita o bloquea los controles durante la operación.
        controles.forEach(control => { // Ejecuta la función indicada para cada elemento de la lista.
            // Actualiza la disponibilidad de los controles afectados.
            control.disabled = bloqueado; // Habilita o bloquea el control según el estado de la operación.
        }); // Cierra la función de respuesta y su registro o llamada.
        if (!bloqueado) actualizarResultado(); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
    } // Finaliza este bloque.

    function actualizarResultado() { // Define actualizarResultado con sus entradas y el resultado que devuelve.
        // Ajusta categorías, cuotas e importes de la vista previa.
        const tipo = tipoSeleccionado(); // Inicializa la variable tipo: tipo de movimiento o error según el contexto.
        campos.categoria.querySelectorAll('optgroup').forEach(grupo => { // Localiza 'optgroup' en el HTML para controlar ese elemento.
            // Oculta y deshabilita categorías de otro tipo de movimiento.
            grupo.hidden = grupo.dataset.tipo !== tipo; // Muestra u oculta el elemento según el estado actual.
            grupo.disabled = grupo.hidden; // Habilita o bloquea el control según el estado de la operación.
        }); // Cierra la función de respuesta y su registro o llamada.
        if (!categorias[tipo]?.has(campos.categoria.value)) campos.categoria.value = ''; // Actualiza el valor visible del campo del formulario.
        const credito = tipo === 'gasto' && campos.pago.value === 'Tarjeta de crédito'; // Actualiza el valor visible del campo del formulario.
        filaCuotas.hidden = !credito; // Muestra u oculta el elemento según el estado actual.
        campos.cuotas.disabled = !credito || !preparado || enviando; // Habilita o bloquea el control según el estado de la operación.
        if (!credito) campos.cuotas.value = '1'; // Actualiza el valor visible del campo del formulario.
        const r = calcular(); // Inicializa r.
        elemento('res-subtotal').textContent = formatearPesos(r.subtotal); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        elemento('res-ajuste').textContent = (r.ajuste > 0 ? '+' : '') + formatearPesos(r.ajuste); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        elemento('res-total').textContent = formatearPesos(r.total); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        elemento('res-cuota').textContent = formatearPesos(r.valorCuota); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        elemento('res-cuota-linea').hidden = r.cuotas <= 1; // Muestra u oculta el elemento según el estado actual.
    } // Finaliza este bloque.

    function mostrarMensaje(texto, tipo, control = null) { // Actualiza el mensaje y su anuncio para lectores de pantalla.
        // Muestra el resultado y enfoca el mensaje o el campo con error.
        mensaje.textContent = texto; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        mensaje.className = 'mensaje ' + tipo; // Actualiza mensaje.className.
        mensaje.setAttribute('role', tipo === 'error' ? 'alert' : 'status'); // Actualiza role: función accesible del elemento.
        mensaje.setAttribute('aria-live', tipo === 'error' ? 'assertive' : 'polite'); // Actualiza aria-live: prioridad del anuncio para lectores de pantalla.
        if (activa && texto && tipo) (control || mensaje).focus(); // Lleva el foco al control para continuar con teclado.
    } // Finaliza este bloque.

    function reiniciar() { // Define reiniciar con sus entradas y el resultado que devuelve.
        // Restablece el formulario, la fecha y los importes de vista previa.
        form.reset(); // Restaura los valores iniciales del formulario.
        campos.fecha.value = fechaHoy(); // Actualiza el valor visible del campo del formulario.
        mostrarMensaje('', ''); // Llama a mostrarMensaje con los datos indicados.
        actualizarResultado(); // Llama a actualizarResultado con los datos indicados.
    } // Finaliza este bloque.

    function cambiarSesion(usuario, conservarBorrador = false) { // Define cambiarSesion con sus entradas y el resultado que devuelve.
        // Descarta datos privados y conserva sólo el borrador permitido de la misma cuenta.
        if (prefijo) conservarBorrador = false; // Descarta datos privados y conserva sólo el borrador permitido de la misma cuenta.
        if (conservarBorrador && propietario) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            // Conserva el borrador asociado a la cuenta propietaria.
            pendiente = { usuario: propietario, tipo: tipoSeleccionado(), campos: Object.fromEntries(Object.entries(campos).map(([id, control]) => [id, control.value])) }; // Actualiza operación pendiente del formulario.
        } else if (!conservarBorrador && (!usuario || pendiente?.usuario !== usuario.email)) pendiente = null; // Ejecuta la alternativa cuando no se cumple la condición anterior.
        revisionDatos++; // Incrementa versión de los datos para descartar respuestas antiguas en uno.
        original = null; // Actualiza original.
        propietario = null; // Actualiza cuenta asociada al formulario.
        preparado = false; // Actualiza disponibilidad de los datos previos al envío.
        enviando = false; // Actualiza estado del envío del formulario.
        reiniciar(); // Llama a reiniciar con los datos indicados.
        bloquear(true); // Llama a bloquear con los datos indicados.
        form.hidden = true; // Muestra u oculta el elemento según el estado actual.
        form.setAttribute('aria-busy', 'false'); // Actualiza aria-busy: estado de carga para tecnología de asistencia.
        if (!prefijo) avisoSesion.hidden = false; // Muestra u oculta el elemento según el estado actual.
        estado.textContent = ''; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        reintentar.hidden = true; // Muestra u oculta el elemento según el estado actual.
    } // Finaliza este bloque.

    async function cargarTarifas() { // Define cargarTarifas con sus entradas y el resultado que devuelve.
        // Carga y valida las tarifas públicas antes de calcular.
        if (!pedidoTarifas) { // Carga y valida las tarifas públicas antes de calcular.
            // Comparte la carga de tarifas y permite reintentar si falla.
            pedidoTarifas = NipinAPI.solicitarJSON('data/tarifas.json').then(datos => { // Prepara HTTP y JSON; luego fetch envía el pedido a la URL indicada.
                // Comprueba las tasas antes de aceptar la tabla de tarifas.
                const porcentajeValido = valor => typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 && valor <= 1 && Number.isInteger(valor * 100); // Inicializa porcentajeValido.
                if (!medios.every(medio => porcentajeValido(datos.medios_pago?.[medio]?.descuento)) || ![...cuotasPermitidas].every(cuotas => porcentajeValido(datos.cuotas?.[cuotas]))) throw new Error('La tabla de tarifas es inválida.'); // Interrumpe el recorrido y comunica el error al código que llamó.
                tarifas = datos; // Actualiza descuentos e intereses configurados.
            }).catch(error => { // Maneja el rechazo de la operación asíncrona.
                // Libera la carga fallida para permitir otro intento explícito.
                pedidoTarifas = null; throw error; // Interrumpe el recorrido y comunica el error al código que llamó.
            }); // Cierra la función de respuesta y su registro o llamada.
        } // Finaliza este bloque.
        await pedidoTarifas; // Espera que termine la operación asíncrona antes de continuar.
    } // Finaliza este bloque.

    async function entrar(movimiento = null, cuenta = null) { // Define entrar con sus entradas y el resultado que devuelve.
        // Activa la vista y prepara sus datos antes de habilitar controles.
        if (prefijo && movimiento) original = { ...movimiento }; // Activa la vista y prepara sus datos antes de habilitar controles.
        activa = true; // Actualiza estado de la vista actual.
        const intento = ++entrada; // Inicializa intento.
        preparado = false; // Actualiza disponibilidad de los datos previos al envío.
        bloquear(true); // Llama a bloquear con los datos indicados.
        form.hidden = true; // Muestra u oculta el elemento según el estado actual.
        avisoSesion.hidden = true; // Muestra u oculta el elemento según el estado actual.
        reintentar.hidden = true; // Muestra u oculta el elemento según el estado actual.
        estado.textContent = 'Verificando sesión y cargando formulario…'; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
        try { // Intenta la operación; catch manejará sus posibles errores.
            // Ejecuta la operación y permite tratar sus errores.
            const sesion = await NipinSesion.consultar(true); // Inicializa la variable sesion: datos de sesión recibidos de PHP.
            if (!activa || intento !== entrada) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            if (!sesion) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                // Ajusta los datos según la identidad de la sesión comprobada.
                if (propietario) cambiarSesion(null, true); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                avisoSesion.hidden = false; // Muestra u oculta el elemento según el estado actual.
                estado.textContent = 'Iniciá sesión para registrar un movimiento.'; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
                return; // Sale de esta función sin continuar con las instrucciones siguientes.
            } // Finaliza este bloque.
            if (prefijo && (!original || (cuenta && cuenta !== sesion.usuario.email))) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            if (propietario && propietario !== sesion.usuario.email) cambiarSesion(sesion.usuario); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            propietario = sesion.usuario.email; // Actualiza cuenta asociada al formulario.
            const revision = revisionDatos; // Inicializa la variable revision: versión usada para descartar respuestas anteriores.
            await Promise.all([cargarTarifas(), NipinAPI.prepararEnvios()]); // Espera el token CSRF antes de permitir POST, PUT o DELETE.
            if (!activa || intento !== entrada || revision !== revisionDatos) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            if (pendiente?.usuario === propietario) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                // Restaura los valores de los controles correspondientes.
                radios.forEach(radio => { // Ejecuta la función indicada para cada elemento de la lista.
                    // Restaura los valores de los controles correspondientes.
                    radio.checked = radio.value === pendiente.tipo; // Actualiza el valor visible del campo del formulario.
                }); // Cierra la función de respuesta y su registro o llamada.
                Object.entries(pendiente.campos).forEach(([id, valor]) => { // Ejecuta la función indicada para cada elemento de la lista.
                    // Restaura los valores de los controles correspondientes.
                    campos[id].value = valor; // Actualiza el valor visible del campo del formulario.
                }); // Cierra la función de respuesta y su registro o llamada.
                pendiente = null; // Actualiza operación pendiente del formulario.
            } // Finaliza este bloque.
            if (prefijo) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                // Restaura los valores de los controles correspondientes.
                radios.forEach(radio => { // Ejecuta la función indicada para cada elemento de la lista.
                    // Restaura los valores de los controles correspondientes.
                    radio.checked = radio.value === original.tipo; // Actualiza el valor visible del campo del formulario.
                }); // Cierra la función de respuesta y su registro o llamada.
                Object.entries(campos).forEach(([id, control]) => { // Ejecuta la función indicada para cada elemento de la lista.
                    // Restaura los valores de los controles correspondientes.
                    control.value = original[id === 'pago' ? 'medioPago' : id] ?? ''; // Actualiza el valor visible del campo del formulario.
                }); // Cierra la función de respuesta y su registro o llamada.
            } // Finaliza este bloque.
            preparado = true; // Actualiza disponibilidad de los datos previos al envío.
            form.hidden = false; // Muestra u oculta el elemento según el estado actual.
            avisoSesion.hidden = true; // Muestra u oculta el elemento según el estado actual.
            estado.textContent = ''; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
            bloquear(enviando); // Llama a bloquear con los datos indicados.
            if (prefijo) campos.descripcion.focus(); // Lleva el foco al control para continuar con teclado.
        } catch (error) { // Recibe el fallo y permite responder sin continuar como si hubiera éxito.
            // Informa el fallo sin sustituir el resultado por un éxito.
            if (!activa || intento !== entrada) return; // Informa el fallo sin sustituir el resultado por un éxito.
            estado.textContent = 'No se pudo preparar el formulario. ' + error.message; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
            reintentar.hidden = false; // Muestra u oculta el elemento según el estado actual.
        } // Finaliza este bloque.
    } // Finaliza este bloque.

    function validar() { // Define validar con sus entradas y el resultado que devuelve.
        // Comprueba los campos y devuelve el primer error con su control.
        const tipo = tipoSeleccionado(); // Inicializa la variable tipo: tipo de movimiento o error según el contexto.
        if (!['ingreso', 'gasto'].includes(tipo)) return ['Seleccioná un tipo de movimiento válido.', radios[0]]; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        const longitud = Array.from(campos.descripcion.value.trim()).length; // Inicializa longitud.
        if (longitud < 1 || longitud > 150) return ['Ingresá una descripción de 1 a 150 caracteres.', campos.descripcion]; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        if (!montoValido()) return ['Ingresá un monto mayor a 0, hasta 999999999,99 y con un máximo de dos decimales.', campos.monto]; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        const fecha = campos.fecha.value; // Inicializa la variable fecha: fecha del movimiento.
        const fechaReal = new Date(fecha + 'T00:00:00Z'); // Inicializa fechaReal.
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < '1900-01-01' || fecha > '2100-12-31' || Number.isNaN(fechaReal.getTime()) || fechaReal.toISOString().slice(0, 10) !== fecha) return ['Seleccioná una fecha real entre 1900 y 2100.', campos.fecha]; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        if (!categorias[tipo].has(campos.categoria.value)) return ['Seleccioná una categoría correspondiente al tipo de movimiento.', campos.categoria]; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        if (!Object.hasOwn(tarifas.medios_pago, campos.pago.value)) return ['Seleccioná un medio de pago válido.', campos.pago]; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        const cuotas = Number(campos.cuotas.value); // Inicializa la variable cuotas: cantidad de cuotas.
        const credito = tipo === 'gasto' && campos.pago.value === 'Tarjeta de crédito'; // Actualiza el valor visible del campo del formulario.
        if (!cuotasPermitidas.has(cuotas) || (!credito && cuotas !== 1)) return ['Seleccioná cuotas válidas: 1, 3, 6 o 12; solo crédito admite más de una.', campos.cuotas]; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        if (Array.from(campos.comentario.value.trim()).length > 500) return ['El comentario puede tener hasta 500 caracteres.', campos.comentario]; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        return null; // Devuelve ausencia de resultado al código que llamó.
    } // Finaliza este bloque.

    form.addEventListener('submit', async evento => { // Registra la acción que se ejecuta al recibir submit.
        // Valida y envía el formulario sin recargar la página.
        evento.preventDefault(); // Evita el envío tradicional del formulario y la recarga completa.
        if (!activa || !preparado || enviando) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        const error = validar(); // Inicializa error.
        if (error) return mostrarMensaje(error[0], 'error', error[1]); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
        const r = calcular(); // Inicializa r.
        const movimiento = { tipo: tipoSeleccionado(), descripcion: campos.descripcion.value.trim(), monto: r.subtotal, fecha: campos.fecha.value, categoria: campos.categoria.value, medioPago: campos.pago.value, cuotas: r.cuotas, comentario: campos.comentario.value.trim() }; // Inicializa la variable movimiento: datos del movimiento.
        const revision = revisionDatos; // Inicializa la variable revision: versión usada para descartar respuestas anteriores.
        enviando = true; // Actualiza estado del envío del formulario.
        bloquear(true); // Llama a bloquear con los datos indicados.
        form.setAttribute('aria-busy', 'true'); // Actualiza aria-busy: estado de carga para tecnología de asistencia.
        mostrarMensaje('Guardando movimiento…', ''); // Llama a mostrarMensaje con los datos indicados.
        try { // Intenta la operación; catch manejará sus posibles errores.
            // Ejecuta la operación y permite tratar sus errores.
            await NipinAPI.prepararEnvios(); // Continúa en js/api.js: obtiene el token antes de habilitar envíos.
            if (revision !== revisionDatos) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            const resultado = original // Inicializa la variable resultado: resultado de la operación.
                ? await NipinAPI.editarMovimiento(original.id, movimiento) // Continúa en js/api.js, editarMovimiento, para comunicarse con PHP.
                : await NipinAPI.guardarMovimiento(movimiento); // Envía POST a api/mis_movimientos.php para crear el movimiento.
            if (revision !== revisionDatos) return; // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            const guardado = resultado.movimiento; // Inicializa guardado.
            if (!guardado || !Number.isInteger(guardado.id) || guardado.id <= 0 || !Number.isFinite(guardado.total) || (original && guardado.id !== original.id)) throw new Error('El servidor no confirmó el movimiento. Revisá tus movimientos antes de reintentar.'); // Interrumpe el recorrido y comunica el error al código que llamó.
            if (original) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                // Aplica el comportamiento específico del formulario de edición.
                await alGuardar(guardado); // Espera que termine la operación asíncrona antes de continuar.
                return; // Sale de esta función sin continuar con las instrucciones siguientes.
            } // Finaliza este bloque.
            reiniciar(); // Llama a reiniciar con los datos indicados.
            mostrarMensaje('Movimiento guardado correctamente. Total: ' + formatearPesos(guardado.total) + '.', 'exito'); // Llama a mostrarMensaje con los datos indicados.
            if (document.querySelector('#resumen')) NipinResumen.actualizarTrasCambio(); // Localiza '#resumen' en el HTML para controlar ese elemento.
        } catch (error) { // Recibe el fallo y permite responder sin continuar como si hubiera éxito.
            // Informa el fallo sin sustituir el resultado por un éxito.
            if (revision !== revisionDatos) return; // Informa el fallo sin sustituir el resultado por un éxito.
            if (error.status === 401) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                // Limpia la sesión vencida y conserva sólo el borrador permitido.
                const enfocar = activa; // Inicializa enfocar.
                NipinSesion.establecer(null, { conservarBorrador: true }); // Continúa en js/app.js: actualiza la identidad visible y limpia las vistas.
                estado.textContent = prefijo ? 'La sesión venció. La edición se descartó.' : 'La sesión venció. Ingresá con la misma cuenta para recuperar tu borrador.'; // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
                if (prefijo) alSesionVencida(); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                if (enfocar) avisoSesion.querySelector('a').focus(); // Lleva el foco al control para continuar con teclado.
                return; // Sale de esta función sin continuar con las instrucciones siguientes.
            } // Finaliza este bloque.
            if (original && error.status === 404) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
                // Aplica el comportamiento específico del formulario de edición.
                await alNoDisponible(); // Espera que termine la operación asíncrona antes de continuar.
                return; // Sale de esta función sin continuar con las instrucciones siguientes.
            } // Finaliza este bloque.
            mostrarMensaje(error.message, 'error'); // Llama a mostrarMensaje con los datos indicados.
        } finally { // Ejecuta la limpieza final aunque la operación haya fallado.
            // Restablece los controles y el estado al finalizar la operación.
            if (revision === revisionDatos) { // Restablece los controles y el estado al finalizar la operación.
                // Mantiene el resultado sólo para la vista o sesión vigente.
                enviando = false; // Actualiza estado del envío del formulario.
                form.setAttribute('aria-busy', 'false'); // Actualiza aria-busy: estado de carga para tecnología de asistencia.
                bloquear(!preparado || !activa); // Llama a bloquear con los datos indicados.
            } // Finaliza este bloque.
        } // Finaliza este bloque.
    }); // Cierra la función de respuesta y su registro o llamada.

    reintentar.addEventListener('click', () => entrar()); // Registra la acción que se ejecuta al recibir click.
    campos.monto.addEventListener('input', actualizarResultado); // Registra la acción que se ejecuta al recibir input.
    campos.monto.addEventListener('change', actualizarResultado); // Registra la acción que se ejecuta al recibir change.
    campos.pago.addEventListener('change', actualizarResultado); // Registra la acción que se ejecuta al recibir change.
    campos.cuotas.addEventListener('change', actualizarResultado); // Registra la acción que se ejecuta al recibir change.
    radios.forEach(radio => radio.addEventListener('change', actualizarResultado)); // Registra la acción que se ejecuta al recibir change.
    reiniciar(); // Llama a reiniciar con los datos indicados.
    bloquear(true); // Llama a bloquear con los datos indicados.
    return { // Devuelve las funciones o datos públicos al código que llamó.
        entrar, cambiarSesion, // Expone estas funciones para utilizarlas desde otros módulos.
        salir() { // Llama a salir con los datos indicados.
            // Desactiva la vista para que las respuestas pendientes no la actualicen.
            activa = false; // Actualiza estado de la vista actual.
            entrada++; // Incrementa datos recibidos para validar en uno.
            preparado = false; // Actualiza disponibilidad de los datos previos al envío.
            if (prefijo) cambiarSesion(null); // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
            bloquear(true); // Llama a bloquear con los datos indicados.
        } // Finaliza este bloque.
    }; // Completa la estructura o llamada iniciada arriba.
} // Finaliza este bloque.

const NipinRegistro = (() => { // Inicializa NipinRegistro.
    // Conecta el formulario de alta con la lógica compartida.
    const form = document.querySelector('#form-movimiento'); // Localiza '#form-movimiento' en el HTML para controlar ese elemento.
    return form ? crearFormularioMovimiento({ form, avisoSesion: document.querySelector('#aviso-sesion'), estado: document.querySelector('#registro-estado'), reintentar: document.querySelector('#registro-reintentar') }) : null; // Localiza '#aviso-sesion' en el HTML para controlar ese elemento.
})(); // Ejecuta el módulo y conserva sus funciones públicas.
