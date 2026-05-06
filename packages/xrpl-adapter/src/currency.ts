// XRPL currency code rules:
//   3-char ASCII (e.g. "USD") → use as-is
//   4+ chars                  → must be 40-char hex (20 bytes), uppercased
export function encodeCurrencyCode(code: string): string {
  if (code === 'XRP') {
    throw new Error('XRP is not an issued currency code')
  }
  if (code.length === 3) return code
  const buf = Buffer.alloc(20, 0)
  Buffer.from(code, 'utf8').copy(buf, 0)
  return buf.toString('hex').toUpperCase()
}

export function decodeCurrencyCode(code: string): string {
  if (code.length === 3) return code
  if (/^[0-9A-Fa-f]{40}$/.test(code)) {
    const buf = Buffer.from(code, 'hex')
    let end = buf.indexOf(0)
    if (end === -1) end = buf.length
    return buf.subarray(0, end).toString('utf8')
  }
  return code
}
