export type PrinterSettings = {
  enabled: boolean;
  type: "BLUETOOTH" | "USB" | "NETWORK";
  paperSize: "58MM" | "80MM";
  deviceName?: string;      // Bluetooth printer name
  address?: string;         // Bluetooth MAC / Network IP
  copies: number;
};
