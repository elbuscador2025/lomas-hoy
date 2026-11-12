// Buscador de Lomas Hoy: entiende cómo habla la gente y lleva a la sección correcta. Solo busca dentro de la app: sin IA y sin servicios externos.
// Cada sección tiene su lista de palabras y de frases. La búsqueda no distingue tildes ni mayúsculas, perdona errores de tipeo comunes (farmasia, jubilasion, kuando, ospital),
// ignora los plurales y las palabras de relleno ("el", "mi", "quiero", "dónde"...), y junta puntos: la sección que más coincide queda primera.

// "Qué hacer hoy?" → "que hacer hoy"
export const limpiar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9+]+/g, " ").trim();

const RELLENO = new Set(("de del la el los las lo un una unos unas y o a al en con sin por para que se me mi mis tu tus su sus es hay ya si no muy mas menos quiero quisiera busco buscar necesito necesitaria "
  + "donde como cual cuales esta este esto ese eso estoy tengo tiene tienen puedo puede podria ver saber hacer hace ahi aca aqui favor hola buenas buen dia tarde noche algo alguien algun alguna").split(" "));
export const palabrasDe = (s: string) => limpiar(s).split(" ").filter((p) => p && (!RELLENO.has(p) || p === "hacer") && p.length > 1);

// Se escribe parecido a como suena: así "farmasia", "jubilasion", "kuando", "ospital" o "bacunar" caen en la palabra correcta
export function sonido(p: string) {
  return p.replace(/ll/g, "y").replace(/qu/g, "k").replace(/c(?=[eiy])/g, "s").replace(/c/g, "k").replace(/z/g, "s").replace(/v/g, "b").replace(/h/g, "").replace(/w/g, "u").replace(/x/g, "ks")
    .replace(/g(?=[ei])/g, "j").replace(/(.)\1+/g, "$1");
}
const singular = (p: string) => (p.length > 4 && p.endsWith("es") ? p.slice(0, -2) : p.length > 3 && p.endsWith("s") ? p.slice(0, -1) : p);

// A cuánto se parecen dos palabras (0 = nada, 1 = iguales). Las cortas (hasta 3 letras) tienen que ser iguales.
function distancia(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const f: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) f[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    f[i][j] = Math.min(f[i - 1][j] + 1, f[i][j - 1] + 1, f[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) f[i][j] = Math.min(f[i][j], f[i - 2][j - 2] + 1); // letras cambiadas de lugar
  }
  return f[a.length][b.length];
}
export function parecido(a: string, b: string) {
  if (a === b) return 1;
  if (a.length <= 3 || b.length <= 3) return 0;
  const sa = singular(a), sb = singular(b);
  if (sa === sb) return 0.95;
  const corta = Math.min(sa.length, sb.length);
  if (corta >= 4 && (sa.startsWith(sb) || sb.startsWith(sa))) return 0.85;
  const m = Math.max(sa.length, sb.length);
  if (m >= 5 && sa[0] === sb[0] && distancia(sa, sb) <= (m >= 9 ? 2 : 1)) return 0.8; // un error de tipeo casi nunca está en la primera letra
  return 0;
}

export type SeccionBusca = {
  id: string; vista: string; clave: string | null; // clave: el interruptor de lomas.config.mjs que la prende o apaga (null = siempre)
  titulo: string; linea: string; palabras: string; frases?: string; // palabras y frases separadas por coma
};
const SIN_TILDES = (s: string) => limpiar(s);

