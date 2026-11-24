// Estado de sesión y formulario compartido: el envío continúa en js/api.js.
const NipinSesion = (() => {
    // Localiza '#sesion' en el HTML para controlar ese elemento.
    const caja = document.querySelector('#sesion');
    // Localiza '#mensaje-sesion' en el HTML para controlar ese elemento.
    const mensaje = document.querySelector('#mensaje-sesion') || document.createElement('p');
    // Comprueba esta condición.
    if (caja && !mensaje.id) {
        // Actualiza mensaje.id.
        mensaje.id = 'mensaje-sesion';
        // Actualiza mensaje.className.
        mensaje.className = 'mensaje error';
        // Actualiza role: función accesible del elemento.
        mensaje.setAttribute('role', 'alert');
        // Inserta los elementos construidos en la estructura del documento.
        caja.after(mensaje);
    }
    // Inicia usuario: identidad del usuario.
    let usuario = null;
    // Inicia revision: versión usada para descartar respuestas anteriores.
    let revision = 0;
    // Inicia errorConsulta: si falló la consulta de identidad.
    let errorConsulta = false;

    // Define mostrar con sus entradas y el resultado que devuelve.
    function mostrar() {
        // Actualiza la presentación con los datos recibidos.
        if (!caja) return;
        // Localiza '#sesion-ingresar' en el HTML para controlar ese elemento.
        caja.querySelector('#sesion-ingresar').hidden = Boolean(usuario);
        // Localiza '#sesion-usuario' en el HTML para controlar ese elemento.
        caja.querySelector('#sesion-usuario').hidden = !usuario;
        // Localiza '#sesion-salir' en el HTML para controlar ese elemento.
        caja.querySelector('#sesion-salir').hidden = !usuario;
        // Muestra texto sin interpretarlo como HTML.
        caja.querySelector('#sesion-nombre').textContent = usuario ? usuario.nombre : '';
    }

    // Actualiza la identidad visible y limpia datos de la sesión anterior.
    function establecer(nuevoUsuario, { conservarBorrador = false } = {}) {
        // Incrementa versión usada para descartar respuestas anteriores en uno.
        revision++;
        // Actualiza identidad del usuario.
        usuario = nuevoUsuario;
        // Actualiza si falló la consulta de identidad.
        errorConsulta = false;
        // Muestra texto sin interpretarlo como HTML.
        mensaje.textContent = '';
        // Localiza '#resumen' en el HTML para controlar ese elemento.
        if (document.querySelector('#resumen')) NipinResumen.limpiar(nuevoUsuario);
        // Localiza '#form-login' en el HTML para controlar ese elemento.
        if (document.querySelector('#form-login')) NipinAcceso.limpiar();
        // Localiza '#form-movimiento' en el HTML para controlar ese elemento.
        if (document.querySelector('#form-movimiento')) NipinRegistro.cambiarSesion(nuevoUsuario, conservarBorrador);
        // Localiza '#vista-movimientos' en el HTML para controlar ese elemento.
        if (document.querySelector('#vista-movimientos')) NipinListado.limpiar(nuevoUsuario);
        // Localiza '#vista-categorias' en el HTML para controlar ese elemento.
        if (document.querySelector('#vista-categorias')) NipinCategorias.limpiar(nuevoUsuario);
        // Llama a mostrar con los datos indicados.
        mostrar();
    }

    // Define consultar con sus entradas y el resultado que devuelve.
    async function consultar(recargar = false) {
        // Inicia consulta: consulta preparada.
        const consulta = revision;
        // Declara sesion: datos de sesión recibidos de PHP.
        let sesion;
        // Intenta la operación y permite capturar sus errores.
        try {
            // Comparte la consulta privada a api/mis_movimientos.php.
            sesion = await NipinAPI.consultarSesion(recargar);
        // Captura el error para responder de forma controlada.
        } catch (error) {
            // Informa el fallo sin sustituir el resultado por un éxito.
            if (consulta === revision) {
                // Actualiza si falló la consulta de identidad.
                errorConsulta = true;
                // Muestra texto sin interpretarlo como HTML.
                mensaje.textContent = error.message;
            }
            // Interrumpe la función y comunica el error.
            throw error;
        }
        // Respuesta anterior a login/logout.
        if (consulta !== revision) return null;
        // Comprueba esta condición.
        if (errorConsulta) {
            // Actualiza si falló la consulta de identidad.
            errorConsulta = false;
            // Muestra texto sin interpretarlo como HTML.
            mensaje.textContent = '';
        }
        // Comprueba esta condición.
        if (usuario && usuario.email !== sesion?.usuario?.email) {
            // Llama a establecer con los datos indicados.
            establecer(sesion ? sesion.usuario : null, { conservarBorrador: !sesion });
        }
        // Ejecuta la alternativa cuando no se cumple la condición anterior.
        else {
            // Actualiza identidad del usuario.
            usuario = sesion ? sesion.usuario : null;
            // Llama a mostrar con los datos indicados.
            mostrar();
        }
        // Devuelve datos de sesión recibidos de PHP al código que llamó.
        return sesion;
    }

    // Comprueba esta condición.
    if (caja) {
        // Localiza '#sesion-salir' en el HTML para controlar ese elemento.
        const salir = caja.querySelector('#sesion-salir');
        // Registra la acción que se ejecuta al recibir click.
        salir.addEventListener('click', async () => {
            // Procesa la acción del control y actualiza su estado.
            if (salir.disabled) return;
            // Habilita o bloquea el control según el estado de la operación.
            salir.disabled = true;
            // Actualiza si falló la consulta de identidad.
            errorConsulta = false;
            // Muestra texto sin interpretarlo como HTML.
            mensaje.textContent = 'Cerrando sesión…';
            // Intenta la operación y permite capturar sus errores.
            try {
                // Envía POST a api/logout.php y descarta el token autenticado.
                await NipinAPI.cerrarSesion();
                // Llama a establecer con los datos indicados.
                establecer(null);
                // Muestra texto sin interpretarlo como HTML.
                mensaje.textContent = '';
                // Localiza '#contenido' en el HTML para controlar ese elemento.
                if (document.querySelector('#contenido')) {
                    // Continúa en js/navegacion.js: cambia la vista sin recargar el documento.
                    NipinNavegacion.ir('inicio', { reemplazar: true, recargar: true });
                    // Continúa en js/api.js: obtiene el token antes de habilitar envíos.
                    await NipinAPI.prepararEnvios();
                // Ejecuta la alternativa cuando no se cumple la condición anterior.
                } else location.href = 'index.html';
            // Captura el error para responder de forma controlada.
            } catch (error) {
                // Muestra texto sin interpretarlo como HTML.
                mensaje.textContent = error.message;
            // Limpia el estado, incluso si la operación falló.
            } finally {
                // Habilita o bloquea el control según el estado de la operación.
                salir.disabled = false;
            }
        });
    }
    // Permite acceder también si la primera consulta falla por red.
    mostrar();
    // Devuelve las funciones o datos públicos al código que llamó.
    return { consultar, establecer, esUsuario: email => usuario?.email === email };
})();

