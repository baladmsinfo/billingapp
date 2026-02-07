<template>
    <v-container fluid class="mobile-bg pa-4">

        <!-- SUMMARY CARD -->
        <v-card class="product-summary mb-4 pa-3" rounded="xl" elevation="0">
            <div class="d-flex justify-space-between align-center">
                <div>
                    <div class="text-caption text-grey">Total Parties</div>
                    <div class="text-h5 font-weight-bold">{{ filteredCustomers.length }}</div>
                </div>
                <v-icon size="36" color="primary">mdi-account-group</v-icon>
            </div>
        </v-card>

        <!-- SEARCH -->
        <v-text-field v-model="search" placeholder="Search parties" prepend-inner-icon="mdi-magnify" variant="solo"
            rounded="xl" hide-details density="comfortable" class="mb-4" />

        <!-- CUSTOMERS LIST -->
        <v-row dense>
            <v-col cols="12" v-for="c in filteredCustomers" :key="c.id">
                <v-card class="product-card mb-4" rounded="xl" elevation="0">

                    <!-- TOP SECTION -->
                    <div class="card-top">
                        <div>
                            <div class="product-name">{{ c.name }}</div>
                            <div class="product-sku">Phone: {{ c.phone || '-' }}</div>
                            <div class="product-sku text-grey">Email: {{ c.email || '-' }}</div>
                        </div>

                        <v-menu>
                            <template #activator="{ props }">
                                <v-btn icon size="small" v-bind="props">
                                    <v-icon>mdi-dots-vertical</v-icon>
                                </v-btn>
                            </template>

                            <v-list rounded="lg" density="compact">
                                <v-list-item @click="editCustomer(c)">Edit</v-list-item>
                                <v-list-item @click="onPartyClick(c)">View</v-list-item>
                                <v-list-item @click="manageAddress(c)">Manage Address</v-list-item>
                                <v-list-item class="text-red" @click="confirmDelete(c.id)">Delete</v-list-item>
                            </v-list>
                        </v-menu>
                    </div>

                    <!-- ADDRESS COUNT -->
                    <div class="meta mt-2">
                        <span class="text-grey">Addresses:</span>
                        <strong>{{ c.addresses?.length || 0 }}</strong>
                    </div>

                    <!-- ADDRESS LIST EXPANDED -->
                    <v-expansion-panels flat v-if="c.addresses?.length" class="mt-2">
                        <v-expansion-panel rounded="xl" elevation="1" class="address-panel">
                            <v-expansion-panel-title class="py-3 px-4">
                                <div class="d-flex align-center">
                                    <v-icon class="mr-2" size="20">mdi-map-marker-radius</v-icon>
                                    <span class="font-weight-medium">
                                        View Addresses ({{ c.addresses.length }})
                                    </span>
                                </div>
                            </v-expansion-panel-title>

                            <v-expansion-panel-text>
                                <v-list density="compact" lines="two" class="rounded-lg pa-0">
                                    <v-list-item v-for="addr in c.addresses" :key="addr.id"
                                        class="rounded-xl mb-2 address-card" elevation="0">
                                        <v-list-item-avatar start>
                                            <v-icon size="28" class="text-primary">mdi-home-city</v-icon>
                                        </v-list-item-avatar>

                                        <v-list-item-content>
                                            <v-list-item-title class="font-weight-medium">
                                                {{ addr.address_line1 }}
                                                <template v-if="addr.address_line2">, {{ addr.address_line2
                                                }}</template>
                                                <template v-if="addr.address_line3">, {{ addr.address_line3
                                                }}</template>
                                            </v-list-item-title>

                                            <v-list-item-subtitle class="text-medium-emphasis">
                                                {{ addr.city }}, {{ addr.state }} - {{ addr.pincode }}
                                            </v-list-item-subtitle>
                                        </v-list-item-content>

                                        <template #append>
                                            <v-chip color="primary" variant="tonal" size="small" class="px-3">
                                                {{ addr.type || "Address" }}
                                            </v-chip>
                                        </template>
                                    </v-list-item>
                                </v-list>
                            </v-expansion-panel-text>
                        </v-expansion-panel>
                    </v-expansion-panels>

                </v-card>
            </v-col>
        </v-row>

        <!-- EMPTY STATE -->
        <v-card v-if="!filteredCustomers.length" rounded="xl" elevation="0" class="pa-6 text-center">
            <v-icon size="48" color="grey">mdi-account-off</v-icon>
            <div class="text-subtitle-1 mt-2">No parties found</div>
            <v-btn color="primary" rounded="xl" class="mt-3" @click="openAddDialog">
                Add Customer
            </v-btn>
        </v-card>

        <!-- FAB ADD BUTTON -->
        <v-btn class="fab-rich" icon color="primary" size="large" @click="openAddDialog">
            <v-icon>mdi-plus</v-icon>
        </v-btn>


        <!-- ===================================================== -->
        <!-- CUSTOMER ADD/EDIT DIALOG -->
        <!-- ===================================================== -->
        <v-dialog v-model="dialog" max-width="450" persistent>
            <v-card rounded="xl" class="pa-4">

                <div class="text-h6  font-weight-bold mb-4">
                    {{ editMode ? "Edit Customer" : "Add Customer" }}
                </div>

                <v-text-field v-model="form.name" label="Customer Name" rounded="lg" variant="outlined"
                    density="comfortable" class="mb-3" />

                <v-text-field v-model="form.phone" label="Phone" variant="outlined" rounded="lg" density="comfortable"
                    class="mb-3" />

                <v-text-field v-model="form.email" label="Email" variant="outlined" rounded="lg" density="comfortable"
                    class="mb-3" />

                <v-row class="mt-4">
                    <v-col cols="6">
                        <v-btn block variant="text" @click="dialog = false">Cancel</v-btn>
                    </v-col>
                    <v-col cols="6">
                        <v-btn block color="primary" @click="saveCustomer">Save</v-btn>
                    </v-col>
                </v-row>

            </v-card>
        </v-dialog>


        <!-- ===================================================== -->
        <!-- DELETE CONFIRMATION -->
        <!-- ===================================================== -->
        <v-dialog v-model="deleteDialog" max-width="400">
            <v-card class="pa-4" rounded="xl">

                <div class="text-h6  font-weight-bold mb-3">Delete Customer?</div>
                <p class="text-body-2">This action cannot be undone.</p>

                <v-row class="mt-4">
                    <v-col cols="6">
                        <v-btn variant="text" block @click="deleteDialog = false">Cancel</v-btn>
                    </v-col>
                    <v-col cols="6">
                        <v-btn color="red" block @click="deleteCustomerFinal">Delete</v-btn>
                    </v-col>
                </v-row>

            </v-card>
        </v-dialog>


        <!-- ===================================================== -->
        <!-- ADDRESS MANAGER -->
        <!-- ===================================================== -->
        <v-dialog v-model="addressDialog" max-width="480" persistent>
            <v-card rounded="xl" class="pa-0">

                <!-- FIXED HEADER -->
                <div class="pa-4 pb-2" style="position: sticky; top: 0; background:white; z-index: 10;">
                    <div class="text-h6 font-weight-bold"> {{ selectedCustomer?.addresses?.length ? "List of Addresses" : "Manage Address" }}</div>
                </div>

                <!-- SCROLLABLE CONTENT -->
                <div class="dialog-scroll px-4">

                    <!-- ADDRESS LIST -->
                    <v-list v-if="selectedCustomer?.addresses?.length" density="compact" class="mb-4 pa-0">
                        <v-list-item rounded="lg" class="pa-4 bg-grey-lighten-4 mb-2"
                            v-for="addr in selectedCustomer.addresses" :key="addr.id">
                            <v-list-item-title class="mb-2">
                                {{ addr.address_line1 }} {{ addr.address_line2 }} {{ addr.address_line3 }}
                            </v-list-item-title>

                            <v-list-item-subtitle>
                                {{ addr.city }}, {{ addr.state }} - {{ addr.pincode }}
                            </v-list-item-subtitle>

                            <template #append>
                                <v-btn class="mr-2" icon size="small" @click="editAddress(addr)">
                                    <v-icon>mdi-pencil</v-icon>
                                </v-btn>
                                <v-btn icon size="small" @click="deleteAddressConfirm(addr.id)">
                                    <v-icon color="red">mdi-delete</v-icon>
                                </v-btn>
                            </template>
                        </v-list-item>
                    </v-list>

                    <!-- ADDRESS FORM -->
                    <div class="text-subtitle-1 mb-2">
                        {{ editAddressMode ? "Edit Existing Address" : "Add New Address" }}
                    </div>

                    <v-text-field v-model="addressForm.address_line1" label="Address Line 1" rounded variant="outlined"
                        class="mb-2" />
                    <v-text-field v-model="addressForm.address_line2" label="Address Line 2" rounded variant="outlined"
                        class="mb-2" />
                    <v-text-field v-model="addressForm.address_line3" label="Address Line 3" rounded variant="outlined"
                        class="mb-2" />

                    <v-text-field v-model="addressForm.city" label="City" rounded variant="outlined" class="mb-2" />
                    <v-text-field v-model="addressForm.state" label="State" rounded variant="outlined" class="mb-2" />
                    <v-text-field v-model="addressForm.pincode" label="Pincode" rounded variant="outlined"
                        class="mb-2" />
                    <v-text-field v-model="addressForm.country" label="Country" rounded variant="outlined"
                        class="mb-4" />

                </div>

                <!-- FIXED FOOTER -->
                <div class="pa-4 pt-2" style="position: sticky; bottom: 0; background:white; z-index: 10;">
                    <v-row>
                        <v-col cols="6">
                            <v-btn block variant="text" @click="addressDialog = false">Close</v-btn>
                        </v-col>
                        <v-col cols="6">
                            <v-btn block color="primary" @click="saveAddress">
                                {{ editAddressMode ? "Update" : "Add" }}
                            </v-btn>
                        </v-col>
                    </v-row>
                </div>

            </v-card>
        </v-dialog>

    </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useCustomers } from "@/composables/pos/useCustomers";
