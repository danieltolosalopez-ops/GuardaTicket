// Capturas para Google Play y App Store con datos de ejemplo (sin marcas reales).
export default async ({ ir, js, captura, clic, escribir, esperar }) => {
  await ir('');
  await js("indexedDB.deleteDatabase('guardaticket'); localStorage.clear(); true");
  await ir('');
  const foto = async (tienda, producto, precio, fecha) => js(`(async () => {
    const c = document.createElement('canvas'); c.width = 620; c.height = 900; const x = c.getContext('2d');
    x.fillStyle = '#f7f5ef'; x.fillRect(0, 0, 620, 900); x.fillStyle = '#3a3646'; x.font = 'bold 34px monospace';
    x.fillText(${JSON.stringify(tienda.toUpperCase())}, 50, 90); x.font = '26px monospace';
    ['C/ Mayor, 12 - 28001 Madrid', 'NIF B-12345678', '------------------------------', ${JSON.stringify(producto)}, '', 'TOTAL ........... ${precio} EUR', 'Tarjeta', '', ${JSON.stringify(fecha)}, '', 'Gracias por su compra']
      .forEach((t, i) => x.fillText(t, 50, 150 + i * 46));
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', .9));
    const dt = new DataTransfer(); dt.items.add(new File([blob], 't.jpg', { type: 'image/jpeg' }));
    const inp = document.querySelector('#foto-galeria'); inp.files = dt.files; inp.dispatchEvent(new Event('change'));
  })()`);
  const ticket = async (nombre, tienda, fecha, precio, conFoto = true) => {
    await clic('#btn-nuevo');
    if (conFoto) { await foto(tienda, nombre, String(precio).replace('.', ','), fecha.split('-').reverse().join('/')); await esperar(600); }
    await escribir('#p-nombre', nombre); await escribir('#p-tienda', tienda); await escribir('#p-fecha', fecha); await escribir('#p-precio', String(precio));
    await js("document.querySelector('#dlg-producto').close('guardar')"); await esperar(500);
  };
  await ticket('Lavadora de carga frontal 9 kg', 'Electro Pérez', '2025-03-12', 449);
  await ticket('Auriculares inalámbricos', 'Tienda online', '2024-01-10', 129.9);
  await ticket('Portátil de 15 pulgadas', 'Informática Centro', '2025-09-20', 699);
  await ticket('Cafetera de cápsulas', 'Hipermercado Norte', '2023-05-02', 89.99);
  await esperar(3000);
  await js('scrollTo(0, 0); true');
  await captura('01-tickets');
  await clic('#tickets .estado-vigente'); await esperar(500);
  await captura('02-garantia');
  await clic('[data-accion="reclamar"]');
  await escribir('#c-problema', 'no centrifuga y hace un ruido fuerte desde hace una semana');
  await escribir('#c-nombre', 'Ana López García'); await escribir('#c-lugar', 'Madrid'); await escribir('#c-contacto', 'ana@ejemplo.es');
  await js("document.querySelector('#c-texto').scrollTop = 0; document.querySelector('#dlg-carta').scrollTop = 300; true");
  await esperar(300);
  await captura('03-reclamar');
  await js("document.querySelector('#dlg-carta').close('cancelar')");
  await clic('[data-vista="renovaciones"]');
  const ren = async (nombre, tipo, fecha, periodo, importe) => {
    await clic('#btn-nuevo');
    await escribir('#r-nombre', nombre); await escribir('#r-tipo', tipo); await escribir('#r-fecha', fecha); await escribir('#r-periodo', periodo); await escribir('#r-importe', String(importe));
    await js("document.querySelector('#dlg-renovacion').close('guardar')"); await esperar(400);
  };
  await ren('Seguro del coche', 'seguro', '2027-01-15', 'anual', 389.5);
  await ren('Seguro de hogar', 'seguro', '2027-03-02', 'anual', 214);
  await ren('Plataforma de series', 'suscripcion', '2026-12-03', 'mensual', 13.99);
  await ren('Gimnasio', 'gimnasio', '2026-12-01', 'mensual', 39.9);
  await ren('Tarifa del móvil', 'contrato', '2027-05-10', 'mensual', 15);
  await esperar(3000);
  await captura('04-renovaciones');
};
