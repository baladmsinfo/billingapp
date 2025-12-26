import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Create PIN hash
 */
export async function createPinHash(pin) {
  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error("PIN must be 4–6 digits");
  }

  return bcrypt.hash(pin, SALT_ROUNDS);
}

export async function hashPin(pin) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(pin, salt);
}

/**
 * Validate PIN
 */
export async function verifyPin(pin, hash) {
  return bcrypt.compare(pin, hash);
}
