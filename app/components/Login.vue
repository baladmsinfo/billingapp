<template>
    <v-container fluid class="d-flex justify-center align-center modern-bg" style="min-height: 100vh">
        <v-card elevation="12" class="pa-8 rounded-xl modern-card" width="420">
            <h2 class="text-center mb-6 text-h5 font-weight-bold">Login</h2>

            <v-form fast-fail>
                <v-text-field v-model="email" label="Email" variant="solo-filled" density="comfortable"
                    :rules="[rules.required, rules.email]" />

                <v-text-field v-model="password" label="Password" type="password" variant="solo-filled"
                    density="comfortable" :rules="[rules.required]" />

                <p class="text-red text-center mt-2">{{ error }}</p>

                <v-btn block color="primary" class="mt-4 py-3 modern-btn" @click="login" :loading="loading">
                    Login
                </v-btn>

                <div class="text-center mt-4">
                    <router-link to="/register">Create an account</router-link>
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
import { useCookie } from "#app";

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

const { validateCompanyLogin } = useDbModels();
const router = useRouter();

const rules = {
    required: v => !!v || "This field is required",
    email: v => /^\S+@\S+\.\S+$/.test(v) || "Enter a valid email",
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
.modern-bg {
    background: linear-gradient(120deg, #fff4ea, #e8f1ff, #ffe8f3);
}

.modern-card {
    border-radius: 18px;
    background: #ffffff;
    border: 1px solid #f3f3f3;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
}

.modern-btn {
    border-radius: 10px;
    font-weight: 600;
    letter-spacing: 0.5px;
}
</style>