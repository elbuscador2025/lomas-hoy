"use client";
import { useState } from "react";

type Datos = {
  dias: { dia: string; visitantes: number; volvieron: number }[];
  resumen: { visitantes_totales: number; volvieron_otro_dia: number } | null;
  reportes: { creado_en: string; seccion: string; mensaje: string }[];
};

export default function Panel() {
  const [password, setPassword] = useState("");
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState("");

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/panel", { method: "POST", body: JSON.stringify({ password }) });
    if (!r.ok) return setError("Contraseña incorrecta");
    setError("");
    setDatos(await r.json());
  }

  if (!datos)
    return (
      <main className="wrap">
        <h1>Panel</h1>
        <form onSubmit={entrar} className="form">
          <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn">Entrar</button>
          {error && <p className="error">{error}</p>}
        </form>
      </main>
    );

  return (
    <main className="wrap">
      <h1>Panel</h1>
      <p>
        Visitantes distintos: <b>{datos.resumen?.visitantes_totales ?? 0}</b> · Volvieron otro día:{" "}
        <b>{datos.resumen?.volvieron_otro_dia ?? 0}</b>
      </p>
      <h2>Por día</h2>
      <table>
        <thead><tr><th>Día</th><th>Visitantes</th><th>Que ya habían venido</th></tr></thead>
        <tbody>
          {datos.dias.map((d) => (
            <tr key={d.dia}><td>{d.dia}</td><td>{d.visitantes}</td><td>{d.volvieron}</td></tr>
          ))}
        </tbody>
      </table>
      <h2>Reportes de error</h2>
      {datos.reportes.length === 0 && <p>Todavía no hay reportes.</p>}
      <ul className="lista">
        {datos.reportes.map((r, i) => (
          <li key={i}>
            <b>{r.seccion}</b> · {new Date(r.creado_en).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}
            <br />{r.mensaje || <i>(sin texto)</i>}
          </li>
        ))}
      </ul>
    </main>
  );
}
