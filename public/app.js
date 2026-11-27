import {
  calcularGarantia, cartaReclamacion, proximaRenovacion, costeAnual, numeroDe, hoyISO, fechaLarga, fechaCorta,
  euros, sumarDias, diasEntre, duracion, quedanFrase, TIPOS, TIPOS_RENOVACION, AVISO_PRONTO_DIAS,
} from './garantia.js';
import * as db from './db.js';
import { esNativa, permisoAvisos, programarAvisos, compartirArchivo, compartirTexto, registrarSW, alPulsarAtras, cerrarDialogoAbierto } from './native.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const leer = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin espacio */ } };

const estado = { productos: [], renovaciones: [], filtro: 'todos', busqueda: '', vista: 'tickets', urls: new Map() };
const hoy = () => hoyISO();

function toast(t) {
  const el = $('#toast'); el.textContent = t; el.classList.add('ver');
  clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('ver'), 2600);
}
function abrirDialogo(d) { if (!d.open) d.showModal(); d.scrollTop = 0; }

// URL de una foto guardada (se reutiliza mientras la app está abierta).
async function urlFoto(id) {
  if (estado.urls.has(id)) return estado.urls.get(id);
  const f = await db.obtener('fotos', id);
  if (!f) return null;
  const u = URL.createObjectURL(f.blob);
  estado.urls.set(id, u);
  return u;
}

// ================= Navegación =================
function irA(vista) {
  estado.vista = vista;
  for (const s of document.querySelectorAll('.vista')) s.hidden = s.id !== `vista-${vista}`;
  for (const b of document.querySelectorAll('.pestañas button')) {
    if (b.dataset.vista === vista) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  }
  $('#btn-nuevo').hidden = vista === 'mas';
  $('#fab-texto').textContent = vista === 'renovaciones' ? 'Añadir renovación' : 'Guardar ticket';
  if (vista === 'renovaciones') pintarRenovaciones();
  if (vista === 'mas') pintarMas();
  scrollTo({ top: 0 });
}
document.querySelectorAll('.pestañas button').forEach((b) => b.addEventListener('click', () => irA(b.dataset.vista)));
$('#btn-nuevo').addEventListener('click', () => (estado.vista === 'renovaciones' ? abrirRenovacion() : abrirProducto()));

// ================= Lista de tickets =================
const SELLOS = { vigente: 'En garantía', pronto: 'Termina pronto', caducada: 'Caducada' };

document.querySelectorAll('.filtro').forEach((b) => b.addEventListener('click', () => {
  estado.filtro = b.dataset.filtro;
  document.querySelectorAll('.filtro').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  pintarTickets();
}));
$('#buscar').addEventListener('input', (e) => { estado.busqueda = e.target.value.trim().toLowerCase(); pintarTickets(); });

function conGarantia() {
  return estado.productos.map((p) => ({ p, g: calcularGarantia(p, hoy()) }));
}

