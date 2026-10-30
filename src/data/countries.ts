export interface Country {
  id: string;
  es: string;
  /** nombre en alemán tal como va tras «aus» */
  de: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { id: 'es', es: 'España', de: 'Spanien', flag: '🇪🇸' },
  { id: 'mx', es: 'México', de: 'Mexiko', flag: '🇲🇽' },
  { id: 'ar', es: 'Argentina', de: 'Argentinien', flag: '🇦🇷' },
  { id: 'co', es: 'Colombia', de: 'Kolumbien', flag: '🇨🇴' },
  { id: 'cl', es: 'Chile', de: 'Chile', flag: '🇨🇱' },
  { id: 'pe', es: 'Perú', de: 'Peru', flag: '🇵🇪' },
  { id: 've', es: 'Venezuela', de: 'Venezuela', flag: '🇻🇪' },
  { id: 'ec', es: 'Ecuador', de: 'Ecuador', flag: '🇪🇨' },
  { id: 'uy', es: 'Uruguay', de: 'Uruguay', flag: '🇺🇾' },
  { id: 'cu', es: 'Cuba', de: 'Kuba', flag: '🇨🇺' },
  { id: 'br', es: 'Brasil', de: 'Brasilien', flag: '🇧🇷' },
  { id: 'it', es: 'Italia', de: 'Italien', flag: '🇮🇹' },
  { id: 'fr', es: 'Francia', de: 'Frankreich', flag: '🇫🇷' },
];

export function getCountry(id: string): Country {
  return COUNTRIES.find((c) => c.id === id) ?? COUNTRIES[0];
}
