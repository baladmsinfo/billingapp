import { useDb } from "@/db/client";
import { nanoid } from "nanoid";

export async function useDbBase() {
  const { drizzleDb, persistDb } = await useDb();
  const now = () => Math.floor(Date.now() / 1000);

  function baseInsert(data: any) {
    return {
      id: nanoid(),
      created_at: now(),
      updated_at: now(),
      ...data,
    };
  }

  async function enqueueSync(
    entity: string,
    entityId: string,
    action: "CREATE" | "UPDATE" | "DELETE",
    payload?: any
  ) {
    await drizzleDb.insert("sync_queue").values({
      id: nanoid(),
      entity,
      entity_id: entityId,
      action,
      payload: payload ? JSON.stringify(payload) : null,
      status: "PENDING",
      retry_count: 0,
      created_at: now(),
      updated_at: now(),
    });

    await persistDb();
  }

  return { drizzleDb, persistDb, baseInsert, enqueueSync, now };
}
