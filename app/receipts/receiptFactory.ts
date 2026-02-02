import { classicReceipt } from './templates/classic'
import { kotReceipt } from './templates/kot'
import { gstSalesReceipt } from './templates/gstSales'
import { refundReceipt } from './templates/refund'
import { nonGSTReceipt } from './templates/nongst'
import type { ReceiptTemplateType } from './templates'


export function buildReceipt(
  template: ReceiptTemplateType,
  data: any,
  width: any
): string {
  switch (template) {
    case 'KOT':
      return kotReceipt(data, width)
    case 'REFUND':
      return refundReceipt(data, width)
    case 'GST_INVOICE':
      return gstSalesReceipt(data, width)
    case 'NONGST_INVOICE':
      return nonGSTReceipt(data, width)
    case 'CLASSIC':
    default:
      return classicReceipt(data, width)
  }
}

// {
//   enabled: true,
//   type: 'BLUETOOTH',
//   paperSize: '58MM',
//   template: 'GST',        // 👈 NEW
//   deviceAddress: '',
//   copies: 1
// }

// <v-select
//   v-model="form.template"
//   label="Receipt Template"
//   :items="[
//     { title: 'Classic', value: 'CLASSIC' },
//     { title: 'GST Invoice', value: 'GST' },
//     { title: 'Compact', value: 'COMPACT' },
//     { title: 'Kitchen Slip', value: 'KITCHEN' }
//   ]"
// />

// import { buildReceipt } from '@/receipts/receiptFactory'

// const receiptText = buildReceipt(
//   form.value.template,
//   orderData
// )

// await printBluetooth(receiptText, 58)

// <v-card class="pa-3 text-mono">
//   <pre>{{ previewText }}</pre>
// </v-card>

// <v-card class="pa-3 text-mono">
//   <pre>{{ previewText }}</pre>
// </v-card>


// const receiptText = gstSalesReceipt({
//   business: {
//     name: 'BUCKS CLOUD POS',
//     legalName: 'Bucksbox Software Pvt Ltd',
//     gstin: '29ABCDE1234F1Z5',
//     address: '#12, MG Road, Bengaluru',
//     phone: '+91 98765 43210'
//   },
//   invoiceNo: 'INV-102345',
//   orderId: 'ORD-889912',
//   dateTime: '11-01-2026 05:45 PM',
//   items: [
//     { name: 'Tea', qty: 2, amount: 40 },
//     { name: 'Coffee', qty: 1, amount: 30 },
//     { name: 'Sandwich', qty: 1, amount: 70 }
//   ],
//   subTotal: 140,
//   cgstRate: 2.5,
//   cgstAmount: 3.5,
//   sgstRate: 2.5,
//   sgstAmount: 3.5,
//   grandTotal: 147,
//   paymentMode: 'UPI',
//   paymentRef: '346789012345'
// })
