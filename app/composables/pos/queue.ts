import { useDb } from "@/db/client";
import { sync_queue } from "@/db/schema";
import { v4 as uuidv4 } from "uuid";

const now = () => Date.now();

export const enqueueSync = async ({
  entity,
  entity_id,
  action,
  payload,
}) => {
  const { drizzleDb, persistDb } = await useDb();

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

  await persistDb();
};
