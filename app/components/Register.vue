<template>
    <v-container fluid class="d-flex justify-center align-start py-10 modern-bg" style="min-height: 100vh;">
        <v-card elevation="16" width="100%" max-width="1100" class="pa-8 rounded-xl modern-card floating-card">
            <div class="text-center mb-8 fade-in">
                <h2 class="text-h5 font-weight-bold title-heading">Create Your Account</h2>
                <p class="text-grey-darken-1 mt-1 subtitle-heading">
                    Let’s register your company
                </p>
            </div>

            <!-- DESKTOP 2-COLUMN GRID / MOBILE 1-COLUMN -->
            <v-form fast-fail>
                <div class="responsive-grid">

                    <!-- LEFT COLUMN -->
                    <div class="grid-column">

                        <!-- ADMIN SECTION -->
                        <h3 class="section-title fade-slide">Company Login</h3>

                        <v-text-field v-model="form.name" label="Admin Full Name" variant="solo-filled"
                            density="comfortable" class="enhanced-input" :rules="[rules.required, rules.name]" />

                        <v-text-field v-model="form.password" label="Admin Password" type="password"
                            variant="solo-filled" density="comfortable" class="enhanced-input"
                            :rules="[rules.required, rules.password]" />

                        <v-text-field v-model="form.primaryEmail" label="Primary Email" variant="solo-filled"
                            density="comfortable" class="enhanced-input" :rules="[rules.required, rules.email]" />

                        <v-text-field v-model="form.primaryPhoneNo" label="Primary Phone" variant="solo-filled"
                            density="comfortable" maxlength="10" class="enhanced-input"
                            :rules="[rules.required, rules.phone]" />

                        <!-- BRANCH SECTION -->
                        <h3 class="section-title fade-slide">Branch Login</h3>

                        <v-text-field v-model="form.secondaryEmail" label="Branch Email" variant="solo-filled"
                            density="comfortable" class="enhanced-input" :rules="[rules.email]" />

                        <v-text-field v-model="form.secondaryPhoneNo" label="Branch Phone" variant="solo-filled"
                            density="comfortable" maxlength="10" class="enhanced-input" :rules="[rules.phone]" />

                        <v-text-field v-model="form.branch_password" label="Branch Password" type="password"
                            variant="solo-filled" density="comfortable" class="enhanced-input" />
                    </div>

                    <!-- RIGHT COLUMN -->
                    <div class="grid-column">
                        <h3 class="section-title fade-slide">Company Details</h3>

                        <v-text-field v-model="form.companyName" label="Company Name" variant="solo-filled"
                            density="comfortable" class="enhanced-input" :rules="[rules.required]" />

                        <v-text-field v-model="form.tenant" label="Tenant" variant="solo-filled" density="comfortable"
                            class="enhanced-input" :rules="[rules.required]" />

                        <v-text-field v-model="form.gstNumber" label="GST Number" variant="solo-filled"
                            density="comfortable" maxlength="15" class="enhanced-input" />

                        <v-select v-model="form.companyType" :items="companyTypes" label="Company Type"
                            variant="solo-filled" density="comfortable" class="enhanced-input"
                            :rules="[rules.required]" />

                        <v-select v-model="form.currencyId" :items="currencyList" label="Currency" variant="solo-filled"
                            density="comfortable" class="enhanced-input" :rules="[rules.required]" />

                        <v-text-field v-model="form.addressLine1" label="Address Line 1" variant="solo-filled"
                            density="comfortable" class="enhanced-input" :rules="[rules.required]" />

                        <v-text-field v-model="form.addressLine2" label="Address Line 2 (Optional)"
                            variant="solo-filled" density="comfortable" class="enhanced-input" />

                        <v-text-field v-model="form.addressLine3" label="Address Line 3 (Optional)"
                            variant="solo-filled" density="comfortable" class="enhanced-input" />


                        <v-text-field v-model="form.city" label="City" variant="solo-filled" density="comfortable"
                            class="enhanced-input" :rules="[rules.required]" />

                        <v-text-field v-model="form.state" label="State" variant="solo-filled" density="comfortable"
                            class="enhanced-input" :rules="[rules.required]" />

                        <v-text-field v-model="form.pincode" label="Pincode" variant="solo-filled" density="comfortable"
                            maxlength="6" class="enhanced-input" :rules="[rules.required, rules.pincode]" />

                    </div>
                </div>

                <p class="text-red text-center">{{ error }}</p>

                <v-btn block color="primary" class="mt-6 py-3 modern-btn soft-btn" :loading="loading" @click="register">
                    Register Company
                </v-btn>

                <div class="text-center mt-4 fade-in">
                    <router-link to="/" class="login-link">
                        Already have an account? Login
                    </router-link>
                </div>
            </v-form>
        </v-card>
    </v-container>
</template>

<script setup>
definePageMeta({
    layout: "auth",
    auth: false,
});

import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useDbModels } from "@/composables/useDbModels.js";

const router = useRouter();
const { registerCompanyOffline, getCurrencies } = useDbModels();

