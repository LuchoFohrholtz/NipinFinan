// Comprueba el helper con HTTP simulado mediante node --test, sin ejecutar PHP ni MySQL.
const { test } = require('node:test');
// Inicializa assert.
const assert = require('node:assert/strict');
// Inicializa fs.
const fs = require('node:fs');
// Inicializa path.
const path = require('node:path');
// Inicializa vm.
const vm = require('node:vm');

// Inicializa codigo.
const codigo = fs.readFileSync(path.join(__dirname, '../js/api.js'), 'utf8');
// Inicia usuario: identidad del usuario.
const usuario = { nombre: 'Cuenta de prueba', email: 'prueba@example.com' };
// Inicia respuesta: respuesta HTTP del servidor.
const respuesta = (datos, status = 200) => ({
    // Incluye el campo ok.
    ok: status >= 200 && status < 300, status, json: async () => datos
});
// Inicia sesion: datos de sesión recibidos de PHP.
const sesion = token => respuesta({ estado: 'exito', usuario: null, csrfToken: token });
// Inicializa login.
const login = token => respuesta({ estado: 'exito', usuario, csrfToken: token });
// Define diferido con sus entradas y el resultado que devuelve.
function diferido() {
    // Declara resolve.
    let resolve;
    // Inicializa promise.
    const promise = new Promise(r => {
        // Actualiza resolve.
        resolve = r;
    });
    // Devuelve las funciones o datos públicos al código que llamó.
    return { promise, resolve };
}
// Define crearAPI con sus entradas y el resultado que devuelve.
function crearAPI(atender) {
    // Ejecuta el helper con un fetch simulado y registra sus peticiones.
    const llamadas = [];
    // Inicializa api.
    const api = vm.runInNewContext(codigo + '\nNipinAPI;', {
        // Envía la petición HTTP y espera la respuesta del servidor.
        fetch(url, opciones) {
            // Llama a llamadas.push con los datos indicados.
            llamadas.push({ url, ...opciones });
            // Devuelve atender(url, opciones) al código que llamó.
            return atender(url, opciones);
        }
    });
    // Devuelve las funciones o datos públicos al código que llamó.
    return { api, llamadas };
}

// Comprueba el resultado esperado y registra si la prueba pasa.
test('toda escritura espera el token y usa cookies del mismo origen', async () => {
    // Comprueba que toda escritura espera el token y usa cookies del mismo origen.
    const { api, llamadas } = crearAPI(async url => url.endsWith('sesion.php')
        // Selecciona este valor si se cumple la condición anterior.
        ? sesion('token-servidor-simulado') : respuesta({ estado: 'exito' }));
    // Recorre los elementos para procesar cada uno dentro del bloque.
    for (const method of ['POST', 'PUT', 'DELETE']) {
        // Espera que termine la operación asíncrona antes de continuar.
        await api.solicitarJSON('api/recurso.php', { method, datos: {} });
    }
    // Comprueba el resultado esperado y registra si la prueba pasa.
    assert.equal(llamadas.filter(p => p.url.endsWith('sesion.php')).length, 1);
    // Recorre los elementos para procesar cada uno dentro del bloque.
    for (const pedido of llamadas.slice(1)) {
        // Comprueba el resultado esperado y registra si la prueba pasa.
        assert.equal(pedido.headers['X-CSRF-Token'], 'token-servidor-simulado');
        // Comprueba el resultado esperado y registra si la prueba pasa.
        assert.equal(pedido.credentials, 'same-origin');
        // Comprueba el resultado esperado y registra si la prueba pasa.
        assert.equal(pedido.cache, 'no-store');
    }
});

