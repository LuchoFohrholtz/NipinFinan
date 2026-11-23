// Estado de sesión y formulario compartido: el envío continúa en js/api.js.
const NipinSesion = (() => {
    // Coordina la identidad visible y la limpieza de datos privados.
    const caja = document.querySelector('#sesion');
    const mensaje = document.querySelector('#mensaje-sesion') || document.createElement('p');
    if (caja && !mensaje.id) {
        // Crea el contenedor accesible de errores si falta en el documento.
        mensaje.id = 'mensaje-sesion';
        mensaje.className = 'mensaje error';
        mensaje.setAttribute('role', 'alert');
        caja.after(mensaje);
    }
    let usuario = null;
    let revision = 0;
    let errorConsulta = false;

    function mostrar() {
        // Actualiza la presentación con los datos recibidos.
        if (!caja) return;
        caja.querySelector('#sesion-ingresar').hidden = Boolean(usuario);
        caja.querySelector('#sesion-usuario').hidden = !usuario;
        caja.querySelector('#sesion-salir').hidden = !usuario;
        caja.querySelector('#sesion-nombre').textContent = usuario ? usuario.nombre : '';
    }

    function establecer(nuevoUsuario, { conservarBorrador = false } = {}) {
        // Cambia la cuenta visible y limpia los datos de la sesión anterior.
        revision++;
        usuario = nuevoUsuario;
        errorConsulta = false;
        mensaje.textContent = '';
        if (document.querySelector('#resumen')) NipinResumen.limpiar(nuevoUsuario);
        if (document.querySelector('#form-login')) NipinAcceso.limpiar();
        if (document.querySelector('#form-movimiento')) NipinRegistro.cambiarSesion(nuevoUsuario, conservarBorrador);
        if (document.querySelector('#vista-movimientos')) NipinListado.limpiar(nuevoUsuario);
        if (document.querySelector('#vista-categorias')) NipinCategorias.limpiar(nuevoUsuario);
        mostrar();
    }

    async function consultar(recargar = false) {
        // Consulta la identidad e ignora respuestas de una sesión anterior.
        const consulta = revision;
        let sesion;
        try {
            // Ejecuta la operación y permite tratar sus errores.
            sesion = await NipinAPI.consultarSesion(recargar);
        } catch (error) {
            // Informa el fallo sin sustituir el resultado por un éxito.
            if (consulta === revision) {
                // Mantiene el resultado sólo para la vista o sesión vigente.
                errorConsulta = true;
                mensaje.textContent = error.message;
            }
            throw error;
        }
        if (consulta !== revision) return null; // Respuesta anterior a login/logout.
        if (errorConsulta) {
            // Limpia el error de una consulta anterior que ya se recuperó.
            errorConsulta = false;
            mensaje.textContent = '';
        }
        if (usuario && usuario.email !== sesion?.usuario?.email) {
            // Ajusta los datos según la identidad de la sesión comprobada.
            establecer(sesion ? sesion.usuario : null, { conservarBorrador: !sesion });
        }
        else {
            // Ajusta los datos según la identidad de la sesión comprobada.
            usuario = sesion ? sesion.usuario : null;
            mostrar();
        }
        return sesion;
    }

    if (caja) {
        // Conecta el botón de cierre con la limpieza de la sesión.
        const salir = caja.querySelector('#sesion-salir');
        salir.addEventListener('click', async () => {
            // Procesa la acción del control y actualiza su estado.
            if (salir.disabled) return;
            salir.disabled = true;
            errorConsulta = false;
            mensaje.textContent = 'Cerrando sesión…';
            try {
                // Ejecuta la operación y permite tratar sus errores.
                await NipinAPI.cerrarSesion();
                establecer(null);
                mensaje.textContent = '';
                if (document.querySelector('#contenido')) {
                    // Vuelve a Inicio después del cierre de sesión.
                    NipinNavegacion.ir('inicio', { reemplazar: true, recargar: true });
                    // Prepara un token anónimo después de cerrar la sesión autenticada.
                    await NipinAPI.prepararEnvios();
                } else location.href = 'index.html';
            } catch (error) {
                // Informa el fallo sin sustituir el resultado por un éxito.
                mensaje.textContent = error.message;
            } finally {
                // Restablece los controles y el estado al finalizar la operación.
                salir.disabled = false;
            }
        });
    }
    mostrar(); // Permite acceder también si la primera consulta falla por red.
    return { consultar, establecer, esUsuario: email => usuario?.email === email };
})();

