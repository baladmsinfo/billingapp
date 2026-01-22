type KOTItem = {
  name: string
  qty: number
}

type KOTData = {
  orderId: string
  tableNo?: string
  items: KOTItem[]
  notes?: string
  dateTime?: string
  paperWidth?: 58 | 80
}

export function kotReceipt(data: KOTData, paperWidth: 58 | 80 = 58): string {
  const width = paperWidth || 58
  const lineWidth = width === 58 ? 32 : 48
  const colItem = width === 58 ? 22 : 36
  const colQty = lineWidth - colItem
  const lineStr = '-'.repeat(lineWidth)
  
  let out = ''
  
  out += '      KITCHEN ORDER\n'
  out += lineStr + '\n'
  out += `Order ID : ${data.orderId}\n`
  if (data.tableNo) out += `Table    : ${data.tableNo}\n`
  out += `Date     : ${data.dateTime || new Date().toLocaleString()}\n`
  out += lineStr + '\n'
  out += padRight('Item', colItem) + padLeft('Qty', colQty) + '\n'
  out += lineStr + '\n'
  
  data.items.forEach(i => {
    out += padRight(i.name, colItem) + padLeft(String(i.qty), colQty) + '\n'
  })
  
  out += lineStr + '\n'
  if (data.notes) {
    out += 'Notes: ' + data.notes + '\n'
    out += lineStr + '\n'
  }
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
