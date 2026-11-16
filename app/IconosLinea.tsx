// Íconos de línea de una sola familia (Lucide, libre y gratuita): mismo grosor y mismo tamaño en toda la portada. Heredan el color del texto.
import {
  Accessibility, ArrowLeftRight, Armchair, Baby, Banknote, Briefcase, BriefcaseBusiness, Building2, BusFront, Car, Cat, ChevronRight, Dices, Dog, Droplet,
  Gamepad2, GraduationCap, HeartPulse, Hospital, Landmark, Newspaper, PawPrint, Pill, ReceiptText, ShieldAlert, Siren, Smile, Stethoscope, Store, Syringe,
  TrainFrontTunnel, TramFront, Trophy, Users, Video, Wrench, Zap, type LucideIcon,
} from "lucide-react";

const ICONOS: Record<string, LucideIcon> = {
  // accesos rápidos, transporte, noticias y grupos
  farmacias: Pill, guardias: Hospital, cobran: Banknote, auto: Car, impuestos: ReceiptText, emergencias: Siren,
  tren: TramFront, colectivos: BusFront, subte: TrainFrontTunnel, noticias: Newspaper,
  salud: HeartPulse, tramites: Landmark, comunidad: Users, trabajo: Briefcase, familia: Smile, flecha: ChevronRight,
  // cuadraditos de cada sección (por su color en Inicio.tsx)
  luz: Zap, agua: Droplet, salitas: HeartPulse, vets: PawPrint, telemedicina: Video, tramitesmuni: Landmark, jubilados: Armchair, estudiar: GraduationCap,
  rescate: Dog, mascotas: Cat, anses: Banknote, trueque: ArrowLeftRight, emprendedores: Store, clubes: Trophy, castracion: Syringe, ansesof: Building2,
  quiniela: Dices, juegos: Gamepad2, peques: Baby, coop: Wrench, disc: Accessibility, trabajoseccion: Briefcase, empleo: BriefcaseBusiness, otros: ShieldAlert,
};

export function IconoLinea({ nombre, tam = 26 }: { nombre: string; tam?: number }) {
  const I = ICONOS[nombre];
  return I ? <I width={tam} height={tam} strokeWidth={1.9} aria-hidden focusable="false" /> : null;
}
export const tieneIconoLinea = (nombre: string) => nombre in ICONOS;
