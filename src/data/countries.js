// Curated list (not exhaustive) — dial code + expected national-number length,
// used for E.164-style normalization and lightweight validation in PhoneInput.
export const COUNTRIES = [
  { code: "EC", flag: "🇪🇨", name: "Ecuador", dial: "593", length: 9 },
  { code: "CO", flag: "🇨🇴", name: "Colombia", dial: "57", length: 10 },
  { code: "PE", flag: "🇵🇪", name: "Perú", dial: "51", length: 9 },
  { code: "MX", flag: "🇲🇽", name: "México", dial: "52", length: 10 },
  { code: "CL", flag: "🇨🇱", name: "Chile", dial: "56", length: 9 },
  { code: "AR", flag: "🇦🇷", name: "Argentina", dial: "54", length: 10 },
  { code: "BO", flag: "🇧🇴", name: "Bolivia", dial: "591", length: 8 },
  { code: "VE", flag: "🇻🇪", name: "Venezuela", dial: "58", length: 10 },
  { code: "PA", flag: "🇵🇦", name: "Panamá", dial: "507", length: 8 },
  { code: "ES", flag: "🇪🇸", name: "España", dial: "34", length: 9 },
  { code: "US", flag: "🇺🇸", name: "Estados Unidos", dial: "1", length: 10 },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

export function findCountry(code) {
  return COUNTRIES.find((c) => c.code === code) || DEFAULT_COUNTRY;
}

// Combines a country dial code with a national number into the digits-only
// format the backend expects (country code + number, no "+", no trunk "0").
export function toE164Digits(dial, national) {
  const digits = national.replace(/\D/g, "").replace(/^0+/, "");
  return `${dial}${digits}`;
}

// Splits a normalized "<dial><national>" digit string back into its parts,
// matching the longest known dial code first (e.g. "591" before "59").
export function decomposeE164(value) {
  if (!value) return { country: DEFAULT_COUNTRY, national: "" };
  const match = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((c) => value.startsWith(c.dial));
  if (!match) return { country: DEFAULT_COUNTRY, national: value };
  return { country: match, national: value.slice(match.dial.length) };
}
