// Audita Lighthouse y axe en una base de prueba con datos nuevos; consultar el README para ejecutarlo.
import puppeteer from "puppeteer-core"; // Importa puppeteer para las pruebas.
import lighthouse from "lighthouse"; // Importa lighthouse para las pruebas.
import fs from "node:fs"; // Importa fs para las pruebas.
const CHROME = process.env.CHROME_PATH || (process.platform === "win32" // Inicializa CHROME.
  ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "/usr/bin/google-chrome"); // Selecciona este valor si se cumple la condición anterior.

const BASE = process.argv[2] || "http://localhost/NipinFinan/"; // Inicializa BASE.
const axeSrc = fs.readFileSync(new URL("./node_modules/axe-core/axe.min.js", import.meta.url), "utf8"); // Inicializa axeSrc.
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] }); // Inicializa browser.
const results = []; // Inicializa results.

async function lh(route, formFactor) { // Define lh con sus entradas y el resultado que devuelve.
  // Audita una ruta con Lighthouse y registra puntuación y fallos.
  const page = await browser.newPage(); // Inicializa page.
  const flags = { output: "json", onlyCategories: ["accessibility"], logLevel: "error", formFactor, // Inicializa flags.
    screenEmulation: formFactor === "desktop" ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false } : undefined }; // Incluye el campo screenEmulation en esta estructura.
  const r = await lighthouse(BASE + "#/" + route, flags, undefined, page); // Inicializa r.
  const lhr = r.lhr; // Inicializa lhr.
  const fails = Object.values(lhr.audits).filter(a => a.score !== null && a.score < 1 && !["notApplicable", "manual", "informative"].includes(a.scoreDisplayMode)) // Inicializa fails.
    .map(a => a.id + ": " + (a.details?.items || []).slice(0, 4).map(i => (i.node?.snippet || "") + " -> " + (i.node?.explanation || "").split("\n")[1]?.trim()).join(" || ")); // Llama a .map con los datos indicados.
  results.push({ route, formFactor, score: Math.round(lhr.categories.accessibility.score * 100), fails }); // Llama a results.push con los datos indicados.
  await page.close(); // Espera que termine la operación asíncrona antes de continuar.
} // Finaliza este bloque.

async function axe(page, label) { // Define axe con sus entradas y el resultado que devuelve.
  // Audita el estado actual de la página con las reglas de axe.
  await page.evaluate(axeSrc); // Espera que termine la operación asíncrona antes de continuar.
  const r = await page.evaluate(async () => (await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] })).violations // Inicializa r.
    .map(v => v.id + ": " + v.nodes.slice(0, 3).map(n => n.html.slice(0, 90) + " -> " + n.failureSummary.split("\n")[1]?.trim()).join(" || "))); // Llama a .map con los datos indicados.
  results.push({ route: label, formFactor: "axe", fails: r }); // Llama a results.push con los datos indicados.
} // Finaliza este bloque.

const rutasPublicas = ["inicio", "acceso"]; // Inicializa rutasPublicas.
const rutasPrivadas = ["inicio", "registrar", "movimientos", "categorias", "categorias/alimentacion", "categorias/sueldo", "categorias/salud"]; // Inicializa rutasPrivadas.

for (const f of ["mobile", "desktop"]) for (const r of rutasPublicas) await lh(r, f); // Recorre los elementos para procesar cada uno dentro del bloque.

// Sesión de prueba por la API real (mismo navegador → misma cookie)
const p = await browser.newPage(); // Inicializa p.
await p.goto(BASE + "#/inicio", { waitUntil: "networkidle0" }); // Espera que termine la operación asíncrona antes de continuar.
const email = "audit" + Date.now() + "@example.com"; // Inicializa la variable email: correo de la cuenta.
const setup = await p.evaluate(async (email) => { // Inicializa setup.
  // Inspecciona o prepara el estado dentro del navegador de prueba.
  const j = async (u, o = {}) => { // Inicializa j.
      // Ejecuta una petición desde el navegador autenticado de prueba.
      const r = await fetch(u, { credentials: "same-origin", ...o }); return [r.status, await r.json()]; // Envía la petición HTTP y espera la respuesta del servidor.
  }; // Completa la estructura o llamada iniciada arriba.
  let [, s] = await j("api/sesion.php"); // Separa los valores recibidos en las variables [, s].
  const post = (u, b, t, m = "POST") => j(u, { method: m, headers: { "Content-Type": "application/json", "X-CSRF-Token": t }, body: JSON.stringify(b) }); // Convierte el objeto JavaScript a texto JSON.
  const reg = await post("api/registro.php", { nombre: "Usuario Auditoría", email, password: "Clave-segura-123" }, s.csrfToken); // Inicializa reg.
  const log = await post("api/login.php", { email, password: "Clave-segura-123" }, s.csrfToken); // Inicializa log.
  const t = log[1].csrfToken; // Inicializa t.
  const mv = (b) => post("api/mis_movimientos.php", { comentario: "", cuotas: 1, fecha: "2026-11-14", ...b }, t); // Inicializa mv.
  const a = await mv({ tipo: "gasto", descripcion: "Supermercado", monto: 10000, categoria: "Alimentación", medioPago: "Efectivo" }); // Inicializa a.
  const b = await mv({ tipo: "ingreso", descripcion: "Sueldo noviembre", monto: 150000, categoria: "Sueldo", medioPago: "Transferencia" }); // Inicializa b.
  const c = await mv({ tipo: "gasto", descripcion: "<img src=x onerror=alert(1)> Heladera", monto: 300000, categoria: "Servicios", medioPago: "Tarjeta de crédito", cuotas: 12 }); // Inicializa c.
  return { reg: reg[0], log: log[0], movs: [a[0], b[0], c[0]], c: c[1].movimiento }; // Devuelve las funciones o datos públicos al código que llamó.
}, email); // Completa los argumentos de la operación iniciada arriba.
results.push({ route: "setup", formFactor: "api", fails: [JSON.stringify(setup)] }); // Convierte el objeto JavaScript a texto JSON.
await p.close(); // Espera que termine la operación asíncrona antes de continuar.

