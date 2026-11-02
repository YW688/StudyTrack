import { del, get, set } from "idb-keyval";
import { z } from "zod";

export const AVATAR_KEY = "studytrack:v1:avatar";

export const avatarSchema = z
  .string()
  .max(400_000)
  .regex(/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/=]+$/);

export async function loadAvatar(): Promise<string | null> {
  try {
    const value = await get(AVATAR_KEY);
    if (!value) return null;
    const parsed = avatarSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function saveAvatar(dataUrl: string): Promise<void> {
  await set(AVATAR_KEY, avatarSchema.parse(dataUrl));
}

export async function deleteAvatar(): Promise<void> {
  await del(AVATAR_KEY);
}
