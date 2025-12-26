<template>
  <div class="pin-container">
    <div
      class="pin-card"
      :class="{ 'slide-up': animate }"
    >
      <h2 class="pin-title">Enter PIN</h2>

      <!-- PIN Dots -->
      <div class="pin-dots">
        <span
          v-for="n in 4"
          :key="n"
          class="pin-dot"
          :class="{ filled: n <= pin.length }"
        ></span>
      </div>

      <!-- Error -->
      <div v-if="error" class="pin-error">{{ error }}</div>

      <!-- Keypad -->
      <div class="keypad">
        <button
          v-for="num in [1,2,3,4,5,6,7,8,9]"
          :key="num"
          class="key-btn"
          @click="addDigit(num)"
        >
          {{ num }}
        </button>

        <!-- Bottom row: Clear, 0, OK -->
        <button class="key-btn control-btn red" @click="clearPin">C</button>
        <button class="key-btn" @click="addDigit(0)">0</button>
        <button class="key-btn control-btn green" @click="submitPin">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from 'vue-router'
import { useDbModels } from "@/composables/useDbModels.js";
import { useCookie } from '#app'

const pin = ref("");
const error = ref("");
const animate = ref(false); // trigger animation

const { validateCompanyPin } = useDbModels();
const router = useRouter();

// Animate card on mount
onMounted(() => {
  setTimeout(() => {
    animate.value = true;
  }, 100); // slight delay for smooth effect
});

// Haptic feedback
function vibrate() {
  if (navigator.vibrate) navigator.vibrate(50);
}

// Add digit
function addDigit(d) {
  if (pin.value.length < 6) {
    pin.value += d;
    vibrate();
  }
}

// Clear PIN
function clearPin() {
  pin.value = "";
  error.value = "";
  vibrate();
}

// Submit PIN
async function submitPin() {
  try {
    const device_id = localStorage.getItem('device_id') || 'DEVICE-TEST';
    const result = await validateCompanyPin({ pin: pin.value, device_id });

    if (!result) throw new Error("Invalid PIN");

    // Create session cookie for 1 day
    const pinSession = useCookie('pin_session', { maxAge: 60 * 60 * 24 });
    pinSession.value = { company_id: result.company_id, logged_in_at: Date.now() };

    router.push('/pos/dashboard'); // redirect after successful PIN
  } catch (err) {
    error.value = err.message || "Invalid PIN";
    pin.value = "";
  }
}


</script>

<style scoped>
/* Container & card */
.pin-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(to bottom right, #eceff1, #cfd8dc);
  padding: 16px;
  overflow: hidden;
}

.pin-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 40px 32px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 12px 24px rgba(0,0,0,0.25);
  display: flex;
  flex-direction: column;
  align-items: center;

  /* Slide up effect */
  transform: translateY(100vh);
  opacity: 0;
  transition: all 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

.pin-card.slide-up {
  transform: translateY(0);
  opacity: 1;
}

/* Title */
.pin-title {
  font-size: 2rem;
  margin-bottom: 24px;
  color: #37474f;
  text-align: center;
  letter-spacing: 1px;
}

/* PIN Dots */
.pin-dots {
  display: flex;
  justify-content: center;
  gap: 18px;
  margin-bottom: 24px;
}

.pin-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #b0bec5;
  transition: all 0.3s ease;
}

.pin-dot.filled {
  background: linear-gradient(135deg, #42a5f5, #478ed1);
  border-color: #1976d2;
  transform: scale(1.3);
  box-shadow: 0 0 8px rgba(66,165,245,0.6);
}

/* Error */
.pin-error {
  color: #d32f2f;
  font-weight: 500;
  margin-bottom: 16px;
  text-align: center;
  animation: shake 0.3s ease;
}

/* Shake animation */
@keyframes shake {
  0% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-5px); }
  100% { transform: translateX(0); }
}

/* Keypad layout */
.keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  width: 100%;
}

/* Buttons */
.key-btn {
  font-size: 1.6rem;
  padding: 20px 0;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: bold;
  color: #ffffff;
  background: linear-gradient(135deg, #42a5f5, #478ed1);
  transition: all 0.2s ease;
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

/* Button press animation */
.key-btn:active {
  transform: scale(0.9);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

/* Control buttons */
.control-btn.red {
  background: #e53935;
}

.control-btn.green {
  background: #43a047;
}

/* Responsive for web & tablets */
@media (min-width: 768px) {
  .pin-card {
    max-width: 360px;
    padding: 50px 40px;
  }

  .key-btn {
    font-size: 1.8rem;
    padding: 24px 0;
  }
}
</style>