import { useRouter } from "vue-router";

const router = useRouter();

const COMPANY_ID = "LOCAL_COMPANY";

const {
    customers,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    addCustomerAddress,
    updateCustomerAddress,
    deleteCustomerAddress
} = useCustomers();

/* ----------------------
   UI STATE
----------------------- */
const search = ref("");

const dialog = ref(false);
const deleteDialog = ref(false);
const addressDialog = ref(false);

const editMode = ref(false);
const editAddressMode = ref(false);

let deleteId = null;

/* ----------------------
   FORMS
----------------------- */
const form = ref({
    id: null,
    name: "",
    phone: "",
    email: "",
});

const addressForm = ref({
    id: null,
    address_line1: "",
    address_line2: "",
    address_line3: "",
    city: "",
    state: "",
    pincode: "",
    country: "",
});

/* ----------------------
   SELECTED CUSTOMER
----------------------- */
const selectedCustomer = ref(null);

/* ----------------------
   FILTER LIST
----------------------- */
const filteredCustomers = computed(() =>
    customers.value.filter((c) =>
        c.name?.toLowerCase().includes(search.value.toLowerCase())
    )
);

/* ----------------------
   INIT
----------------------- */
onMounted(async () => {
    await fetchCustomers(COMPANY_ID);
});

/* ----------------------
   ADD CUSTOMER
----------------------- */
function openAddDialog() {
    editMode.value = false;
    form.value = {
        id: null,
        name: "",
        phone: "",
        email: "",
    };
    dialog.value = true;
}

