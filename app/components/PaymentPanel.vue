<script setup lang="ts">
import { ref, computed, defineProps, defineEmits, watch } from "vue";
import { useNuxtApp } from "#app";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}
interface CustomerInput {
  name?: string;
  phone?: string;
  email?: string;
}

const { $printReceipt } = useNuxtApp();

const props = defineProps<{ cart: CartItem[]; show: boolean }>();
const emit = defineEmits<{
  (e: "close"): void;
  (
    e: "confirm",
    payload: {
      customer?: CustomerInput;
      payments: { method: "CASH" | "UPI"; amount: number }[];
    }
  ): void;
  (e: "done"): void;
}>();

type Step = "CUSTOMER" | "PAYMENT" | "QR" | "RECEIPT";
const step = ref<Step>("CUSTOMER");
const localShow = ref(false);
const paymentMethod = ref<"CASH" | "UPI" | null>(null);
const customer = ref<CustomerInput>({ name: "", phone: "", email: "" });

const subtotal = computed(() =>
  props.cart.reduce((s, i) => s + i.price * i.quantity, 0)
);
const gstAmount = computed(() => +(subtotal.value * 0.18).toFixed(2));
const grandTotal = computed(
  () => +(subtotal.value + gstAmount.value).toFixed(2)
);

const qrCode = ref("");
const qrTimer = ref(30);
let qrInterval: number | null = null;
const stopQR = () => {
  if (qrInterval) clearInterval(qrInterval);
  qrInterval = null;
};
const startQR = () => {
  paymentMethod.value = "UPI";
  qrCode.value = `QR-${Math.floor(Math.random() * 1000000)}`;
  qrTimer.value = 30;
  step.value = "QR";
  qrInterval = window.setInterval(() => {
    if (qrTimer.value > 0) qrTimer.value--;
    else stopQR();
  }, 1000);
};

const resetAll = () => {
  step.value = "CUSTOMER";
  paymentMethod.value = null;
  customer.value = { name: "", phone: "", email: "" };
  stopQR();
};

watch(
  () => props.show,
  (v) => {
    localShow.value = v;
    if (!v) resetAll();
  },
  { immediate: true }
);

const confirmCash = () => {
  emit("confirm", {
    customer:
      customer.value.name || customer.value.phone ? customer.value : undefined,
    payments: [{ method: "CASH", amount: grandTotal.value }],
  });
  paymentMethod.value = "CASH";
  step.value = "RECEIPT";
};
const confirmQR = () => {
  emit("confirm", {
    customer:
      customer.value.name || customer.value.phone ? customer.value : undefined,
    payments: [{ method: "UPI", amount: grandTotal.value }],
  });
  paymentMethod.value = "UPI";
  step.value = "RECEIPT";
};
const confirmUPI = () => {
  stopQR();
  emit("confirm", {
    customer:
      customer.value.name || customer.value.phone ? customer.value : undefined,
    payments: [{ method: "UPI", amount: grandTotal.value }],
  });
  paymentMethod.value = "UPI";
  step.value = "RECEIPT";
};

const goBack = () => {
  if (step.value === "PAYMENT") step.value = "CUSTOMER";
  if (step.value === "QR") step.value = "PAYMENT";
};

const closePanel = () => {
  resetAll();
  emit("close");
};
const completePayment = () => {
  resetAll();
  emit("done");
};
let startY = 0;
const onTouchStart = (e: TouchEvent) => {
  startY = e.touches[0].clientY;
};
const onTouchMove = (e: TouchEvent) => {
  if (e.touches[0].clientY - startY > 100) closePanel();
};

const printThermalReceipt = async () => {
  const receiptData = {
    business: {
      name: "BUCKS CLOUD POS",
      legalName: "Bucksbox Software Pvt Ltd",
      gstin: "29ABCDE1234F1Z5",
      address: "#12, MG Road, Bengaluru",
      phone: "+91 98765 43210",
    },
    invoiceNo: "INV-102345",
    orderId: "ORD-889912",
    dateTime: new Date().toLocaleString(),
    items: props.cart?.length
      ? props.cart.map((i) => ({
          name: i.name,
          qty: i.quantity,
          amount: i.price * i.quantity,
        }))
      : [],
    subTotal: subtotal.value,
    cgstRate: 9,
    cgstAmount: +(subtotal.value * 0.09).toFixed(2),
    sgstRate: 9,
    sgstAmount: +(subtotal.value * 0.09).toFixed(2),
    grandTotal: grandTotal.value,
    paymentMode: paymentMethod.value,
    paymentRef: "TXN-" + Date.now(),
  };

  await $printReceipt(receiptData);
};
</script>

