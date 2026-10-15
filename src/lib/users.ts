import { createHash } from "node:crypto";
import { hashPassword } from "@/lib/password";
import { storeGetText, storePut } from "@/lib/store";

export type StoredUser = {
  id: string;
  email: string;
  name: string;
  salt: string;
  hash: string;
  createdAt: string;
};

const userId = (email: string) =>
  createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32);

const userPath = (id: string) => `users/${id}.json`;

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const text = await storeGetText(userPath(userId(email)));
  if (!text) return null;
  try {
    return JSON.parse(text) as StoredUser;
  } catch {
    return null;
  }
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  const text = await storeGetText(userPath(id));
  if (!text) return null;
  try {
    return JSON.parse(text) as StoredUser;
  } catch {
    return null;
  }
}

export async function createUser(input: { email: string; name: string; password: string }): Promise<StoredUser> {
  const email = input.email.trim().toLowerCase();
  const id = userId(email);
  const { salt, hash } = hashPassword(input.password);
  const user: StoredUser = {
    id,
    email,
    name: input.name.trim(),
    salt,
    hash,
    createdAt: new Date().toISOString(),
  };
  await storePut(userPath(id), JSON.stringify(user, null, 2), "application/json");
  return user;
}
