import { useState } from "react";
import { COUNTRIES, findCountry, toE164Digits, decomposeE164 } from "../data/countries";

// Controlled via two local pieces (country + national digits) but reports a
// single normalized "<dial><national>" digit string upward, e.g. "593987776666".
// That format is also exactly what the Datum backend expects for telefono_cuidador.
export default function PhoneInput({ value, onChange, placeholder }) {
  const initial = decomposeE164(value);
  const [countryCode, setCountryCode] = useState(initial.country.code);
  const [national, setNational] = useState(initial.national);
  const country = findCountry(countryCode);

  function emit(nextCountry, nextNational) {
    const digits = nextNational.replace(/\D/g, "");
    setNational(digits);
    onChange(digits ? toE164Digits(nextCountry.dial, digits) : "");
  }

  return (
    <div className="sm-phone-input">
      <select
        className="sm-phone-country"
        value={countryCode}
        onChange={(e) => {
          setCountryCode(e.target.value);
          emit(findCountry(e.target.value), national);
        }}
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} +{c.dial}
          </option>
        ))}
      </select>
      <input
        className="sm-input sm-phone-national"
        placeholder={placeholder || "99 999 9999"}
        value={national}
        onChange={(e) => emit(country, e.target.value)}
        inputMode="numeric"
      />
    </div>
  );
}
