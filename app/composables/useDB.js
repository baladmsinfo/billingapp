// composables/useDb.ts
import { db } from '@/db/client' // your initialized drizzle/sql.js client
export const useDb = () => ({ db })