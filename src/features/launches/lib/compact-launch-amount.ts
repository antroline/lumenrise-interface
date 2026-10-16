/** Compact display only; the original exact string remains available to every input method. */
export function compactLaunchAmount(value: string) {
  const match = value.match(/^([\d,]+)(\.\d+)?(.*)$/);
  if (!match) return value;
  const whole = match[1].replaceAll(',', '');
  if (whole.length < 7) {
    if (BigInt(whole) > BigInt(0) && (match[2]?.length ?? 0) > 5) {
      return `${match[1]}${match[2].slice(0, 3)}${match[3]}`;
    }
    return value;
  }
  const power = whole.length > 12 ? 12 : whole.length > 9 ? 9 : 6;
  const head = whole.slice(0, -power);
  const fraction = whole.slice(-power, -power + 2).replace(/0+$/, '');
  return `${head}${fraction ? `.${fraction}` : ''}${power === 12 ? 'T' : power === 9 ? 'B' : 'M'}${match[3]}`;
}