// Comprueba el resultado esperado y registra si la prueba pasa.
test('una preparación antigua no reemplaza el token rotado por login', async () => {
    // Comprueba que una preparación antigua no reemplaza el token rotado por login.
    const antigua = diferido();
    // Inicializa consultas.
    let consultas = 0;
    // Inicializa { api, llamadas }.
    const { api, llamadas } = crearAPI(async url => {
        // Comprueba esta condición.
        if (url.endsWith('sesion.php')) return ++consultas === 1 ? antigua.promise : sesion('anonimo');
        // Comprueba esta condición.
        if (url.endsWith('login.php')) return login('rotado');
        // Devuelve respuesta({ estado: 'exito' }) al código que llamó.
        return respuesta({ estado: 'exito' });
    });
    // Inicia pendiente: operación pendiente del formulario.
    const pendiente = api.prepararSesion();
    // Inicializa rechazo.
    const rechazo = assert.rejects(pendiente, /La sesión cambió/);
    // Espera que termine la operación asíncrona antes de continuar.
    await api.ingresar({ email: usuario.email, password: 'solo-prueba' });
    // Llama a antigua.resolve con los datos indicados.
    antigua.resolve(sesion('obsoleto'));
    // Espera que termine la operación asíncrona antes de continuar.
    await rechazo;
    // Espera que termine la operación asíncrona antes de continuar.
    await api.cerrarSesion();
    // Comprueba el resultado esperado y registra si la prueba pasa.
    assert.equal(llamadas.at(-1).headers['X-CSRF-Token'], 'rotado');
});

// Comprueba el resultado esperado y registra si la prueba pasa.
test('un 403 antiguo no invalida el token de un login posterior', async () => {
    // Comprueba que un 403 antiguo no invalida el token de un login posterior.
    const antigua = diferido();
    // Inicializa { api, llamadas }.
    const { api, llamadas } = crearAPI(async url => {
        // Comprueba esta condición.
        if (url.endsWith('sesion.php')) return sesion('anonimo');
        // Comprueba esta condición.
        if (url.endsWith('login.php')) return login('rotado');
        // Comprueba esta condición.
        if (url.endsWith('anterior.php')) return antigua.promise;
        // Devuelve respuesta({ estado: 'exito' }) al código que llamó.
        return respuesta({ estado: 'exito' });
    });
    // Espera que termine la operación asíncrona antes de continuar.
    await api.prepararEnvios();
    // Inicia pendiente: operación pendiente del formulario.
    const pendiente = api.solicitarJSON('api/anterior.php', { method: 'POST' });
    // Inicializa rechazo.
    const rechazo = assert.rejects(pendiente, e => e.status === 403);
    // Espera que termine la operación asíncrona antes de continuar.
    await api.ingresar({});
    // Llama a antigua.resolve con los datos indicados.
    antigua.resolve(respuesta({ estado: 'error', mensaje: 'CSRF inválido' }, 403));
    // Espera que termine la operación asíncrona antes de continuar.
    await rechazo;
    // Espera que termine la operación asíncrona antes de continuar.
    await api.cerrarSesion();
    // Comprueba el resultado esperado y registra si la prueba pasa.
    assert.equal(llamadas.filter(p => p.url.endsWith('sesion.php')).length, 1);
    // Comprueba el resultado esperado y registra si la prueba pasa.
    assert.equal(llamadas.at(-1).headers['X-CSRF-Token'], 'rotado');
});

// Comprueba el resultado esperado y registra si la prueba pasa.
test('403 con JSON roto renueva token solo en el siguiente envío explícito', async () => {
    // Comprueba que 403 con JSON roto renueva token solo en el siguiente envío explícito.
    let tokens = 0;
    // Inicializa { api, llamadas }.
    const { api, llamadas } = crearAPI(async url => {
        // Comprueba esta condición.
        if (url.endsWith('sesion.php')) return sesion('token-' + ++tokens);
        // Comprueba esta condición.
        if (url.endsWith('rechazado.php')) return {
            // Incluye el campo ok.
            ok: false, status: 403, json: async () => {
                // Interrumpe la función y comunica el error.
                throw new SyntaxError('HTML');
            }
        };
        // Devuelve respuesta({ estado: 'exito' }) al código que llamó.
        return respuesta({ estado: 'exito' });
    });
    // Espera que termine la operación asíncrona antes de continuar.
    await assert.rejects(api.solicitarJSON('api/rechazado.php', { method: 'POST' }), e => e.status === 403);
    // Comprueba el resultado esperado y registra si la prueba pasa.
    assert.equal(tokens, 1);
    // Comprueba el resultado esperado y registra si la prueba pasa.
    assert.equal(llamadas.filter(p => p.method === 'POST').length, 1);
    // Espera que termine la operación asíncrona antes de continuar.
    await api.solicitarJSON('api/otro.php', { method: 'PUT' });
    // Comprueba el resultado esperado y registra si la prueba pasa.
    assert.equal(tokens, 2);
    // Comprueba el resultado esperado y registra si la prueba pasa.
    assert.equal(llamadas.at(-1).headers['X-CSRF-Token'], 'token-2');
});

