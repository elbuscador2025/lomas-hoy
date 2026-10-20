"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Pantalla de entrada a mi panel: si ya hay sesión, lo manda a /panel.
export default function Entrar() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch("/api/sesion").then((r) => r.json()).then((s) => { if (s.destino) router.replace(s.destino); }).catch(() => {});
  }, [router]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setEnviando(true);
    try {
      const r = await fetch("/api/entrar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ correo, clave }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setError(d.error ?? "No se pudo ingresar.");
      router.replace(d.destino);
    } catch {
      setError("No se pudo conectar. Revisá tu internet.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="wrap">
      <h1>Ingresar</h1>
      <form onSubmit={entrar} className="form">
        <label>Correo
          <input type="text" inputMode="email" autoCapitalize="none" autoComplete="username" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </label>
        <label>Contraseña
          <input type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} />
        </label>
        <button className="btn" disabled={enviando}>Ingresar</button>
        {error && <p className="error">{error}</p>}
      </form>
      <p><a href="/">Volver a Lomas Hoy</a></p>
    </main>
  );
}