function pintarTickets() {
  const items = conGarantia();
  const pronto = items.filter((x) => x.g.estado === 'pronto').length;
  const vigentes = items.filter((x) => x.g.estado !== 'caducada').length;
  $('#resumen').innerHTML = items.length
    ? `${items.length} ${items.length === 1 ? 'ticket guardado' : 'tickets guardados'}, ${vigentes} en garantía.${pronto ? ` <b>${pronto} ${pronto === 1 ? 'termina' : 'terminan'} en menos de dos meses.</b>` : ''}` : '';
  const q = estado.busqueda;
  const orden = { pronto: 0, vigente: 1, caducada: 2 };
  const lista = items
    .filter((x) => estado.filtro === 'todos' || x.g.estado === estado.filtro)
    .filter((x) => !q || `${x.p.nombre} ${x.p.tienda || ''} ${x.p.notas || ''}`.toLowerCase().includes(q))
    .sort((a, b) => orden[a.g.estado] - orden[b.g.estado] || (a.g.estado === 'caducada' ? b.g.finTotal.localeCompare(a.g.finTotal) : a.g.finTotal.localeCompare(b.g.finTotal)));
  const ul = $('#tickets');
  if (!estado.productos.length) {
    ul.innerHTML = `<li class="vacio"><div class="ticket ticket-vacio"><p class="t-tienda">Aún no hay tickets</p>
      <p>Cuando compres algo, hazle una foto al ticket. Te avisaremos antes de que termine la garantía y, si se estropea, te prepararemos la carta para reclamar.</p>
      <button class="boton" type="button" id="primero">Guardar mi primer ticket</button></div></li>`;
    $('#primero').onclick = () => abrirProducto();
    return;
  }
  if (!lista.length) { ul.innerHTML = '<li class="nota">No hay tickets con ese filtro.</li>'; return; }
  ul.innerHTML = lista.map(({ p, g }) => `
    <li><button type="button" class="ticket estado-${g.estado}" data-id="${esc(p.id)}">
      <span class="sello">${SELLOS[g.estado]}</span>
      <span class="t-tienda">${esc(p.tienda || 'Sin tienda')}</span>
      <span class="t-producto">${esc(p.nombre)}</span>
      <span class="t-linea"><span>${fechaCorta(p.fechaCompra)}</span><span>${esc(euros(p.precio))}</span></span>
      <span class="t-raya"></span>
      <span class="t-linea t-fuerte"><span>Garantía hasta</span><span>${fechaCorta(g.finTotal)}</span></span>
      <span class="barra" aria-hidden="true"><i style="width:${Math.round(g.progreso * 100)}%"></i></span>
      <span class="t-pie">${g.estado === 'caducada' ? `Terminó hace ${duracion(g.finTotal, hoy())}` : quedanFrase(g.quedan)}${p.fotos?.length ? '' : '<span class="sin-foto">Falta la foto del ticket</span>'}</span>
    </button></li>`).join('');
  ul.querySelectorAll('.ticket[data-id]').forEach((b) => b.addEventListener('click', () => abrirDetalle(b.dataset.id)));
}

// ================= Formulario de producto =================
const dlgP = $('#dlg-producto');
const fp = {
  nombre: $('#p-nombre'), tienda: $('#p-tienda'), fecha: $('#p-fecha'), precio: $('#p-precio'),
  segunda: $('#p-segunda'), extra: $('#p-extra'), notas: $('#p-notas'),
};
let edicion = null; // { id, fotos: [ids], nuevas: [{id, blob}] , quitadas: [] }

function tipoElegido() { return document.querySelector('input[name="p-tipo"]:checked').value; }
document.querySelectorAll('input[name="p-tipo"]').forEach((r) => r.addEventListener('change', () => { $('#campo-segunda').hidden = tipoElegido() !== 'segunda'; }));

function abrirProducto(p = null) {
  edicion = { id: p?.id || null, fotos: [...(p?.fotos || [])], nuevas: [], quitadas: [] };
  $('#titulo-producto').textContent = p ? 'Editar ticket' : 'Guardar un ticket';
  fp.nombre.value = p?.nombre || ''; fp.tienda.value = p?.tienda || ''; fp.fecha.value = p?.fechaCompra || hoy();
  fp.precio.value = p?.precio ?? ''; fp.segunda.value = String(p?.añosSegunda || 3); fp.extra.value = p?.garantiaExtraHasta || '';
  fp.notas.value = p?.notas || '';
  document.querySelector(`input[name="p-tipo"][value="${p?.tipo || 'nuevo'}"]`).checked = true;
  $('#campo-segunda').hidden = (p?.tipo || 'nuevo') !== 'segunda';
  $('#tiendas').innerHTML = [...new Set(estado.productos.map((x) => x.tienda).filter(Boolean))].map((t) => `<option value="${esc(t)}">`).join('');
  pintarFotosForm();
  abrirDialogo(dlgP);
}

async function pintarFotosForm() {
  const cont = $('#fotos-form');
  const guardadas = await Promise.all(edicion.fotos.map(async (id) => ({ id, url: await urlFoto(id) })));
  const nuevas = edicion.nuevas.map((n) => ({ id: n.id, url: n.url }));
  const todas = [...guardadas, ...nuevas].filter((x) => x.url);
  cont.innerHTML = todas.length ? todas.map((f) => `<figure><img src="${f.url}" alt="Foto del ticket">
      <button type="button" class="quitar" data-id="${f.id}" aria-label="Quitar foto">×</button></figure>`).join('')
    : '<p class="foto-vacia">Haz una foto al ticket o a la factura: es lo que te pedirán para reclamar.</p>';
  cont.querySelectorAll('.quitar').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.id;
    if (edicion.fotos.includes(id)) { edicion.fotos = edicion.fotos.filter((x) => x !== id); edicion.quitadas.push(id); }
    edicion.nuevas = edicion.nuevas.filter((x) => x.id !== id);
    pintarFotosForm();
  }));
}

