<template>
  <v-card rounded="xl" variant="flat">
    <v-card-title>Printer Settings</v-card-title>

    <v-card-text>
      <!-- Enable/Disable Printer -->
      <v-switch v-model="form.enabled" label="Enable Printer" />

      <!-- Printer Type -->
      <v-select
        v-model="form.type"
        :items="['BLUETOOTH', 'USB', 'NETWORK']"
        label="Printer Type"
      />

      <!-- Paper Size -->
      <v-select
        v-model="form.paperSize"
        :items="['58MM', '80MM']"
        label="Paper Size"
      />

      <!-- Bluetooth Printers -->
      <v-select
        v-if="form.type === 'BLUETOOTH'"
        v-model="form.deviceAddress"
        :items="bluetoothDevices"
        item-title="name"
        item-value="address"
        label="Select Bluetooth Printer"
        :loading="scanningBluetooth"
        prepend-icon="mdi-bluetooth"
      >
        <template #append>
          <v-btn icon @click="scanForBluetooth">
            <v-icon>mdi-refresh</v-icon>
          </v-btn>
        </template>
      </v-select>

      <!-- USB Printers -->
      <v-select
        v-if="form.type === 'USB'"
        v-model="form.usbDevice"
        :items="usbDevices"
        item-title="deviceName"
        item-value="vendorProductString"
        label="Select USB Printer"
        :loading="scanningUsb"
        prepend-icon="mdi-usb"
      >
        <template #append>
          <v-btn icon @click="scanForUsb">
            <v-icon>mdi-refresh</v-icon>
          </v-btn>
        </template>
      </v-select>

      <!-- Network Printer -->
      <v-text-field
        v-if="form.type === 'NETWORK'"
        v-model="form.address"
        label="Printer IP Address"
      />

      <!-- Number of Copies -->
      <v-text-field
        type="number"
        v-model.number="form.copies"
        label="Number of Copies"
        min="1"
      />
    </v-card-text>

    <v-select
      v-model="form.template"
      label="Receipt Template"
      :items="[
        { title: 'NON GST SALES RECEIPT', value: 'NONGST_INVOICE' },
        { title: 'GST SALES RECEIPT', value: 'GST_INVOICE' },
        { title: 'KOT RECEIPT', value: 'KITCHEN' },
      ]"
    />

    <!-- Actions -->
    <v-card-actions>
      <v-btn color="primary" block @click="save">Save Settings</v-btn>
    </v-card-actions>
    <v-btn
      color="success"
      block
      @click="testPrint"
      :disabled="!form.enabled || !canTestPrint"
    >
      Test Print
    </v-btn>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, Text } from "vue";
import { usePrinter } from "@/composables/usePrinter";
import { usePrinterSettings } from "@/composables/usePrinterSettings";
import { buildReceipt } from "@/receipts/receiptFactory";

const device = useDevice();
definePageMeta({
  title: "Printer Settings",
  showBack: true,
});

// --------------------
// Composables
// --------------------
const {
  scanBluetooth,
  connectBluetooth,
  printBluetooth,
  listUsb,
  connectUsb,
  printUsb,
} = usePrinter();
const { getSettings, saveSettings } = usePrinterSettings();

// --------------------
// Form state
// --------------------
const form = ref({
  enabled: true,
  type: "BLUETOOTH",
  paperSize: "58MM",
  deviceAddress: "",
  template: "GST",
  usbDevice: "",
  address: "",
  copies: 1,
});

// --------------------
// Device lists
// --------------------
const bluetoothDevices = ref<{ name: string; address: string }[]>([]);
const usbDevices = ref<any[]>([]);

// --------------------
// Scanning states
// --------------------
const scanningBluetooth = ref(false);
const scanningUsb = ref(false);

// --------------------
// Computed: enable Test Print
// --------------------
const canTestPrint = computed(() => {
  switch (form.value.type) {
    case "BLUETOOTH":
      return !!form.value.deviceAddress;
    case "USB":
      return !!form.value.usbDevice;
    case "NETWORK":
      return !!form.value.address;
    default:
      return false;
  }
});

// --------------------
// Load saved settings and scan devices
// --------------------
onMounted(async () => {
  const saved = await getSettings();
  if (saved) form.value = saved;

  if (form.value.type === "BLUETOOTH") scanForBluetooth();
  if (form.value.type === "USB") scanForUsb();
});

