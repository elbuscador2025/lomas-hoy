"use client";
import { useCallback, useEffect, useState } from "react";
import { config } from "@/lomas.config.mjs";

export type Prefs = { tipos: Record<string, boolean> };
export type EstadoPush = "cargando" | "noSoportado" | "iosSinInstalar" | "inactivo" | "denegado" | "activo";

const CLAVE = "lomas-hoy:push";
const PUBLICA = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim();
const json = { "Content-Type": "application/json" };

export const prefsIniciales = (): Prefs => ({
  tipos: Object.fromEntries(Object.entries(config.push.tipos).map(([k, v]) => [k, v.activa])),
});

const aBytes = (base64: string) => {
  const b = atob((base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};
export const esIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const estaInstalada = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function leerPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE) ?? "null");
    if (p?.tipos) return { ...prefsIniciales(), ...p, tipos: { ...prefsIniciales().tipos, ...p.tipos } };
  } catch {}
  return prefsIniciales();
}

// Avisos al celular. El permiso del navegador solo se pide cuando la persona toca "Activar avisos".
export function usePush() {
  const [estado, setEstado] = useState<EstadoPush>("cargando");
  const [prefs, setPrefs] = useState<Prefs>(prefsIniciales());
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    (async () => {
      setPrefs(leerPrefs());
      if (esIOS() && !estaInstalada()) return setEstado("iosSinInstalar"); // en iPhone solo anda desde la pantalla de inicio
      if (!("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) || !PUBLICA) return setEstado("noSoportado");
      if (Notification.permission === "denied") return setEstado("denegado");
      try {
        const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
        setEstado(sub ? "activo" : "inactivo");
      } catch {
        setEstado("noSoportado");
      }
    })();
  }, []);

  const enviar = async (sub: PushSubscription, p: Prefs) => {
    const r = await fetch("/api/push/suscribir", { method: "POST", headers: json, body: JSON.stringify({ subscription: sub.toJSON(), ...p }) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "No se pudo guardar.");
    localStorage.setItem(CLAVE, JSON.stringify(p));
    setPrefs(p);
  };

  const activar = useCallback(async (p: Prefs) => {
    setError(""); setOcupado(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") { setEstado(permiso === "denied" ? "denegado" : "inactivo"); return false; }
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(PUBLICA) }));
      await enviar(sub, p);
      setEstado("activo");
      return true;
    } catch (e) {
      setError((e as Error).message || "No se pudieron activar los avisos.");
      return false;
    } finally {
      setOcupado(false);
    }
  }, []);

  const guardar = useCallback(async (p: Prefs) => {
    setError("");
    setPrefs(p);
    try {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (sub) await enviar(sub, p);
    } catch (e) {
      setError((e as Error).message || "No se pudo guardar el cambio.");
    }
  }, []);

  const desactivar = useCallback(async () => {
    setError(""); setOcupado(true);
    try {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/suscribir", { method: "POST", headers: json, body: JSON.stringify({ accion: "borrar", endpoint: sub.endpoint }) }).catch(() => {});
        await sub.unsubscribe();
      }
      localStorage.removeItem(CLAVE);
      setPrefs(prefsIniciales());
      setEstado("inactivo");
    } catch (e) {
      setError((e as Error).message || "No se pudo desactivar.");
    } finally {
      setOcupado(false);
    }
  }, []);

  return { estado, prefs, setPrefs, error, ocupado, activar, guardar, desactivar };
}
export type Push = ReturnType<typeof usePush>;

// Instalar la app: en Android el navegador avisa cuándo se puede y se instala con un toque.
type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export function useInstalar() {
  const [instalada, setInstalada] = useState(true); // hasta saber, no se muestra nada
  const [ios, setIos] = useState(false);
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  useEffect(() => {
    setInstalada(estaInstalada());
    setIos(esIOS());
    const antes = (e: Event) => { e.preventDefault(); setEvento(e as EventoInstalar); };
    const despues = () => { setInstalada(true); setEvento(null); };
    window.addEventListener("beforeinstallprompt", antes);
    window.addEventListener("appinstalled", despues);
    return () => { window.removeEventListener("beforeinstallprompt", antes); window.removeEventListener("appinstalled", despues); };
  }, []);
  const instalar = useCallback(async () => {
    if (!evento) return;
    await evento.prompt();
    const r = await evento.userChoice;
    if (r.outcome === "accepted") setInstalada(true);
    setEvento(null);
  }, [evento]);
  return { instalada, ios, evento, instalar };
}
