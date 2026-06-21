import { ClipboardList, MessageCircle, BarChart3, Bot, BellRing, Users, TrendingUp } from "lucide-react";
import people1 from "../assets/people/people-1.png";
import people2 from "../assets/people/people-2.png";
import people3 from "../assets/people/people-3.png";
import people4 from "../assets/people/people-4.png";
import people5 from "../assets/people/people-5.png";

export const PEOPLE = [people1, people2, people3, people4, people5];

export const STEPS = [
  {
    icon: ClipboardList,
    title: "Registra los medicamentos",
    body: "El familiar ingresa el nombre del cuidador, su número de WhatsApp y la lista de medicinas con dosis y horarios.",
  },
  {
    icon: MessageCircle,
    title: "El agente avisa por WhatsApp",
    body: "SincroMed le escribe al cuidador a la hora exacta de cada pastilla. Puede confirmar con texto, audio o foto.",
  },
  {
    icon: BarChart3,
    title: "Tú ves la adherencia en tiempo real",
    body: "Desde esta app consultas qué medicinas se tomaron, cuándo y con qué evidencia. Sin llamadas, sin preocupaciones.",
  },
];

export const FEATURES = [
  {
    icon: Bot,
    title: "IA que entiende fotos y audios",
    body: "El agente acepta cualquier forma de confirmación: una foto de las pastillas, un mensaje de voz o simplemente \"listo\".",
  },
  {
    icon: BellRing,
    title: "Recordatorios personalizados por pastilla",
    body: "Cada medicina tiene su propia hora. El sistema envía un recordatorio diferente para cada una.",
  },
  {
    icon: Users,
    title: "Sin límite de medicinas por cuidador",
    body: "Ideal para adultos mayores polimedicados con 5 o más pastillas diarias.",
  },
  {
    icon: TrendingUp,
    title: "Dashboard de adherencia histórica",
    body: "Ve el historial completo de tomas, filtra por fecha y detecta patrones de olvido antes de que sean un problema.",
  },
];

export const TESTIMONIALS = [
  {
    text: "Mi mamá toma 7 pastillas distintas. Antes me llamaba para preguntar cuáles le tocaban. Ahora SincroMed le recuerda todo y yo solo reviso el dashboard.",
    name: "Carolina V.",
    role: "Hija, Guayaquil",
    color: "magenta",
  },
  {
    text: "Lo que más me gustó es que mi papá no tuvo que aprender nada nuevo. Le llega un mensaje de WhatsApp y ya. Él lo usa como siempre ha usado el celular.",
    name: "Roberto M.",
    role: "Hijo, Cuenca",
    color: "blue",
  },
  {
    text: "Configuramos todas las medicinas en 10 minutos. Al día siguiente el agente ya le estaba escribiendo a mi abuela. Sencillísimo.",
    name: "Diana P.",
    role: "Nieta, Quito",
    color: "amber",
  },
];
