// Importa puppeteer para las pruebas.
import puppeteer from "puppeteer-core";
// Importa lighthouse para las pruebas.
import lighthouse from "lighthouse";
// Importa fs para las pruebas.
import fs from "node:fs";
// Inicializa CHROME.
const CHROME = process.env.CHROME_PATH || (process.platform === "win32"
  // Selecciona este valor si se cumple la condición anterior.
  ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "/usr/bin/google-chrome");

// Inicializa BASE.
const BASE = process.argv[2] || "http://localhost/NipinFinan/";
// Inicializa axeSrc.
const axeSrc = fs.readFileSync(new URL("./node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
// Inicializa browser.
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
// Inicializa results.
const results = [];

// Define lh con sus entradas y el resultado que devuelve.
async function lh(route, formFactor) {
  // Audita una ruta con Lighthouse y registra puntuación y fallos.
  const page = await browser.newPage();
  // Inicializa flags.
  const flags = { output: "json", onlyCategories: ["accessibility"], logLevel: "error", formFactor,
    // Incluye el campo screenEmulation.
    screenEmulation: formFactor === "desktop" ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false } : undefined };
  // Inicializa r.
  const r = await lighthouse(BASE + "#/" + route, flags, undefined, page);
  // Inicializa lhr.
  const lhr = r.lhr;
  // Inicializa fails.
  const fails = Object.values(lhr.audits).filter(a => a.score !== null && a.score < 1 && !["notApplicable", "manual", "informative"].includes(a.scoreDisplayMode))
    // Llama a .map con los datos indicados.
    .map(a => a.id + ": " + (a.details?.items || []).slice(0, 4).map(i => (i.node?.snippet || "") + " -> " + (i.node?.explanation || "").split("\n")[1]?.trim()).join(" || "));
  // Llama a results.push con los datos indicados.
  results.push({ route, formFactor, score: Math.round(lhr.categories.accessibility.score * 100), fails });
  // Espera que termine la operación asíncrona antes de continuar.
  await page.close();
}

// Define axe con sus entradas y el resultado que devuelve.
async function axe(page, label) {
  // Espera que termine la operación asíncrona antes de continuar.
  await page.evaluate(axeSrc);
  // Inicializa r.
  const r = await page.evaluate(async () => (await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] })).violations
    // Llama a .map con los datos indicados.
    .map(v => v.id + ": " + v.nodes.slice(0, 3).map(n => n.html.slice(0, 90) + " -> " + n.failureSummary.split("\n")[1]?.trim()).join(" || ")));
  // Llama a results.push con los datos indicados.
  results.push({ route: label, formFactor: "axe", fails: r });
}

// Inicializa rutasPublicas.
const rutasPublicas = ["inicio", "acceso"];
// Inicializa rutasPrivadas.
const rutasPrivadas = ["inicio", "registrar", "movimientos", "categorias", "categorias/alimentacion", "categorias/sueldo", "categorias/salud"];

// Recorre los elementos para procesar cada uno dentro del bloque.
for (const f of ["mobile", "desktop"]) for (const r of rutasPublicas) await lh(r, f);

// Sesión de prueba por la API real (mismo navegador → misma cookie)
const p = await browser.newPage();
// Espera que termine la operación asíncrona antes de continuar.
await p.goto(BASE + "#/inicio", { waitUntil: "networkidle0" });
// Inicia email: correo de la cuenta.
const email = "audit" + Date.now() + "@example.com";
// Inicializa setup.
const setup = await p.evaluate(async (email) => {
  // Inspecciona o prepara el estado dentro del navegador de prueba.
  const j = async (u, o = {}) => {
      // Envía la petición HTTP y espera la respuesta del servidor.
      const r = await fetch(u, { credentials: "same-origin", ...o }); return [r.status, await r.json()];
  };
  // Separa los valores recibidos en las variables [, s].
  let [, s] = await j("api/sesion.php");
  // Convierte el objeto JavaScript a texto JSON.
  const post = (u, b, t, m = "POST") => j(u, { method: m, headers: { "Content-Type": "application/json", "X-CSRF-Token": t }, body: JSON.stringify(b) });
  // Inicializa reg.
  const reg = await post("api/registro.php", { nombre: "Usuario Auditoría", email, password: "Clave-segura-123" }, s.csrfToken);
  // Inicializa log.
  const log = await post("api/login.php", { email, password: "Clave-segura-123" }, s.csrfToken);
  // Inicializa t.
  const t = log[1].csrfToken;
  // Inicializa mv.
  const mv = (b) => post("api/mis_movimientos.php", { comentario: "", cuotas: 1, fecha: "2026-11-14", ...b }, t);
  // Inicializa a.
  const a = await mv({ tipo: "gasto", descripcion: "Supermercado", monto: 10000, categoria: "Alimentación", medioPago: "Efectivo" });
  // Inicializa b.
  const b = await mv({ tipo: "ingreso", descripcion: "Sueldo noviembre", monto: 150000, categoria: "Sueldo", medioPago: "Transferencia" });
  // Inicializa c.
  const c = await mv({ tipo: "gasto", descripcion: "<img src=x onerror=alert(1)> Heladera", monto: 300000, categoria: "Servicios", medioPago: "Tarjeta de crédito", cuotas: 12 });
  // Devuelve las funciones o datos públicos al código que llamó.
  return { reg: reg[0], log: log[0], movs: [a[0], b[0], c[0]], c: c[1].movimiento };
}, email);
// Convierte el objeto JavaScript a texto JSON.
results.push({ route: "setup", formFactor: "api", fails: [JSON.stringify(setup)] });
// Espera que termine la operación asíncrona antes de continuar.
await p.close();

