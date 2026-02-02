import { Preferences } from "@capacitor/preferences";
import type { PrinterSettings } from "@/types/printer";

const KEY = "printer_settings";

export function usePrinterSettings() {
  const getSettings = async (): Promise<PrinterSettings | null> => {
    const { value } = await Preferences.get({ key: KEY });
    return value ? JSON.parse(value) : null;
  };

  const saveSettings = async (settings: PrinterSettings) => {
    await Preferences.set({
      key: KEY,
      value: JSON.stringify(settings),
    });
  };

  const clearSettings = async () => {
    await Preferences.remove({ key: KEY });
  };

  return { getSettings, saveSettings, clearSettings };
}
