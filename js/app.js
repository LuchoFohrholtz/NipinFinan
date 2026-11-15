// NipinFinan - módulos compartidos y estado de sesión en memoria.
const NipinSesion = (() => {
    const caja = document.querySelector('#sesion');
    const mensaje = document.querySelector('#mensaje-sesion') || document.createElement('p');
    if (caja && !mensaje.id) {
        mensaje.id = 'mensaje-sesion';
        mensaje.className = 'mensaje error';
        mensaje.setAttribute('role', 'alert');
        caja.after(mensaje);
    }
    let usuario = null;
    let revision = 0;
    let errorConsulta = false;

    function mostrar() {
        if (!caja) return;
        caja.querySelector('#sesion-ingresar').hidden = Boolean(usuario);
        caja.querySelector('#sesion-usuario').hidden = !usuario;
        caja.querySelector('#sesion-salir').hidden = !usuario;
        caja.querySelector('#sesion-nombre').textContent = usuario ? usuario.nombre : '';
    }

    function establecer(nuevoUsuario, { conservarBorrador = false } = {}) {
        revision++;
        usuario = nuevoUsuario;
        errorConsulta = false;
        mensaje.textContent = '';
        if (document.querySelector('#resumen')) NipinResumen.limpiar();
        if (document.querySelector('#form-login')) NipinAcceso.limpiar();
        if (document.querySelector('#form-movimiento')) NipinRegistro.cambiarSesion(nuevoUsuario, conservarBorrador);
        if (document.querySelector('#vista-movimientos')) NipinListado.limpiar(nuevoUsuario);
        mostrar();
    }

    async function consultar(recargar = false) {
        const consulta = revision;
        let sesion;
        try {
            sesion = await NipinAPI.consultarSesion(recargar);
        } catch (error) {
            if (consulta === revision) {
                errorConsulta = true;
                mensaje.textContent = error.message;
            }
            throw error;
        }
        if (consulta !== revision) return null; // Respuesta anterior a login/logout.
        if (errorConsulta) {
            errorConsulta = false;
            mensaje.textContent = '';
        }
        if (usuario && usuario.email !== sesion?.usuario?.email) {
            establecer(sesion ? sesion.usuario : null, { conservarBorrador: !sesion });
        }
        else {
            usuario = sesion ? sesion.usuario : null;
            mostrar();
        }
        return sesion;
    }

    if (caja) {
        const salir = caja.querySelector('#sesion-salir');
        salir.addEventListener('click', async () => {
            if (salir.disabled) return;
            salir.disabled = true;
            errorConsulta = false;
            mensaje.textContent = 'Cerrando sesión…';
            try {
                await NipinAPI.cerrarSesion();
                establecer(null);
                mensaje.textContent = '';
                if (document.querySelector('#contenido')) {
                    NipinNavegacion.ir('inicio', { reemplazar: true, recargar: true });
                    // El token anónimo se solicita solo cuando se integra CSRF.
                    await NipinAPI.prepararEnvios();
                } else location.href = 'index.html';
            } catch (error) {
                mensaje.textContent = error.message;
            } finally {
                salir.disabled = false;
            }
        });
    }
    mostrar(); // Permite acceder también si la primera consulta falla por red.
    return { consultar, establecer, esUsuario: email => usuario?.email === email };
})();

if (document.querySelector('#sesion')) {
    NipinSesion.consultar().catch(() => {}); // El módulo ya muestra el error.
}

