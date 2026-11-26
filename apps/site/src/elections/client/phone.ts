// Mobile numbers for WhatsApp: a country picker (Egypt first, then the Arab world and
// the countries members most often live in) and one normaliser that accepts Arabic or
// Persian digits, spaces, dashes, a leading 0, or a full +code / 00code number.

/** Name (Arabic), calling code, and a sample national number for the placeholder. */
export const COUNTRIES: [string, string, string][] = [
  ['مصر', '20', '1001234567'],
  ['السعودية', '966', '512345678'],
  ['الإمارات', '971', '501234567'],
  ['الكويت', '965', '50012345'],
  ['قطر', '974', '33123456'],
  ['البحرين', '973', '36001234'],
  ['عُمان', '968', '92123456'],
  ['الأردن', '962', '790123456'],
  ['لبنان', '961', '71123456'],
  ['فلسطين', '970', '599123456'],
  ['سوريا', '963', '944567890'],
  ['العراق', '964', '7912345678'],
  ['اليمن', '967', '712345678'],
  ['ليبيا', '218', '912345678'],
  ['السودان', '249', '911231234'],
  ['تونس', '216', '20123456'],
  ['الجزائر', '213', '551234567'],
  ['المغرب', '212', '650123456'],
  ['الولايات المتحدة', '1', '2015550123'],
  ['كندا', '1', '5062345678'],
  ['المملكة المتحدة', '44', '7400123456'],
  ['أيرلندا', '353', '850123456'],
  ['ألمانيا', '49', '15123456789'],
  ['فرنسا', '33', '612345678'],
  ['إيطاليا', '39', '3123456789'],
  ['إسبانيا', '34', '612345678'],
  ['هولندا', '31', '612345678'],
  ['بلجيكا', '32', '470123456'],
  ['سويسرا', '41', '781234567'],
  ['النمسا', '43', '664123456'],
  ['السويد', '46', '701234567'],
  ['النرويج', '47', '40612345'],
  ['الدنمارك', '45', '34412345'],
  ['اليونان', '30', '6912345678'],
  ['قبرص', '357', '96123456'],
  ['تركيا', '90', '5012345678'],
  ['روسيا', '7', '9123456789'],
  ['الصين', '86', '13123456789'],
  ['اليابان', '81', '9012345678'],
  ['الهند', '91', '8123456789'],
  ['باكستان', '92', '3012345678'],
  ['ماليزيا', '60', '123456789'],
  ['سنغافورة', '65', '81234567'],
  ['أستراليا', '61', '412345678'],
  ['نيوزيلندا', '64', '211234567'],
  ['جنوب أفريقيا', '27', '711234567'],
  ['نيجيريا', '234', '8021234567'],
  ['كينيا', '254', '712123456'],
  ['البرازيل', '55', '11961234567'],
  ['المكسيك', '52', '2221234567'],
];

/** Arabic-Indic and Persian digits turned into Latin ones; nothing else changes. */
export function latin(v: string): string {
  return v
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** Latin digits only, with spacing and punctuation removed (a leading + is kept). */
export function digits(v: string): string {
  return latin(v).replace(/[\s\-().]/g, '');
}

/**
 * Splits whatever was typed into a calling code and a national number. A number typed
 * with its own +code / 00code wins over the picker; otherwise the picker's code is used
 * and a leading 0 (a national habit) is dropped.
 */
export function split(typed: string, picked: string): { cc: string; national: string } {
  let v = digits(typed);
  if (/^(\+|00)[1-9]/.test(v)) {
    v = v.replace(/^(\+|00)/, '');
    for (let n = 3; n > 0; n--) {
      const code = v.slice(0, n);
      if (COUNTRIES.some((c) => c[1] === code)) return { cc: code, national: v.slice(n).replace(/^0+/, '') };
    }
    return { cc: v.slice(0, 3), national: v.slice(3) };
  }
  v = v.replace(/^\+/, '');
  if (v.startsWith(picked) && v.length - picked.length >= 7) v = v.slice(picked.length);
  return { cc: picked, national: v.replace(/^0+/, '') };
}

/** +<code><number>, or '' when it cannot be a mobile number. */
export function e164(typed: string, picked: string): string {
  const { cc, national } = split(typed, picked);
  if (!/^\d{1,3}$/.test(cc) || !/^\d{6,13}$/.test(national)) return '';
  return `+${cc}${national}`;
}

/** An Egyptian-style local number check for the complaints form (01X XXXX XXXX), or any +code number. */
export function validComplaintPhone(typed: string): boolean {
  const v = digits(typed);
  if (/^(\+|00)[1-9]\d{7,14}$/.test(v)) return true;
  return /^01[0125]\d{8}$/.test(v);
}