if (document.querySelector('#sesion')) {
    // Ajusta los datos según la identidad de la sesión comprobada.
    NipinSesion.consultar().catch(() => {
        // Finaliza este callback sin acciones adicionales.
        }); // El módulo ya muestra el error.
}

// Reutiliza alta y edición con controles, estado y borradores independientes.
function crearFormularioMovimiento({ form, avisoSesion, estado, reintentar, prefijo = '', alGuardar = null, alNoDisponible = null, alSesionVencida = null }) {
    // Prepara controles, cálculos y eventos reutilizables para alta y edición.
    const elemento = id => form.querySelector('#' + prefijo + id);
    const campos = Object.fromEntries(['descripcion', 'monto', 'fecha', 'categoria', 'pago', 'cuotas', 'comentario'].map(id => [id, elemento(id)]));
    const radios = [...form.querySelectorAll('input[type="radio"]')];
    const controles = [...form.querySelectorAll('input, select, textarea, button')];
    const filaCuotas = elemento('fila-cuotas');
    const mensaje = elemento('mensaje');
    // El catálogo textual ya existente en el HTML coincide con el anexo 8.
    const categorias = Object.fromEntries([...campos.categoria.querySelectorAll('optgroup')].map(grupo => [grupo.dataset.tipo, new Set([...grupo.querySelectorAll('option')].map(opcion => opcion.value))]));
    const medios = [...campos.pago.options].map(opcion => opcion.value).filter(Boolean);
    const cuotasPermitidas = new Set([...campos.cuotas.options].map(opcion => Number(opcion.value)));
    let tarifas = null, pedidoTarifas = null;
    let activa = false, preparado = false, enviando = false;
    let entrada = 0, revisionDatos = 0;
    let propietario = null, pendiente = null;
    let original = null;

    function tipoSeleccionado() {
        // Obtiene el tipo de movimiento seleccionado en los botones de opción.
        return radios.find(radio => radio.checked)?.value || '';
    }

    function fechaHoy() {
        // Obtiene la fecha local en formato año-mes-día.
        const ahora = new Date();
        return new Date(ahora - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }

    function formatearPesos(valor) {
        // Presenta un importe en pesos con los decimales necesarios.
        const decimales = Number.isInteger(valor) ? 0 : 2;
        return (valor < 0 ? '-$' : '$') + Math.abs(valor).toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
    }

    function montoValido() {
        // Comprueba que el monto sea positivo y tenga como máximo dos decimales.
        const monto = Number(campos.monto.value);
        return /^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(campos.monto.value) && Number.isFinite(monto) && monto > 0 && monto <= 999999999.99;
    }

    function calcular() {
        // Calcula la vista previa del total y las cuotas con las tarifas cargadas.
        const vacio = { subtotal: 0, ajuste: 0, total: 0, cuotas: 1, valorCuota: 0 };
        if (!montoValido()) return vacio;
        const monto = Number(campos.monto.value);
        const sinAjuste = { subtotal: monto, ajuste: 0, total: monto, cuotas: 1, valorCuota: monto };
        if (tipoSeleccionado() === 'ingreso') return sinAjuste;
        if (!tarifas || !Object.hasOwn(tarifas.medios_pago, campos.pago.value)) return sinAjuste;
        const esCredito = campos.pago.value === 'Tarjeta de crédito';
        const cuotas = esCredito ? Number(campos.cuotas.value) : 1;
        if (!cuotasPermitidas.has(cuotas)) return vacio;
        // Calcula en centavos para redondear importes sin errores binarios.
        const centavos = Math.round(monto * 100);
        const descuento = Math.round(tarifas.medios_pago[campos.pago.value].descuento * 100);
        const interes = esCredito ? Math.round(tarifas.cuotas[cuotas] * 100) : 0;
        const totalCentavos = Math.floor((centavos * (100 - descuento) * (100 + interes) + 5000) / 10000);
        return { subtotal: monto, ajuste: (totalCentavos - centavos) / 100, total: totalCentavos / 100, cuotas, valorCuota: Math.floor((totalCentavos + cuotas / 2) / cuotas) / 100 };
    }

    function bloquear(bloqueado) {
        // Habilita o bloquea los controles durante la operación.
        controles.forEach(control => {
            // Actualiza la disponibilidad de los controles afectados.
            control.disabled = bloqueado;
        });
        if (!bloqueado) actualizarResultado();
    }

    function actualizarResultado() {
        // Ajusta categorías, cuotas e importes de la vista previa.
        const tipo = tipoSeleccionado();
        campos.categoria.querySelectorAll('optgroup').forEach(grupo => {
            // Oculta y deshabilita categorías de otro tipo de movimiento.
            grupo.hidden = grupo.dataset.tipo !== tipo;
            grupo.disabled = grupo.hidden;
        });
        if (!categorias[tipo]?.has(campos.categoria.value)) campos.categoria.value = '';
        const credito = tipo === 'gasto' && campos.pago.value === 'Tarjeta de crédito';
        filaCuotas.hidden = !credito;
        campos.cuotas.disabled = !credito || !preparado || enviando;
        if (!credito) campos.cuotas.value = '1';
        const r = calcular();
        elemento('res-subtotal').textContent = formatearPesos(r.subtotal);
        elemento('res-ajuste').textContent = (r.ajuste > 0 ? '+' : '') + formatearPesos(r.ajuste);
        elemento('res-total').textContent = formatearPesos(r.total);
        elemento('res-cuota').textContent = formatearPesos(r.valorCuota);
        elemento('res-cuota-linea').hidden = r.cuotas <= 1;
    }

    function mostrarMensaje(texto, tipo, control = null) {
        // Muestra el resultado y enfoca el mensaje o el campo con error.
        mensaje.textContent = texto;
        mensaje.className = 'mensaje ' + tipo;
        mensaje.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
        mensaje.setAttribute('aria-live', tipo === 'error' ? 'assertive' : 'polite');
        if (activa && texto && tipo) (control || mensaje).focus();
    }

    function reiniciar() {
        // Restablece el formulario, la fecha y los importes de vista previa.
        form.reset();
        campos.fecha.value = fechaHoy();
        mostrarMensaje('', '');
        actualizarResultado();
    }

    function cambiarSesion(usuario, conservarBorrador = false) {
        // Descarta datos privados y conserva sólo el borrador permitido de la misma cuenta.
        if (prefijo) conservarBorrador = false;
        if (conservarBorrador && propietario) {
            // Conserva el borrador asociado a la cuenta propietaria.
            pendiente = { usuario: propietario, tipo: tipoSeleccionado(), campos: Object.fromEntries(Object.entries(campos).map(([id, control]) => [id, control.value])) };
        } else if (!conservarBorrador && (!usuario || pendiente?.usuario !== usuario.email)) pendiente = null;
        revisionDatos++;
        original = null;
        propietario = null;
        preparado = false;
        enviando = false;
        reiniciar();
        bloquear(true);
        form.hidden = true;
        form.setAttribute('aria-busy', 'false');
        if (!prefijo) avisoSesion.hidden = false;
        estado.textContent = '';
        reintentar.hidden = true;
    }

    async function cargarTarifas() {
        // Carga y valida las tarifas públicas antes de calcular.
        if (!pedidoTarifas) {
            // Comparte la carga de tarifas y permite reintentar si falla.
            pedidoTarifas = NipinAPI.solicitarJSON('data/tarifas.json').then(datos => {
                // Comprueba las tasas antes de aceptar la tabla de tarifas.
                const porcentajeValido = valor => typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 && valor <= 1 && Number.isInteger(valor * 100);
                if (!medios.every(medio => porcentajeValido(datos.medios_pago?.[medio]?.descuento)) || ![...cuotasPermitidas].every(cuotas => porcentajeValido(datos.cuotas?.[cuotas]))) throw new Error('La tabla de tarifas es inválida.');
                tarifas = datos;
            }).catch(error => {
                // Libera la carga fallida para permitir otro intento explícito.
                pedidoTarifas = null; throw error;
            });
        }
        await pedidoTarifas;
    }

    async function entrar(movimiento = null, cuenta = null) {
        // Activa la vista y prepara sus datos antes de habilitar controles.
        if (prefijo && movimiento) original = { ...movimiento };
        activa = true;
        const intento = ++entrada;
        preparado = false;
        bloquear(true);
        form.hidden = true;
        avisoSesion.hidden = true;
        reintentar.hidden = true;
        estado.textContent = 'Verificando sesión y cargando formulario…';
        try {
            // Ejecuta la operación y permite tratar sus errores.
            const sesion = await NipinSesion.consultar(true);
            if (!activa || intento !== entrada) return;
            if (!sesion) {
                // Ajusta los datos según la identidad de la sesión comprobada.
                if (propietario) cambiarSesion(null, true);
                avisoSesion.hidden = false;
                estado.textContent = 'Iniciá sesión para registrar un movimiento.';
                return;
            }
            if (prefijo && (!original || (cuenta && cuenta !== sesion.usuario.email))) return;
            if (propietario && propietario !== sesion.usuario.email) cambiarSesion(sesion.usuario);
            propietario = sesion.usuario.email;
            const revision = revisionDatos;
            await Promise.all([cargarTarifas(), NipinAPI.prepararEnvios()]);
            if (!activa || intento !== entrada || revision !== revisionDatos) return;
            if (pendiente?.usuario === propietario) {
                // Restaura los valores de los controles correspondientes.
                radios.forEach(radio => {
                    // Restaura los valores de los controles correspondientes.
                    radio.checked = radio.value === pendiente.tipo;
                });
                Object.entries(pendiente.campos).forEach(([id, valor]) => {
                    // Restaura los valores de los controles correspondientes.
                    campos[id].value = valor;
                });
                pendiente = null;
            }
            if (prefijo) {
                // Restaura los valores de los controles correspondientes.
                radios.forEach(radio => {
                    // Restaura los valores de los controles correspondientes.
                    radio.checked = radio.value === original.tipo;
                });
                Object.entries(campos).forEach(([id, control]) => {
                    // Restaura los valores de los controles correspondientes.
                    control.value = original[id === 'pago' ? 'medioPago' : id] ?? '';
                });
            }
            preparado = true;
            form.hidden = false;
            avisoSesion.hidden = true;
            estado.textContent = '';
            bloquear(enviando);
            if (prefijo) campos.descripcion.focus();
        } catch (error) {
            // Informa el fallo sin sustituir el resultado por un éxito.
            if (!activa || intento !== entrada) return;
            estado.textContent = 'No se pudo preparar el formulario. ' + error.message;
            reintentar.hidden = false;
        }
    }

    function validar() {
        // Comprueba los campos y devuelve el primer error con su control.
        const tipo = tipoSeleccionado();
        if (!['ingreso', 'gasto'].includes(tipo)) return ['Seleccioná un tipo de movimiento válido.', radios[0]];
        const longitud = Array.from(campos.descripcion.value.trim()).length;
        if (longitud < 1 || longitud > 150) return ['Ingresá una descripción de 1 a 150 caracteres.', campos.descripcion];
        if (!montoValido()) return ['Ingresá un monto mayor a 0, hasta 999999999,99 y con un máximo de dos decimales.', campos.monto];
        const fecha = campos.fecha.value;
        const fechaReal = new Date(fecha + 'T00:00:00Z');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < '1900-01-01' || fecha > '2100-12-31' || Number.isNaN(fechaReal.getTime()) || fechaReal.toISOString().slice(0, 10) !== fecha) return ['Seleccioná una fecha real entre 1900 y 2100.', campos.fecha];
        if (!categorias[tipo].has(campos.categoria.value)) return ['Seleccioná una categoría correspondiente al tipo de movimiento.', campos.categoria];
        if (!Object.hasOwn(tarifas.medios_pago, campos.pago.value)) return ['Seleccioná un medio de pago válido.', campos.pago];
        const cuotas = Number(campos.cuotas.value);
        const credito = tipo === 'gasto' && campos.pago.value === 'Tarjeta de crédito';
        if (!cuotasPermitidas.has(cuotas) || (!credito && cuotas !== 1)) return ['Seleccioná cuotas válidas: 1, 3, 6 o 12; solo crédito admite más de una.', campos.cuotas];
        if (Array.from(campos.comentario.value.trim()).length > 500) return ['El comentario puede tener hasta 500 caracteres.', campos.comentario];
        return null;
    }

    form.addEventListener('submit', async evento => {
        // Valida y envía el formulario sin recargar la página.
        evento.preventDefault();
        if (!activa || !preparado || enviando) return;
        const error = validar();
        if (error) return mostrarMensaje(error[0], 'error', error[1]);
        const r = calcular();
        const movimiento = { tipo: tipoSeleccionado(), descripcion: campos.descripcion.value.trim(), monto: r.subtotal, fecha: campos.fecha.value, categoria: campos.categoria.value, medioPago: campos.pago.value, cuotas: r.cuotas, comentario: campos.comentario.value.trim() };
        const revision = revisionDatos;
        enviando = true;
        bloquear(true);
        form.setAttribute('aria-busy', 'true');
        mostrarMensaje('Guardando movimiento…', '');
        try {
            // Ejecuta la operación y permite tratar sus errores.
            await NipinAPI.prepararEnvios();
            if (revision !== revisionDatos) return;
            const resultado = original
                ? await NipinAPI.editarMovimiento(original.id, movimiento)
                : await NipinAPI.guardarMovimiento(movimiento);
            if (revision !== revisionDatos) return;
            const guardado = resultado.movimiento;
            if (!guardado || !Number.isInteger(guardado.id) || guardado.id <= 0 || !Number.isFinite(guardado.total) || (original && guardado.id !== original.id)) throw new Error('El servidor no confirmó el movimiento. Revisá tus movimientos antes de reintentar.');
            if (original) {
                // Aplica el comportamiento específico del formulario de edición.
                await alGuardar(guardado);
                return;
            }
            reiniciar();
            mostrarMensaje('Movimiento guardado correctamente. Total: ' + formatearPesos(guardado.total) + '.', 'exito');
            if (document.querySelector('#resumen')) NipinResumen.actualizarTrasCambio();
        } catch (error) {
            // Informa el fallo sin sustituir el resultado por un éxito.
            if (revision !== revisionDatos) return;
            if (error.status === 401) {
                // Limpia la sesión vencida y conserva sólo el borrador permitido.
                const enfocar = activa;
                NipinSesion.establecer(null, { conservarBorrador: true });
                estado.textContent = prefijo ? 'La sesión venció. La edición se descartó.' : 'La sesión venció. Ingresá con la misma cuenta para recuperar tu borrador.';
                if (prefijo) alSesionVencida();
                if (enfocar) avisoSesion.querySelector('a').focus();
                return;
            }
            if (original && error.status === 404) {
                // Aplica el comportamiento específico del formulario de edición.
                await alNoDisponible();
                return;
            }
            mostrarMensaje(error.message, 'error');
        } finally {
            // Restablece los controles y el estado al finalizar la operación.
            if (revision === revisionDatos) {
                // Mantiene el resultado sólo para la vista o sesión vigente.
                enviando = false;
                form.setAttribute('aria-busy', 'false');
                bloquear(!preparado || !activa);
            }
        }
    });

    reintentar.addEventListener('click', () => entrar());
    campos.monto.addEventListener('input', actualizarResultado);
    campos.monto.addEventListener('change', actualizarResultado);
    campos.pago.addEventListener('change', actualizarResultado);
    campos.cuotas.addEventListener('change', actualizarResultado);
    radios.forEach(radio => radio.addEventListener('change', actualizarResultado));
    reiniciar();
    bloquear(true);
    return {
        entrar, cambiarSesion,
        salir() {
            // Desactiva la vista para que las respuestas pendientes no la actualicen.
            activa = false;
            entrada++;
            preparado = false;
            if (prefijo) cambiarSesion(null);
            bloquear(true);
        }
    };
}

const NipinRegistro = (() => {
    // Conecta el formulario de alta con la lógica compartida.
    const form = document.querySelector('#form-movimiento');
    return form ? crearFormularioMovimiento({ form, avisoSesion: document.querySelector('#aviso-sesion'), estado: document.querySelector('#registro-estado'), reintentar: document.querySelector('#registro-reintentar') }) : null;
})();
