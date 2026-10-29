"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Registro de un merendero: solo se llega con el enlace de invitación (sirve una sola vez).
function Formulario() {
  const router = useRouter();
  const token = useSearchParams().get("i") ?? "";
  const [vigente, setVigente] = useState<boolean | null>(null);
  const [v, setV] = useState({ nombre: "", responsable: "", direccion: "", correo: "", clave: "" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  useEffect(() => { fetch(`/api/merendero/registro?i=${encodeURIComponent(token)}`).then((r) => r.json()).then((j) => setVigente(!!j.ok)).catch(() => setVigente(false)); }, [token]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setEnviando(true);
    try {
      const r = await fetch("/api/merendero/registro", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...v }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setError(d.error ?? "No se pudo completar el registro.");
      router.replace(d.destino);
    } catch {
      setError("No se pudo conectar. Revisá tu internet.");
    } finally {
      setEnviando(false);
    }
  }
  const campo = (k: keyof typeof v, t: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label>{t}<input value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} {...extra} /></label>
  );
  if (vigente === null) return <p>Cargando…</p>;
  if (!vigente) return <><h1>Invitación no válida</h1><p>Este enlace ya se usó o venció. Pedí uno nuevo a quien te invitó.</p><p><a href="/">Ir a Lomas Hoy</a></p></>;
  return (
    <>
      <h1>🍲 Registrá tu merendero</h1>
      <p>Completá estos datos para publicar tus cenas en Lomas Hoy.</p>
      <form onSubmit={enviar} className="form form-merendero">
        {campo("nombre", "Nombre del merendero", { placeholder: "Olla de Marta" })}
        {campo("responsable", "Nombre de la responsable")}
        {campo("direccion", "Dirección donde se entrega la comida")}
        {campo("correo", "Mail", { type: "text", inputMode: "email", autoCapitalize: "none", autoComplete: "username" })}
        {campo("clave", "Contraseña (mínimo 8 caracteres)", { type: "password", autoComplete: "new-password" })}
        <button className="btn grande-btn" disabled={enviando}>Registrarme</button>
        {error && <p className="error">{error}</p>}
      </form>
    </>
  );
}
export default function Registro() {
  return <main className="wrap"><Suspense fallback={<p>Cargando…</p>}><Formulario /></Suspense></main>;
}
