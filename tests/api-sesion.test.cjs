// Comprueba el helper con HTTP simulado mediante node --test, sin ejecutar PHP ni MySQL.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const codigo = fs.readFileSync(path.join(__dirname, '../js/api.js'), 'utf8');
const usuario = { nombre: 'Cuenta de prueba', email: 'prueba@example.com' };
const respuesta = (datos, status = 200) => ({
    ok: status >= 200 && status < 300, status, json: async () => datos
});
const sesion = token => respuesta({ estado: 'exito', usuario: null, csrfToken: token });
const login = token => respuesta({ estado: 'exito', usuario, csrfToken: token });
function diferido() {
    // Crea una promesa controlable para simular respuestas tardías.
    let resolve;
    const promise = new Promise(r => {
        // Conserva la función que permitirá resolver la promesa simulada.
        resolve = r;
    });
    return { promise, resolve };
}
function crearAPI(atender) {
    // Ejecuta el helper con un fetch simulado y registra sus peticiones.
    const llamadas = [];
    const api = vm.runInNewContext(codigo + '\nNipinAPI;', {
        fetch(url, opciones) {
            // Registra la petición simulada antes de devolver su respuesta.
            llamadas.push({ url, ...opciones });
            return atender(url, opciones);
        }
    });
    return { api, llamadas };
}

test('toda escritura espera el token y usa cookies del mismo origen', async () => {
    // Comprueba que toda escritura espera el token y usa cookies del mismo origen.
    const { api, llamadas } = crearAPI(async url => url.endsWith('sesion.php')
        ? sesion('token-servidor-simulado') : respuesta({ estado: 'exito' }));
    for (const method of ['POST', 'PUT', 'DELETE']) {
        // Recorre los elementos para acumular o comprobar sus resultados.
        await api.solicitarJSON('api/recurso.php', { method, datos: {} });
    }
    assert.equal(llamadas.filter(p => p.url.endsWith('sesion.php')).length, 1);
    for (const pedido of llamadas.slice(1)) {
        // Recorre los elementos para acumular o comprobar sus resultados.
        assert.equal(pedido.headers['X-CSRF-Token'], 'token-servidor-simulado');
        assert.equal(pedido.credentials, 'same-origin');
        assert.equal(pedido.cache, 'no-store');
    }
});

test('una preparación antigua no reemplaza el token rotado por login', async () => {
    // Comprueba que una preparación antigua no reemplaza el token rotado por login.
    const antigua = diferido();
    let consultas = 0;
    const { api, llamadas } = crearAPI(async url => {
        // Devuelve el resultado correspondiente a esta condición.
        if (url.endsWith('sesion.php')) return ++consultas === 1 ? antigua.promise : sesion('anonimo');
        if (url.endsWith('login.php')) return login('rotado');
        return respuesta({ estado: 'exito' });
    });
    const pendiente = api.prepararSesion();
    const rechazo = assert.rejects(pendiente, /La sesión cambió/);
    await api.ingresar({ email: usuario.email, password: 'solo-prueba' });
    antigua.resolve(sesion('obsoleto'));
    await rechazo;
    await api.cerrarSesion();
    assert.equal(llamadas.at(-1).headers['X-CSRF-Token'], 'rotado');
});

test('un 403 antiguo no invalida el token de un login posterior', async () => {
    // Comprueba que un 403 antiguo no invalida el token de un login posterior.
    const antigua = diferido();
    const { api, llamadas } = crearAPI(async url => {
        // Devuelve el resultado correspondiente a esta condición.
        if (url.endsWith('sesion.php')) return sesion('anonimo');
        if (url.endsWith('login.php')) return login('rotado');
        if (url.endsWith('anterior.php')) return antigua.promise;
        return respuesta({ estado: 'exito' });
    });
    await api.prepararEnvios();
    const pendiente = api.solicitarJSON('api/anterior.php', { method: 'POST' });
    const rechazo = assert.rejects(pendiente, e => e.status === 403);
    await api.ingresar({});
    antigua.resolve(respuesta({ estado: 'error', mensaje: 'CSRF inválido' }, 403));
    await rechazo;
    await api.cerrarSesion();
    assert.equal(llamadas.filter(p => p.url.endsWith('sesion.php')).length, 1);
    assert.equal(llamadas.at(-1).headers['X-CSRF-Token'], 'rotado');
});

