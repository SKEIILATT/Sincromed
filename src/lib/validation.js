import { decomposeE164 } from "../data/countries";

const NAME_RE = /^[a-zA-ZÀ-ÿñÑ\s'.-]{2,}$/;

export function validateName(name) {
  if (!name.trim()) return "Ingresa tu nombre.";
  if (!NAME_RE.test(name.trim())) return "Ingresa un nombre válido (solo letras).";
  return "";
}

export function validatePhone(e164digits) {
  if (!e164digits) return "Ingresa un número de teléfono.";
  const { country, national } = decomposeE164(e164digits);
  if (national.length !== country.length) {
    return `El número de ${country.name} debe tener ${country.length} dígitos.`;
  }
  return "";
}

export function validatePassword(pass) {
  if (!pass) return "Ingresa una contraseña.";
  if (pass.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
  return "";
}
