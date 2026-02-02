import { Capacitor } from '@capacitor/core'
import { Printer } from 'printer'

export interface BluetoothDevice {
  name: string
  address: string
}

export interface UsbDevice {
  deviceName: string
  vendorId: number
  productId: number
  vendorProductString: string
}

export function usePrinter() {
  const isNative = Capacitor.isNativePlatform()

  // --------------------
  // Scan Bluetooth Devices
  // --------------------
  const scanBluetooth = async (): Promise<BluetoothDevice[]> => {
    if (!isNative) return []
    try {
      const res = await Printer.scanBluetooth()
      return (
        res.devices?.map((d: any) => ({
          name: d.name || d.deviceName || 'Unknown',
          address: d.address
        })) || []
      )
    } catch (e) {
      console.error('[Printer] scanBluetooth failed:', e)
      return []
    }
  }

  // --------------------
  // Connect Bluetooth
  // --------------------
  const connectBluetooth = async (address: string) => {
    if (!isNative) return
    if (!address) throw new Error('[Printer] Bluetooth address is required')
    try {
      return await Printer.connectBluetooth({ address })
    } catch (e) {
      console.error('[Printer] connectBluetooth failed:', e)
      throw e
    }
  }

  // --------------------
  // Print via Bluetooth
  // --------------------
  const printBluetooth = async (text: string, width = 58) => {
    if (!isNative) throw new Error('[Printer] Native platform required')
    if (!text) throw new Error('[Printer] Text cannot be empty')
    try {
      // Always send flat string
      return await Printer.printBluetooth({ text, width })
    } catch (e) {
      console.error('[Printer] printBluetooth failed:', e)
      throw e
    }
  }

  // --------------------
  // List USB Devices
  // --------------------
  const listUsb = async (): Promise<UsbDevice[]> => {
    if (!isNative) return []
    try {
      const res = await Printer.listUsb()
      return (
        res.devices?.map((d: any) => ({
          deviceName: d.deviceName || 'Unknown',
          vendorId: d.vendorId,
          productId: d.productId,
          vendorProductString: `${d.vendorId}-${d.productId}`
        })) || []
      )
    } catch (e) {
      console.error('[Printer] listUsb failed:', e)
      return []
    }
  }

  // --------------------
  // Connect USB
  // --------------------
  const connectUsb = async (vendorId: number, productId: number) => {
    if (!isNative) return
    if (vendorId == null || productId == null) {
      throw new Error('[Printer] VendorId and ProductId are required')
    }
    try {
      return await Printer.connectUsb({ vendorId, productId })
    } catch (e) {
      console.error('[Printer] connectUsb failed:', e)
      throw e
    }
  }

  // --------------------
  // Print via USB
  // --------------------
  const printUsb = async (text: string, width = 80) => {
    if (!isNative) throw new Error('[Printer] Native platform required')
    if (!text) throw new Error('[Printer] Text cannot be empty')
    try {
      return await Printer.printUsb({ text, width })
    } catch (e) {
      console.error('[Printer] printUsb failed:', e)
      throw e
    }
  }

  return {
    scanBluetooth,
    connectBluetooth,
    printBluetooth,
    listUsb,
    connectUsb,
    printUsb
  }
}