// Reduce la foto a 1600 px y JPEG para que ocupe poco (≈ 200-400 KB).
async function comprimir(archivo) {
  const max = 1600;
  let img;
  try { img = await createImageBitmap(archivo, { imageOrientation: 'from-image' }); } catch {
    img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = URL.createObjectURL(archivo); });
  }
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob((b) => ok(b || archivo), 'image/jpeg', 0.82));
}

// Las fotos van al ticket en el que se eligieron, aunque mientras se preparan se pulse «Guardar» o se abra otro.
// Al guardar se espera a que terminen (edicion.preparando) para que no se queden fuera.
async function añadirFotos(lista) {
  const ed = edicion;
  const trabajo = (async () => {
    await ed.preparando;
    for (const archivo of lista) {
      if (!archivo.type.startsWith('image/')) continue;
      const blob = await comprimir(archivo);
      ed.nuevas.push({ id: db.nuevoId(), blob, url: URL.createObjectURL(blob) });
    }
  })();
  ed.preparando = trabajo.catch(() => {});
  await trabajo;
  if (edicion === ed) pintarFotosForm();
}
for (const id of ['#foto-camara', '#foto-galeria']) {
  $(id).addEventListener('change', async (e) => { await añadirFotos([...e.target.files]); e.target.value = ''; });
}

dlgP.addEventListener('close', async () => {
  if (dlgP.returnValue !== 'guardar') return;
  // Se leen el formulario y las fotos ANTES de guardar nada: mientras se guardan las fotos,
  // el formulario puede volver a abrirse (y vaciarse) para el ticket siguiente.
  const ed = edicion;
  const p = estado.productos.find((x) => x.id === ed.id) || { id: db.nuevoId(), creado: hoy() };
  const datos = {
    nombre: fp.nombre.value.trim(), tienda: fp.tienda.value.trim(), fechaCompra: fp.fecha.value,
    precio: fp.precio.value === '' ? null : Number(fp.precio.value), tipo: tipoElegido(),
    añosSegunda: Number(fp.segunda.value), garantiaExtraHasta: fp.extra.value || null, notas: fp.notas.value.trim(),
    actualizado: hoy(),
  };
  await ed.preparando; // si al pulsar «Guardar» aún se estaba preparando una foto, se espera a que termine
  datos.fotos = [...ed.fotos, ...ed.nuevas.map((n) => n.id)];
  for (const n of ed.nuevas) await db.poner('fotos', { id: n.id, blob: n.blob });
  for (const id of ed.quitadas) await db.borrar('fotos', id);
  Object.assign(p, datos);
  await db.poner('productos', p);
  if (!estado.productos.includes(p)) estado.productos.push(p);
  db.pedirPersistencia();
  pintarTickets();
  await reprogramarAvisos(true);
  toast(ed.id ? 'Ticket actualizado' : 'Ticket guardado');
});
$('#form-producto').addEventListener('submit', (e) => {
  if (e.submitter?.value === 'guardar' && (!fp.nombre.value.trim() || !fp.fecha.value)) { e.preventDefault(); fp.nombre.reportValidity(); }
});

