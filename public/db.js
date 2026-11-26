// Almacén local (IndexedDB): productos, fotos y renovaciones. Nada sale del dispositivo.
const NOMBRE = 'guardaticket';
const VERSION = 1;
export const ALMACENES = ['productos', 'fotos', 'renovaciones'];
let abierta;

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

export const todos = (s) => operar(s, 'readonly', (st) => st.getAll());
export const obtener = (s, id) => operar(s, 'readonly', (st) => st.get(id));
export const poner = (s, obj) => operar(s, 'readwrite', (st) => st.put(obj));
export const borrar = (s, id) => operar(s, 'readwrite', (st) => st.delete(id));
export const vaciar = (s) => operar(s, 'readwrite', (st) => st.clear());

// Pide al navegador que no borre los datos aunque falte espacio (solo web).
export async function pedirPersistencia() {
  try { if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch { /* sin soporte */ }
}

export const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
