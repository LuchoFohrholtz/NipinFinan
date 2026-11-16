// Pruebas unitarias con HTTP simulado. No acreditan PHP/MySQL ni CSRF reales.
// Ejecutar: node --test tests/api-sesion.test.cjs
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
    let resolve;
    const promise = new Promise(r => { resolve = r; });
    return { promise, resolve };
}
function crearAPI(atender) {
    const llamadas = [];
    const api = vm.runInNewContext(codigo + '\nNipinAPI;', {
        fetch(url, opciones) {
            llamadas.push({ url, ...opciones });
            return atender(url, opciones);
        }
    });
    return { api, llamadas };
}

test('toda escritura espera el token y usa cookies del mismo origen', async () => {
    const { api, llamadas } = crearAPI(async url => url.endsWith('sesion.php')
        ? sesion('token-servidor-simulado') : respuesta({ estado: 'exito' }));
    for (const method of ['POST', 'PUT', 'DELETE']) {
        await api.solicitarJSON('api/recurso.php', { method, datos: {} });
    }
    assert.equal(llamadas.filter(p => p.url.endsWith('sesion.php')).length, 1);
    for (const pedido of llamadas.slice(1)) {
        assert.equal(pedido.headers['X-CSRF-Token'], 'token-servidor-simulado');
        assert.equal(pedido.credentials, 'same-origin');
        assert.equal(pedido.cache, 'no-store');
    }
});

test('una preparación antigua no reemplaza el token rotado por login', async () => {
    const antigua = diferido();
    let consultas = 0;
    const { api, llamadas } = crearAPI(async url => {
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
    const antigua = diferido();
    const { api, llamadas } = crearAPI(async url => {
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
    let tokens = 0;
    const { api, llamadas } = crearAPI(async url => {
        if (url.endsWith('sesion.php')) return sesion('token-' + ++tokens);
        if (url.endsWith('rechazado.php')) return {
            ok: false, status: 403, json: async () => { throw new SyntaxError('HTML'); }
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
    for (const fallo of ['sin-token', 'red']) {
        const { api, llamadas } = crearAPI(async () => {
            if (fallo === 'red') throw new TypeError('Sin red');
            return respuesta({ usuario: null });
        });
        await assert.rejects(api.solicitarJSON('api/registro.php', { method: 'POST', datos: {} }));
        assert.equal(llamadas.length, 1);
        assert.equal(llamadas[0].method, 'GET');
    }
});

test('logout descarta el token autenticado y prepara otra sesión anónima', async () => {
    let tokens = 0;
    const { api, llamadas } = crearAPI(async url => {
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
    for (const status of [400, 401, 403, 404, 500]) {
        const { api, llamadas } = crearAPI(async url => url.endsWith('sesion.php')
            ? sesion('token') : respuesta({ estado: 'error', mensaje: 'Revisá la operación' }, status));
        await assert.rejects(api.solicitarJSON('api/mis_movimientos.php', { method: 'POST', datos: {}, privada: true }),
            e => e.status === status && e.message === 'Revisá la operación');
        assert.equal(llamadas.filter(p => p.method === 'POST').length, 1);
    }
});