export const SECCIONES: SeccionBusca[] = [
  { id: "anses", vista: "anses", clave: "anses", titulo: "Hoy cobran", linea: "Fechas de cobro de jubilados, AUH y pensiones",
    palabras: "cobro, cobrar, cobran, cobra, cobras, jubilacion, jubilaciones, jubilado, jubilada, jubilados, pension, pensiones, pensionado, pensionada, auh, asignacion, asignaciones, universal, haber, haberes, anses, calendario, depositan, pagan, plata",
    frases: "cuando cobro, cuando cobran, cuando cobra, cuando cobramos, cuando pagan, cuando depositan, fecha de cobro, dia de cobro, mi jubilacion, mi pension, calendario de pagos, cuando es el cobro, asignacion por hijo, asignacion universal" },
  { id: "ansesof", vista: "ansesof", clave: "ansesof", titulo: "ANSES: oficinas y turnos", linea: "Oficinas de ANSES en Lomas, teléfono 130 y cómo sacar turno",
    palabras: "anses, oficina, oficinas, cuil, constancia, 130, previsional, atencion",
    frases: "turno anses, sacar turno anses, oficina de anses, oficinas anses, donde queda anses, telefono anses, tramite anses, constancia de cuil, atencion anses" },
  { id: "telemedicina", vista: "telemedicina", clave: "telemedicina", titulo: "Telemedicina Lomas", linea: "Médico por videollamada, gratis, las 24 horas",
    palabras: "medico, medica, doctor, doctora, consulta, consultas, fiebre, febril, dolor, telemedicina, videollamada, receta, recetas, certificado, reposo, pediatra, pediatria, enfermo, enferma, gripe, resfrio, tos, sintomas, virus, malestar, vomito, diarrea, garganta, salud",
    frases: "necesito un medico, consulta medica, consulta online, medico online, medico gratis, me siento mal, estoy enfermo, estoy enferma, mi hijo tiene fiebre, receta medica, certificado medico, medico por videollamada" },
  { id: "guardias", vista: "guardias", clave: "urgencias", titulo: "Guardias médicas", linea: "Hospitales y guardias abiertas las 24 horas",
    palabras: "guardia, guardias, hospital, hospitales, urgencia, urgencias, emergencia, emergencias, medico, doctor, doctora, fiebre, accidente, herida, sangre, ambulancia, clinica, sanatorio, internacion, golpe, fractura, quemadura, desmayo",
    frases: "hospital cerca, guardia cerca, guardia medica, necesito una guardia, me lastime, me accidente, hospital de lomas, guardia de lomas" },
  { id: "salitas", vista: "salitas", clave: "urgencias", titulo: "Salitas (centros de salud)", linea: "Centros de salud del barrio, atención gratuita",
    palabras: "salita, salitas, caps, vacuna, vacunas, vacunacion, vacunar, vacunarme, control, controles, pediatrico, enfermera, enfermero, odontologo, dentista, ginecologo, anticonceptivo, preservativo, centro",
    frases: "centro de salud, sala de primeros auxilios, vacunas gratis, vacuna gratis, control de salud, salita del barrio, salita cerca, atencion gratuita, turno medico" },
  { id: "vets", vista: "vets", clave: "urgencias", titulo: "Veterinarias", linea: "Veterinarias de Lomas y las de guardia 24 hs",
    palabras: "veterinaria, veterinarias, veterinario, veterinaria, vete, animal, animales, perro, perros, perra, gato, gatos, gata, mascota, mascotas, vacunar, vacuna, desparasitar, pulgas, garrapatas, cachorro, cachorrito, zoonosis, antirrabica, rabia",
    frases: "vacunar perro, vacunar gato, vacunar mi perro, vacuna del perro, veterinaria de guardia, veterinario de guardia, mi perro esta enfermo, mi gato esta enfermo, perro enfermo, gato enfermo, hospital de animales, atropellaron a mi perro, vacuna antirrabica" },
  { id: "castracion", vista: "castracion", clave: "castracion", titulo: "Castración gratuita", linea: "Turnos de castración gratis para perros y gatos, y jornadas en los barrios",
    palabras: "castrar, castracion, castraciones, castrarlo, castrarla, castro, esterilizar, esterilizacion, capar, esterilizada, castrado, castrada, zoonosis, veterinaria, veterinarias, veterinario",
    frases: "vacunar perro, vacunar gato, vacunar mi perro, vacunar mi gato, vacuna del perro, castrar perro, castrar gato, castrar perra, castrar gata, castrar mi perro, castrar mi gata, castracion gratis, castracion gratuita, turno de castracion, esterilizar perra, esterilizar gata, hospital de animales, castrar mascota" },
  { id: "mascotas", vista: "mascotas", clave: "mascotas", titulo: "Mascotas perdidas", linea: "Perdidos y encontrados: publicá o mirá las mascotas del barrio",
    palabras: "perdi, perdio, perdido, perdida, perdidos, perdidas, perdieron, extravio, extravie, extraviado, extraviada, encontre, encontro, encontrado, encontrada, encontramos, apareci, aparecio, volvio, abandonado, abandonada, callejero, callejera, perro, perros, perra, gato, gatos, gata, mascota, mascotas",
    frases: "se perdio mi perro, se perdio mi gato, se perdio mi mascota, perdi mi perro, perdi mi gato, perdi a mi perro, perdi a mi gato, perdi a mi perra, perdi a mi gata, encontre un perro, encontre un gato, encontre una mascota, mascota perdida, mascotas perdidas, perro perdido, gato perdido, perro encontrado, gato encontrado, mi perro se escapo, mi gato se escapo, perro en la calle, gato en la calle, se escapo mi perro, se escapo mi gato, se fue mi perro" },
  { id: "farmacias", vista: "farmacias", clave: "farmacias", titulo: "Farmacias", linea: "Farmacias abiertas ahora · cerca tuyo",
    palabras: "farmacia, farmacias, remedio, remedios, medicamento, medicamentos, pastilla, pastillas, jarabe, analgesico, ibuprofeno, paracetamol, aspirina, farmaceutico, droga, drogueria",
    frases: "farmacia de turno, farmacia abierta, farmacia 24 horas, farmacia 24, farmacia cerca, farmacia de guardia, necesito un remedio, comprar un remedio, remedio urgente, farmacia abierta ahora, donde comprar remedios, farmacias de turno" },
  { id: "luz", vista: "luz", clave: "luz", titulo: "Cortes de luz", linea: "Cortes de luz en este momento y los programados",
    palabras: "luz, edesur, corte, cortes, apagon, energia, electricidad, electrico, electrica, transformador, tension, enre, apagaron, cortaron",
    frases: "sin luz, se fue la luz, no hay luz, corte de luz, cortes de luz, se corto la luz, cortaron la luz, volvio la luz, cuando vuelve la luz, baja tension, apagon en lomas, luz cortada" },
  { id: "agua", vista: "agua", clave: "agua", titulo: "Cortes de agua", linea: "Cortes de agua de AySA y avisos de los diarios",
    palabras: "agua, aysa, canilla, canillas, caneria, presion, cloaca, cloacas, potable",
    frases: "sin agua, no hay agua, corte de agua, cortes de agua, se fue el agua, cortaron el agua, falta de agua, no sale agua, poca presion de agua, cuando vuelve el agua, agua cortada" },
  { id: "clima", vista: "clima", clave: "clima", titulo: "Clima", linea: "El tiempo ahora, hora por hora y a 5 días",
    palabras: "clima, tiempo, temperatura, lluvia, llueve, llover, lloviendo, lluvioso, paraguas, calor, frio, fresco, pronostico, viento, tormenta, granizo, humedad, grados, nublado, soleado, sol, nieblas, niebla, helada, temporal, impermeable, campera, abrigo",
    frases: "va a llover, que tiempo hace, que tiempo va a hacer, hace frio, hace calor, cuantos grados, llevo paraguas, necesito paraguas, tiempo de manana, tiempo de hoy, clima de hoy, clima de manana, pronostico extendido, va a hacer frio, va a hacer calor, hora por hora" },
  { id: "tren", vista: "tren", clave: "tren", titulo: "Tren Roca", linea: "Estado del tren Roca y avisos del ramal",
    palabras: "tren, trenes, roca, ramal, ferrocarril, estacion, estaciones, constitucion, ezeiza, formacion, vias, andén, anden",
    frases: "tren roca, tren a capital, tren a constitucion, horario del tren, el tren funciona, esta andando el tren, estado del tren, ramal temperley" },
  { id: "colectivos", vista: "colectivos", clave: "colectivos", titulo: "Colectivos", linea: "Paros y avisos de colectivos",
    palabras: "colectivo, colectivos, bondi, bondis, micro, omnibus, uta, paro, paros, linea, lineas, chofer, choferes, bus",
    frases: "paro de colectivos, hay colectivos, hay paro, funcionan los colectivos, paro de transporte, paro de la uta, hay paro de colectivos, colectivo de lomas" },
  { id: "empleo", vista: "empleo", clave: "empleo", titulo: "Portal Empleo", linea: "Portal Empleo oficial y gratuito: subí tu CV, mirá ofertas y cursos",
    palabras: "trabajo, trabajar, empleo, empleos, cv, curriculum, curriculo, laboral, laborales, oferta, ofertas, vacante, vacantes, postularme, postular, desempleado, desocupado, conseguir, capacitacion, capacitaciones, curso, cursos, formacion",
    frases: "busco trabajo, buscar trabajo, conseguir trabajo, necesito trabajo, quiero trabajar, bolsa de trabajo, oferta laboral, ofertas laborales, ofertas de trabajo, hacer un curriculum, armar el cv, subir mi cv, portal empleo, cursos gratis, curso gratis, cursos gratuitos, quiero hacer un curso" },
  { id: "trabajo", vista: "trabajo", clave: "trabajo", titulo: "Trabajo para mayores de 50 años", linea: "Busco trabajo y ofrezco trabajo entre vecinos mayores de 50",
    palabras: "trabajo, trabajar, empleo, changa, changas, oficio, oficios, cincuenta, mayores, jubilado, ofrezco, necesito, busco, empleada, domestica, cuidado, cuidadora, cuidador, jardinero, albanil, plomero, electricista, pintor, gasista, niñera, ninera, limpieza",
    frases: "mayores de 50, mayor de 50, trabajo para mayores, trabajo mayores de 50, mas de 50, busco trabajo, ofrezco trabajo, necesito trabajo, tengo mas de 50, trabajo para jubilados, cuido adultos, cuidar abuelos, cuidadora de adultos, hago changas, trabajo de oficio" },
  { id: "comunidad", vista: "comunidad", clave: "comunidad", titulo: "Trámites municipales", linea: "Turnos y trámites online del Municipio (Comunidad Lomas)",
    palabras: "turno, turnos, tramite, tramites, municipio, municipal, municipalidad, intendencia, gestion, gestiones, tasa, tasas, comunidad, habilitacion, documentacion, dni, perfil, pagos, pagar, partida, abl",
    frases: "sacar turno, sacar un turno, turno online, tramite online, tramites online, tramites municipales, hacer un tramite, comunidad lomas, perfil digital, pagar la tasa, pagar tasas, pagar abl, turno dni, turno de documentacion, renovar dni, turno municipal, turno en el municipio" },
  { id: "jubilados", vista: "jubilados", clave: null, titulo: "Jubilados: salir y disfrutar", linea: "Talleres, cursos y centros de jubilados de Lomas",
    palabras: "jubilados, jubilado, jubilada, abuelos, abuelo, abuela, abuelas, mayores, mayor, ancianos, anciano, abuelito, abuelita, upami, pami, taller, talleres, curso, cursos, universidad, tercera, edad, centro, centros, actividades, paseos",
    frases: "adultos mayores, persona mayor, personas mayores, tercera edad, centro de jubilados, centros de jubilados, club de jubilados, talleres de pami, talleres pami, talleres gratis, talleres para jubilados, cursos de pami, cursos pami, cursos para jubilados, curso de la universidad, universidad para jubilados, actividades para jubilados, actividades para abuelos, que hacer con mi abuela, que hacer con mi abuelo, algo para hacer con mis abuelos, donde puede ir mi abuela, donde puede ir mi abuelo, pasarla bien, salir y disfrutar, centro de jubilados de mi barrio, upami universidad, pami talleres, pami cursos" },
  { id: "auto", vista: "auto", clave: null, titulo: "Auto y trámites", linea: "Patente, multas, licencia, VTV, registro y transferencia",
    palabras: "auto, autos, coche, coches, moto, motos, motocicleta, vehiculo, vehiculos, patente, patentes, dominio, chapa, automotor, automotores, multa, multas, infraccion, infracciones, fotomulta, fotomultas, licencia, licencias, carnet, carne, registro, conducir, conductor, manejar, vtv, verificacion, tecnica, transferencia, transferir, titularidad, cedula, arba, formulario",
    frases: "cuanto debo de patente, deuda de patente, pagar la patente, consultar la patente, patente del auto, patente de la moto, licencia de conducir, carnet de conducir, registro de conducir, sacar el registro, sacar la licencia, renovar el registro, renovar la licencia, se me vencio el registro, se me vencio la licencia, verificacion tecnica vehicular, verificacion tecnica, sacar turno vtv, turno de vtv, turno para la vtv, transferir un auto, transferir una moto, transferencia de auto, transferencia de un auto, vender mi auto, vendi mi auto, compre un auto, registro del automotor, registro automotor, multas de transito, consultar multas, tengo multas, foto multa, cedula verde, cedula azul, cedula digital, tramites del auto, tramites de la moto, formulario 08, libre deuda" },
  { id: "agenda", vista: "agenda", clave: "agenda", titulo: "Agenda de Lomas", linea: "Eventos y actividades en Lomas: notas de los diarios locales",
    palabras: "evento, eventos, agenda, festival, festivales, feria, ferias, show, shows, recital, recitales, concierto, conciertos, espectaculo, espectaculos, teatro, cine, actividad, actividades, taller, talleres, kermes, muestra, exposicion, expo, fiesta, salir, paseo, obra, inscripcion, inscripciones",
    frases: "que hacer, que hacer hoy, que hacer manana, que hacer el fin de semana, que hacer este fin de semana, que hay para hacer, fin de semana, plan para hoy, planes para el finde, actividades gratis, actividad gratis, eventos gratis, espectaculo gratis, salir a pasear, algo para hacer, que hay hoy en lomas, actividades para chicos, que hacer con los chicos" },
  { id: "emprendedores", vista: "emprendedores", clave: "emprendedores", titulo: "Emprendedores", linea: "Emprendimientos de vecinos: productos y servicios de Lomas",
    palabras: "emprendimiento, emprendimientos, emprendedor, emprendedora, emprendedores, vender, venta, ventas, vendo, comprar, compra, compras, negocio, negocios, local, servicio, servicios, producto, productos, artesanias, artesano, comercio, pedidos, delivery, encargo, encargos",
    frases: "quiero vender, quiero comprar, para vender, para comprar, vender algo, comprar algo, mi emprendimiento, publicar mi emprendimiento, mi negocio, tengo un emprendimiento, tengo un negocio, donde comprar, quien vende, hago tortas, vendo ropa, hago comida, servicio a domicilio" },
  { id: "deportes", vista: "deportes", clave: null, titulo: "Deportes para chicos", linea: "Clubes y escuelas deportivas de Lomas para chicos",
    palabras: "deporte, deportes, deportivo, club, clubes, escuelita, escuela, entrenar, entrenamiento, futbol, futsal, basquet, basket, natacion, pileta, hockey, voley, patin, taekwondo, karate, judo, artes, marciales, atletismo, rugby, gimnasia, chicos, ninos, ninas, infantil, hijo, hijos",
    frases: "deportes para chicos, deporte para ninos, club para mi hijo, club para chicos, escuelita de futbol, escuelita de deportes, donde puede jugar mi hijo, donde hacer deporte, actividad para ninos, actividades para chicos, mi hijo quiere jugar, que mi hijo haga deporte, clases de natacion, clases de futbol, clases de patin, artes marciales, escuela de futbol, anotar a mi hijo, anotar a mi hija" },
  { id: "trueque", vista: "trueque", clave: "trueque", titulo: "Trueque", linea: "Cambios entre vecinos: ofrecé lo que no usás y buscá lo que necesitás",
    palabras: "trueque, trocar, cambiar, cambio, cambios, permutar, permuta, intercambio, intercambiar, canje, canjear, regalo, regalar, usado, usada, usados, comprar, vender, ropa, juguetes, muebles",
    frases: "feria de trueque, cambiar ropa, cambiar cosas, cambio por, regalo cosas, regalar cosas, cosas usadas, ropa usada, intercambio de cosas, quiero cambiar, tengo para cambiar, cosas que no uso, no uso mas" },
  { id: "discapacidad", vista: "discapacidad", clave: "discapacidad", titulo: "Discapacidad", linea: "Trámites, certificado (CUD) y ayuda para personas con discapacidad",
    palabras: "discapacidad, discapacitado, discapacitada, cud, certificado, invalidez, silla, autismo, tea, senadis, andis, pase, simbolo, accesibilidad, ciego, sordo, baston, ruedas, minusvalido",
    frases: "certificado de discapacidad, certificado unico de discapacidad, pase libre, pase de colectivo, pension por invalidez, silla de ruedas, estacionamiento discapacidad, tramite cud, persona con discapacidad, hijo con discapacidad, mi hijo es autista" },
  { id: "coop", vista: "coop", clave: "coop", titulo: "COOP", linea: "Luminarias, poda, árboles y arreglos del barrio",
    palabras: "coop, luminaria, luminarias, poda, podar, arbol, arboles, alumbrado, lampara, bache, baches, zanja, vereda, calle, barrio, reclamo, reclamos, basura, desmalezado, yuyos, pasto, cordon, mantenimiento",
    frases: "arreglo del barrio, arreglos del barrio, poste de luz, luz de la calle, calle oscura, la calle esta rota, bache en la calle, arbol caido, arbol por caer, poda de arbol, pedir una poda, reclamo del barrio, hacer un reclamo, no hay alumbrado" },
  { id: "quiniela", vista: "quiniela", clave: "quiniela", titulo: "Quiniela y Quini 6", linea: "Resultados de hoy de la Quiniela y del Quini 6",
    palabras: "quiniela, quinielas, quini, quini6, loteria, sorteo, sorteos, resultado, resultados, numero, numeros, ganador, ganadores, premio, premios, tombola, extracto, provincia, nacional",
    frases: "quini 6, quini seis, resultados de la quiniela, resultado de la quiniela, numeros de la quiniela, que salio, que salio en la quiniela, salio el quini, numero ganador, extracto de la quiniela, loteria de hoy" },
  { id: "juegos", vista: "juegos", clave: null, titulo: "Juegos", linea: "Juegos gratis para pasar el rato (y para chicos)",
    palabras: "juego, juegos, jugar, jugamos, divertirme, entretener, entretenimiento, aburrido, tateti, viborita, apila, cosmo, zafa, naves, nave, pintar, colorear, peques, chicos, nene, nena, diversion",
    frases: "pasar el rato, estoy aburrido, estoy aburrida, algo para jugar, juego para chicos, juegos para chicos, juegos para nenes, ta te ti, ta-te-ti, juego de naves, juego del perro" },
  { id: "noticias", vista: "noticias", clave: "noticias", titulo: "Noticias de Lomas", linea: "Titulares de los diarios de Lomas, con enlace a cada nota",
    palabras: "noticia, noticias, novedades, novedad, diario, diarios, periodico, titular, titulares, informacion, actualidad, prensa",
    frases: "que paso, que paso hoy, que paso en lomas, ultimas noticias, noticias de lomas, noticias de hoy, que esta pasando, que se dice" },
  { id: "pasa", vista: "pasa-avisar", clave: "pasa", titulo: "Avisá si pasa algo en tu zona", linea: "Contale a los vecinos qué pasa: calle cortada, choque, árbol caído, inundación",
    palabras: "avisar, aviso, avisos, inundacion, inundado, inundada, choque, semaforo, corte, cortada, cortado, incendio, humo, accidente, poste, cable, cables, pozo, derrumbe, vecinos",
    frases: "calle cortada, calle inundada, hay un choque, arbol caido, semaforo roto, semaforo sin luz, aviso a los vecinos, avisar a los vecinos, quiero avisar, algo paso en mi barrio, que pasa en mi zona, que pasa en mi barrio, hay un incendio, cable caido, calle anegada" },
  { id: "sos", vista: "sos", clave: null, titulo: "SOS: números de emergencia", linea: "Ambulancia, policía, bomberos y otros teléfonos para llamar ya",
    palabras: "sos, emergencia, emergencias, ambulancia, policia, bomberos, 911, 107, 100, 144, 103, auxilio, socorro, urgente, urgencia, incendio, robo, asalto, ladron, ladrones, violencia, peligro, ayuda, denuncia, maltrato, secuestro, infarto, ahogo",
    frases: "necesito ayuda, necesito una ambulancia, llamar a la policia, llamar a los bomberos, numero de la policia, numero de emergencia, numeros de emergencia, numero de bomberos, violencia de genero, me robaron, me estan robando, hay un incendio, pedir ayuda, es urgente, emergencia medica, defensa civil" },
  { id: "otros", vista: "otros", clave: "urgencias", titulo: "Emergencias y servicios", linea: "Policía, bomberos y teléfonos de reclamos y servicios",
    palabras: "comisaria, comisarias, policia, bomberos, bombero, reclamo, reclamos, servicio, servicios, gas, metrogas, edesur, aysa, defensa, civil, telefono, telefonos, numero, numeros",
    frases: "comisaria cerca, comisaria de lomas, telefono de la comisaria, numero de la comisaria, bomberos de lomas, perdida de gas, pierde gas, olor a gas, telefono de edesur, telefono de aysa, reclamo de luz, reclamo de agua, defensa civil" },
  { id: "notificaciones", vista: "notificaciones", clave: null, titulo: "Avisos en tu celular", linea: "Activá las notificaciones: cortes de luz, tormentas, tren y más",
    palabras: "notificacion, notificaciones, avisos, alertas, alerta, avisarme, push, activar, recordatorio, recibir",
    frases: "avisarme cuando, que me avise, quiero que me avise, activar avisos, activar notificaciones, recibir avisos, recibir alertas, avisos al celular, avisos del celular" },
];

