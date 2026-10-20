import { createHash } from "node:crypto";
import { getDatabase } from "@/lib/database";
import { hashPassword } from "@/lib/password";

export type StoredUser = {
  id: string;
  email: string;
  name: string;
  bio?: string;
  avatar?: string;
  salt: string;
  hash: string;
  createdAt: string;
};

const userId = (email: string) =>
  createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32);

function toUser(row: Record<string, unknown>): StoredUser {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    bio: row.bio == null ? undefined : String(row.bio),
    avatar: row.avatar == null ? undefined : String(row.avatar),
    salt: String(row.salt),
    hash: String(row.hash),
    createdAt: String(row.created_at),
  };
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const db = await getDatabase();
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE email = ? LIMIT 1",
    args: [email.trim().toLowerCase()],
  });
  const row = result.rows[0];
  return row ? toUser(row) : null;
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  const db = await getDatabase();
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE id = ? LIMIT 1",
    args: [id],
  });
  const row = result.rows[0];
  return row ? toUser(row) : null;
}

export async function saveUser(user: StoredUser): Promise<void> {
  const db = await getDatabase();
  await db.execute({
    sql: `UPDATE users SET name = ?, bio = ?, avatar = ? WHERE id = ?`,
    args: [user.name, user.bio ?? null, user.avatar ?? null, user.id],
  });
}

export async function listUsers(): Promise<StoredUser[]> {
  const db = await getDatabase();
  const result = await db.execute("SELECT * FROM users ORDER BY created_at ASC");
  return result.rows.map(toUser);
}

export async function createUser(input: {
  email: string;
  name: string;
  password: string;
}): Promise<StoredUser> {
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

  const db = await getDatabase();
  await db.execute({
    sql: `INSERT INTO users
      (id, email, name, bio, avatar, salt, hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      user.id,
      user.email,
      user.name,
      user.bio ?? null,
      user.avatar ?? null,
      user.salt,
      user.hash,
      user.createdAt,
    ],
  });
  return user;
}