<template>
  <v-dialog v-model="localShow" fullscreen persistent hide-overlay>
    <div class="overlay" @click="closePanel"></div>

    <v-card
      class="payment-panel"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
    >
      <!-- HEADER -->
      <div class="header">
        <div class="header-top">
          <v-btn
            icon
            class="back-btn"
            v-if="step !== 'CUSTOMER' && step !== 'RECEIPT'"
            @click="goBack"
          >
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          <h2 class="title">💳 Checkout</h2>
        </div>
        <p class="subtitle">Secure & Fast POS Payment</p>

        <div class="step-bar">
          <div :class="['step-dot', step === 'CUSTOMER' ? 'active' : '']"></div>
          <div :class="['step-dot', step === 'PAYMENT' ? 'active' : '']"></div>
          <div :class="['step-dot', step === 'QR' ? 'active' : '']"></div>
          <div :class="['step-dot', step === 'RECEIPT' ? 'active' : '']"></div>
        </div>
      </div>

      <!-- CUSTOMER STEP -->
      <div v-if="step === 'CUSTOMER'" class="step fade-slide mt-6 mb-4">
        <h3 class="step-title mb-4">Customer Details (Optional)</h3>
        <v-text-field
          v-model="customer.name"
          label="Full Name"
          outlined
          dense
          class="neumorphic"
        />
        <v-text-field
          v-model="customer.phone"
          label="Phone Number"
          outlined
          dense
          class="neumorphic"
        />
        <v-text-field
          v-model="customer.email"
          label="Email"
          outlined
          dense
          class="neumorphic"
        />
        <v-btn color="primary" block class="mt-4" @click="step = 'PAYMENT'">
          CONTINUE
        </v-btn>
      </div>

      <!-- PAYMENT STEP -->
      <div v-if="step === 'PAYMENT'" class="step fade-slide mt-8">
        <v-card class="totals-card" elevation="6">
          <div class="totals-row">
            <span>Subtotal</span><span>₹{{ subtotal.toFixed(2) }}</span>
          </div>
          <div class="totals-row">
            <span>GST (18%)</span><span>₹{{ gstAmount.toFixed(2) }}</span>
          </div>
          <div class="totals-row total">
            <span>Total</span><span>₹{{ grandTotal.toFixed(2) }}</span>
          </div>
        </v-card>

        <v-row class="payment-options" dense>
          <v-col cols="6">
            <v-btn class="payment-btn cash" block @click="confirmCash"
              >💵 Cash</v-btn
            >
          </v-col>
          <v-col cols="6">
            <v-btn class="payment-btn upi" block @click="confirmQR"
              >📱 UPI / QR</v-btn
            >
          </v-col>
        </v-row>
      </div>

      <!-- QR STEP -->
      <div v-if="step === 'QR'" class="step fade-slide qr-step text-center">
        <h3 class="step-title">Scan QR Code</h3>
        <v-card class="qr-placeholder qr-animate" elevation="8">{{
          qrCode
        }}</v-card>
        <v-progress-linear
          :value="(qrTimer / 30) * 100"
          height="6"
          color="primary"
          class="mb-2 rounded"
        />
        <p class="qr-timer">Expires in {{ qrTimer }}s</p>
        <v-btn class="confirm-btn" block @click="confirmUPI"
          >PAYMENT RECEIVED</v-btn
        >
      </div>

      <!-- RECEIPT STEP -->
      <div v-if="step === 'RECEIPT'" class="step fade-slide receipt-step mt-10">
        <div id="receipt-content" class="terminal-paper">
          <h3>🧾 Receipt</h3>
          <p>
            <strong>Customer:</strong>
            {{ customer.name || customer.phone || "Guest" }}
          </p>
          <hr />
          <div v-for="item in props.cart" :key="item.id">
            {{ item.name }} x{{ item.quantity }} - ₹{{
              (item.price * item.quantity).toFixed(2)
            }}
          </div>
          <hr />
          <div>Subtotal: ₹{{ subtotal.toFixed(2) }}</div>
          <div>GST (18%): ₹{{ gstAmount.toFixed(2) }}</div>
          <div>
            <strong>Total: ₹{{ grandTotal.toFixed(2) }}</strong>
          </div>
          <hr />
          <p>Payment Method: {{ paymentMethod }}</p>
          <p>Thank you for your purchase!</p>
        </div>
        <v-row class="mt-4" dense>
          <v-col cols="6">
            <v-btn
              class="confirm-btn"
              block
              color="primary"
              @click="printThermalReceipt"
              >🖨 Print</v-btn
            >
          </v-col>
          <v-col cols="6">
            <v-btn
              class="confirm-btn"
              block
              color="grey"
              @click="completePayment"
              >Close</v-btn
            >
          </v-col>
        </v-row>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