// ================= Detalle =================
const dlgD = $('#dlg-detalle');
async function abrirDetalle(id) {
  const p = estado.productos.find((x) => x.id === id);
  if (!p) return;
  const g = calcularGarantia(p, hoy());
  const fotos = (await Promise.all((p.fotos || []).map(async (f) => ({ id: f, url: await urlFoto(f) })))).filter((x) => x.url);
  const presuncion = g.presuncion && hoy() <= g.presuncion
    ? `<li>Hasta el <b>${fechaLarga(g.presuncion)}</b>, si falla, la tienda tiene que demostrar que el defecto no venía de fábrica.</li>` : '';
  $('#detalle').innerHTML = `
    <div class="hoja-cabecera"><h3>${esc(p.nombre)}</h3>
      <button class="icono" type="button" data-cerrar aria-label="Cerrar"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    ${fotos.length ? `<div class="galeria">${fotos.map((f) => `<button type="button" class="miniatura" data-url="${f.url}"><img src="${f.url}" alt="Foto del ticket"></button>`).join('')}</div>`
      : '<p class="foto-vacia">Sin foto del ticket. Edita el ticket para añadirla.</p>'}
    <div class="ficha estado-${g.estado}">
      <p class="ficha-estado"><span class="sello">${SELLOS[g.estado]}</span></p>
      <p class="ficha-fin">Garantía hasta el <b>${fechaLarga(g.finTotal)}</b>${g.quedan ? ` (${quedanFrase(g.quedan).toLowerCase()})` : ''}.</p>
      <ul class="datos">
        <li>Comprado ${p.tienda ? `en <b>${esc(p.tienda)}</b> ` : ''}el ${fechaLarga(p.fechaCompra)}${p.precio != null ? ` por ${esc(euros(p.precio))}` : ''}.</li>
        <li>${esc(TIPOS[p.tipo] || TIPOS.nuevo)}: garantía legal hasta el ${fechaLarga(g.fin)}.${g.extra ? ` Garantía del fabricante hasta el ${fechaLarga(g.extra)}.` : ''}</li>
        ${presuncion}
        ${p.notas ? `<li>${esc(p.notas)}</li>` : ''}
      </ul>
      <p class="nota">${esc(g.explicacion)}</p>
    </div>
    <div class="acciones">
      ${g.estado !== 'caducada' ? '<button class="boton" type="button" data-accion="reclamar">Reclamar: se ha estropeado</button>' : ''}
      ${!esNativa && g.estado !== 'caducada' ? '<button class="boton boton-claro" type="button" data-accion="calendario">Añadir aviso al calendario</button>' : ''}
      <button class="boton boton-claro" type="button" data-accion="editar">Editar</button>
      <button class="boton boton-peligro" type="button" data-accion="borrar">Borrar</button>
    </div>`;
  dlgD.querySelector('[data-cerrar]').onclick = () => dlgD.close();
  dlgD.querySelectorAll('.miniatura').forEach((b) => b.addEventListener('click', () => { $('#visor-img').src = b.dataset.url; abrirDialogo($('#dlg-foto')); }));
  dlgD.querySelectorAll('[data-accion]').forEach((b) => b.addEventListener('click', async () => {
    const a = b.dataset.accion;
    if (a === 'editar') { dlgD.close(); abrirProducto(p); }
    if (a === 'reclamar') { dlgD.close(); abrirCarta(p); }
    if (a === 'calendario') {
      const aviso = sumarDias(g.finTotal, -30) > hoy() ? sumarDias(g.finTotal, -30) : g.finTotal;
      await compartirArchivo({ nombre: `garantia-${p.nombre.replace(/[^\w]+/g, '-').toLowerCase()}.ics`, tipo: 'text/calendar',
        contenido: ics({ titulo: `Termina la garantía: ${p.nombre}`, fecha: aviso, descripcion: `La garantía de ${p.nombre}${p.tienda ? ` (${p.tienda})` : ''} termina el ${fechaLarga(g.finTotal)}. Si falla algo, reclama antes.` }) });
    }
    if (a === 'borrar') {
      if (!confirm(`¿Borrar «${p.nombre}» y sus fotos?`)) return;
      for (const f of p.fotos || []) await db.borrar('fotos', f);
      await db.borrar('productos', p.id);
      estado.productos = estado.productos.filter((x) => x.id !== p.id);
      dlgD.close(); pintarTickets(); await reprogramarAvisos(); toast('Ticket borrado');
    }
  }));
  abrirDialogo(dlgD);
}