const loading = ref(false);
const error = ref("");

const companyTypes = [
    "Private Limited",
    "Sole Proprietorship",
    "Partnership",
    "LLP",
    "Public Limited",
];

const currencyList = ref([]);

onMounted(async () => {
    try {
        const list = await getCurrencies();

        currencyList.value = list.map(c => ({
            title: `${c.code} - ${c.name}`,
            value: c.id,
        }));
    } catch (err) {
        console.error("Failed to load currencies:", err);
    }
});

const form = reactive({
    name: "",
    password: "",
    branch_password: "",
    primaryEmail: "",
    primaryPhoneNo: "",
    secondaryEmail: "",
    secondaryPhoneNo: "",
    companyName: "",
    tenant: "",
    gstNumber: "",
    companyType: "",
    currencyId: "",
    city: "",
    state: "",
    pincode: "",
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
});

const rules = {
    required: v => !!v || "Required",
    email: v => /^\S+@\S+\.\S+$/.test(v) || "Invalid email",
    phone: v => /^[6-9]\d{9}$/.test(v) || "Invalid phone number",
    pincode: v => /^[1-9][0-9]{5}$/.test(v) || "Invalid pincode",
    name: v => /^[A-Za-z ]{3,}$/.test(v) || "Enter valid name",
    password: v =>
        /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/.test(v) ||
        "Min 6 chars with letters & numbers",
};

async function register() {
    error.value = "";

    if (!form.name || !form.password) {
        error.value = "Admin name & password required";
        return;
    }

    try {
        loading.value = true;
        const res = await registerCompanyOffline(form);

        if (res.statusCode === "00") {
            error.value = res.message || "Registration successful";
            router.push("/");
        } else {
            error.value = res.message || "Registration failed";
        }
    } catch (err) {
        error.value = err.message || "Registration failed";
    } finally {
        loading.value = false;
    }
}
</script>

<style scoped>
/* ---------------------------------- */
/* Responsive Two-Column Layout */
/* ---------------------------------- */
.responsive-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 28px;
}

@media (min-width: 900px) {
    .responsive-grid {
        grid-template-columns: 1fr 1fr;
    }
}

.grid-column {
    display: flex;
    flex-direction: column;
    gap: 18px;
}

/* ---------------------------------- */
/* Premium Background */
/* ---------------------------------- */
.modern-bg {
    background: linear-gradient(135deg, #ffe5d0, #e8f0ff, #ffe0f3);
    background-size: 200% 200%;
    animation: bgShift 18s ease infinite;
}

@keyframes bgShift {
    0% {
        background-position: 0% 0%;
    }

    50% {
        background-position: 100% 100%;
    }

    100% {
        background-position: 0% 0%;
    }
}

/* ---------------------------------- */
/* Card Glassmorphism */
/* ---------------------------------- */
.modern-card {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(14px);
    border-radius: 22px !important;
    border: 1px solid rgba(255, 255, 255, 0.5);
    box-shadow: 0 25px 45px rgba(0, 0, 0, 0.14);
}

.floating-card {
    animation: floatCard 5s ease-in-out infinite;
}

@keyframes floatCard {
    0% {
        transform: translateY(0);
    }

    50% {
        transform: translateY(-10px);
    }

    100% {
        transform: translateY(0);
    }
}

/* ---------------------------------- */
/* Typography */
/* ---------------------------------- */
.title-heading {
    letter-spacing: 0.4px;
}

.subtitle-heading {
    font-size: 14px;
}

/* ---------------------------------- */
/* Input fields styling */
/* ---------------------------------- */
.enhanced-input :deep(.v-field) {
    border-radius: 12px !important;
    background: rgba(255, 255, 255, 0.55) !important;
    border: 1px solid #eee;
    transition: 0.25s ease;
}

.enhanced-input :deep(.v-field:hover) {
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.07);
}

/* ---------------------------------- */
/* Section Titles */
/* ---------------------------------- */
.section-title {
    margin-top: 4px;
    margin-bottom: 5px;
    font-weight: 600;
    font-size: 16px;
    color: #444;
}

/* fade animations */
.fade-in {
    animation: fadeIn 0.8s ease both;
}

.fade-slide {
    animation: fadeSlide 0.8s ease both;
}

@keyframes fadeIn {
    0% {
        opacity: 0;
    }

    100% {
        opacity: 1;
    }
}

@keyframes fadeSlide {
    0% {
        opacity: 0;
        transform: translateY(10px);
    }

    100% {
        opacity: 1;
        transform: translateY(0);
    }
}

/* ---------------------------------- */
/* Button */
/* ---------------------------------- */
.soft-btn {
    border-radius: 12px !important;
    font-size: 15px;
    background: linear-gradient(135deg, #4f8cff, #6b4eff);
    transition: 0.3s ease;
}

.soft-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* ---------------------------------- */
/* Login Link */
/* ---------------------------------- */
.login-link {
    font-weight: 600;
    color: #4f4fff;
    text-decoration: none;
}

.login-link:hover {
    opacity: 0.8;
}
</style>