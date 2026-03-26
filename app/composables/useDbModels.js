import { useDb } from "@/db/client.js";
import { v4 as uuidv4 } from "uuid";
import { hashPin, verifyPin } from "@/utils/pin.js";
import { eq } from "drizzle-orm";

import {
  companies,
  sync_queue,
} from "@/db/schema.js";

/* ---------------- HELPERS ---------------- */
const now = () => Date.now();
const safeBind = (v) => (v === undefined || v === null ? null : v);

/* ================= MAIN ================= */
export function useDbModels() {
  const dbReady = async () => {
    const { drizzleDb, persistDb } = await useDb();
    return { drizzleDb, persistDb };
  };

  /* ---------------- GENERIC UPSERT ---------------- */
  const upsert = async (db, table, id, data) => {
    const existing = await db.select().from(table).where(eq(table.id, id)).limit(1);

    if (existing.length === 0) {
      await db.insert(table).values(data);
    } else {
      delete data.created_at;
      await db.update(table).set(data).where(eq(table.id, id));
    }
  };

  /* ---------------- SYNC QUEUE ---------------- */
  const enqueueSync = async ({ entity, entity_id, action, payload }) => {
    const { drizzleDb } = await dbReady();

    await drizzleDb.insert(sync_queue).values({
      id: uuidv4(),
      entity,
      entity_id,
      action,
      payload: JSON.stringify(payload),
      status: "PENDING",
      retry_count: 0,
      created_at: now(),
      updated_at: now(),
    });
  };

  /* ---------------- GENERIC LOCAL SYNC HANDLER ---------------- */
  const localSyncHandler = async (endpoint, payload) => {
    switch (endpoint) {
      case "company-sync":
        return await syncCompany(payload);

      case "branch-sync":
        return await syncBranch(payload);

      case "products-sync":
        return await syncProducts(payload);

      case "tax-sync":
        return await syncTaxRates(payload);

      case "parties-sync":
        return await syncParties(payload);

      case "invoices-sync":
        return await syncInvoices(payload);

      case "payments-sync":
        return await syncPayments(payload);

      default:
        console.warn("Unknown sync endpoint:", endpoint);
    }
  };

  const syncCompany = async (data) => {
    const { drizzleDb, persistDb } = await dbReady();
    const nowTs = Date.now();
    const c = data.company;

    const localCompany = {
      id: "LOCAL_COMPANY",                // 🔥 Always LOCAL
      cloud_company_id: c.id,            // Store cloud UUID

      name: c.name || null,
      email: c.email || null,
      phone: c.phone || null,
      address: c.address || null,

      currency_code: c.currency?.code || null,
      currency_symbol: c.currency?.symbol || null,

      // required local fields
      license_key: "",
      license_token: "",
      license_expiry: null,
      grace_until: null,

      pin_hash: "",                      // always non-null
      pin_attempts: 0,
      pin_locked_until: null,
      device_id: "",

      created_at: c.created_at ?? nowTs,
      updated_at: nowTs,
    };

    await upsert(drizzleDb, companies, "LOCAL_COMPANY", localCompany);

    await persistDb();
  };
  
  const syncBranch = async (data) => {
    const { drizzleDb, persistDb } = await dbReady();

    const nowTs = Date.now();
    const b = data.branch;

    await upsert(drizzleDb, branches, b.id, {
      ...b,
      updated_at: nowTs,
      created_at: b.created_at ?? nowTs,
    });

    await persistDb();
  };

  const syncProducts = async (data) => {
    const { drizzleDb, persistDb } = await dbReady();
    const nowTs = Date.now();

    // categories
    for (const c of data.categories || []) {
      await upsert(drizzleDb, categories, c.id, {
        ...c,
        updated_at: nowTs,
        created_at: c.created_at ?? nowTs,
      });
    }

    // products + items inside it
    for (const p of data.products || []) {
      await upsert(drizzleDb, products, p.id, {
        ...p,
        updated_at: nowTs,
        created_at: p.created_at ?? nowTs,
      });

      for (const item of p.items || []) {
        await upsert(drizzleDb, items, item.id, {
          ...item,
          updated_at: nowTs,
          created_at: item.created_at ?? nowTs,
        });
      }
    }

    // branch items
    for (const bi of data.branchItems || []) {
      await upsert(drizzleDb, branch_items, bi.id, {
        ...bi,
        updated_at: nowTs,
        created_at: bi.created_at ?? nowTs,
      });
    }

    await persistDb();
  };

  const syncTaxRates = async (data) => {
    const { drizzleDb, persistDb } = await dbReady();
    const nowTs = Date.now();

    for (const t of data.tax_rates || []) {
      await upsert(drizzleDb, tax_rates, t.id, {
        ...t,
        updated_at: nowTs,
        created_at: t.created_at ?? nowTs,
      });
    }

    await persistDb();
  };

  const syncParties = async (data) => {
    const { drizzleDb, persistDb } = await dbReady();
    const nowTs = Date.now();

    for (const p of data.parties || []) {
      await upsert(drizzleDb, parties, p.id, {
        ...p,
        updated_at: nowTs,
        created_at: p.created_at ?? nowTs,
      });

      for (const addr of p.addresses || []) {
        await upsert(drizzleDb, party_addresses, addr.id, {
          ...addr,
          updated_at: nowTs,
          created_at: addr.created_at ?? nowTs,
        });
      }
    }

    await persistDb();
  };

  const syncInvoices = async (data) => {
    const { drizzleDb, persistDb } = await dbReady();
    const nowTs = Date.now();

    for (const inv of data.invoices || []) {
      await upsert(drizzleDb, invoices, inv.id, {
        ...inv,
        updated_at: nowTs,
        created_at: inv.created_at ?? nowTs,
      });

      for (const ii of inv.items || []) {
        await upsert(drizzleDb, invoice_items, ii.id, {
          ...ii,
          updated_at: nowTs,
          created_at: ii.created_at ?? nowTs,
        });
      }
    }

    await persistDb();
  };

  const syncPayments = async (data) => {
    const { drizzleDb, persistDb } = await dbReady();
    const nowTs = Date.now();

    for (const p of data.payments || []) {
      await upsert(drizzleDb, payments, p.id, {
        ...p,
        updated_at: nowTs,
        created_at: p.created_at ?? nowTs,
      });
    }

    await persistDb();
  };



  const validateCompanyLogin = async ({ email, password }) => {
    const { drizzleDb, persistDb } = await dbReady();
    const config = useRuntimeConfig();
    const { $axios } = useNuxtApp();

    try {
      const res = await $axios.post(`${config.public.API_ENDPOINT}/api/offline/login`, {
        email,
        password
      });

      console.log("Login response:", res);

      const { user, company, branch, token } = res.data;

      // check whether we can store the token in the local host ??????????

      let loginSession;

      if (res.data?.statusCode === "00") {
        // const endpoints = [
        //   "company-sync",
        //   "branch-sync",
        //   "products-sync",
        //   "tax-sync",
        //   "parties-sync",
        //   "invoices-sync",
        //   "payments-sync"
        // ];

        // for (const ep of endpoints) {
        //   const res = await $axios.get(`${config.public.API_ENDPOINT}/api/offline/${ep}`, {
        //     headers: { Authorization: `Bearer ${token}` }
        //   });

        //   await localSyncHandler(ep, res.data);
        // }

        if (user.role === "ADMIN") {
          loginSession = useCookie("login_session", { maxAge: 86400 });
          loginSession.value = {
            company_id: company.id,
            logged_in_at: Date.now(),
          };
        } else if (user.role === "BRANCHADMIN") {

          loginSession = useCookie("login_session", { maxAge: 86400 });
          loginSession.value = {
            branch_id: branch.id,
            company_id: company.id,
            logged_in_at: Date.now(),
          };

        }
      }

      // Check below code whether it helps to sync???????????????


      // const nowTs = now();
      // const companyId = company?.id ?? user.companyId;

      // const existing = await drizzleDb
      //   .select()
      //   .from(companies)
      //   .where(eq(companies.id, companyId))
      //   .limit(1);

      // const companyData = {
      //   id: companyId,
      //   name: company?.name || null,
      //   email: company?.email || null,
      //   phone: company?.phone || null,
      //   address: company?.address || null,
      //   license_key: company?.license?.key || null,
      //   license_token: token, // store offline jwt for future sync
      //   license_expiry: company?.license?.expiry || null,
      //   grace_until: null,
      //   pin_hash: null,
      //   pin_attempts: 0,
      //   pin_locked_until: null,
      //   device_id: null,
      //   last_sync_at: nowTs,
      //   created_at: nowTs,
      //   updated_at: nowTs
      // };

      // // 🔥 3️⃣ CREATE OR UPDATE IN LOCAL SQL
      // if (existing.length === 0) {
      //   await drizzleDb.insert(companies).values(companyData);
      // } else {
      //   delete companyData.created_at;
      //   await drizzleDb
      //     .update(companies)
      //     .set(companyData)
      //     .where(eq(companies.id, companyId));
      // }

      // // Save SQLite
      // await persistDb();

      // // 🔥 4️⃣ ADD TO SYNC QUEUE
      // await enqueueSync({
      //   entity: "companies",
      //   entity_id: companyId,
      //   action: "OFFLINE_LOGIN",
      //   payload: { user, company, branch }
      // });

      return res.data

    } catch (err) {
      console.error("Offline login error:", err);
      throw err;
    }
  };

  const getCurrencies = async () => {
    const { $axios } = useNuxtApp();
    const config = useRuntimeConfig();

    try {
      const res = await $axios.get(`${config.public.API_ENDPOINT}/api/users/currencies`);
      console.log("res",res)
      const response =res.data

      
      
      return response.data; // array of currencies
    } catch (err) {
      console.log("err",err)
      console.error("Currency fetch error:", err);
      throw err;

    }
  };

  /* ===========================================
     REGISTER COMPANY (Cloud → Local Sync)
  =========================================== */
  const registerCompanyOffline = async (form) => {
    const { drizzleDb, persistDb } = await dbReady();
    const { $axios } = useNuxtApp();
    const config = useRuntimeConfig();

    const payload = {
      name: form.companyName,
      adminName: form.name,
      adminPassword: form.password,
      adminEmail: form.primaryEmail,
      adminPhone: form.primaryPhoneNo,

      branchEmail: form.secondaryEmail || null,
      branchPhone: form.secondaryPhoneNo || null,
      branchPassword: form.branch_password || null,

      tenant: form.tenant,
      gstNumber: form.gstNumber || null,
      companyType: form.companyType,
      currencyId: form.currencyId,
      city: form.city,
      state: form.state,
      pincode: form.pincode,
      addressLine1: form.addressLine1,
      addressLine2: form.addressLine2 || null,
      addressLine3: form.addressLine3 || null,
    };

    try {
      const res = await $axios.post(
        `${config.public.API_ENDPOINT}/api/offline/register`,
        payload
      );

      console.log("Registration response:", res);

      if (res.data?.statusCode !== "00") {
        throw new Error(res.data?.message);
      }

      return res.data;

    } catch (err) {
      console.warn("Offline register error:", err);
      throw err;
    }
  };



  // const validateCompanyPin = async ({ pin, device_id }) => {
  //   const { drizzleDb } = await dbReady();
  //   const rows = await drizzleDb.select().from(companies).limit(1);
  //   console.log(rows);

  //   if (!rows.length) throw new Error("POS not initialized");

  //   const company = rows[0];
  //   if (company.device_id !== device_id) throw new Error("Unauthorized device");
  //   if (!(await verifyPin(pin, company.pin_hash))) throw new Error("Invalid PIN");

  //   return company;
  // };

  /* ================= COMPANY ================= */
  // const createCompany = async (data) => {
  //   const { drizzleDb, persistDb } = await dbReady();
  //   const exists = await drizzleDb.select().from(companies).limit(1);
  //   if (exists.length) throw new Error("Company already exists");

  //   const id = uuidv4();

  //   await drizzleDb.insert(companies).values({
  //     id,
  //     ...data,
  //     pin_hash: await hashPin(data.pin),
  //     created_at: now(),
  //     updated_at: now(),
  //   });

  //   await enqueueSync({
  //     entity: "companies",
  //     entity_id: id,
  //     action: "CREATE",
  //     payload: data,
  //   });

  //   await persistDb();
  //   return id;
  // };


  /* ================= EXPORT ================= */
  return {
    // createCompany,
    // validateCompanyPin,
    registerCompanyOffline,
    validateCompanyLogin,
    getCurrencies,
  };
}
