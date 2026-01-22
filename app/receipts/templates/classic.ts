type ReceiptItem = {
  name: string
  qty: number
  price: number
}

type ReceiptData = {
  invoiceNo: string
  orderId: string
  items: ReceiptItem[]
  paymentMode: string
  upiRef?: string
}

/* ================= HELPERS ================= */

const formatDateTime = (date = new Date()) => {
  const d = date

  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()

  let hours = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'

  hours = hours % 12
  hours = hours ? hours : 12 // 12-hour format
  const hh = String(hours).padStart(2, '0')

  return `${day}-${month}-${year} ${hh}:${minutes} ${ampm}`
}

const padRight = (text: string, len: number) =>
  text.length > len ? text.slice(0, len) : text + ' '.repeat(len - text.length)

const padLeft = (text: string, len: number) =>
  text.length > len ? text.slice(0, len) : ' '.repeat(len - text.length) + text

const getLineWidth = (paperWidth: 58 | 80) =>
  paperWidth === 58 ? 32 : 48

const line = (chars: number) => '-'.repeat(chars)

/* ================= RECEIPT ================= */

export function classicReceipt(
  data: ReceiptData,
  paperWidth: 58 | 80 = 58
): string {
  const lineWidth = getLineWidth(paperWidth)

  // Column widths MUST add up to lineWidth
  const colItem = paperWidth === 58 ? 16 : 26
  const colQty = 5
  const colAmt = lineWidth - colItem - colQty

  let subTotal = 0
  let out = ''

  /* ---------- HEADER ---------- */
  out += '       BUCKS CLOUD POS\n'
  out += '   Bucksbox Software Pvt Ltd\n'
  out += '   GSTIN: 29ABCDE1234F1Z5\n'
  out += '   #12, MG Road, Bengaluru\n'
  out += '   Ph: +91 98765 43210\n'
  out += line(lineWidth) + '\n'

  /* ---------- INVOICE INFO ---------- */
  out += `Invoice No : ${data.invoiceNo}\n`
  out += `Order ID   : ${data.orderId}\n`
  out += `Date       : ${formatDateTime()}\n`
  out += line(lineWidth) + '\n'

  /* ---------- TABLE HEADER ---------- */
  out +=
    padRight('Item', colItem) +
    padLeft('Qty', colQty) +
    padLeft('Amt', colAmt) +
    '\n'
  out += line(lineWidth) + '\n'

  /* ---------- ITEMS ---------- */
  data.items.forEach((i) => {
    const amount = i.qty * i.price
    subTotal += amount

    out +=
      padRight(i.name, colItem) +
      padLeft(i.qty.toString(), colQty) +
      padLeft(amount.toFixed(2), colAmt) +
      '\n'
  })

  out += line(lineWidth) + '\n'

  /* ---------- GST ---------- */
  const cgst = subTotal * 0.025
  const sgst = subTotal * 0.025
  const total = subTotal + cgst + sgst

  out +=
    padRight('Sub Total', colItem + colQty) +
    padLeft(subTotal.toFixed(2), colAmt) +
    '\n\n'

  out +=
    padRight('CGST @ 2.5%', colItem + colQty) +
    padLeft(cgst.toFixed(2), colAmt) +
    '\n'

  out +=
    padRight('SGST @ 2.5%', colItem + colQty) +
    padLeft(sgst.toFixed(2), colAmt) +
    '\n'

  out += line(lineWidth) + '\n'

  out +=
    padRight('GRAND TOTAL', colItem + colQty) +
    padLeft(total.toFixed(2), colAmt) +
    '\n'

  out += line(lineWidth) + '\n'

  /* ---------- PAYMENT ---------- */
  out += `Payment : ${data.paymentMode}\n`
  if (data.upiRef) out += `UPI Ref : ${data.upiRef}\n`

  out += line(lineWidth) + '\n'
  out += 'Thank you for your business!\n'
  out += '      Visit Again 😊\n\n\n'

  return out
}
