// Server only. A password is never stored, only "scrypt$<salt>$<hash>".
// scrypt is slow and memory-hungry on purpose: guessing passwords from a leaked hash is expensive.
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// The async version, so hashing (about 50 ms) does not block other requests.
const scryptAsync = promisify(scrypt) as (password: string, salt: string, keyLength: number) => Promise<Buffer>;
const KEY_LENGTH = 64;

// A new random salt for every password: two users with the same password get different hashes.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hashHex] = stored.split("$");
  const expected = Buffer.from(hashHex ?? "", "hex");
  // A malformed value would give an empty buffer, and two empty buffers are "equal".
  if (scheme !== "scrypt" || !salt || expected.length !== KEY_LENGTH) return false;
  const actual = await scryptAsync(password, salt, KEY_LENGTH);
  // Takes the same time wherever the bytes differ, so timing reveals nothing about the hash.
  return timingSafeEqual(expected, actual);
}
