export function gstSalesReceipt(
  data: {
    business: {
      name: string
      legalName: string
      gstin: string
      address: string
      phone: string
    }
    invoiceNo: string
    orderId: string
    dateTime: string
    items: {
      name: string
      qty: number
      amount: number
    }[]
    subTotal: number
    cgstRate: number
    cgstAmount: number
    sgstRate: number
    sgstAmount: number
    grandTotal: number
    paymentMode: string
    paymentRef?: string
  },
  paperWidth: 58 | 80 = 58
): string {
  // --------------------
  // WIDTH CONFIG
  // --------------------
  const chars = paperWidth === 58 ? 32 : 48
  const line = '-'.repeat(chars)

  const center = (text: string) => {
    if (text.length >= chars) return text.slice(0, chars)
    const pad = Math.floor((chars - text.length) / 2)
    return ' '.repeat(pad) + text
  }

  const money = (n: number) => n.toFixed(2)

  const colItem = paperWidth === 58 ? 16 : 26
  const colQty = 4
  const colAmt = chars - colItem - colQty

  const padRight = (t: string, l: number) =>
    t.length > l ? t.slice(0, l) : t + ' '.repeat(l - t.length)

  const padLeft = (t: string, l: number) =>
    t.length > l ? t.slice(0, l) : ' '.repeat(l - t.length) + t

  // --------------------
  // ITEMS
  // --------------------
  const itemsText = data.items
    .map(i =>
      padRight(i.name, colItem) +
      padLeft(String(i.qty), colQty) +
      padLeft(money(i.amount), colAmt)
    )
    .join('\n')

  // --------------------
  // RECEIPT
  // --------------------
  let out = ''

  out += `${center(data.business.name)}\n`
  out += `${center(data.business.legalName)}\n`
  out += `${center(`GSTIN: ${data.business.gstin}`)}\n`
  out += `${center(data.business.address)}\n`
  out += `${center(`Ph: ${data.business.phone}`)}\n`
  out += `${line}\n`

  out += `Invoice No : ${data.invoiceNo}\n`
  out += `Order ID   : ${data.orderId}\n`
  out += `Date       : ${data.dateTime}\n`
  out += `${line}\n`

  out +=
    padRight('Item', colItem) +
    padLeft('Qty', colQty) +
    padLeft('Amt', colAmt) +
    '\n'

  out += `${line}\n`
  out += `${itemsText}\n`
  out += `${line}\n`

  out +=
    padRight('Sub Total', colItem + colQty) +
    padLeft(money(data.subTotal), colAmt) +
    '\n\n'

  out +=
    padRight(`CGST @ ${data.cgstRate}%`, colItem + colQty) +
    padLeft(money(data.cgstAmount), colAmt) +
    '\n'

  out +=
    padRight(`SGST @ ${data.sgstRate}%`, colItem + colQty) +
    padLeft(money(data.sgstAmount), colAmt) +
    '\n'

  out += `${line}\n`

  out +=
    padRight('TOTAL GST', colItem + colQty) +
    padLeft(money(data.cgstAmount + data.sgstAmount), colAmt) +
    '\n'

  out += `${line}\n`

  out +=
    padRight('GRAND TOTAL', colItem + colQty) +
    padLeft(money(data.grandTotal), colAmt) +
    '\n'

  out += `${line}\n`
  out += `Payment : ${data.paymentMode}\n`

  if (data.paymentRef) {
    out += `UPI Ref : ${data.paymentRef}\n`
  }

  out += `${line}\n`
  out += `${center('Thank you for your business!')}\n`
  out += `${center('Visit Again 😊')}\n`
  out += `${center('www.bucksbox.in')}\n\n\n`

  return out
}