// Recorre los elementos para procesar cada uno dentro del bloque.
for (const f of ["mobile", "desktop"]) for (const r of rutasPrivadas) await lh(r, f);

// Estados interactivos con axe
const q = await browser.newPage();
// Espera que termine la operación asíncrona antes de continuar.
await q.setViewport({ width: 1280, height: 900 });
// Espera que termine la operación asíncrona antes de continuar.
await q.goto(BASE + "#/movimientos", { waitUntil: "networkidle0" });
// Espera que termine la operación asíncrona antes de continuar.
await new Promise(r => setTimeout(r, 800));
// Espera que termine la operación asíncrona antes de continuar.
await axe(q, "movimientos (listado)");
// Muestra texto sin interpretarlo como HTML.
const xss = await q.evaluate(() => ({ imgs: document.querySelectorAll("#vista-movimientos img").length, texto: document.querySelector("#vista-movimientos")?.textContent.includes("<img src=x") }));
// Convierte el objeto JavaScript a texto JSON.
results.push({ route: "xss", formFactor: "check", fails: [JSON.stringify(xss)] });
// Muestra texto sin interpretarlo como HTML.
const botones = await q.$$eval("#vista-movimientos button", bs => bs.map(b => b.textContent.trim()));
// Convierte el objeto JavaScript a texto JSON.
results.push({ route: "botones listado", formFactor: "info", fails: [JSON.stringify(botones.slice(0, 8))] });
// Inicializa idxEditar.
const idxEditar = botones.findIndex(t => /editar/i.test(t));
// Comprueba esta condición.
if (idxEditar >= 0) {
    // Actualiza los datos de la estructura indicada.
    (await q.$$("#vista-movimientos button"))[idxEditar].click(); await new Promise(r => setTimeout(r, 500)); await axe(q, "movimientos (edición abierta)");
}
// Espera que termine la operación asíncrona antes de continuar.
await q.goto(BASE + "#/movimientos", { waitUntil: "networkidle0" }); await new Promise(r => setTimeout(r, 800));
// Muestra texto sin interpretarlo como HTML.
const b2 = await q.$$eval("#vista-movimientos button", bs => bs.map(b => b.textContent.trim()));
// Inicializa idxEliminar.
const idxEliminar = b2.findIndex(t => /eliminar/i.test(t));
// Comprueba esta condición.
if (idxEliminar >= 0) {
    // Actualiza los datos de la estructura indicada.
    (await q.$$("#vista-movimientos button"))[idxEliminar].click(); await new Promise(r => setTimeout(r, 500)); await axe(q, "movimientos (diálogo eliminar)");
}
// Espera que termine la operación asíncrona antes de continuar.
await q.goto(BASE + "#/registrar", { waitUntil: "networkidle0" }); await new Promise(r => setTimeout(r, 500));
// Maneja el rechazo de la operación asíncrona.
await q.click("form button[type=submit]").catch(() => {
    }); await new Promise(r => setTimeout(r, 500));
// Espera que termine la operación asíncrona antes de continuar.
await axe(q, "registrar (envío vacío con errores)");
// Espera que termine la operación asíncrona antes de continuar.
await browser.close();

// Recorre los elementos para procesar cada uno dentro del bloque.
for (const r of results) {
  // Llama a console.log con los datos indicados.
  console.log(`[${r.formFactor}] ${r.route}${r.score !== undefined ? " = " + r.score : ""}`);
  // Recorre los elementos para procesar cada uno dentro del bloque.
  for (const f of r.fails) console.log("   - " + f);
}