// --------------------
// Scan for Bluetooth
// --------------------
const scanForBluetooth = async () => {
  try {
    scanningBluetooth.value = true;
    const devices = await scanBluetooth();
    bluetoothDevices.value = devices;
    if (!form.value.deviceAddress && devices.length > 0) {
      form.value.deviceAddress = devices[0].address;
    }
  } catch (e) {
    console.error("Bluetooth scan failed:", e);
  } finally {
    scanningBluetooth.value = false;
  }
};

// --------------------
// Scan for USB
// --------------------
const scanForUsb = async () => {
  try {
    scanningUsb.value = true;
    const devices = await listUsb();
    usbDevices.value = devices.map((d: any) => ({
      ...d,
      vendorProductString: `${d.vendorId}-${d.productId}`,
    }));
    if (!form.value.usbDevice && devices.length > 0) {
      form.value.usbDevice = usbDevices.value[0].vendorProductString;
    }
  } catch (e) {
    console.error("USB scan failed:", e);
  } finally {
    scanningUsb.value = false;
  }
};

// --------------------
// Save printer settings and auto-connect
// --------------------
const save = async () => {
  await saveSettings(form.value);
  alert("Printer settings saved");

  if (!form.value.enabled) return;

  try {
    if (form.value.type === "BLUETOOTH" && form.value.deviceAddress) {
      console.log("Connecting Bluetooth:", form.value.deviceAddress);
      await connectBluetooth(form.value.deviceAddress); // <- pass flat string
      alert("Bluetooth connected");
      console.log("Bluetooth connected");
    }

    if (form.value.type === "USB" && form.value.usbDevice) {
      const [vendorId, productId] = form.value.usbDevice.split("-").map(Number);
      await connectUsb(vendorId, productId); // <- pass flat numbers
      console.log("USB connected");
    }
  } catch (e) {
    console.error("Auto-connect failed:", e);
    alert("Auto-connect failed: " + (e as any).message || e);
  }
};

// --------------------
// Test Print
// --------------------
const testPrint = async () => {
  if (!canTestPrint.value) return;

  const width = parseInt(form.value.paperSize.replace("MM", ""));

  const text = `*** Test Receipt ***
  Printer Type: ${form.value.type}
  Device: ${
    form.value.type === "BLUETOOTH"
      ? form.value.deviceAddress
      : form.value.type === "USB"
      ? form.value.usbDevice
      : form.value.address
  }
  Copies: ${form.value.copies}
  ----------------------------
  Thank you!
  `;

  // const orderData = {
  //   business: {
  //     name: "BUCKS CLOUD POS",
  //     legalName: "Bucksbox Software Pvt Ltd",
  //     gstin: "29ABCDE1234F1Z5",
  //     address: "#12, MG Road, Bengaluru",
  //     phone: "+91 98765 43210",
  //   },
  //   invoiceNo: "INV-102345",
  //   orderId: "ORD-889912",
  //   dateTime: "11-01-2026 05:45 PM",
  //   items: [
  //     { name: "Tea", qty: 2, amount: 40 },
  //     { name: "Coffee", qty: 1, amount: 30 },
  //     { name: "Sandwich", qty: 1, amount: 70 },
  //   ],
  //   subTotal: 140,
  //   cgstRate: 2.5,
  //   cgstAmount: 3.5,
  //   sgstRate: 2.5,
  //   sgstAmount: 3.5,
  //   grandTotal: 147,
  //   paymentMode: "UPI",
  //   paymentRef: "346789012345",
  // };

  // const receiptText = buildReceipt("GST_SALES", orderData);

  console.log("text", Text);

  try {
    if (form.value.type === "BLUETOOTH" && form.value.deviceAddress) {
      for (let i = 0; i < form.value.copies; i++) {
        await printBluetooth(text, width); // <- flat string & width
      }
    }

    if (form.value.type === "USB" && form.value.usbDevice) {
      for (let i = 0; i < form.value.copies; i++) {
        await printUsb(text, width); // <- flat string & width
      }
    }

    if (form.value.type === "NETWORK") {
      alert("Network printing not implemented yet");
    }

    alert("Test print completed!");
  } catch (e: any) {
    console.error("Test print failed:", e);
    alert("Test print failed: " + (e.message || e));
  }
};
</script>