test('403 con JSON roto renueva token solo en el siguiente envío explícito', async () => {
    // Comprueba que 403 con JSON roto renueva token solo en el siguiente envío explícito.
    let tokens = 0;
    const { api, llamadas } = crearAPI(async url => {
        // Devuelve el resultado correspondiente a esta condición.
        if (url.endsWith('sesion.php')) return sesion('token-' + ++tokens);
        if (url.endsWith('rechazado.php')) return {
            ok: false, status: 403, json: async () => {
                // Rechaza los datos que no cumplen esta validación.
                throw new SyntaxError('HTML');
            }
        };
        return respuesta({ estado: 'exito' });
    });
    await assert.rejects(api.solicitarJSON('api/rechazado.php', { method: 'POST' }), e => e.status === 403);
    assert.equal(tokens, 1);
    assert.equal(llamadas.filter(p => p.method === 'POST').length, 1);
    await api.solicitarJSON('api/otro.php', { method: 'PUT' });
    assert.equal(tokens, 2);
    assert.equal(llamadas.at(-1).headers['X-CSRF-Token'], 'token-2');
});

test('sin token válido o sin conexión no envía la escritura ni la reintenta', async () => {
    // Comprueba que sin token válido o sin conexión no envía la escritura ni la reintenta.
    for (const fallo of ['sin-token', 'red']) {
        // Comprueba los datos y rechaza los valores inválidos.
        const { api, llamadas } = crearAPI(async () => {
            // Comprueba los datos y rechaza los valores inválidos.
            if (fallo === 'red') throw new TypeError('Sin red');
            return respuesta({ usuario: null });
        });
        await assert.rejects(api.solicitarJSON('api/registro.php', { method: 'POST', datos: {} }));
        assert.equal(llamadas.length, 1);
        assert.equal(llamadas[0].method, 'GET');
    }
});

test('logout descarta el token autenticado y prepara otra sesión anónima', async () => {
    // Comprueba que logout descarta el token autenticado y prepara otra sesión anónima.
    let tokens = 0;
    const { api, llamadas } = crearAPI(async url => {
        // Devuelve el resultado correspondiente a esta condición.
        if (url.endsWith('sesion.php')) return sesion('anonimo-' + ++tokens);
        if (url.endsWith('login.php')) return login('autenticado');
        return respuesta({ estado: 'exito' });
    });
    await api.ingresar({});
    await api.cerrarSesion();
    await api.solicitarJSON('api/registro.php', { method: 'POST', datos: {} });
    assert.equal(llamadas.find(p => p.url.endsWith('logout.php')).headers['X-CSRF-Token'], 'autenticado');
    assert.equal(llamadas.at(-1).headers['X-CSRF-Token'], 'anonimo-2');
});

test('un error de escritura conserva status/mensaje y no dispara otro envío', async () => {
    // Comprueba que un error de escritura conserva status/mensaje y no dispara otro envío.
    for (const status of [400, 401, 403, 404, 500]) {
        // Recorre los elementos para acumular o comprobar sus resultados.
        const { api, llamadas } = crearAPI(async url => url.endsWith('sesion.php')
            ? sesion('token') : respuesta({ estado: 'error', mensaje: 'Revisá la operación' }, status));
        await assert.rejects(api.solicitarJSON('api/mis_movimientos.php', { method: 'POST', datos: {}, privada: true }),
            e => e.status === status && e.message === 'Revisá la operación');
        assert.equal(llamadas.filter(p => p.method === 'POST').length, 1);
    }
});
