// COSMO LOMAS: dibujos propios, hechos con cuadraditos ("#" = lleno, "." = vacío). Ningún dibujo viene de otro juego: todos fueron diseñados para este.
// Cada invasor tiene dos cuadros de animación (aletean o mueven las patas).
export type Dibujo = string[];

// Mariposa cósmica (alas arriba / alas abajo)
const MARIPOSA: [Dibujo, Dibujo] = [
  ["##.......##", "###..#..###", "####.#.####", ".####.####.", "..#######..", "...#...#...", "..##...##..", ".##.....##."],
  ["...#...#...", "..##.#.##..", ".####.####.", "###########", "#.#######.#", "#..#...#..#", "...##.##...", "..##...##.."],
];
// Robot calavera
const ROBOT: [Dibujo, Dibujo] = [
  ["..#######..", ".#########.", "###.###.###", "###.###.###", "###########", "..##...##..", ".##.###.##.", "##.......##"],
  ["..#######..", ".#########.", "###.###.###", "###.###.###", "###########", ".###...###.", "##..###..##", ".#.......#."],
];
// Medusa
const MEDUSA: [Dibujo, Dibujo] = [
  ["...#####...", "..#######..", ".#########.", "##.##.##.##", "###########", ".#.#.#.#.#.", "#.#.....#.#", "..#.....#.."],
  ["...#####...", "..#######..", ".#########.", "##.##.##.##", "###########", "#.#.#.#.#.#", ".#.#...#.#.", "#.#.....#.#"],
];
export const NAVE: Dibujo = ["......#......", ".....###.....", "....#####....", ".#..#####..#.", ".##.#####.##.", "#############", "###.#####.###", "##.........##"];
export const OVNI: Dibujo = ["....#####....", "..#########..", ".###.###.###.", "#############", ".##..###..##.", "..#.......#.."];

// Los cinco tipos de invasor, de arriba hacia abajo: forma, color y puntos
export const TIPOS: { formas: [Dibujo, Dibujo]; color: string; puntos: number }[] = [
  { formas: MEDUSA, color: "#FF4FD8", puntos: 50 },
  { formas: ROBOT, color: "#FFA63D", puntos: 30 },
  { formas: ROBOT, color: "#FF6B6B", puntos: 30 },
  { formas: MARIPOSA, color: "#44E58A", puntos: 20 },
  { formas: MARIPOSA, color: "#3DD6FF", puntos: 10 },
];
export const COLOR_NAVE = "#7DF9FF", COLOR_OVNI = "#FF5A8A";