// Comprueba el resultado esperado y registra si la prueba pasa.
test('sin token válido o sin conexión no envía la escritura ni la reintenta', async () => {
    // Recorre los elementos para procesar cada uno dentro del bloque.
    for (const fallo of ['sin-token', 'red']) {
        // Comprueba los datos y rechaza los valores inválidos.
        const { api, llamadas } = crearAPI(async () => {
            // Interrumpe la función y comunica el error.
            if (fallo === 'red') throw new TypeError('Sin red');
            // Devuelve respuesta({ usuario: null }) al código que llamó.
            return respuesta({ usuario: null });
        });
        // Espera que termine la operación asíncrona antes de continuar.
        await assert.rejects(api.solicitarJSON('api/registro.php', { method: 'POST', datos: {} }));
        // Comprueba el resultado esperado y registra si la prueba pasa.
        assert.equal(llamadas.length, 1);
        // Comprueba el resultado esperado y registra si la prueba pasa.
        assert.equal(llamadas[0].method, 'GET');
    }
});

// Comprueba el resultado esperado y registra si la prueba pasa.
test('logout descarta el token autenticado y prepara otra sesión anónima', async () => {
    // Comprueba que logout descarta el token autenticado y prepara otra sesión anónima.
    let tokens = 0;
    // Inicializa { api, llamadas }.
    const { api, llamadas } = crearAPI(async url => {
        // Comprueba esta condición.
        if (url.endsWith('sesion.php')) return sesion('anonimo-' + ++tokens);
        // Comprueba esta condición.
        if (url.endsWith('login.php')) return login('autenticado');
        // Devuelve respuesta({ estado: 'exito' }) al código que llamó.
        return respuesta({ estado: 'exito' });
    });
    // Espera que termine la operación asíncrona antes de continuar.
    await api.ingresar({});
    // Espera que termine la operación asíncrona antes de continuar.
    await api.cerrarSesion();
    // Espera que termine la operación asíncrona antes de continuar.
    await api.solicitarJSON('api/registro.php', { method: 'POST', datos: {} });
    // Comprueba el resultado esperado y registra si la prueba pasa.
    assert.equal(llamadas.find(p => p.url.endsWith('logout.php')).headers['X-CSRF-Token'], 'autenticado');
    // Comprueba el resultado esperado y registra si la prueba pasa.
    assert.equal(llamadas.at(-1).headers['X-CSRF-Token'], 'anonimo-2');
});

// Comprueba el resultado esperado y registra si la prueba pasa.
test('un error de escritura conserva status/mensaje y no dispara otro envío', async () => {
    // Recorre los elementos para procesar cada uno dentro del bloque.
    for (const status of [400, 401, 403, 404, 500]) {
        // Recorre los elementos para acumular o comprobar sus resultados.
        const { api, llamadas } = crearAPI(async url => url.endsWith('sesion.php')
            // Selecciona este valor si se cumple la condición anterior.
            ? sesion('token') : respuesta({ estado: 'error', mensaje: 'Revisá la operación' }, status));
        // Espera que termine la operación asíncrona antes de continuar.
        await assert.rejects(api.solicitarJSON('api/mis_movimientos.php', { method: 'POST', datos: {}, privada: true }),
            // Actualiza e.
            e => e.status === status && e.message === 'Revisá la operación');
        // Comprueba el resultado esperado y registra si la prueba pasa.
        assert.equal(llamadas.filter(p => p.method === 'POST').length, 1);
    }
});
