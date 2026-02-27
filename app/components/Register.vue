<template>
    <v-container fluid class="d-flex justify-center align-start py-10 modern-bg" style="min-height: 100vh;">
        <v-card elevation="12" width="520" class="pa-8 rounded-xl modern-card">
            <div class="text-center mb-6">
                <h2 class="text-h5 font-weight-bold">Create Your Account</h2>
                <p class="text-grey-darken-1 mt-1">Let’s register your company</p>
            </div>

            <v-form fast-fail>

                <!-- ADMIN SECTION -->
                <h3 class="section-title">Company Login</h3>

                <v-text-field v-model="form.name" label="Admin Full Name" variant="solo-filled" density="comfortable"
                    :rules="[rules.required, rules.name]" />

                <v-text-field v-model="form.password" label="Admin Password" type="password" variant="solo-filled"
                    density="comfortable" :rules="[rules.required, rules.password]" />

                <v-text-field v-model="form.primaryEmail" label="Primary Email" variant="solo-filled"
                    density="comfortable" :rules="[rules.required, rules.email]" />

                <v-text-field v-model="form.primaryPhoneNo" label="Primary Phone" variant="solo-filled"
                    density="comfortable" maxlength="10" :rules="[rules.required, rules.phone]" />

                <!-- BRANCH SECTION -->
                <h3 class="section-title">Branch Login</h3>

                <v-text-field v-model="form.secondaryEmail" label="Branch Email" variant="solo-filled"
                    density="comfortable" :rules="[rules.email]" />

                <v-text-field v-model="form.secondaryPhoneNo" label="Branch Phone" variant="solo-filled"
                    density="comfortable" maxlength="10" :rules="[rules.phone]" />

                <v-text-field v-model="form.branch_password" label="Branch Password" type="password"
                    variant="solo-filled" density="comfortable" />

                <!-- COMPANY DETAILS -->
                <h3 class="section-title">Company Details</h3>

                <v-text-field v-model="form.companyName" label="Company Name" variant="solo-filled"
                    density="comfortable" :rules="[rules.required]" />

                <v-text-field v-model="form.tenant" label="Tenant" variant="solo-filled" density="comfortable"
                    :rules="[rules.required]" />

                <v-text-field v-model="form.gstNumber" label="GST Number" variant="solo-filled" density="comfortable"
                    maxlength="15" />

                <v-select v-model="form.companyType" :items="companyTypes" label="Company Type" variant="solo-filled"
                    density="comfortable" :rules="[rules.required]" />

                <v-select v-model="form.currencyId" :items="currencyList" label="Currency" variant="solo-filled"
                    density="comfortable" :rules="[rules.required]" />

                <v-text-field v-model="form.city" label="City" variant="solo-filled" density="comfortable"
                    :rules="[rules.required]" />

                <v-text-field v-model="form.state" label="State" variant="solo-filled" density="comfortable"
                    :rules="[rules.required]" />

                <v-text-field v-model="form.pincode" label="Pincode" variant="solo-filled" density="comfortable"
                    maxlength="6" :rules="[rules.required, rules.pincode]" />

                <v-text-field v-model="form.addressLine1" label="Address Line 1" variant="solo-filled"
                    density="comfortable" :rules="[rules.required]" />

                <v-text-field v-model="form.addressLine2" label="Address Line 2 (Optional)" variant="solo-filled"
                    density="comfortable" />

                <v-text-field v-model="form.addressLine3" label="Address Line 3 (Optional)" variant="solo-filled"
                    density="comfortable" />

                <p class="text-red text-center">{{ error }}</p>

                <v-btn block color="primary" class="mt-6 py-3 modern-btn" :loading="loading" @click="register">
                    Register Company
                </v-btn>

                <div class="text-center mt-4">
                    <router-link to="/">Already have an account? Login</router-link>
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

import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { useDbModels } from "@/composables/useDbModels.js";

const router = useRouter();
const { registerCompanyOffline } = useDbModels();

const loading = ref(false);
const error = ref("");

const companyTypes = [
    "Private Limited",
    "Sole Proprietorship",
    "Partnership",
    "LLP",
    "Public Limited",
];

const currencyList = ["INR", "USD", "EUR", "GBP", "AUD"];

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
.modern-bg {
    background: linear-gradient(120deg, #fff4ea, #e8f1ff, #ffe8f3);
}

.modern-card {
    border-radius: 18px;
    background: #ffffff;
    border: 1px solid #f3f3f3;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
}

.section-title {
    margin-top: 24px;
    margin-bottom: 10px;
    font-weight: 600;
    color: #444;
}

.modern-btn {
    border-radius: 10px;
    font-weight: 600;
    letter-spacing: 0.5px;
}
</style>