// Localiza '#sesion' en el HTML para controlar ese elemento.
if (document.querySelector('#sesion')) {
    // Maneja el rechazo de la operación asíncrona.
    NipinSesion.consultar().catch(() => {
        });
}

// Construye el formulario reutilizado para alta y edición.
function crearFormularioMovimiento({ form, avisoSesion, estado, reintentar, prefijo = '', alGuardar = null, alNoDisponible = null, alSesionVencida = null }) {
    // Localiza '#' + prefijo + id en el HTML para controlar ese elemento.
    const elemento = id => form.querySelector('#' + prefijo + id);
    // Inicia campos: campos del movimiento.
    const campos = Object.fromEntries(['descripcion', 'monto', 'fecha', 'categoria', 'pago', 'cuotas', 'comentario'].map(id => [id, elemento(id)]));
    // Localiza 'input[type="radio"]' en el HTML para controlar ese elemento.
    const radios = [...form.querySelectorAll('input[type="radio"]')];
    // Localiza 'input, select, textarea, button' en el HTML para controlar ese elemento.
    const controles = [...form.querySelectorAll('input, select, textarea, button')];
    // Inicializa filaCuotas.
    const filaCuotas = elemento('fila-cuotas');
    // Inicia mensaje: texto o contenedor de retroalimentación.
    const mensaje = elemento('mensaje');
    // Localiza 'optgroup' en el HTML para controlar ese elemento.
    const categorias = Object.fromEntries([...campos.categoria.querySelectorAll('optgroup')].map(grupo => [grupo.dataset.tipo, new Set([...grupo.querySelectorAll('option')].map(opcion => opcion.value))]));
    // Inicializa medios.
    const medios = [...campos.pago.options].map(opcion => opcion.value).filter(Boolean);
    // Inicializa cuotasPermitidas.
    const cuotasPermitidas = new Set([...campos.cuotas.options].map(opcion => Number(opcion.value)));
    // Inicia tarifas: descuentos e intereses configurados.
    let tarifas = null, pedidoTarifas = null;
    // Inicia activa: estado de la vista actual.
    let activa = false, preparado = false, enviando = false;
    // Inicia entrada: datos recibidos para validar.
    let entrada = 0, revisionDatos = 0;
    // Inicia propietario: cuenta asociada al formulario.
    let propietario = null, pendiente = null;
    // Inicializa original.
    let original = null;

    // Define tipoSeleccionado con sus entradas y el resultado que devuelve.
    function tipoSeleccionado() {
        // Devuelve radios.find(radio => radio.checked)?.value || '' al código que llamó.
        return radios.find(radio => radio.checked)?.value || '';
    }

    // Define fechaHoy con sus entradas y el resultado que devuelve.
    function fechaHoy() {
        // Obtiene la fecha local en formato año-mes-día.
        const ahora = new Date();
        // Devuelve new Date(ahora - ahora.getTimezoneOffset() * 60000).toISOString().sli… al código que llamó.
        return new Date(ahora - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }

    // Define formatearPesos con sus entradas y el resultado que devuelve.
    function formatearPesos(valor) {
        // Presenta un importe en pesos con los decimales necesarios.
        const decimales = Number.isInteger(valor) ? 0 : 2;
        // Devuelve (valor < 0 ? '-$' : '$') + Math.abs(valor).toLocaleString('es-AR', { … al código que llamó.
        return (valor < 0 ? '-$' : '$') + Math.abs(valor).toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
    }

    // Define montoValido con sus entradas y el resultado que devuelve.
    function montoValido() {
        // Inicia monto: importe original del movimiento.
        const monto = Number(campos.monto.value);
        // Devuelve /^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(campos.monto.value) && Numbe… al código que llamó.
        return /^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(campos.monto.value) && Number.isFinite(monto) && monto > 0 && monto <= 999999999.99;
    }

    // Define calcular con sus entradas y el resultado que devuelve.
    function calcular() {
        // Calcula la vista previa del total y las cuotas con las tarifas cargadas.
        const vacio = { subtotal: 0, ajuste: 0, total: 0, cuotas: 1, valorCuota: 0 };
        // Comprueba esta condición.
        if (!montoValido()) return vacio;
        // Inicia monto: importe original del movimiento.
        const monto = Number(campos.monto.value);
        // Inicializa sinAjuste.
        const sinAjuste = { subtotal: monto, ajuste: 0, total: monto, cuotas: 1, valorCuota: monto };
        // Comprueba esta condición.
        if (tipoSeleccionado() === 'ingreso') return sinAjuste;
        // Comprueba esta condición.
        if (!tarifas || !Object.hasOwn(tarifas.medios_pago, campos.pago.value)) return sinAjuste;
        // Actualiza el valor visible del campo del formulario.
        const esCredito = campos.pago.value === 'Tarjeta de crédito';
        // Inicia cuotas: cantidad de cuotas.
        const cuotas = esCredito ? Number(campos.cuotas.value) : 1;
        // Comprueba esta condición.
        if (!cuotasPermitidas.has(cuotas)) return vacio;
        // Calcula en centavos para redondear importes sin errores binarios.
        const centavos = Math.round(monto * 100);
        // Inicia descuento: tasa de descuento del medio de pago.
        const descuento = Math.round(tarifas.medios_pago[campos.pago.value].descuento * 100);
        // Inicia interes: tasa de interés de las cuotas.
        const interes = esCredito ? Math.round(tarifas.cuotas[cuotas] * 100) : 0;
        // Inicializa totalCentavos.
        const totalCentavos = Math.floor((centavos * (100 - descuento) * (100 + interes) + 5000) / 10000);
        // Devuelve las funciones o datos públicos al código que llamó.
        return { subtotal: monto, ajuste: (totalCentavos - centavos) / 100, total: totalCentavos / 100, cuotas, valorCuota: Math.floor((totalCentavos + cuotas / 2) / cuotas) / 100 };
    }

    // Define bloquear con sus entradas y el resultado que devuelve.
    function bloquear(bloqueado) {
        // Ejecuta la función indicada para cada elemento de la lista.
        controles.forEach(control => {
            // Habilita o bloquea el control según el estado de la operación.
            control.disabled = bloqueado;
        });
        // Comprueba esta condición.
        if (!bloqueado) actualizarResultado();
    }

    // Define actualizarResultado con sus entradas y el resultado que devuelve.
    function actualizarResultado() {
        // Inicia tipo: tipo de movimiento o error según el contexto.
        const tipo = tipoSeleccionado();
        // Localiza 'optgroup' en el HTML para controlar ese elemento.
        campos.categoria.querySelectorAll('optgroup').forEach(grupo => {
            // Muestra u oculta el elemento según el estado actual.
            grupo.hidden = grupo.dataset.tipo !== tipo;
            // Habilita o bloquea el control según el estado de la operación.
            grupo.disabled = grupo.hidden;
        });
        // Actualiza el valor visible del campo del formulario.
        if (!categorias[tipo]?.has(campos.categoria.value)) campos.categoria.value = '';
        // Actualiza el valor visible del campo del formulario.
        const credito = tipo === 'gasto' && campos.pago.value === 'Tarjeta de crédito';
        // Muestra u oculta el elemento según el estado actual.
        filaCuotas.hidden = !credito;
        // Habilita o bloquea el control según el estado de la operación.
        campos.cuotas.disabled = !credito || !preparado || enviando;
        // Actualiza el valor visible del campo del formulario.
        if (!credito) campos.cuotas.value = '1';
        // Inicializa r.
        const r = calcular();
        // Muestra texto sin interpretarlo como HTML.
        elemento('res-subtotal').textContent = formatearPesos(r.subtotal);
        // Muestra texto sin interpretarlo como HTML.
        elemento('res-ajuste').textContent = (r.ajuste > 0 ? '+' : '') + formatearPesos(r.ajuste);
        // Muestra texto sin interpretarlo como HTML.
        elemento('res-total').textContent = formatearPesos(r.total);
        // Muestra texto sin interpretarlo como HTML.
        elemento('res-cuota').textContent = formatearPesos(r.valorCuota);
        // Muestra u oculta el elemento según el estado actual.
        elemento('res-cuota-linea').hidden = r.cuotas <= 1;
    }

    // Actualiza el mensaje y su anuncio para lectores de pantalla.
    function mostrarMensaje(texto, tipo, control = null) {
        // Muestra texto sin interpretarlo como HTML.
        mensaje.textContent = texto;
        // Actualiza mensaje.className.
        mensaje.className = 'mensaje ' + tipo;
        // Actualiza role: función accesible del elemento.
        mensaje.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
        // Actualiza aria-live: prioridad del anuncio para lectores de pantalla.
        mensaje.setAttribute('aria-live', tipo === 'error' ? 'assertive' : 'polite');
        // Lleva el foco al control.
        if (activa && texto && tipo) (control || mensaje).focus();
    }

    // Define reiniciar con sus entradas y el resultado que devuelve.
    function reiniciar() {
        // Restaura los valores iniciales del formulario.
        form.reset();
        // Actualiza el valor visible del campo del formulario.
        campos.fecha.value = fechaHoy();
        // Llama a mostrarMensaje con los datos indicados.
        mostrarMensaje('', '');
        // Llama a actualizarResultado con los datos indicados.
        actualizarResultado();
    }

    // Define cambiarSesion con sus entradas y el resultado que devuelve.
    function cambiarSesion(usuario, conservarBorrador = false) {
        // Descarta datos privados y conserva sólo el borrador permitido de la misma cuenta.
        if (prefijo) conservarBorrador = false;
        // Comprueba esta condición.
        if (conservarBorrador && propietario) {
            // Actualiza operación pendiente del formulario.
            pendiente = { usuario: propietario, tipo: tipoSeleccionado(), campos: Object.fromEntries(Object.entries(campos).map(([id, control]) => [id, control.value])) };
        // Ejecuta la alternativa cuando no se cumple la condición anterior.
        } else if (!conservarBorrador && (!usuario || pendiente?.usuario !== usuario.email)) pendiente = null;
        // Incrementa versión de los datos para descartar respuestas antiguas en uno.
        revisionDatos++;
        // Actualiza original.
        original = null;
        // Actualiza cuenta asociada al formulario.
        propietario = null;
        // Actualiza disponibilidad de los datos previos al envío.
        preparado = false;
        // Actualiza estado del envío del formulario.
        enviando = false;
        // Llama a reiniciar con los datos indicados.
        reiniciar();
        // Llama a bloquear con los datos indicados.
        bloquear(true);
        // Muestra u oculta el elemento según el estado actual.
        form.hidden = true;
        // Actualiza aria-busy: estado de carga para tecnología de asistencia.
        form.setAttribute('aria-busy', 'false');
        // Muestra u oculta el elemento según el estado actual.
        if (!prefijo) avisoSesion.hidden = false;
        // Muestra texto sin interpretarlo como HTML.
        estado.textContent = '';
        // Muestra u oculta el elemento según el estado actual.
        reintentar.hidden = true;
    }

    // Define cargarTarifas con sus entradas y el resultado que devuelve.
    async function cargarTarifas() {
        // Carga y valida las tarifas públicas antes de calcular.
        if (!pedidoTarifas) {
            // Prepara HTTP y JSON; luego fetch envía el pedido a la URL indicada.
            pedidoTarifas = NipinAPI.solicitarJSON('data/tarifas.json').then(datos => {
                // Comprueba las tasas antes de aceptar la tabla de tarifas.
                const porcentajeValido = valor => typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 && valor <= 1 && Number.isInteger(valor * 100);
                // Interrumpe la función y comunica el error.
                if (!medios.every(medio => porcentajeValido(datos.medios_pago?.[medio]?.descuento)) || ![...cuotasPermitidas].every(cuotas => porcentajeValido(datos.cuotas?.[cuotas]))) throw new Error('La tabla de tarifas es inválida.');
                // Actualiza descuentos e intereses configurados.
                tarifas = datos;
            // Maneja el rechazo de la operación asíncrona.
            }).catch(error => {
                // Interrumpe la función y comunica el error.
                pedidoTarifas = null; throw error;
            });
        }
        // Espera que termine la operación asíncrona antes de continuar.
        await pedidoTarifas;
    }

    // Define entrar con sus entradas y el resultado que devuelve.
    async function entrar(movimiento = null, cuenta = null) {
        // Activa la vista y prepara sus datos antes de habilitar controles.
        if (prefijo && movimiento) original = { ...movimiento };
        // Actualiza estado de la vista actual.
        activa = true;
        // Inicializa intento.
        const intento = ++entrada;
        // Actualiza disponibilidad de los datos previos al envío.
        preparado = false;
        // Llama a bloquear con los datos indicados.
        bloquear(true);
        // Muestra u oculta el elemento según el estado actual.
        form.hidden = true;
        // Muestra u oculta el elemento según el estado actual.
        avisoSesion.hidden = true;
        // Muestra u oculta el elemento según el estado actual.
        reintentar.hidden = true;
        // Muestra texto sin interpretarlo como HTML.
        estado.textContent = 'Verificando sesión y cargando formulario…';
        // Intenta la operación y permite capturar sus errores.
        try {
            // Inicia sesion: datos de sesión recibidos de PHP.
            const sesion = await NipinSesion.consultar(true);
            // Comprueba esta condición.
            if (!activa || intento !== entrada) return;
            // Comprueba esta condición.
            if (!sesion) {
                // Ajusta los datos según la identidad de la sesión comprobada.
                if (propietario) cambiarSesion(null, true);
                // Muestra u oculta el elemento según el estado actual.
                avisoSesion.hidden = false;
                // Muestra texto sin interpretarlo como HTML.
                estado.textContent = 'Iniciá sesión para registrar un movimiento.';
                // Sale de esta función sin continuar con las instrucciones siguientes.
                return;
            }
            // Comprueba esta condición.
            if (prefijo && (!original || (cuenta && cuenta !== sesion.usuario.email))) return;
            // Comprueba esta condición.
            if (propietario && propietario !== sesion.usuario.email) cambiarSesion(sesion.usuario);
            // Actualiza cuenta asociada al formulario.
            propietario = sesion.usuario.email;
            // Inicia revision: versión usada para descartar respuestas anteriores.
            const revision = revisionDatos;
            // Espera el token CSRF antes de permitir POST, PUT o DELETE.
            await Promise.all([cargarTarifas(), NipinAPI.prepararEnvios()]);
            // Comprueba esta condición.
            if (!activa || intento !== entrada || revision !== revisionDatos) return;
            // Comprueba esta condición.
            if (pendiente?.usuario === propietario) {
                // Ejecuta la función indicada para cada elemento de la lista.
                radios.forEach(radio => {
                    // Actualiza el valor visible del campo del formulario.
                    radio.checked = radio.value === pendiente.tipo;
                });
                // Ejecuta la función indicada para cada elemento de la lista.
                Object.entries(pendiente.campos).forEach(([id, valor]) => {
                    // Actualiza el valor visible del campo del formulario.
                    campos[id].value = valor;
                });
                // Actualiza operación pendiente del formulario.
                pendiente = null;
            }
            // Comprueba esta condición.
            if (prefijo) {
                // Ejecuta la función indicada para cada elemento de la lista.
                radios.forEach(radio => {
                    // Actualiza el valor visible del campo del formulario.
                    radio.checked = radio.value === original.tipo;
                });
                // Ejecuta la función indicada para cada elemento de la lista.
                Object.entries(campos).forEach(([id, control]) => {
                    // Actualiza el valor visible del campo del formulario.
                    control.value = original[id === 'pago' ? 'medioPago' : id] ?? '';
                });
            }
            // Actualiza disponibilidad de los datos previos al envío.
            preparado = true;
            // Muestra u oculta el elemento según el estado actual.
            form.hidden = false;
            // Muestra u oculta el elemento según el estado actual.
            avisoSesion.hidden = true;
            // Muestra texto sin interpretarlo como HTML.
            estado.textContent = '';
            // Llama a bloquear con los datos indicados.
            bloquear(enviando);
            // Lleva el foco al control.
            if (prefijo) campos.descripcion.focus();
        // Captura el error para responder de forma controlada.
        } catch (error) {
            // Informa el fallo sin sustituir el resultado por un éxito.
            if (!activa || intento !== entrada) return;
            // Muestra texto sin interpretarlo como HTML.
            estado.textContent = 'No se pudo preparar el formulario. ' + error.message;
            // Muestra u oculta el elemento según el estado actual.
            reintentar.hidden = false;
        }
    }

    // Define validar con sus entradas y el resultado que devuelve.
    function validar() {
        // Inicia tipo: tipo de movimiento o error según el contexto.
        const tipo = tipoSeleccionado();
        // Comprueba esta condición.
        if (!['ingreso', 'gasto'].includes(tipo)) return ['Seleccioná un tipo de movimiento válido.', radios[0]];
        // Inicializa longitud.
        const longitud = Array.from(campos.descripcion.value.trim()).length;
        // Comprueba esta condición.
        if (longitud < 1 || longitud > 150) return ['Ingresá una descripción de 1 a 150 caracteres.', campos.descripcion];
        // Comprueba esta condición.
        if (!montoValido()) return ['Ingresá un monto mayor a 0, hasta 999999999,99 y con un máximo de dos decimales.', campos.monto];
        // Inicia fecha: fecha del movimiento.
        const fecha = campos.fecha.value;
        // Inicializa fechaReal.
        const fechaReal = new Date(fecha + 'T00:00:00Z');
        // Comprueba esta condición.
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < '1900-01-01' || fecha > '2100-12-31' || Number.isNaN(fechaReal.getTime()) || fechaReal.toISOString().slice(0, 10) !== fecha) return ['Seleccioná una fecha real entre 1900 y 2100.', campos.fecha];
        // Comprueba esta condición.
        if (!categorias[tipo].has(campos.categoria.value)) return ['Seleccioná una categoría correspondiente al tipo de movimiento.', campos.categoria];
        // Comprueba esta condición.
        if (!Object.hasOwn(tarifas.medios_pago, campos.pago.value)) return ['Seleccioná un medio de pago válido.', campos.pago];
        // Inicia cuotas: cantidad de cuotas.
        const cuotas = Number(campos.cuotas.value);
        // Actualiza el valor visible del campo del formulario.
        const credito = tipo === 'gasto' && campos.pago.value === 'Tarjeta de crédito';
        // Comprueba esta condición.
        if (!cuotasPermitidas.has(cuotas) || (!credito && cuotas !== 1)) return ['Seleccioná cuotas válidas: 1, 3, 6 o 12; solo crédito admite más de una.', campos.cuotas];
        // Comprueba esta condición.
        if (Array.from(campos.comentario.value.trim()).length > 500) return ['El comentario puede tener hasta 500 caracteres.', campos.comentario];
        // Devuelve ausencia de resultado al código que llamó.
        return null;
    }

    // Registra la acción que se ejecuta al recibir submit.
    form.addEventListener('submit', async evento => {
        // Evita el envío tradicional del formulario y la recarga completa.
        evento.preventDefault();
        // Comprueba esta condición.
        if (!activa || !preparado || enviando) return;
        // Inicializa error.
        const error = validar();
        // Comprueba esta condición.
        if (error) return mostrarMensaje(error[0], 'error', error[1]);
        // Inicializa r.
        const r = calcular();
        // Inicia movimiento: datos del movimiento.
        const movimiento = { tipo: tipoSeleccionado(), descripcion: campos.descripcion.value.trim(), monto: r.subtotal, fecha: campos.fecha.value, categoria: campos.categoria.value, medioPago: campos.pago.value, cuotas: r.cuotas, comentario: campos.comentario.value.trim() };
        // Inicia revision: versión usada para descartar respuestas anteriores.
        const revision = revisionDatos;
        // Actualiza estado del envío del formulario.
        enviando = true;
        // Llama a bloquear con los datos indicados.
        bloquear(true);
        // Actualiza aria-busy: estado de carga para tecnología de asistencia.
        form.setAttribute('aria-busy', 'true');
        // Llama a mostrarMensaje con los datos indicados.
        mostrarMensaje('Guardando movimiento…', '');
        // Intenta la operación y permite capturar sus errores.
        try {
            // Continúa en js/api.js: obtiene el token antes de habilitar envíos.
            await NipinAPI.prepararEnvios();
            // Comprueba esta condición.
            if (revision !== revisionDatos) return;
            // Inicia resultado: resultado de la operación.
            const resultado = original
                // Continúa en js/api.js, editarMovimiento, para comunicarse con PHP.
                ? await NipinAPI.editarMovimiento(original.id, movimiento)
                // Envía POST a api/mis_movimientos.php para crear el movimiento.
                : await NipinAPI.guardarMovimiento(movimiento);
            // Comprueba esta condición.
            if (revision !== revisionDatos) return;
            // Inicializa guardado.
            const guardado = resultado.movimiento;
            // Interrumpe la función y comunica el error.
            if (!guardado || !Number.isInteger(guardado.id) || guardado.id <= 0 || !Number.isFinite(guardado.total) || (original && guardado.id !== original.id)) throw new Error('El servidor no confirmó el movimiento. Revisá tus movimientos antes de reintentar.');
            // Comprueba esta condición.
            if (original) {
                // Espera que termine la operación asíncrona antes de continuar.
                await alGuardar(guardado);
                // Sale de esta función sin continuar con las instrucciones siguientes.
                return;
            }
            // Llama a reiniciar con los datos indicados.
            reiniciar();
            // Llama a mostrarMensaje con los datos indicados.
            mostrarMensaje('Movimiento guardado correctamente. Total: ' + formatearPesos(guardado.total) + '.', 'exito');
            // Localiza '#resumen' en el HTML para controlar ese elemento.
            if (document.querySelector('#resumen')) NipinResumen.actualizarTrasCambio();
        // Captura el error para responder de forma controlada.
        } catch (error) {
            // Informa el fallo sin sustituir el resultado por un éxito.
            if (revision !== revisionDatos) return;
            // Comprueba esta condición.
            if (error.status === 401) {
                // Limpia la sesión vencida y conserva sólo el borrador permitido.
                const enfocar = activa;
                // Continúa en js/app.js: actualiza la identidad visible y limpia las vistas.
                NipinSesion.establecer(null, { conservarBorrador: true });
                // Muestra texto sin interpretarlo como HTML.
                estado.textContent = prefijo ? 'La sesión venció. La edición se descartó.' : 'La sesión venció. Ingresá con la misma cuenta para recuperar tu borrador.';
                // Comprueba esta condición.
                if (prefijo) alSesionVencida();
                // Lleva el foco al control.
                if (enfocar) avisoSesion.querySelector('a').focus();
                // Sale de esta función sin continuar con las instrucciones siguientes.
                return;
            }
            // Comprueba esta condición.
            if (original && error.status === 404) {
                // Espera que termine la operación asíncrona antes de continuar.
                await alNoDisponible();
                // Sale de esta función sin continuar con las instrucciones siguientes.
                return;
            }
            // Llama a mostrarMensaje con los datos indicados.
            mostrarMensaje(error.message, 'error');
        // Limpia el estado, incluso si la operación falló.
        } finally {
            // Restablece los controles y el estado al finalizar la operación.
            if (revision === revisionDatos) {
                // Actualiza estado del envío del formulario.
                enviando = false;
                // Actualiza aria-busy: estado de carga para tecnología de asistencia.
                form.setAttribute('aria-busy', 'false');
                // Llama a bloquear con los datos indicados.
                bloquear(!preparado || !activa);
            }
        }
    });

    // Registra la acción que se ejecuta al recibir click.
    reintentar.addEventListener('click', () => entrar());
    // Registra la acción que se ejecuta al recibir input.
    campos.monto.addEventListener('input', actualizarResultado);
    // Registra la acción que se ejecuta al recibir change.
    campos.monto.addEventListener('change', actualizarResultado);
    // Registra la acción que se ejecuta al recibir change.
    campos.pago.addEventListener('change', actualizarResultado);
    // Registra la acción que se ejecuta al recibir change.
    campos.cuotas.addEventListener('change', actualizarResultado);
    // Registra la acción que se ejecuta al recibir change.
    radios.forEach(radio => radio.addEventListener('change', actualizarResultado));
    // Llama a reiniciar con los datos indicados.
    reiniciar();
    // Llama a bloquear con los datos indicados.
    bloquear(true);
    // Devuelve las funciones o datos públicos al código que llamó.
    return {
        // Expone estas funciones para utilizarlas desde otros módulos.
        entrar, cambiarSesion,
        // Llama a salir con los datos indicados.
        salir() {
            // Actualiza estado de la vista actual.
            activa = false;
            // Incrementa datos recibidos para validar en uno.
            entrada++;
            // Actualiza disponibilidad de los datos previos al envío.
            preparado = false;
            // Comprueba esta condición.
            if (prefijo) cambiarSesion(null);
            // Llama a bloquear con los datos indicados.
            bloquear(true);
        }
    };
}

// Inicializa NipinRegistro.
const NipinRegistro = (() => {
    // Localiza '#form-movimiento' en el HTML para controlar ese elemento.
    const form = document.querySelector('#form-movimiento');
    // Localiza '#aviso-sesion' en el HTML para controlar ese elemento.
    return form ? crearFormularioMovimiento({ form, avisoSesion: document.querySelector('#aviso-sesion'), estado: document.querySelector('#registro-estado'), reintentar: document.querySelector('#registro-reintentar') }) : null;
})();