/* ----------------------
   EDIT CUSTOMER
----------------------- */
function editCustomer(c) {
    editMode.value = true;
    form.value = { ...c };
    dialog.value = true;
}

/* ----------------------
   SAVE CUSTOMER
----------------------- */
async function saveCustomer() {
    if (!form.value.name) return;

    if (editMode.value) {
        await updateCustomer(form.value);
    } else {
        await createCustomer({
            ...form.value,
            company_id: COMPANY_ID,
        });
    }

    dialog.value = false;
    await fetchCustomers(COMPANY_ID);
}

/* ----------------------
   DELETE CUSTOMER
----------------------- */
function confirmDelete(id) {
    deleteId = id;
    deleteDialog.value = true;
}

async function deleteCustomerFinal() {
    await deleteCustomer(deleteId);
    deleteDialog.value = false;

    await fetchCustomers(COMPANY_ID);
}

/* ----------------------
   OPEN ADDRESS MANAGER
----------------------- */
function manageAddress(customer) {
    selectedCustomer.value = customer;

    addressForm.value = {
        id: null,
        address_line1: "",
        address_line2: "",
        address_line3: "",
        city: "",
        state: "",
        pincode: "",
        country: "",
    };

    editAddressMode.value = false;
    addressDialog.value = true;
}

/* ----------------------
   EDIT ADDRESS
----------------------- */
function editAddress(addr) {
    editAddressMode.value = true;

    addressForm.value = { ...addr };
}

/* ----------------------
   SAVE ADDRESS (ADD/UPDATE)
----------------------- */
async function saveAddress() {
    const custId = selectedCustomer.value.id;

    if (editAddressMode.value) {
        await updateCustomerAddress(custId, addressForm.value);
    } else {
        await addCustomerAddress(custId, {
            address_line1: addressForm.value.address_line1,
            address_line2: addressForm.value.address_line2,
            address_line3: addressForm.value.address_line3,
            city: addressForm.value.city,
            state: addressForm.value.state,
            pincode: addressForm.value.pincode,
            country: addressForm.value.country,
        });
    }

    await fetchCustomers(COMPANY_ID);

    // reopen updated list
    manageAddress(customers.value.find(c => c.id === custId));
}

/* ----------------------
   DELETE ADDRESS
----------------------- */
async function deleteAddressConfirm(id) {
    const custId = selectedCustomer.value.id;

    await deleteCustomerAddress(custId, id);

    await fetchCustomers(COMPANY_ID);

    manageAddress(customers.value.find(c => c.id === custId));
}

const onPartyClick = (customer) => {
    router.push(`/pos/customers/${customer.id}`);
};
</script>

<style scoped>
.product-card {
    background: white;
    border-radius: 18px;
    padding: 16px;
}

.card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.product-name {
    font-weight: 600;
    font-size: 16px;
}

.address-panel {
    border-radius: 20px;
    background: #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.address-card {
    background: #f9f9fc;
    padding: 10px 14px;
    border: 1px solid #eeeeee;
}

.address-card:hover {
    background: #f3f6ff;
    border-color: #d6dfff;
    transition: 0.25s ease;
}

.fab-rich {
    position: fixed;
    bottom: 72px;
    right: 16px;
    border-radius: 50%;
    box-shadow: 0 12px 30px rgba(79, 70, 229, 0.4);
}

.product-sku {
    font-size: 13px;
}

.meta {
    font-size: 13px;
    color: #666;
}

.variant-expansion {
    margin-top: 8px;
    border-radius: 12px;
    background: #fafafa;
}
</style>