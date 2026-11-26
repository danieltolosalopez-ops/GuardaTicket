import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularGarantia, sumarMeses, duracion, proximaRenovacion, costeAnual, cartaReclamacion, numeroDe } from '../public/garantia.js';

test('producto nuevo desde 2022: 3 años y presunción de 2', () => {
  const g = calcularGarantia({ fechaCompra: '2025-03-12', tipo: 'nuevo' }, '2026-11-26');
  assert.equal(g.fin, '2028-03-12');
  assert.equal(g.presuncion, '2027-03-12');
  assert.equal(g.estado, 'vigente');
  assert.equal(g.quedan, '1 año y 3 meses');
});

test('producto nuevo de 2021: 2 años (ya caducada)', () => {
  const g = calcularGarantia({ fechaCompra: '2021-12-31', tipo: 'nuevo' }, '2026-11-26');
  assert.equal(g.fin, '2023-12-31');
  assert.equal(g.estado, 'caducada');
  assert.equal(g.quedan, null);
});

test('segunda mano: lo pactado, mínimo 1 año y máximo 3', () => {
  assert.equal(calcularGarantia({ fechaCompra: '2026-01-10', tipo: 'segunda', añosSegunda: 1 }).fin, '2027-01-10');
  assert.equal(calcularGarantia({ fechaCompra: '2026-01-10', tipo: 'segunda', añosSegunda: 0 }).fin, '2029-01-10'); // sin dato: 3 años
  assert.equal(calcularGarantia({ fechaCompra: '2026-01-10', tipo: 'segunda', añosSegunda: 9 }).fin, '2029-01-10');
  assert.equal(calcularGarantia({ fechaCompra: '2026-01-10', tipo: 'segunda' }).presuncion, null);
});

test('contenido digital: 2 años', () => {
  assert.equal(calcularGarantia({ fechaCompra: '2026-05-01', tipo: 'digital' }).fin, '2028-05-01');
});

test('29 de febrero y fin de mes', () => {
  assert.equal(sumarMeses('2024-02-29', 36), '2027-02-28');
  assert.equal(sumarMeses('2026-01-31', 1), '2026-02-28');
});

test('aviso "termina pronto" en los últimos 60 días', () => {
  assert.equal(calcularGarantia({ fechaCompra: '2024-01-15', tipo: 'nuevo' }, '2026-11-26').estado, 'pronto');
  assert.equal(calcularGarantia({ fechaCompra: '2024-03-15', tipo: 'nuevo' }, '2026-11-26').estado, 'vigente');
});

test('la garantía ampliada del fabricante alarga la fecha final', () => {
  const g = calcularGarantia({ fechaCompra: '2026-01-10', tipo: 'nuevo', garantiaExtraHasta: '2031-01-10' }, '2026-11-26');
  assert.equal(g.fin, '2029-01-10');
  assert.equal(g.extra, '2031-01-10');
  assert.equal(g.finTotal, '2031-01-10');
  const corta = calcularGarantia({ fechaCompra: '2026-01-10', tipo: 'nuevo', garantiaExtraHasta: '2027-01-10' });
  assert.equal(corta.extra, null);
});

test('duración legible', () => {
  assert.equal(duracion('2026-11-26', '2026-12-08'), '12 días');
  assert.equal(duracion('2026-11-26', '2027-11-26'), '1 año');
  assert.equal(duracion('2026-11-26', '2029-02-27'), '2 años y 3 meses');
});

test('renovaciones: avanza a la próxima fecha y calcula el coste anual', () => {
  assert.equal(proximaRenovacion({ proxima: '2025-06-01', periodicidad: 'anual' }, '2026-11-26'), '2027-06-01');
  assert.equal(proximaRenovacion({ proxima: '2026-10-31', periodicidad: 'mensual' }, '2026-11-26'), '2026-11-30');
  assert.equal(proximaRenovacion({ proxima: '2026-01-01', periodicidad: 'unica' }, '2026-11-26'), '2026-01-01');
  assert.equal(costeAnual({ importe: 12.99, periodicidad: 'mensual' }), 155.88);
  assert.equal(costeAnual({ importe: 300, periodicidad: 'anual' }), 300);
});

test('carta de reclamación con los datos del producto', () => {
  const p = { nombre: 'Lavadora Bosch', tienda: 'Electro Pérez', fechaCompra: '2025-03-12', precio: 449, tipo: 'nuevo' };
  const g = calcularGarantia(p, '2026-11-26');
  const c = cartaReclamacion(p, g, { nombre: 'Ana López', problema: 'no centrifuga', solucion: 'reparacion', hoy: '2026-11-26' });
  assert.match(c, /Electro Pérez/);
  assert.match(c, /12 de marzo de 2025/);
  assert.match(c, /449,00/);
  assert.match(c, /reparación gratuita/);
  assert.match(c, /presume que ya existía/);
  assert.match(c, /12 de marzo de 2028/);
});

test('identificadores numéricos estables para los avisos', () => {
  assert.equal(numeroDe('abc'), numeroDe('abc'));
  assert.notEqual(numeroDe('abc'), numeroDe('abd'));
  assert.ok(numeroDe('x'.repeat(50)) * 10 + 9 < 2 ** 31);
});
