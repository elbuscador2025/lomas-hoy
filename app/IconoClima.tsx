// Íconos del tiempo a color (Meteocons, de uso libre: public/meteocons/LICENSE.txt)
const CONOCIDOS = ["sol", "solnube", "nube", "lluvia", "tormenta", "niebla", "nieve", "luna", "lunanube"];
export default function IconoClima({ nombre, tam = 48 }: { nombre: string; tam?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/meteocons/${CONOCIDOS.includes(nombre) ? nombre : "nube"}.svg`} width={tam} height={tam} alt="" className="icono-clima" />;
}
