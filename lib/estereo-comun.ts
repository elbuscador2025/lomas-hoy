// Estéreo de "Carrera de Autopista": la canción de prueba. Por defecto es la que viene con la app; desde mi panel se puede reemplazar por otro MP3.
export const MAX_BYTES_ESTEREO = 8 * 1024 * 1024;
export const URL_CANCION_ORIGINAL = "/juegos/autopista/cancion-prueba.mp3";
export const NOMBRE_CANCION_ORIGINAL = "Ay Vamos · J Balvin (remix DJ TAO)";
export type CancionEstereo = { url: string; nombre: string; tam: number; subido: string };
// Un MP3 de verdad empieza con "ID3" o con una marca de cuadro de audio (FF Fx)
export const esMp3 = (b: Uint8Array) => b.length >= 3 && ((b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0));
export const nombreDeArchivo = (n: string) => n.replace(/\.mp3$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "Canción";
