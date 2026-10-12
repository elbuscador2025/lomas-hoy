"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Formulario de las dos pantallas de enlace de un solo uso: registro por invitación y contraseña nueva.
export default function FormularioCuenta({ modo, token }: { modo: "invitacion" | "restablecer"; token: string }) {
  const router = useRouter();
  const [v, setV] = useState({ nombre: "", area: "", correo: "", clave: "", repetir: "" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof v, x: string) => setV((a) => ({ ...a, [k]: x }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setEnviando(true);
    try {
      const r = await fetch(`/api/${modo}/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      const d = await r.json().catch(() => ({}));
      if (d.vencido) return router.replace("/"); // el enlace ya se usó o venció: se vuelve a la app normal
      if (!r.ok) return setError(d.error ?? "No se pudo completar.");
      router.replace(d.destino);
    } catch {
      setError("No se pudo conectar. Revisá tu internet.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="wrap">
      <h1>{modo === "invitacion" ? "Bienvenido a Lomas Hoy" : "Elegí tu contraseña nueva"}</h1>
      {modo === "invitacion" && <p className="vacio">Completá tus datos para publicar avisos para los vecinos.</p>}
      <form onSubmit={enviar} className="form">
        {modo === "invitacion" && (
          <>
            <label>Nombre<input maxLength={60} autoComplete="name" value={v.nombre} onChange={(e) => set("nombre", e.target.value)} /></label>
            <label>Área (por ejemplo Intendencia, Deportes, Prensa)<input maxLength={40} value={v.area} onChange={(e) => set("area", e.target.value)} /></label>
            <label>Correo<input type="text" inputMode="email" autoCapitalize="none" autoComplete="username" maxLength={80} value={v.correo} onChange={(e) => set("correo", e.target.value)} /></label>
          </>
        )}
        <label>Contraseña (mínimo 8 caracteres)<input type="password" autoComplete="new-password" value={v.clave} onChange={(e) => set("clave", e.target.value)} /></label>
        <label>Repetí la contraseña<input type="password" autoComplete="new-password" value={v.repetir} onChange={(e) => set("repetir", e.target.value)} /></label>
        <button className="btn" disabled={enviando}>{modo === "invitacion" ? "Crear mi cuenta" : "Guardar contraseña"}</button>
        {error && <p className="error">{error}</p>}
      </form>
    </main>
  );
}