for (const f of ["mobile", "desktop"]) for (const r of rutasPrivadas) await lh(r, f); // Recorre los elementos para procesar cada uno dentro del bloque.

// Estados interactivos con axe
const q = await browser.newPage(); // Inicializa q.
await q.setViewport({ width: 1280, height: 900 }); // Espera que termine la operación asíncrona antes de continuar.
await q.goto(BASE + "#/movimientos", { waitUntil: "networkidle0" }); // Espera que termine la operación asíncrona antes de continuar.
await new Promise(r => setTimeout(r, 800)); // Espera que termine la operación asíncrona antes de continuar.
await axe(q, "movimientos (listado)"); // Espera que termine la operación asíncrona antes de continuar.
const xss = await q.evaluate(() => ({ imgs: document.querySelectorAll("#vista-movimientos img").length, texto: document.querySelector("#vista-movimientos")?.textContent.includes("<img src=x") })); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
results.push({ route: "xss", formFactor: "check", fails: [JSON.stringify(xss)] }); // Convierte el objeto JavaScript a texto JSON.
const botones = await q.$$eval("#vista-movimientos button", bs => bs.map(b => b.textContent.trim())); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
results.push({ route: "botones listado", formFactor: "info", fails: [JSON.stringify(botones.slice(0, 8))] }); // Convierte el objeto JavaScript a texto JSON.
const idxEditar = botones.findIndex(t => /editar/i.test(t)); // Inicializa idxEditar.
if (idxEditar >= 0) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
    // Audita con axe el formulario de edición abierto.
    (await q.$$("#vista-movimientos button"))[idxEditar].click(); await new Promise(r => setTimeout(r, 500)); await axe(q, "movimientos (edición abierta)"); // Actualiza los datos de la estructura indicada.
} // Finaliza este bloque.
await q.goto(BASE + "#/movimientos", { waitUntil: "networkidle0" }); await new Promise(r => setTimeout(r, 800)); // Espera que termine la operación asíncrona antes de continuar.
const b2 = await q.$$eval("#vista-movimientos button", bs => bs.map(b => b.textContent.trim())); // Escribe texto en el DOM sin interpretarlo como HTML; evita insertar etiquetas.
const idxEliminar = b2.findIndex(t => /eliminar/i.test(t)); // Inicializa idxEliminar.
if (idxEliminar >= 0) { // Evalúa la condición y ejecuta este bloque sólo si resulta verdadera.
    // Audita con axe el diálogo de confirmación de baja abierto.
    (await q.$$("#vista-movimientos button"))[idxEliminar].click(); await new Promise(r => setTimeout(r, 500)); await axe(q, "movimientos (diálogo eliminar)"); // Actualiza los datos de la estructura indicada.
} // Finaliza este bloque.
await q.goto(BASE + "#/registrar", { waitUntil: "networkidle0" }); await new Promise(r => setTimeout(r, 500)); // Espera que termine la operación asíncrona antes de continuar.
await q.click("form button[type=submit]").catch(() => { // Maneja el rechazo de la operación asíncrona.
    // Finaliza este callback sin acciones adicionales.
    }); await new Promise(r => setTimeout(r, 500)); // Actualiza los datos de la estructura indicada.
await axe(q, "registrar (envío vacío con errores)"); // Espera que termine la operación asíncrona antes de continuar.
await browser.close(); // Espera que termine la operación asíncrona antes de continuar.

for (const r of results) { // Recorre los elementos para procesar cada uno dentro del bloque.
  // Recorre los elementos para acumular o comprobar sus resultados.
  console.log(`[${r.formFactor}] ${r.route}${r.score !== undefined ? " = " + r.score : ""}`); // Llama a console.log con los datos indicados.
  for (const f of r.fails) console.log("   - " + f); // Recorre los elementos para procesar cada uno dentro del bloque.
} // Finaliza este bloque.