function ics({ titulo, fecha, descripcion }) {
  const f = fecha.replaceAll('-', ''), fin = sumarDias(fecha, 1).replaceAll('-', '');
  const e = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const sello = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Guarda el Ticket//ES', 'BEGIN:VEVENT', `UID:${f}-${Math.random().toString(36).slice(2)}@guardaticket`,
    `DTSTAMP:${sello}`, `DTSTART;VALUE=DATE:${f}`, `DTEND;VALUE=DATE:${fin}`, `SUMMARY:${e(titulo)}`, `DESCRIPTION:${e(descripcion)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${e(titulo)}`, 'TRIGGER:-P1DT0H', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
}

// ================= Carta de reclamación =================
const dlgC = $('#dlg-carta');
let cartaDe = null;
const cf = { problema: $('#c-problema'), nombre: $('#c-nombre'), lugar: $('#c-lugar'), contacto: $('#c-contacto'), texto: $('#c-texto') };
function abrirCarta(p) {
  cartaDe = p;
  const yo = leer('gt.yo', {});
  cf.nombre.value = yo.nombre || ''; cf.lugar.value = yo.lugar || ''; cf.contacto.value = yo.contacto || ''; cf.problema.value = '';
  redactar();
  abrirDialogo(dlgC);
}
function redactar() {
  const p = cartaDe; const g = calcularGarantia(p, hoy());
  cf.texto.value = cartaReclamacion(p, g, {
    nombre: cf.nombre.value.trim(), lugar: cf.lugar.value.trim(), contacto: cf.contacto.value.trim(), problema: cf.problema.value.trim(),
    solucion: document.querySelector('input[name="c-solucion"]:checked').value, hoy: hoy(),
  });
  escribir('gt.yo', { nombre: cf.nombre.value.trim(), lugar: cf.lugar.value.trim(), contacto: cf.contacto.value.trim() });
}
for (const el of [cf.problema, cf.nombre, cf.lugar, cf.contacto]) el.addEventListener('input', redactar);
document.querySelectorAll('input[name="c-solucion"]').forEach((r) => r.addEventListener('change', redactar));
$('#c-copiar').addEventListener('click', async () => { try { await navigator.clipboard.writeText(cf.texto.value); toast('Carta copiada'); } catch { cf.texto.select(); } });
$('#c-compartir').addEventListener('click', async () => {
  const r = await compartirTexto(cf.texto.value, `Reclamación: ${cartaDe.nombre}`);
  if (r === 'copiado') toast('Carta copiada: pégala en tu correo');
});

// ================= Renovaciones =================
const dlgR = $('#dlg-renovacion');
const fr = { nombre: $('#r-nombre'), tipo: $('#r-tipo'), fecha: $('#r-fecha'), periodo: $('#r-periodo'), importe: $('#r-importe'), avisar: $('#r-avisar') };
fr.tipo.innerHTML = Object.entries(TIPOS_RENOVACION).map(([k, v]) => `<option value="${k}">${esc(v.nombre)}</option>`).join('');
let renEdit = null;
const CONSEJOS = {
  seguro: 'Para que no se renueve, avisa a la aseguradora por escrito con al menos un mes de antelación (art. 22 de la Ley de Contrato de Seguro). Por eso te avisamos 45 días antes: te da tiempo a comparar.',
  suscripcion: 'Si no la usas, date de baja antes de esta fecha para que no te vuelvan a cobrar.',
  contrato: 'Revisa si tu tarifa sigue siendo buena antes de que se renueve.',
  gimnasio: 'Mira en tu contrato con cuánta antelación tienes que avisar para darte de baja.',
  otro: '',
};
fr.tipo.addEventListener('change', () => { if (!renEdit) fr.avisar.value = String(TIPOS_RENOVACION[fr.tipo.value].avisar); $('#r-consejo').textContent = CONSEJOS[fr.tipo.value]; });

