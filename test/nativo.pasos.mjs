// Comportamiento de la app nativa: avisos, copia espejo de tickets y fotos, recuperación y botón Atrás.
// Pone una foto de ticket en el formulario abierto, como si se eligiera de la galería.
const FOTO = `(async () => {
  const c = document.createElement('canvas'); c.width = 400; c.height = 600; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 400, 600); x.fillStyle = '#000'; x.fillText('TICKET', 40, 80);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', .9));
  const dt = new DataTransfer(); dt.items.add(new File([blob], 't.jpg', { type: 'image/jpeg' }));
  const inp = document.querySelector('#foto-galeria'); inp.files = dt.files; inp.dispatchEvent(new Event('change'));
})()`;
export default async ({ ir, js, clic, escribir, esperar }) => {
  await ir('');
  await js("indexedDB.deleteDatabase('guardaticket'); localStorage.clear(); true");
  await ir('');
  await clic('#btn-nuevo');
  await js(FOTO);
  await esperar(700);
  await escribir('#p-nombre', 'Televisor LG'); await escribir('#p-tienda', 'Carrefour'); await escribir('#p-fecha', '2026-06-01');
  await js("document.querySelector('#dlg-producto').close('guardar')");
  await esperar(900);
  const archivos = await js("Object.keys(localStorage).filter(k => k.startsWith('__fs:'))");
  if (!archivos.some((k) => k.endsWith('productos.json')) || !archivos.some((k) => k.endsWith('.jpg'))) throw new Error('No se hizo la copia espejo: ' + archivos.join(', '));
  const avisos = await js("JSON.parse(localStorage.getItem('__avisos') || '[]').length");
  if (avisos !== 2) throw new Error('Esperaba 2 avisos de garantía y hay ' + avisos);
  // El sistema borra la base de datos interna: al abrir, se recupera de la copia espejo.
  await js("new Promise(r => { const q = indexedDB.deleteDatabase('guardaticket'); q.onsuccess = q.onerror = q.onblocked = () => r(true); })");
  await ir('');
  await esperar(1000);
  const n = await js("document.querySelectorAll('#tickets .ticket[data-id]').length");
  if (n !== 1) throw new Error('No se recuperó el ticket: ' + n);
  const conFoto = await js("!document.querySelector('.sin-foto')");
  if (!conFoto) throw new Error('Se recuperó el ticket pero no su foto');
  // Botón Atrás
  await clic('[data-vista="renovaciones"]');
  await js('window.__atras()'); await esperar(200);
  if (await js("document.querySelector('#vista-tickets').hidden")) throw new Error('Atrás no vuelve a los tickets');
  // Copia de seguridad: en la app se comparte el archivo
  await clic('[data-vista="mas"]');
  await clic('#btn-exportar'); await esperar(600);
  if (!(await js("JSON.parse(localStorage.getItem('__llamadas')).some(l => l[0] === 'Share' && l[2].files?.[0]?.includes('guarda-el-ticket'))"))) throw new Error('La copia no se comparte en la app');
  // Guardar un ticket con foto y abrir enseguida el formulario del siguiente: el primero no puede quedarse vacío.
  await clic('[data-vista="tickets"]');
  await clic('#btn-nuevo');
  await js(FOTO);
  await esperar(700);
  await escribir('#p-nombre', 'Cafetera Krups'); await escribir('#p-tienda', 'MediaMarkt'); await escribir('#p-fecha', '2026-09-15');
  // Se pulsa «Guardar ticket» justo después de cerrarse el formulario, mientras aún se guarda la foto.
  await js(`new Promise((r) => { const d = document.querySelector('#dlg-producto');
    d.addEventListener('close', () => { document.querySelector('#btn-nuevo').click(); r(true); }, { once: true }); d.close('guardar'); })`);
  await esperar(1200);
  await js("document.querySelector('#dlg-producto').close('cancelar')");
  const guardados = await js(`new Promise((r) => { const q = indexedDB.open('guardaticket'); q.onsuccess = () => {
    const g = q.result.transaction('productos').objectStore('productos').getAll();
    g.onsuccess = () => r(JSON.stringify(g.result.map((p) => [p.nombre, p.tienda, p.fechaCompra, (p.fotos || []).length]))); }; })`);
  if (!guardados.includes('["Cafetera Krups","MediaMarkt","2026-09-15",1]') || guardados.includes('[""')) throw new Error('El ticket se guardó mal al abrir enseguida otro: ' + guardados);
};
