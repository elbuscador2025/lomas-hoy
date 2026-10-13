import { Composition } from "remotion";
import { Presentacion, DURACION } from "./Presentacion";

export const Raiz = () => (
  <Composition id="Presentacion" component={Presentacion} durationInFrames={DURACION} fps={30} width={1080} height={1920} />
);