// ---- Para buscar rápido: las palabras y frases de cada sección se preparan una sola vez ----
type Preparada = SeccionBusca & { sonidos: string[]; fr: string[][] };
const lista = (s?: string) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);
let preparadas: Preparada[] | null = null;
const preparar = () => (preparadas ??= SECCIONES.map((s) => ({
  ...s,
  sonidos: [...new Set(lista(s.palabras).map((p) => sonido(SIN_TILDES(p))))],
  fr: lista(s.frases).map((f) => palabrasDe(f).map((p) => sonido(p))),
})));

export type Coincidencia = { id: string; vista: string; clave: string | null; titulo: string; linea: string; puntos: number };

// Devuelve las secciones que mejor coinciden con lo que se escribió, la que más puntos tiene primero
export function buscarSecciones(consulta: string, maximo = 4): Coincidencia[] {
  const q = palabrasDe(consulta).map(sonido);
  if (!q.length) return [];
  const res = preparar().map((s) => {
    let puntos = 0;
    for (const t of q) { let mejor = 0; for (const w of s.sonidos) { const v = parecido(t, w); if (v > mejor) mejor = v; if (mejor === 1) break; } puntos += mejor; }
    for (const f of s.fr) if (f.length >= 2 && f.every((p) => q.some((t) => parecido(t, p) >= 0.8))) puntos += 2 + f.length * 0.5; // una frase entera vale más que palabras sueltas
    return { id: s.id, vista: s.vista, clave: s.clave, titulo: s.titulo, linea: s.linea, puntos };
  }).filter((r) => r.puntos >= 0.8).sort((a, b) => b.puntos - a.puntos);
  const tope = res[0]?.puntos ?? 0;
  return res.filter((r) => r.puntos >= Math.max(0.8, tope * 0.45)).slice(0, maximo);
}

// Para los datos cargados (lugares, publicaciones...): cada palabra de la búsqueda tiene que aparecer, escrita igual, en plural o con un error de tipeo
export function coincideTexto(consulta: string, texto: string) {
  const q = palabrasDe(consulta);
  if (!q.length) return false;
  const t = limpiar(texto), palabras = t.split(" ").map(sonido);
  return q.every((p) => t.includes(p) || palabras.some((w) => parecido(sonido(p), w) >= 0.8));
}
