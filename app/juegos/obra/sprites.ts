// ZAFÁ LOMAS: dibujos propios, hechos con cuadraditos ("." = vacío; cada letra es un color de la paleta). Ninguno viene de otro juego.
export type Dibujo = string[];
export const PALETA: Record<string, string> = {
  y: "#FFC83D", // casco amarillo
  s: "#F2B880", // piel
  b: "#2F6BFF", // remera azul
  p: "#4A3B6B", // pantalón
  k: "#161628", // zapatos y ojos
  o: "#FF8A3D", // chaleco naranja
  w: "#FFFFFF", // blanco
  d: "#8A5A2B", // pelo oscuro del perro
  l: "#E8B873", // pelo claro del perro
  r: "#F0506E", // lengua
  c: "#C9CFE6", // gris claro (pelota)
  g: "#5E6A99", // gris medio (pelota)
  Y: "#FFE98A", // amarillo claro
};

// El vecino (casco amarillo). Camina, salta y trepa; para mirar a la izquierda se da vuelta.
export const VECINO: Record<"quieto" | "paso" | "salto" | "trepa", Dibujo> = {
  quieto: ["...yyyy...", "..yyyyyy..", ".yyyyyyyy.", "...ssss...", "...sksk...", "...ssss...", "..bbbbbb..", ".sbbbbbbs.", ".sbbbbbbs.", "..oooooo..", "..pppppp..", "..pp..pp..", "..pp..pp..", ".kkk..kkk."],
  paso: ["...yyyy...", "..yyyyyy..", ".yyyyyyyy.", "...ssss...", "...sksk...", "...ssss...", "..bbbbbb..", ".sbbbbbbs.", ".sbbbbbbs.", "..oooooo..", "..pppppp..", ".pp....pp.", ".pp....pp.", "kkk....kkk"],
  salto: ["...yyyy...", "..yyyyyy..", ".yyyyyyyy.", "s..ssss..s", "s..sksk..s", ".s.ssss.s.", "..bbbbbb..", "..bbbbbb..", "..oooooo..", "..bbbbbb..", "..pppppp..", ".pp....pp.", "pp......pp", "kk......kk"],
  trepa: ["...yyyy...", "..yyyyyy..", ".yyyyyyyy.", "...ssss...", "s..sksk...", "s..ssss...", "s.bbbbbb..", ".sbbbbbb..", "..bbbbbbs.", "..oooooo..", "..pppppp..", "..pp..pp..", "..pp..pp..", ".kkk..kkk."],
};

// El perro gigante y juguetón de la obra: sentado, con una pelota en las patas (cuadro 1) y tirándola (cuadro 2)
export const PERRO: [Dibujo, Dibujo] = [
  [
    "....dddddddddddd....",
    "...dddddddddddddd...",
    "..ddd.llllllll.ddd..",
    "..ddd.lwwllwwl.ddd..",
    "..ddd.lwkllwkl.ddd..",
    "..ddd.llllllll.ddd..",
    "...dd.lllkkllld.dd..",
    "......llllkklll.....",
    "......lllrrllll.....",
    "......llllrrlll.....",
    "....dddddddddddd....",
    "...ddddddddddddd....",
    "..dddlllllllllddd...",
    "..dddlllllllllddd...",
    ".cccddllllllllddccc.",
    ".cgcdddddddddddcgcc.",
    ".cccdddddddddddccc..",
    "..dd.dddd.dddd.dd...",
    "..ddd.ddd.ddd.ddd...",
    ".dddd.ddd.ddd.dddd..",
  ],
  [
    "....dddddddddddd....",
    "...dddddddddddddd...",
    "..ddd.llllllll.ddd..",
    "..ddd.lwwllwwl.ddd..",
    "..ddd.lwkllwkl.ddd..",
    "..ddd.llllllll.ddd..",
    "...dd.lllkkllld.dd..",
    "......llllkklll.....",
    "......lllrrrlll.....",
    "......llrrrrrll.....",
    "....dddddddddddd....",
    "...ddddddddddddd....",
    "..dddlllllllllddd...",
    "..dddlllllllllddd.dd",
    "..dddllllllllddddddd",
    "...ddddddddddddd.ddd",
    "...ddddddddddddd.dd.",
    "..dd.dddd.dddd.dd...",
    "..ddd.ddd.ddd.ddd...",
    ".dddd.ddd.ddd.dddd..",
  ],
];

// La bandera de la meta, arriba a la derecha
export const BANDERA: Dibujo = ["wwwwwwww.", "wYYYYYYYw", "wYYbbbYYw", "wYYbbbYYw", "wYYYYYYYw", "wwwwwwwwc", "c........", "c........", "c........", "c........", "c........", "c........", "c........", "ccc......"];