:root {
  --primary: #1976d2;
}

/* OVERLAY */
.overlay {
  position: fixed;
  inset: 0;
  backdrop-filter: blur(14px);
  background: rgba(0, 0, 0, 0.35);
  z-index: 50;
}

/* PANEL */
.payment-panel {
  position: fixed;
  bottom: 0;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  background: #fff;
  border-radius: 24px 24px 0 0;
  padding: 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  z-index: 100;
  transform: translateY(100%);
  animation: slideUp 0.35s forwards;
}

/* HEADER */
.header {
  background: linear-gradient(135deg, #1976d2, #1565c0) !important;
  color: #fff !important;
  padding: 24px 16px 32px;
  border-radius: 24px 24px 0 0;
  text-align: center;
  position: relative;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}
.header-top {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.back-btn {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.2) !important;
}
.back-btn:hover {
  background: white !important;
}

.header .title {
  font-size: 2rem;
  font-weight: 800;
  text-align: center;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}
.header .subtitle {
  text-align: center;
  font-size: 1rem;
  opacity: 0.85;
  margin-top: 6px;
  font-weight: 500;
}

/* STEP BAR */
.step-bar {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
}
.step-dot {
  width: 16px;
  height: 16px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transition: 0.4s;
}
.step-dot.active {
  background: #fff;
  transform: scale(1.5);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.7);
}

/* NEUMORPHIC INPUTS */
.neumorphic .v-input__control {
  background: #f5f5f5;
  border-radius: 16px;
  box-shadow: inset 6px 6px 12px rgba(0, 0, 0, 0.08),
    inset -6px -6px 12px rgba(255, 255, 255, 0.8);
}

/* TOTALS */
.totals-card {
  padding: 24px;
  border-radius: 20px;
  margin-bottom: 24px;
}
.totals-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 1rem;
}
.totals-row.total {
  font-weight: 700;
  font-size: 1.25rem;
  border-top: 1px solid #eee;
  padding-top: 16px;
}

/* PAYMENT BUTTONS */
.payment-btn {
  border-radius: 16px;
  font-weight: 700;
  color: #fff;
  height: 60px;
  transition: all 0.2s;
}
.payment-btn.cash {
  background: linear-gradient(135deg, #fbc02d, #fdd835);
  color: #333;
}
.payment-btn.upi {
  background: linear-gradient(135deg, var(--primary), #1565c0);
}
.payment-btn:hover {
  transform: scale(1.03);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

/* CONFIRM BUTTON */
.confirm-btn {
  border-radius: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary), #1565c0);
  color: #fff;
  height: 55px;
  margin-top: 16px;
}

/* QR */
.qr-placeholder {
  width: 220px;
  height: 220px;
  margin: 16px auto;
  border-radius: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.2rem;
  font-weight: 700;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}
.qr-animate {
  animation: glowPulse 1.6s infinite;
}
@keyframes glowPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.4);
  }
  70% {
    box-shadow: 0 0 0 25px rgba(25, 118, 210, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
  }
}

/* SUCCESS */
.success-step {
  text-align: center;
  padding: 50px 0;
}
.success-icon {
  font-size: 3.5rem;
  color: var(--primary);
  margin-bottom: 24px;
  animation: popBounce 0.6s ease;
}
@keyframes popBounce {
  0% {
    transform: scale(0);
  }
  60% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

/* ANIMATIONS */
.fade-slide {
  animation: fadeSlide 0.35s ease forwards;
}
@keyframes fadeSlide {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes slideUp {
  to {
    transform: translateY(0);
  }
}

/* Terminal receipt styles */
.terminal-paper {
  background: #f8f8f8;
  font-family: monospace;
  padding: 20px;
  border-radius: 12px;
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.1);
  line-height: 1.4rem;
  max-height: 400px;
  overflow-y: auto;
}
.terminal-paper hr {
  border: 0;
  border-top: 1px dashed #ccc;
  margin: 8px 0;
}
</style>
