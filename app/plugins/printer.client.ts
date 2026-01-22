import { Capacitor } from "@capacitor/core";
import { Printer } from "printer";
import { usePrinterSettings } from "@/composables/usePrinterSettings";
import { buildReceipt } from "@/receipts/receiptFactory";

export default defineNuxtPlugin(() => {
  const isNative = Capacitor.isNativePlatform();

  /**
   * Print receipt
   * @param data Receipt data
   * @param template Optional template override
   */
  const printReceipt = async (
    data: any,
    template?: string
  ) => {
    if (!isNative) {
      throw new Error("Printing supported only on native platforms");
    }

    // -----------------------------
    // Load printer settings
    // -----------------------------
    const { getSettings } = usePrinterSettings();
    const settings = await getSettings();

    if (!settings || !settings.enabled) {
      throw new Error("Printer is disabled or not configured");
    }

    // -----------------------------
    // Resolve paper width
    // -----------------------------
    const width = settings.paperSize === "80MM" ? 80 : 58;
    const copies = Math.max(1, settings.copies || 1);

    // -----------------------------
    // Resolve template priority
    // -----------------------------
    const selectedTemplate =
      template || settings.template || "DEFAULT";

    // -----------------------------
    // Build receipt
    // -----------------------------
    const receiptText = buildReceipt(
      selectedTemplate,
      data,
      width
    );

    if (!receiptText || typeof receiptText !== "string") {
      throw new Error("Receipt text generation failed");
    }

    // -----------------------------
    // BLUETOOTH
    // -----------------------------
    if (settings.type === "BLUETOOTH") {
      if (!settings.deviceAddress) {
        throw new Error("Bluetooth address missing");
      }

      await Printer.connectBluetooth({
        address: settings.deviceAddress,
      });

      for (let i = 0; i < copies; i++) {
        await Printer.printBluetooth({
          text: receiptText,
          width,
        });
      }

      return true;
    }

    // -----------------------------
    // USB
    // -----------------------------
    if (settings.type === "USB") {
      if (!settings.usbDevice) {
        throw new Error("USB device not selected");
      }

      const [vendorId, productId] = settings.usbDevice
        .split("-")
        .map(Number);

      if (!vendorId || !productId) {
        throw new Error("Invalid USB device IDs");
      }

      await Printer.connectUsb({
        vendorId,
        productId,
      });

      for (let i = 0; i < copies; i++) {
        await Printer.printUsb({
          text: receiptText,
          width,
        });
      }

      return true;
    }

    throw new Error(`Unsupported printer type: ${settings.type}`);
  };

  return {
    provide: {
      printReceipt,
    },
  };
});
