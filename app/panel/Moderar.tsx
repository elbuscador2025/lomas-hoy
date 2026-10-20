"use client";
import { post } from "./api";

export type DatosModeracion = { denuncias?: { motivo: string }[]; oculta?: boolean };

// Lo que se suma a cada publicación de Trueque y Trabajo en mi panel: denuncias, "Dejar publicada" y "Bloquear".
export function Denuncias({ r }: { r: DatosModeracion }) {
  if (!r.denuncias?.length) return null;
  return (
    <>
      <span className="pildora grave">{r.oculta ? "Oculta" : "Denunciada"} · {r.denuncias.length} {r.denuncias.length === 1 ? "denuncia" : "denuncias"}</span>
      <small>{[...new Set(r.denuncias.map((d) => d.motivo))].join(" · ")}</small>
    </>
  );
}

export function AccionesModeracion({ seccion, id, r, onHecho }: { seccion: "trueque" | "trabajo"; id: string; r: DatosModeracion; onHecho: (msg: string) => void }) {
  return (
    <>
      {r.denuncias?.length ? (
        <button className="btn" onClick={async () => { const x = await post(`/api/panel/${seccion}`, { accion: "dejar", id }); onHecho(x.ok ? "Revisada: se ve de nuevo y se borraron las denuncias." : "No se pudo."); }}>Dejar publicada</button>
      ) : null}
      <button className="btn claro" onClick={async () => {
        if (!confirm("¿Bloquear? Se bajan todas sus publicaciones y no puede volver a publicar con ese número ni desde ese celular.")) return;
        const x = await post("/api/panel/bloqueos", { accion: "bloquear", seccion, id });
        onHecho(x.ok ? "Bloqueado: se bajaron todas sus publicaciones." : "No se pudo bloquear.");
      }}>Bloquear</button>
    </>
  );
}