function abrirRenovacion(r = null) {
  renEdit = r;
  $('#titulo-renovacion').textContent = r ? 'Editar renovación' : 'Nueva renovación';
  fr.nombre.value = r?.nombre || ''; fr.tipo.value = r?.tipo || 'seguro'; fr.fecha.value = r ? proximaRenovacion(r, hoy()) : '';
  fr.periodo.value = r?.periodicidad || 'anual'; fr.importe.value = r?.importe ?? ''; fr.avisar.value = String(r?.avisarDias || TIPOS_RENOVACION[fr.tipo.value].avisar);
  $('#r-consejo').textContent = CONSEJOS[fr.tipo.value];
  $('#r-borrar').hidden = !r;
  abrirDialogo(dlgR);
}
$('#form-renovacion').addEventListener('submit', (e) => {
  if (e.submitter?.value === 'guardar' && (!fr.nombre.value.trim() || !fr.fecha.value)) { e.preventDefault(); (fr.nombre.value.trim() ? fr.fecha : fr.nombre).reportValidity(); }
});
dlgR.addEventListener('close', async () => {
  if (dlgR.returnValue === 'borrar' && renEdit) {
    if (!confirm(`¿Borrar «${renEdit.nombre}»?`)) return;
    await db.borrar('renovaciones', renEdit.id);
    estado.renovaciones = estado.renovaciones.filter((x) => x.id !== renEdit.id);
  } else if (dlgR.returnValue === 'guardar') {
    const r = renEdit || { id: db.nuevoId() };
    Object.assign(r, { nombre: fr.nombre.value.trim(), tipo: fr.tipo.value, proxima: fr.fecha.value, periodicidad: fr.periodo.value,
      importe: fr.importe.value === '' ? null : Number(fr.importe.value), avisarDias: Number(fr.avisar.value) });
    await db.poner('renovaciones', r);
    if (!estado.renovaciones.includes(r)) estado.renovaciones.push(r);
    db.pedirPersistencia();
    toast('Renovación guardada');
  } else return;
  pintarRenovaciones();
  await reprogramarAvisos(true);
});

