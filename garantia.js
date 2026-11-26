// Cálculo de garantías y renovaciones. Sin dependencias del navegador (se prueba con Node).
// Base legal: texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios
// (RDL 1/2007), reformado por el RDL 7/2021 para las compras desde el 1 de enero de 2022.

export const REFORMA = '2022-01-01';

const pad = (n) => String(n).padStart(2, '0');
export const aFecha = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
export const aISO = (f) => f.toISOString().slice(0, 10);
export const sumarDias = (iso, n) => { const f = aFecha(iso); f.setUTCDate(f.getUTCDate() + n); return aISO(f); };
export const diasEntre = (a, b) => Math.round((aFecha(b) - aFecha(a)) / 86400000);
export function hoyISO(ahora = new Date()) { return `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`; }

// Suma meses de fecha a fecha; si el día no existe (31 de abril, 29 de febrero), usa el último del mes.
export function sumarMeses(iso, meses) {
  const [y, m, d] = iso.split('-').map(Number);
  const total = (m - 1) + meses;
  const yf = y + Math.floor(total / 12), mf = ((total % 12) + 12) % 12 + 1;
  const ultimo = new Date(Date.UTC(yf, mf, 0)).getUTCDate();
  return `${yf}-${pad(mf)}-${pad(Math.min(d, ultimo))}`;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export function fechaLarga(iso) { const [y, m, d] = iso.split('-').map(Number); return `${d} de ${MESES[m - 1]} de ${y}`; }
export function fechaCorta(iso) { const [y, m, d] = iso.split('-').map(Number); return `${pad(d)}/${pad(m)}/${y}`; }
export const euros = (n) => (n == null || n === '' || Number.isNaN(Number(n))) ? '' :
  Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

// "2 años y 3 meses", "4 meses", "12 días"
export function duracion(desde, hasta) {
  if (hasta <= desde) return '0 días';
  let meses = 0;
  while (sumarMeses(desde, meses + 1) <= hasta) meses++;
  const años = Math.floor(meses / 12), m = meses % 12;
  if (meses === 0) { const d = diasEntre(desde, hasta); return `${d} ${d === 1 ? 'día' : 'días'}`; }
  const partes = [];
  if (años) partes.push(`${años} ${años === 1 ? 'año' : 'años'}`);
  if (m) partes.push(`${m} ${m === 1 ? 'mes' : 'meses'}`);
  return partes.join(' y ');
}

// "Queda 1 mes" / "Quedan 3 meses" (concordancia del verbo con lo que queda).
export const quedanFrase = (q) => `${/^1 [^ ]+$/.test(q) ? 'Queda' : 'Quedan'} ${q}`;

export const TIPOS = {
  nuevo: 'Nuevo',
  segunda: 'De segunda mano (comprado a una tienda)',
  digital: 'App, juego o contenido digital',
};

export const AVISO_PRONTO_DIAS = 60;

// p = { fechaCompra, tipo: 'nuevo'|'segunda'|'digital', añosSegunda, garantiaExtraHasta }
export function calcularGarantia(p, hoy = hoyISO()) {
  const desde = p.fechaCompra;
  const tras2022 = desde >= REFORMA;
  let meses, presuncionMeses = null, explicacion;
  if (p.tipo === 'digital') {
    meses = 24;
    explicacion = 'Los contenidos digitales de pago único (apps, juegos, libros electrónicos) tienen 2 años de garantía.';
  } else if (p.tipo === 'segunda') {
    const max = tras2022 ? 3 : 2;
    const años = Math.min(max, Math.max(1, Number(p.añosSegunda) || max));
    meses = años * 12;
    explicacion = `En los productos de segunda mano comprados a una empresa, la garantía es de ${max} años, salvo que se pacte por escrito un plazo menor, que nunca puede ser inferior a 1 año.`;
  } else if (tras2022) {
    meses = 36; presuncionMeses = 24;
    explicacion = 'Los productos nuevos comprados desde el 1 de enero de 2022 tienen 3 años de garantía legal desde la entrega.';
  } else {
    meses = 24; presuncionMeses = 6;
    explicacion = 'Los productos comprados antes de 2022 tenían 2 años de garantía legal.';
  }
  const fin = sumarMeses(desde, meses);
  const presuncion = presuncionMeses ? sumarMeses(desde, presuncionMeses) : null;
  const extra = p.garantiaExtraHasta && p.garantiaExtraHasta > fin ? p.garantiaExtraHasta : null;
  const finTotal = extra || fin;
  const restantes = diasEntre(hoy, finTotal);
  const total = Math.max(1, diasEntre(desde, finTotal));
  const estado = restantes < 0 ? 'caducada' : restantes <= AVISO_PRONTO_DIAS ? 'pronto' : 'vigente';
  return {
    fin, extra, finTotal, presuncion, meses, explicacion, estado, restantes,
    progreso: Math.min(1, Math.max(0, diasEntre(desde, hoy) / total)),
    quedan: restantes >= 0 ? duracion(hoy, finTotal) : null,
  };
}

// ---------- Renovaciones (seguros, suscripciones, contratos) ----------
export const PERIODOS = { mensual: 1, trimestral: 3, semestral: 6, anual: 12, unica: 0 };
export const TIPOS_RENOVACION = {
  seguro: { nombre: 'Seguro', avisar: 45 },
  suscripcion: { nombre: 'Suscripción', avisar: 3 },
  contrato: { nombre: 'Contrato (luz, gas, móvil…)', avisar: 30 },
  gimnasio: { nombre: 'Gimnasio o club', avisar: 15 },
  otro: { nombre: 'Otro', avisar: 7 },
};

// Si la fecha ya pasó y se repite, la adelanta a la próxima renovación.
export function proximaRenovacion(r, hoy = hoyISO()) {
  const meses = PERIODOS[r.periodicidad] ?? 0;
  let d = r.proxima;
  if (!meses) return d;
  for (let i = 0; d < hoy && i < 1200; i++) d = sumarMeses(r.proxima, meses * (i + 1));
  return d;
}

export function costeAnual(r) {
  const meses = PERIODOS[r.periodicidad] ?? 0;
  const importe = Number(r.importe) || 0;
  return meses ? importe * (12 / meses) : 0;
}

// ---------- Carta de reclamación ----------
export function cartaReclamacion(p, g, datos) {
  const hoyTxt = fechaLarga(datos.hoy || hoyISO());
  const quiero = datos.solucion === 'sustitucion' ? 'la sustitución del producto por otro nuevo' : 'la reparación gratuita del producto';
  const presuncion = g.presuncion && (datos.hoy || hoyISO()) <= g.presuncion
    ? `\nAl haberse manifestado el defecto dentro de los dos primeros años desde la entrega, la ley presume que ya existía en el momento de la compra, por lo que corresponde a ustedes demostrar lo contrario.\n` : '';
  return `${datos.nombre || '[Tu nombre y apellidos]'}
${datos.dni ? `DNI: ${datos.dni}\n` : ''}${datos.contacto || '[Tu teléfono o correo electrónico]'}

A la atención de: ${p.tienda || '[Nombre de la tienda o empresa vendedora]'}

En ${datos.lugar || '[localidad]'}, a ${hoyTxt}

Asunto: Reclamación por falta de conformidad de un producto en garantía

Muy señores míos:

El ${fechaLarga(p.fechaCompra)} les compré el siguiente producto: ${p.nombre}${p.precio ? `, por un importe de ${euros(p.precio)}` : ''}. Adjunto copia del ticket o factura de compra.

El producto presenta el siguiente problema: ${datos.problema || '[describe el fallo y desde cuándo ocurre]'}.

El producto se encuentra dentro del plazo de garantía legal, que finaliza el ${fechaLarga(g.fin)}, conforme a los artículos 114 y siguientes del texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios (Real Decreto Legislativo 1/2007).
${presuncion}
Por ello, les solicito ${quiero}, sin ningún coste para mí, tal y como establece la citada ley, y que me indiquen por escrito cómo van a proceder.

Si no recibo respuesta en un plazo de 15 días, presentaré una hoja de reclamaciones y acudiré a los servicios de consumo de mi comunidad autónoma.

Atentamente,

${datos.nombre || '[Firma]'}
`;
}

// Número entero estable a partir de un identificador de texto (para los avisos de Android).
export function numeroDe(id) {
  let h = 2166136261;
  for (const c of String(id)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 190_000_000;
}
