// Recorrido de la app en un móvil simulado (node test/probar.mjs public test/visual.pasos.mjs /tmp/capturas).
export default async ({ ir, js, captura, clic, escribir, esperar }) => {
  await ir('');
  await js("indexedDB.deleteDatabase('guardaticket'); localStorage.clear(); true");
  await ir('');
  await captura('01-vacio');
  // Ticket con foto
  await clic('#btn-nuevo');
  await js(`(async () => {
    const c = document.createElement('canvas'); c.width = 600; c.height = 900; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, 600, 900); x.fillStyle = '#333'; x.font = '40px monospace';
    ['ELECTRO PEREZ', 'LAVADORA SERIE 6', '449,00 EUR', '12/03/2025'].forEach((t, i) => x.fillText(t, 40, 120 + i * 70));
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', .9));
    const dt = new DataTransfer(); dt.items.add(new File([blob], 'ticket.jpg', { type: 'image/jpeg' }));
    const inp = document.querySelector('#foto-galeria'); inp.files = dt.files; inp.dispatchEvent(new Event('change'));
  })()`);
  await esperar(800);
  await escribir('#p-nombre', 'Lavadora Bosch Serie 6');
  await escribir('#p-tienda', 'Electro Pérez');
  await escribir('#p-fecha', '2025-03-12');
  await escribir('#p-precio', '449');
  await captura('02-formulario');
  await js("document.querySelector('#dlg-producto').close('guardar')");
  await esperar(800);
  // Otros dos sin foto: uno que termina pronto y otro caducado
  for (const [n, t, f] of [['Auriculares Sony WH-1000', 'Amazon', '2024-01-10'], ['Móvil Samsung A52', 'Phone House', '2021-06-01']]) {
    await clic('#btn-nuevo');
    await escribir('#p-nombre', n); await escribir('#p-tienda', t); await escribir('#p-fecha', f);
    await js("document.querySelector('#dlg-producto').close('guardar')");
    await esperar(600);
  }
  await captura('03-lista', true);
  const n = await js("document.querySelectorAll('#tickets .ticket[data-id]').length");
  if (n !== 3) throw new Error('Esperaba 3 tickets y hay ' + n);
  const sellos = await js("[...document.querySelectorAll('#tickets .sello')].map(s => s.textContent).join('|')");
  if (sellos !== 'Termina pronto|En garantía|Caducada') throw new Error('Orden/estados inesperados: ' + sellos);
  // Detalle y carta
  await clic('#tickets .estado-vigente');
  await esperar(500);
  await captura('04-detalle');
  await clic('[data-accion="reclamar"]');
  await escribir('#c-problema', 'no centrifuga desde hace una semana');
  await escribir('#c-nombre', 'Ana López');
  await captura('05-carta');
  const carta = await js("document.querySelector('#c-texto').value");
  if (!carta.includes('no centrifuga') || !carta.includes('12 de marzo de 2028')) throw new Error('Carta incompleta');
  await js("document.querySelector('#dlg-carta').close('cancelar')");
  // Renovaciones
  await clic('[data-vista="renovaciones"]');
  await clic('#btn-nuevo');
  await escribir('#r-nombre', 'Seguro del coche'); await escribir('#r-fecha', '2027-01-15'); await escribir('#r-importe', '389.50');
  await js("document.querySelector('#dlg-renovacion').close('guardar')");
  await esperar(500);
  await clic('#btn-nuevo');
  await escribir('#r-nombre', 'Netflix'); await escribir('#r-tipo', 'suscripcion'); await escribir('#r-periodo', 'mensual');
  await escribir('#r-fecha', '2026-12-03'); await escribir('#r-importe', '13.99');
  await js("document.querySelector('#dlg-renovacion').close('guardar')");
  await esperar(500);
  await captura('06-renovaciones', true);
  const total = await js("document.querySelector('.recibo .t-fuerte').textContent");
  if (!total.includes('557,38')) throw new Error('Total anual inesperado: ' + total);
  await clic('[data-vista="mas"]');
  await captura('07-copia', true);
  // Persistencia tras recargar
  await ir('');
  const tras = await js("document.querySelectorAll('#tickets .ticket[data-id]').length");
  if (tras !== 3) throw new Error('Tras recargar hay ' + tras + ' tickets');
};