function pintarRenovaciones() {
  const cont = $('#renovaciones');
  const h = hoy();
  const lista = estado.renovaciones.map((r) => ({ r, prox: proximaRenovacion(r, h) })).sort((a, b) => a.prox.localeCompare(b.prox));
  if (!lista.length) {
    cont.innerHTML = `<div class="ticket ticket-vacio"><p class="t-tienda">Nada que renovar</p><p>Añade el seguro del coche, el de casa, Netflix, el gimnasio… y te avisamos antes de cada renovación.</p>
      <button class="boton" type="button" id="primera-ren">Añadir la primera</button></div>`;
    $('#primera-ren').onclick = () => abrirRenovacion();
    return;
  }
  const total = estado.renovaciones.reduce((s, r) => s + costeAnual(r), 0);
  cont.innerHTML = `<div class="ticket recibo">
    <span class="t-tienda">Lo que se renueva solo</span>
    <ul class="filas">${lista.map(({ r, prox }) => {
      const dias = diasEntre(h, prox);
      const cuando = prox < h ? 'ya pasó' : dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`;
      return `<li><button type="button" data-id="${esc(r.id)}" class="${dias <= (r.avisarDias || 7) && prox >= h ? 'cerca' : ''}">
        <span class="f-nombre">${esc(r.nombre)}</span><span class="f-importe">${esc(euros(r.importe))}</span>
        <span class="f-fecha">${fechaCorta(prox)}, ${cuando}</span><span class="f-tipo">${esc(TIPOS_RENOVACION[r.tipo]?.nombre || '')}</span></button></li>`;
    }).join('')}</ul>
    <span class="t-raya"></span>
    <span class="t-linea t-fuerte"><span>Total al año</span><span>${esc(euros(total))}</span></span>
  </div>`;
  cont.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => abrirRenovacion(estado.renovaciones.find((x) => x.id === b.dataset.id))));
}

// ================= Avisos =================
async function reprogramarAvisos(pedir = false) {
  if (!esNativa) return;
  if (pedir) await permisoAvisos(true);
  const a10 = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 10, 0, 0); };
  const avisos = [];
  for (const { p, g } of conGarantia()) {
    if (g.estado === 'caducada') continue;
    const base = numeroDe(p.id) * 10;
    avisos.push({ id: base + 1, titulo: `La garantía de ${p.nombre} termina en ${AVISO_PRONTO_DIAS} días`, texto: `Termina el ${fechaLarga(g.finTotal)}. Si algo falla, reclama ahora.`, fecha: a10(sumarDias(g.finTotal, -AVISO_PRONTO_DIAS)) });
    avisos.push({ id: base + 2, titulo: `Última semana de garantía: ${p.nombre}`, texto: `Termina el ${fechaLarga(g.finTotal)}.`, fecha: a10(sumarDias(g.finTotal, -7)) });
  }
  for (const r of estado.renovaciones) {
    const prox = proximaRenovacion(r, hoy());
    const base = numeroDe(r.id) * 10;
    avisos.push({ id: base + 3, titulo: `${r.nombre} se renueva en ${r.avisarDias} días`, texto: `${fechaLarga(prox)}${r.importe ? `, ${euros(r.importe)}` : ''}. ${CONSEJOS[r.tipo] || ''}`.trim(), fecha: a10(sumarDias(prox, -(r.avisarDias || 7))) });
    avisos.push({ id: base + 4, titulo: `Mañana se renueva: ${r.nombre}`, texto: `${fechaLarga(prox)}${r.importe ? `, ${euros(r.importe)}` : ''}.`, fecha: a10(sumarDias(prox, -1)) });
  }
  avisos.sort((x, y) => x.fecha - y.fecha);
  await programarAvisos(avisos);
}

// ================= Copia de seguridad =================
const blobADataURL = (b) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); });
$('#btn-exportar').addEventListener('click', async () => {
  const fotos = await db.todos('fotos');
  const copia = { app: 'guardaticket', version: 1, fecha: new Date().toISOString(), productos: estado.productos, renovaciones: estado.renovaciones,
    fotos: await Promise.all(fotos.map(async (f) => ({ id: f.id, datos: await blobADataURL(f.blob) }))) };
  await compartirArchivo({ nombre: `guarda-el-ticket-${hoy()}.json`, contenido: JSON.stringify(copia), tipo: 'application/json', titulo: 'Copia de Guarda el Ticket' });
  escribir('gt.ultimaCopia', hoy()); pintarMas();
});
$('#importar').addEventListener('change', async (e) => {
  const archivo = e.target.files[0]; e.target.value = '';
  if (!archivo) return;
  try {
    const copia = JSON.parse(await archivo.text());
    if (copia.app !== 'guardaticket') throw new Error('No es una copia de Guarda el Ticket');
    if (!confirm(`La copia tiene ${copia.productos.length} tickets y ${copia.renovaciones.length} renovaciones. Se añadirán a los que ya tienes. ¿Seguimos?`)) return;
    for (const f of copia.fotos || []) await db.poner('fotos', { id: f.id, blob: await (await fetch(f.datos)).blob() });
    for (const p of copia.productos || []) await db.poner('productos', p);
    for (const r of copia.renovaciones || []) await db.poner('renovaciones', r);
    await cargar(); await reprogramarAvisos();
    toast('Copia recuperada');
  } catch (err) { alert(`No se pudo recuperar la copia: ${err.message}`); }
});

async function pintarMas() {
  const u = leer('gt.ultimaCopia', null);
  $('#ultima-copia').textContent = u ? `Última copia: ${fechaLarga(u)}.` : 'Aún no has descargado ninguna copia.';
  if (esNativa) {
    const p = await permisoAvisos(false);
    $('#estado-avisos').textContent = p === 'granted'
      ? `Activados. Te avisamos ${AVISO_PRONTO_DIAS} días y 7 días antes de que termine cada garantía, y antes de cada renovación, a las 10:00.`
      : 'Desactivados. Actívalos en los ajustes del móvil (Aplicaciones → Guarda el Ticket → Notificaciones).';
  } else {
    $('#estado-avisos').textContent = 'En la versión web no podemos enviarte avisos. Instala la app de Android o usa «Añadir aviso al calendario» en cada ticket.';
  }
}

// ================= Arranque =================
alPulsarAtras(() => {
  if (cerrarDialogoAbierto()) return true;
  if (estado.vista !== 'tickets') { irA('tickets'); return true; }
  return false;
});
async function cargar() {
  [estado.productos, estado.renovaciones] = await Promise.all([db.todos('productos'), db.todos('renovaciones')]);
  pintarTickets();
  if (estado.vista === 'renovaciones') pintarRenovaciones();
}
// En la app nativa, si el sistema borró los datos internos (falta de espacio), se recuperan de la copia espejo.
if (await db.recuperarSiHaceFalta()) toast('Tickets recuperados');
await cargar();
reprogramarAvisos();
registrarSW();
