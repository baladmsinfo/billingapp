import { useDb } from "@/db/client";
import { v4 as uuidv4 } from "uuid";

const now = () => Math.floor(Date.now() / 1000);

/* =========================================
   1️⃣ NAMED EXPORT → enqueueSync (IMPORTANT)
   ========================================= */

export async function enqueueSync(data: {
  entity: string;
  entity_id: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  payload: any;
}) {
  const { drizzleDb, persistDb } = await useDb();

  await drizzleDb.insert("sync_queue").values({
    id: uuidv4(),
    entity: data.entity,
    entity_id: data.entity_id,
    action: data.action,
    payload: JSON.stringify(data.payload),
    status: "PENDING",
    created_at: now(),
  });

  await persistDb();
}

/* =========================================
   2️⃣ COMPOSABLE → useSyncQueue (WORKER)
   ========================================= */

export async function useSyncQueue() {
  const { drizzleDb, persistDb } = await useDb();

  async function pending() {
    return drizzleDb
      .select()
      .from("sync_queue")
      .where({ status: "PENDING" });
  }

  async function markSynced(id: string) {
    await drizzleDb
      .update("sync_queue")
      .set({
        status: "SYNCED",
        updated_at: now(),
      })
      .where({ id });

    await persistDb();
  }

  return {
    pending,
    markSynced,
  };
}
