<template>
    <v-container
        fluid
        class="d-flex justify-center align-center modern-bg"
        style="min-height: 100vh"
    >
        <v-card
            elevation="12"
            class="pa-8 rounded-xl modern-card floating-card fade-in"
            width="420"
        >
            <h2 class="text-center mb-6 text-h5 font-weight-bold title-heading">
                Welcome Back
            </h2>
            <p class="subtitle-heading text-center mb-6">Login to continue</p>

            <v-form fast-fail>
                <!-- Email -->
                <v-text-field
                    v-model="email"
                    label="Email"
                    variant="solo-filled"
                    density="comfortable"
                    class="enhanced-input"
                    :rules="[rules.required, rules.email]"
                />

                <!-- Password -->
                <v-text-field
                    v-model="password"
                    label="Password"
                    type="password"
                    variant="solo-filled"
                    density="comfortable"
                    class="enhanced-input"
                    :rules="[rules.required]"
                />

                <p class="text-red text-center mt-2">{{ error }}</p>

                <v-btn
                    block
                    color="primary"
                    class="mt-4 py-3 modern-btn soft-btn"
                    @click="login"
                    :loading="loading"
                >
                    Login
                </v-btn>

                <div class="text-center mt-4 fade-in">
                    <router-link to="/register" class="login-link">
                        Create an account
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

import { ref } from "vue";
import { useRouter } from "vue-router";
import { useDbModels } from "@/composables/useDbModels.js";

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

const { validateCompanyLogin } = useDbModels();
const router = useRouter();

const rules = {
    required: (v) => !!v || "This field is required",
    email: (v) => /^\S+@\S+\.\S+$/.test(v) || "Enter a valid email",
};

async function login() {
    error.value = "";

    if (!rules.email(email.value)) {
        error.value = "Enter valid email";
        return;
    }
    if (!rules.required(password.value)) {
        error.value = "Password required";
        return;
    }

    try {
        loading.value = true;

        const res = await validateCompanyLogin({
            email: email.value,
            password: password.value,
        });

        if (res.statusCode === "00") {
            router.push("/pos/dashboard");
        } else {
            error.value = res.message || "Login failed";
        }
    } catch (err) {
        error.value = err.message || "Login failed";
    } finally {
        loading.value = false;
    }
}
</script>

<style scoped>

/* ---------------------------------- */
/*        PREMIUM BACKGROUND          */
/* ---------------------------------- */
.modern-bg {
    background: linear-gradient(135deg, #ffe5d0, #e8f0ff, #ffe0f3);
    background-size: 200% 200%;
    animation: bgShift 16s ease infinite;
}

@keyframes bgShift {
    0% { background-position: 0% 0%; }
    50% { background-position: 100% 100%; }
    100% { background-position: 0% 0%; }
}

/* ---------------------------------- */
/*       PREMIUM CARD STYLING         */
/* ---------------------------------- */
.modern-card {
    background: rgba(255, 255, 255, 0.78);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 20px !important;
    box-shadow: 0 20px 40px rgba(0,0,0,0.12);
}

/* Floating card animation */
.floating-card {
    animation: floatCard 4s ease-in-out infinite;
}
@keyframes floatCard {
    0%   { transform: translateY(0); }
    50%  { transform: translateY(-8px); }
    100% { transform: translateY(0); }
}

/* Fade in */
.fade-in {
    animation: fadeIn 0.8s ease both;
}
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* ---------------------------------- */
/*      HEADINGS & TEXT STYLE         */
/* ---------------------------------- */
.title-heading {
    letter-spacing: 0.5px;
    color: #333;
}

.subtitle-heading {
    font-size: 14px;
    color: #555;
}

/* ---------------------------------- */
/*       INPUT FIELD ENHANCEMENT      */
/* ---------------------------------- */
.enhanced-input :deep(.v-field) {
    border-radius: 12px !important;
    transition: 0.25s ease;
    background: rgba(255, 255, 255, 0.65) !important;
    border: 1px solid #eee;
}

.enhanced-input :deep(.v-field:hover) {
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.07);
}

/* ---------------------------------- */
/*           BUTTON STYLE             */
/* ---------------------------------- */
.soft-btn {
    border-radius: 12px !important;
    font-size: 15px;
    letter-spacing: 0.5px;
    background: linear-gradient(135deg, #4f8cff, #6b4eff);
    transition: 0.3s ease;
}

.soft-btn:hover {
    opacity: 0.92;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.22);
}

/* ---------------------------------- */
/*           LINK STYLE               */
/* ---------------------------------- */
.login-link {
    text-decoration: none;
    font-weight: 600;
    color: #4f4fff;
    transition: 0.2s;
}
.login-link:hover {
    opacity: 0.8;
}
</style>