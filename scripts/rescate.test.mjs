// Pruebas del filtro de "Perro al rescate": no se pueden publicar teléfonos, enlaces, direcciones con número ni nombres de personas.
import test from "node:test";
import assert from "node:assert/strict";
import { motivoRescateInvalido as m } from "../lib/rescate-comun.ts";

test("lo que sí se puede escribir", () => {
  for (const t of [
    "Perro flaquito y asustado, camina cerca de la plaza. Parece que tiene una pata lastimada.",
    "En la esquina de Alsina y Sarmiento hay un gato herido debajo de un auto",
    "Cachorros abandonados en una caja frente a la estación de Banfield",
    "Hay una perra con crías en la Plaza San Martín de Temperley",
    "Perrito en Santa Marta, cerca de la ruta, sin collar",
    "Está en Villa Fiorito, en una vereda, muy flaco",
    "Tiene 3 meses y es marrón, necesita comida",
    "Lo vimos en San José, al lado de la escuela",
  ]) assert.equal(m(t), null, t);
});
test("teléfonos y enlaces", () => {
  assert.match(m("llamame al 11 5555-1234"), /teléfonos/);
  assert.match(m("escribime 1155551234"), /teléfonos/);
  assert.match(m("mirá en www.rescate.com.ar"), /enlaces/);
  assert.match(m("escribime a @rescatista_lomas"), /enlaces/);
  assert.match(m("once cinco cinco cinco cinco uno dos tres"), /teléfonos/);
});
test("direcciones con número", () => {
  assert.match(m("Está en calle Alsina 1234"), /direcciones con número/);
  assert.match(m("vive en Av. Yrigoyen 8101"), /direcciones con número/);
  assert.match(m("Hipólito Yrigoyen 8101, frente a la farmacia"), /direcciones con número/);
  assert.match(m("en Sarmiento N° 55"), /direcciones con número/);
});
test("nombres de personas", () => {
  assert.match(m("El dueño se llama Carlos y lo ata siempre"), /nombres/);
  assert.match(m("Lo tiene el señor Pérez"), /nombres/);
  assert.match(m("La familia Gómez lo abandonó"), /nombres/);
  assert.match(m("Dice Marcelo que lo maltratan"), /nombres/);
});
