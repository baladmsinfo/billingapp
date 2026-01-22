type ReceiptItem = {
  name: string
  qty: number
  amount: number
}

type NonGSTReceiptData = {
  business: {
    name: string
    legalName: string
    gstin?: string
    address: string
    phone: string
  }
  invoiceNo: string
  orderId: string
  dateTime?: string | Date
  items?: ReceiptItem[]
  subTotal: number
  grandTotal: number
  paymentMode: string
  paymentRef?: string
  paperWidth?: 58 | 80
}

/* =============== HELPERS =============== */
const padRight = (text: string, len: number) =>
  text.length > len ? text.slice(0, len) : text + ' '.repeat(len - text.length)

const padLeft = (text: string, len: number) =>
  text.length > len ? text.slice(0, len) : ' '.repeat(len - text.length) + text

const getLineWidth = (paperWidth: 58 | 80 = 58) => (paperWidth === 58 ? 32 : 48)

const line = (chars: number) => '-'.repeat(chars)

const formatDateTime = (date: string | Date = new Date()) => {
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  let hours = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  const hh = String(hours).padStart(2, '0')
  return `${day}-${month}-${year} ${hh}:${minutes} ${ampm}`
}

/* =============== NON-GST RECEIPT =============== */
export function nonGSTReceipt(data: NonGSTReceiptData): string {
  const width = data.paperWidth || 58
  const lineWidth = getLineWidth(width)

  // Column widths must add up to lineWidth
  const colItem = width === 58 ? 16 : 26
  const colQty = 5
  const colAmt = lineWidth - colItem - colQty

  let out = ''

  // HEADER
  out += padRight('       ' + (data.business.name || ''), lineWidth) + '\n'
  out += padRight('   ' + (data.business.legalName || ''), lineWidth) + '\n'
  if (data.business.gstin) out += padRight(`GSTIN: ${data.business.gstin}`, lineWidth) + '\n'
  out += padRight(data.business.address || '', lineWidth) + '\n'
  out += padRight(`Ph: ${data.business.phone || ''}`, lineWidth) + '\n'
  out += line(lineWidth) + '\n'

  // INVOICE INFO
  out += `Invoice No : ${data.invoiceNo || ''}\n`
  out += `Order ID   : ${data.orderId || ''}\n`
  out += `Date       : ${formatDateTime(data.dateTime)}\n`
  out += line(lineWidth) + '\n'

  // ITEMS TABLE HEADER
  out += padRight('Item', colItem) + padLeft('Qty', colQty) + padLeft('Amt', colAmt) + '\n'
  out += line(lineWidth) + '\n'

  // ITEMS
  const items = data.items || []
  if (items.length === 0) {
    out += padRight('No items', lineWidth) + '\n'
  } else {
    items.forEach(i => {
      out += padRight(i.name || '', colItem) +
             padLeft(String(i.qty || 0), colQty) +
             padLeft((i.amount || 0).toFixed(2), colAmt) + '\n'
    })
  }

  out += line(lineWidth) + '\n'

  // TOTALS
  out += padRight('Sub Total', colItem + colQty) + padLeft((data.subTotal || 0).toFixed(2), colAmt) + '\n'
  out += padRight('GRAND TOTAL', colItem + colQty) + padLeft((data.grandTotal || 0).toFixed(2), colAmt) + '\n'
  out += line(lineWidth) + '\n'

  // PAYMENT
  out += `Payment : ${data.paymentMode || 'CASH'}\n`
  if (data.paymentRef) out += `UPI Ref : ${data.paymentRef}\n`

  out += line(lineWidth) + '\n'
  out += padRight('Thank you for your business!', lineWidth) + '\n'
  out += padRight('      Visit Again 😊', lineWidth) + '\n\n\n' // ESC/POS feed

  return out
}
