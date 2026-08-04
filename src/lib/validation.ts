export function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0
}

export function validateCNPJ(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, '')
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false

  let sum = 0, w = 5
  for (let i = 0; i < 12; i++, w = w === 2 ? 9 : w - 1) sum += +d[i] * w
  let rem = sum % 11
  if (+d[12] !== (rem < 2 ? 0 : 11 - rem)) return false

  sum = 0; w = 6
  for (let i = 0; i < 13; i++, w = w === 2 ? 9 : w - 1) sum += +d[i] * w
  rem = sum % 11
  return +d[13] === (rem < 2 ? 0 : 11 - rem)
}

export function validateCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += +d[i] * (10 - i)
  let r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  if (r !== +d[9]) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += +d[i] * (11 - i)
  r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  return r === +d[10]
}
