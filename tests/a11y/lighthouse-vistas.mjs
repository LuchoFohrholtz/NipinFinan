// Auditoría de accesibilidad de NipinFinan (J3/J5, AE4).
// Corre Lighthouse (categoría Accesibilidad) en cada vista de la SPA, sin sesión y con sesión,
// en móvil y escritorio, y axe-core (WCAG 2.1 A/AA) sobre estados interactivos: edición,
// diálogo de baja y errores del formulario. Crea una cuenta de prueba nueva en cada ejecución.
// Uso: cd tests/a11y && npm install && node lighthouse-vistas.mjs http://localhost/NipinFinan/
// Usar una base de prueba: agrega movimientos de ejemplo a la cuenta creada.
import puppeteer from "puppeteer-core";
import lighthouse from "lighthouse";
import fs from "node:fs";
const CHROME = process.env.CHROME_PATH || (process.platform === "win32"
  ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "/usr/bin/google-chrome");

const BASE = process.argv[2] || "http://localhost/NipinFinan/";
const axeSrc = fs.readFileSync(new URL("./node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const results = [];

async function lh(route, formFactor) {
  const page = await browser.newPage();
  const flags = { output: "json", onlyCategories: ["accessibility"], logLevel: "error", formFactor,
    screenEmulation: formFactor === "desktop" ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false } : undefined };
  const r = await lighthouse(BASE + "#/" + route, flags, undefined, page);
  const lhr = r.lhr;
  const fails = Object.values(lhr.audits).filter(a => a.score !== null && a.score < 1 && !["notApplicable", "manual", "informative"].includes(a.scoreDisplayMode))
    .map(a => a.id + ": " + (a.details?.items || []).slice(0, 4).map(i => (i.node?.snippet || "") + " -> " + (i.node?.explanation || "").split("\n")[1]?.trim()).join(" || "));
  results.push({ route, formFactor, score: Math.round(lhr.categories.accessibility.score * 100), fails });
  await page.close();
}

async function axe(page, label) {
  await page.evaluate(axeSrc);
  const r = await page.evaluate(async () => (await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] })).violations
    .map(v => v.id + ": " + v.nodes.slice(0, 3).map(n => n.html.slice(0, 90) + " -> " + n.failureSummary.split("\n")[1]?.trim()).join(" || ")));
  results.push({ route: label, formFactor: "axe", fails: r });
}

const rutasPublicas = ["inicio", "acceso"];
const rutasPrivadas = ["inicio", "registrar", "movimientos", "categorias", "categorias/alimentacion", "categorias/sueldo", "categorias/salud"];

for (const f of ["mobile", "desktop"]) for (const r of rutasPublicas) await lh(r, f);

// Sesión de prueba por la API real (mismo navegador → misma cookie)
const p = await browser.newPage();
await p.goto(BASE + "#/inicio", { waitUntil: "networkidle0" });
const email = "audit" + Date.now() + "@example.com";
const setup = await p.evaluate(async (email) => {
  const j = async (u, o = {}) => { const r = await fetch(u, { credentials: "same-origin", ...o }); return [r.status, await r.json()]; };
  let [, s] = await j("api/sesion.php");
  const post = (u, b, t, m = "POST") => j(u, { method: m, headers: { "Content-Type": "application/json", "X-CSRF-Token": t }, body: JSON.stringify(b) });
  const reg = await post("api/registro.php", { nombre: "Usuario Auditoría", email, password: "Clave-segura-123" }, s.csrfToken);
  const log = await post("api/login.php", { email, password: "Clave-segura-123" }, s.csrfToken);
  const t = log[1].csrfToken;
  const mv = (b) => post("api/mis_movimientos.php", { comentario: "", cuotas: 1, fecha: "2026-11-14", ...b }, t);
  const a = await mv({ tipo: "gasto", descripcion: "Supermercado", monto: 10000, categoria: "Alimentación", medioPago: "Efectivo" });
  const b = await mv({ tipo: "ingreso", descripcion: "Sueldo noviembre", monto: 150000, categoria: "Sueldo", medioPago: "Transferencia" });
  const c = await mv({ tipo: "gasto", descripcion: "<img src=x onerror=alert(1)> Heladera", monto: 300000, categoria: "Servicios", medioPago: "Tarjeta de crédito", cuotas: 12 });
  return { reg: reg[0], log: log[0], movs: [a[0], b[0], c[0]], c: c[1].movimiento };
}, email);
results.push({ route: "setup", formFactor: "api", fails: [JSON.stringify(setup)] });
await p.close();

for (const f of ["mobile", "desktop"]) for (const r of rutasPrivadas) await lh(r, f);

// Estados interactivos con axe
const q = await browser.newPage();
await q.setViewport({ width: 1280, height: 900 });
await q.goto(BASE + "#/movimientos", { waitUntil: "networkidle0" });
await new Promise(r => setTimeout(r, 800));
await axe(q, "movimientos (listado)");
const xss = await q.evaluate(() => ({ imgs: document.querySelectorAll("#vista-movimientos img").length, texto: document.querySelector("#vista-movimientos")?.textContent.includes("<img src=x") }));
results.push({ route: "xss", formFactor: "check", fails: [JSON.stringify(xss)] });
const botones = await q.$$eval("#vista-movimientos button", bs => bs.map(b => b.textContent.trim()));
results.push({ route: "botones listado", formFactor: "info", fails: [JSON.stringify(botones.slice(0, 8))] });
const idxEditar = botones.findIndex(t => /editar/i.test(t));
if (idxEditar >= 0) { (await q.$$("#vista-movimientos button"))[idxEditar].click(); await new Promise(r => setTimeout(r, 500)); await axe(q, "movimientos (edición abierta)"); }
await q.goto(BASE + "#/movimientos", { waitUntil: "networkidle0" }); await new Promise(r => setTimeout(r, 800));
const b2 = await q.$$eval("#vista-movimientos button", bs => bs.map(b => b.textContent.trim()));
const idxEliminar = b2.findIndex(t => /eliminar/i.test(t));
if (idxEliminar >= 0) { (await q.$$("#vista-movimientos button"))[idxEliminar].click(); await new Promise(r => setTimeout(r, 500)); await axe(q, "movimientos (diálogo eliminar)"); }
await q.goto(BASE + "#/registrar", { waitUntil: "networkidle0" }); await new Promise(r => setTimeout(r, 500));
await q.click("form button[type=submit]").catch(() => {}); await new Promise(r => setTimeout(r, 500));
await axe(q, "registrar (envío vacío con errores)");
await browser.close();

for (const r of results) {
  console.log(`[${r.formFactor}] ${r.route}${r.score !== undefined ? " = " + r.score : ""}`);
  for (const f of r.fails) console.log("   - " + f);
}
