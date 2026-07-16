import bcrypt from "bcryptjs";
import { authConfig } from "./config";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, authConfig.passwordRounds);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
