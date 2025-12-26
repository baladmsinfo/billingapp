// plugins/db.client.js
import { migrate } from "~/db/migrate";
import { seed } from "~/db/seed";
import { useDb } from "~/db/client";

export default defineNuxtPlugin(async () => {
  await migrate(true);
  await seed();
  //await migrate();
  const { drizzleDb } = await useDb();

  return {
    provide: { db: drizzleDb },
  };
});
