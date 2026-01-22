type RefundItem = {
  name: string
  qty: number
  amount: number
}

type RefundData = {
  invoiceNo: string
  orderId: string
  items: RefundItem[]
  total: number
  paymentMode: string
  refundRef?: string
  voidedBy?: string
  dateTime?: string
}

export function refundReceipt(data: RefundData, paperWidth: 58 | 80 = 58): string {
  const width = paperWidth || 58
  const lineWidth = width === 58 ? 32 : 48
  const colItem = width === 58 ? 16 : 26
  const colQty = 5
  const colAmt = lineWidth - colItem - colQty
  const lineStr = '-'.repeat(lineWidth)
  
  let out = ''
  
  out += '       REFUND / VOID\n'
  out += lineStr + '\n'
  out += `Invoice : ${data.invoiceNo}\n`
  out += `Order   : ${data.orderId}\n`
  out += `Date    : ${data.dateTime || new Date().toLocaleString()}\n`
  if (data.voidedBy) out += `Voided By: ${data.voidedBy}\n`
  out += lineStr + '\n'
  out += padRight('Item', colItem) + padLeft('Qty', colQty) + padLeft('Amt', colAmt) + '\n'
  out += lineStr + '\n'
  
  data.items.forEach(i => {
    out += padRight(i.name, colItem) + padLeft(String(i.qty), colQty) + padLeft(i.amount.toFixed(2), colAmt) + '\n'
  })
  
  out += lineStr + '\n'
  out += padRight('TOTAL', colItem + colQty) + padLeft(data.total.toFixed(2), colAmt) + '\n'
  out += lineStr + '\n'
  
  out += `Payment : ${data.paymentMode}\n`
  if (data.refundRef) out += `Refund Ref: ${data.refundRef}\n`
  out += lineStr + '\n'
  out += 'Transaction VOIDED\n'
  out += '\n\n' // ESC/POS feed
  return out
}

/* helper */
function padRight(text: string, len: number) {
  return text.length > len ? text.slice(0, len) : text + ' '.repeat(len - text.length)
}
function padLeft(text: string, len: number) {
  return text.length > len ? text.slice(0, len) : ' '.repeat(len - text.length) + text
}