// Una calculadora y validación para alta y edición; cada instancia conserva
// sus propios controles y estado. La edición nunca utiliza el borrador del alta.
function crearFormularioMovimiento({ form, avisoSesion, estado, reintentar, prefijo = '', alGuardar = null, alNoDisponible = null, alSesionVencida = null }) {
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
        return radios.find(radio => radio.checked)?.value || '';
    }

    function fechaHoy() {
        const ahora = new Date();
        return new Date(ahora - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }

    function formatearPesos(valor) {
        const decimales = Number.isInteger(valor) ? 0 : 2;
        return (valor < 0 ? '-$' : '$') + Math.abs(valor).toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
    }

    function montoValido() {
        const monto = Number(campos.monto.value);
        return /^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(campos.monto.value) && Number.isFinite(monto) && monto > 0 && monto <= 999999999.99;
    }

    function calcular() {
        const vacio = { subtotal: 0, ajuste: 0, total: 0, cuotas: 1, valorCuota: 0 };
        if (!montoValido()) return vacio;
        const monto = Number(campos.monto.value);
        const sinAjuste = { subtotal: monto, ajuste: 0, total: monto, cuotas: 1, valorCuota: monto };
        if (tipoSeleccionado() === 'ingreso') return sinAjuste;
        if (!tarifas || !Object.hasOwn(tarifas.medios_pago, campos.pago.value)) return sinAjuste;
        const esCredito = campos.pago.value === 'Tarjeta de crédito';
        const cuotas = esCredito ? Number(campos.cuotas.value) : 1;
        if (!cuotasPermitidas.has(cuotas)) return vacio;
        // Las tarifas AE2 son porcentajes enteros. La aritmética en centavos
        // evita errores binarios al redondear mitades hacia arriba (1,15 × 90%).
        const centavos = Math.round(monto * 100);
        const descuento = Math.round(tarifas.medios_pago[campos.pago.value].descuento * 100);
        const interes = esCredito ? Math.round(tarifas.cuotas[cuotas] * 100) : 0;
        const totalCentavos = Math.floor((centavos * (100 - descuento) * (100 + interes) + 5000) / 10000);
        return { subtotal: monto, ajuste: (totalCentavos - centavos) / 100, total: totalCentavos / 100, cuotas, valorCuota: Math.floor((totalCentavos + cuotas / 2) / cuotas) / 100 };
    }

    function bloquear(bloqueado) {
        controles.forEach(control => { control.disabled = bloqueado; });
        if (!bloqueado) actualizarResultado();
    }

    function actualizarResultado() {
        const tipo = tipoSeleccionado();
        campos.categoria.querySelectorAll('optgroup').forEach(grupo => {
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
        mensaje.textContent = texto;
        mensaje.className = 'mensaje ' + tipo;
        mensaje.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
        mensaje.setAttribute('aria-live', tipo === 'error' ? 'assertive' : 'polite');
        if (activa && texto && tipo) (control || mensaje).focus();
    }

    function reiniciar() {
        form.reset();
        campos.fecha.value = fechaHoy();
        mostrarMensaje('', '');
        actualizarResultado();
    }

    function cambiarSesion(usuario, conservarBorrador = false) {
        if (prefijo) conservarBorrador = false;
        if (conservarBorrador && propietario) {
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
        if (!pedidoTarifas) {
            pedidoTarifas = NipinAPI.solicitarJSON('data/tarifas.json').then(datos => {
                const porcentajeValido = valor => typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 && valor <= 1 && Number.isInteger(valor * 100);
                if (!medios.every(medio => porcentajeValido(datos.medios_pago?.[medio]?.descuento)) || ![...cuotasPermitidas].every(cuotas => porcentajeValido(datos.cuotas?.[cuotas]))) throw new Error('La tabla de tarifas es inválida.');
                tarifas = datos;
            }).catch(error => { pedidoTarifas = null; throw error; });
        }
        await pedidoTarifas;
    }

    async function entrar(movimiento = null, cuenta = null) {
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
            const sesion = await NipinSesion.consultar(true);
            if (!activa || intento !== entrada) return;
            if (!sesion) {
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
                radios.forEach(radio => { radio.checked = radio.value === pendiente.tipo; });
                Object.entries(pendiente.campos).forEach(([id, valor]) => { campos[id].value = valor; });
                pendiente = null;
            }
            if (prefijo) {
                radios.forEach(radio => { radio.checked = radio.value === original.tipo; });
                Object.entries(campos).forEach(([id, control]) => {
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
            if (!activa || intento !== entrada) return;
            estado.textContent = 'No se pudo preparar el formulario. ' + error.message;
            reintentar.hidden = false;
        }
    }

    function validar() {
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
            await NipinAPI.prepararEnvios();
            if (revision !== revisionDatos) return;
            const resultado = original
                ? await NipinAPI.editarMovimiento(original.id, movimiento)
                : await NipinAPI.guardarMovimiento(movimiento);
            if (revision !== revisionDatos) return;
            const guardado = resultado.movimiento;
            if (!guardado || !Number.isInteger(guardado.id) || guardado.id <= 0 || !Number.isFinite(guardado.total) || (original && guardado.id !== original.id)) throw new Error('El servidor no confirmó el movimiento. Revisá tus movimientos antes de reintentar.');
            if (original) {
                await alGuardar(guardado);
                return;
            }
            reiniciar();
            mostrarMensaje('Movimiento guardado correctamente. Total: ' + formatearPesos(guardado.total) + '.', 'exito');
        } catch (error) {
            if (revision !== revisionDatos) return;
            if (error.status === 401) {
                const enfocar = activa;
                NipinSesion.establecer(null, { conservarBorrador: true });
                estado.textContent = prefijo ? 'La sesión venció. La edición se descartó.' : 'La sesión venció. Ingresá con la misma cuenta para recuperar tu borrador.';
                if (prefijo) alSesionVencida();
                if (enfocar) avisoSesion.querySelector('a').focus();
                return;
            }
            if (original && error.status === 404) {
                await alNoDisponible();
                return;
            }
            mostrarMensaje(error.message, 'error');
        } finally {
            if (revision === revisionDatos) {
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
            activa = false;
            entrada++;
            preparado = false;
            if (prefijo) cambiarSesion(null);
            bloquear(true);
        }
    };
}

const NipinRegistro = (() => {
    const form = document.querySelector('#form-movimiento');
    return form ? crearFormularioMovimiento({ form, avisoSesion: document.querySelector('#aviso-sesion'), estado: document.querySelector('#registro-estado'), reintentar: document.querySelector('#registro-reintentar') }) : null;
})();

// NipinFinan - AE2, opción 2 - Luciano Fohrholtz.
// El resumen solo lee movimientos; la demostración usa un JSON separado.
const NipinResumen = (() => {
    if (!document.querySelector("#resumen")) return null;
    let modo = "real";
    let sinSesion = false;
    let movimientos = [];
    let cargando = false;
    let activa = false;
    let actualizarAlTerminar = false;
    let revisionDatos = 0;

    const panel = document.querySelector("#resumen");
    const mes = panel.querySelector("#resumen-mes");
    const categoria = panel.querySelector("#resumen-filtro-categoria");
    const botonDemo = panel.querySelector("#resumen-demo");
    const botonActualizar = panel.querySelector("#resumen-actualizar");
    const aviso = panel.querySelector("#resumen-aviso");

    function mesActual() {
        const hoy = new Date();
        return hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0");
    }

    function nombreMes(valor) {
        const [anio, numero] = valor.split("-");
        const nombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        return nombres[Number(numero) - 1] + " de " + anio;
    }

    function mesAnterior(valor) {
        const [anio, numero] = valor.split("-").map(Number);
        return (numero === 1 ? anio - 1 : anio) + "-" + String(numero === 1 ? 12 : numero - 1).padStart(2, "0");
    }

    function pesos(centavos) {
        return (centavos / 100).toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: centavos % 100 === 0 ? 0 : 2 });
    }

    function porcentaje(valor) {
        return valor.toLocaleString("es-AR", { maximumFractionDigits: 1 }) + "%";
    }

    function mostrarAviso(texto, error = false) {
        aviso.textContent = texto;
        aviso.hidden = !texto;
        aviso.classList.toggle("error", error);
    }

    // Validamos sin corregir ni escribir los registros del módulo de Santiago.
    function validarMovimientos(datos) {
        if (!Array.isArray(datos)) throw new Error("Los movimientos no son una lista.");
        return datos.filter(m => {
            if (!m || !["ingreso", "gasto"].includes(m.tipo)) return false;
            if (typeof m.total !== "number" || m.total <= 0 || !Number.isSafeInteger(Math.round(m.total * 100))) return false;
            if (typeof m.categoria !== "string" || !m.categoria.trim()) return false;
            if (typeof m.fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(m.fecha)) return false;
            const [anio, numero, dia] = m.fecha.split("-").map(Number);
            const ultimoDia = new Date(anio, numero, 0).getDate();
            return anio >= 1000 && numero >= 1 && numero <= 12 && dia >= 1 && dia <= ultimoDia;
        });
    }

    // Una petición HTTP real; los ejemplos nunca se guardan en la cuenta.
    async function cargarEjemplo() {
        const datos = await NipinAPI.solicitarJSON("data/metricas.json");
        return datos.movimientos;
    }

    function agregarOpcion(select, valor, texto) {
        const opcion = document.createElement("option");
        opcion.value = valor;
        opcion.textContent = texto;
        select.append(opcion);
    }

    function prepararFiltros(reiniciar) {
        const seleccionado = mes.value;
        const seleccionCategoria = categoria.value;
        const meses = [...new Set(movimientos.map(m => m.fecha.slice(0, 7)))];
        if (modo === "real" && !meses.includes(mesActual())) meses.push(mesActual());
        meses.sort().reverse();
        mes.replaceChildren();
        agregarOpcion(mes, "todos", "Todo el período");
        meses.forEach(valor => agregarOpcion(mes, valor, nombreMes(valor)));
        const inicial = modo === "real" ? mesActual() : (meses[0] || "todos");
        mes.value = !reiniciar && (seleccionado === "todos" || meses.includes(seleccionado)) ? seleccionado : inicial;

        const categorias = [...new Set(movimientos.map(m => m.categoria))].sort((a, b) => a.localeCompare(b, "es"));
        categoria.replaceChildren();
        agregarOpcion(categoria, "todas", "Todas las categorías");
        categorias.forEach(valor => agregarOpcion(categoria, valor, valor));
        categoria.value = !reiniciar && categorias.includes(seleccionCategoria) ? seleccionCategoria : "todas";
    }

    function filtrar(periodo) {
        return movimientos.filter(m => (periodo === "todos" || m.fecha.slice(0, 7) === periodo) && (categoria.value === "todas" || m.categoria === categoria.value));
    }

    // Sumamos en centavos y usamos total, sin volver a calcular las cuotas.
    function sumar(lista, tipo) {
        return lista.filter(m => m.tipo === tipo).reduce((total, m) => total + Math.round(m.total * 100), 0);
    }

    function gastosPorCategoria(lista) {
        const grupos = new Map();
        lista.filter(m => m.tipo === "gasto").forEach(m => {
            grupos.set(m.categoria, (grupos.get(m.categoria) || 0) + Math.round(m.total * 100));
        });
        return [...grupos].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
    }

    function mostrarBarras(grupos, gastos) {
        const lista = panel.querySelector("#resumen-barras");
        lista.replaceChildren();
        panel.querySelector("#resumen-sin-gastos").hidden = grupos.length > 0;
        grupos.forEach(([nombre, importe]) => {
            const item = document.createElement("li");
            const texto = document.createElement("div");
            texto.className = "resumen-barra-texto";
            const etiqueta = document.createElement("strong");
            etiqueta.textContent = nombre;
            const detalle = document.createElement("span");
            const parte = importe / gastos * 100;
            detalle.textContent = pesos(importe) + " · " + porcentaje(parte);
            texto.append(etiqueta, detalle);
            const base = document.createElement("div");
            base.className = "resumen-barra-base";
            base.setAttribute("aria-hidden", "true");
            const barra = document.createElement("span");
            barra.className = "resumen-barra-valor";
            barra.style.width = parte + "%";
            base.append(barra);
            item.append(texto, base);
            lista.append(item);
        });
    }

    function diferencia(actual, anterior) {
        const valor = actual - anterior;
        return valor === 0 ? "Sin cambios" : (valor > 0 ? "+" : "−") + pesos(Math.abs(valor));
    }

    function mostrarComparacion(ingresos, gastos) {
        const bloque = panel.querySelector("#resumen-comparacion");
        bloque.hidden = mes.value === "todos";
        if (bloque.hidden) return;
        const anterior = mesAnterior(mes.value);
        const lista = filtrar(anterior);
        panel.querySelector("#resumen-comparacion-titulo").textContent = "Comparación con " + nombreMes(anterior).toLowerCase();
        panel.querySelector("#resumen-diferencia-ingresos").textContent = diferencia(ingresos, sumar(lista, "ingreso"));
        panel.querySelector("#resumen-diferencia-gastos").textContent = diferencia(gastos, sumar(lista, "gasto"));
        panel.querySelector("#resumen-comparacion-nota").textContent = lista.length ? "Diferencia de importes con el mismo filtro de categoría." : "No hay movimientos con estos filtros en el mes anterior; se compara con $0.";
    }

    function mostrarResumen() {
        const lista = filtrar(mes.value);
        const ingresos = sumar(lista, "ingreso");
        const gastos = sumar(lista, "gasto");
        const saldo = ingresos - gastos;
        const grupos = gastosPorCategoria(lista);
        panel.querySelector("#resumen-ingresos").textContent = pesos(ingresos);
        panel.querySelector("#resumen-gastos").textContent = pesos(gastos);
        const disponible = panel.querySelector("#resumen-saldo");
        disponible.textContent = pesos(saldo);
        disponible.classList.toggle("gasto", saldo < 0);
        disponible.classList.toggle("ingreso", saldo > 0);
        panel.querySelector("#resumen-porcentaje").textContent = ingresos ? porcentaje(saldo / ingresos * 100) : "—";
        panel.querySelector("#resumen-cantidad").textContent = lista.length;
        const mayores = grupos.length ? grupos.filter(g => g[1] === grupos[0][1]).map(g => g[0]) : [];
        panel.querySelector("#resumen-categoria-mayor").textContent = mayores.length ? mayores.join(" / ") : "Sin gastos";
        panel.querySelector("#resumen-categoria-importe").textContent = grupos.length ? pesos(grupos[0][1]) + (mayores.length > 1 ? " en cada categoría (empate)" : " en el período") : "Todavía no hay una categoría de mayor gasto.";
        panel.querySelector("#resumen-contexto").textContent = (mes.value === "todos" ? "Todo el período" : nombreMes(mes.value)) + " · " + (categoria.value === "todas" ? "Todas las categorías" : categoria.value);
        panel.querySelector("#resumen-fuente").textContent = modo === "real" ? "Mis movimientos" : "Datos de ejemplo";
        botonDemo.textContent = modo === "real" ? "Ver demostración" : "Volver a mis movimientos";
        botonDemo.setAttribute("aria-pressed", String(modo === "demo"));
        panel.querySelector("#resumen-vacio").hidden = lista.length > 0;
        panel.querySelector("#resumen-vacio-texto").textContent = movimientos.length ? "No hay movimientos para los filtros seleccionados." : "Todavía no hay movimientos para mostrar.";
        const registrar = panel.querySelector("#resumen-registrar");
        registrar.hidden = modo === "demo";
        registrar.href = sinSesion ? "index.html#/acceso" : "index.html#/registrar";
        if (sinSesion) registrar.dataset.ruta = "acceso";
        else registrar.dataset.ruta = "registrar";
        registrar.textContent = sinSesion ? "Iniciar sesión →" : "Registrar un movimiento →";
        mostrarBarras(grupos, gastos);
        mostrarComparacion(ingresos, gastos);
    }

    async function actualizarDatos(destino = modo, reiniciar = false) {
        if (cargando) return;
        const revision = revisionDatos;
        cargando = true;
        panel.setAttribute("aria-busy", "true");
        botonDemo.disabled = true;
        botonActualizar.disabled = true;
        mostrarAviso(destino === "demo" ? "Cargando datos de ejemplo…" : "Actualizando resumen…");
        try {
            let datos;
            if (destino === "demo") datos = await cargarEjemplo();
            else {
                const sesion = await NipinSesion.consultar(true);
                if (revision !== revisionDatos) return;
                sinSesion = sesion === null;
                datos = sesion ? sesion.movimientos : [];
            }
            if (revision !== revisionDatos) return;
            const validos = validarMovimientos(datos);
            modo = destino;
            movimientos = validos;
            prepararFiltros(reiniciar);
            mostrarResumen();
            const ignorados = datos.length - validos.length;
            mostrarAviso(ignorados ? "Se omitieron " + ignorados + " movimientos con datos incompletos o inválidos." : "", ignorados > 0);
            if (modo === "real" && sinSesion) mostrarAviso("Iniciá sesión para ver tus movimientos. Mientras tanto podés ver la demostración.");
        } catch (error) {
            if (revision !== revisionDatos) return;
            // Mantenemos la última vista correcta y ofrecemos reintentar.
            console.warn("No se pudo actualizar el resumen:", error.message);
            mostrarAviso(destino === "demo" ? "No pudimos cargar la demostración. La vista anterior se conserva. Intentá nuevamente." : "No pudimos leer tus movimientos. La vista anterior se conserva. Intentá actualizar nuevamente.", true);
            if (destino === "demo" && modo === "real") botonDemo.textContent = "Reintentar demostración";
        } finally {
            if (revision !== revisionDatos) return;
            cargando = false;
            panel.setAttribute("aria-busy", "false");
            botonDemo.disabled = false;
            botonActualizar.disabled = false;
            if (activa && actualizarAlTerminar) {
                actualizarAlTerminar = false;
                actualizarDatos();
            }
        }
    }

    // Todos los eventos se registran desde este app.js, sin atributos on*.
    mes.addEventListener("change", mostrarResumen);
    categoria.addEventListener("change", mostrarResumen);
    botonActualizar.addEventListener("click", () => actualizarDatos());
    botonDemo.addEventListener("click", () => actualizarDatos(modo === "real" ? "demo" : "real", true));
    prepararFiltros(true);
    mostrarResumen();
    return {
        actualizarTrasCambio() {
            revisionDatos++;
            cargando = false;
            actualizarAlTerminar = false;
            return actualizarDatos('real');
        },
        limpiar() {
            // Invalida lecturas anteriores: un GET pendiente nunca repone los
            // movimientos de la cuenta que acaba de cerrar sesión.
            revisionDatos++;
            movimientos = [];
            modo = "real";
            sinSesion = true;
            cargando = false;
            actualizarAlTerminar = false;
            panel.setAttribute("aria-busy", "false");
            botonDemo.disabled = false;
            botonActualizar.disabled = false;
            prepararFiltros(true);
            mostrarResumen();
            mostrarAviso("Iniciá sesión para ver tus movimientos. Mientras tanto podés ver la demostración.");
        },
        entrar() {
            activa = true;
            if (cargando) actualizarAlTerminar = true;
            else actualizarDatos();
        },
        salir() {
            activa = false;
            actualizarAlTerminar = false;
        }
    };
})();
