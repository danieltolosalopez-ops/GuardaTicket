import { plugin } from './native.js';
// Almacén local (IndexedDB): productos, fotos y renovaciones. Nada sale del dispositivo.
// En la app nativa (Android/iPhone) se guarda además una copia espejo en los archivos internos de la app,
// porque el sistema puede vaciar los datos del navegador interno si el móvil se queda sin espacio.
const NOMBRE = 'guardaticket';
const VERSION = 1;
export const ALMACENES = ['productos', 'fotos', 'renovaciones'];
let abierta;


const FS = plugin('Filesystem');
const DIR = 'DATA';
const CARPETA = 'guardaticket';

function abrir() {
  if (!abierta) {
    abierta = new Promise((ok, ko) => {
      const r = indexedDB.open(NOMBRE, VERSION);
      r.onupgradeneeded = () => {
        for (const s of ALMACENES) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' });
      };
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ko(r.error);
    });
  }
  return abierta;
}

async function operar(almacen, modo, fn) {
  const db = await abrir();
  return new Promise((ok, ko) => {
    const t = db.transaction(almacen, modo);
    const peticion = fn(t.objectStore(almacen));
    t.oncomplete = () => ok(peticion?.result);
    t.onerror = () => ko(t.error);
    t.onabort = () => ko(t.error);
  });
}

// ---------- Copia espejo en archivos (solo app nativa) ----------
const aBase64 = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
async function espejo(almacen, obj, borrado) {
  if (!FS) return;
  try {
    if (almacen === 'fotos') {
      const ruta = `${CARPETA}/fotos/${borrado ? obj : obj.id}.jpg`;
      if (borrado) await FS.deleteFile({ path: ruta, directory: DIR }).catch(() => {});
      else await FS.writeFile({ path: ruta, data: await aBase64(obj.blob), directory: DIR, recursive: true });
      return;
    }
    const datos = await operar(almacen, 'readonly', (st) => st.getAll());
    await FS.writeFile({ path: `${CARPETA}/${almacen}.json`, data: JSON.stringify(datos), directory: DIR, encoding: 'utf8', recursive: true });
  } catch (e) { console.warn('Copia espejo', e); }
}

export async function recuperarSiHaceFalta() {
  if (!FS) return false;
  try {
    const [p, r] = await Promise.all([operar('productos', 'readonly', (st) => st.count()), operar('renovaciones', 'readonly', (st) => st.count())]);
    if (p || r) return false;
    const leerJSON = async (n) => {
      try { return JSON.parse((await FS.readFile({ path: `${CARPETA}/${n}.json`, directory: DIR, encoding: 'utf8' })).data); } catch { return []; }
    };
    const productos = await leerJSON('productos');
    const renovaciones = await leerJSON('renovaciones');
    if (!productos.length && !renovaciones.length) return false;
    for (const prod of productos) {
      for (const id of prod.fotos || []) {
        try {
          const { data } = await FS.readFile({ path: `${CARPETA}/fotos/${id}.jpg`, directory: DIR });
          const blob = await (await fetch(`data:image/jpeg;base64,${data}`)).blob();
          await operar('fotos', 'readwrite', (st) => st.put({ id, blob }));
        } catch { /* foto perdida: se conserva el resto */ }
      }
      await operar('productos', 'readwrite', (st) => st.put(prod));
    }
    for (const ren of renovaciones) await operar('renovaciones', 'readwrite', (st) => st.put(ren));
    return true;
  } catch (e) { console.warn('Recuperación', e); return false; }
}

export const todos = (s) => operar(s, 'readonly', (st) => st.getAll());
export const obtener = (s, id) => operar(s, 'readonly', (st) => st.get(id));
export async function poner(s, obj) { const r = await operar(s, 'readwrite', (st) => st.put(obj)); await espejo(s, obj, false); return r; }
export async function borrar(s, id) { const r = await operar(s, 'readwrite', (st) => st.delete(id)); await espejo(s, id, true); return r; }

// Pide al navegador que no borre los datos aunque falte espacio (solo web).
export async function pedirPersistencia() {
  try { if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch { /* sin soporte */ }
}

export const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
