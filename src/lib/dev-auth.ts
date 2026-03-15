import { cookies } from "next/headers";

const DEV_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function getDevUser() {
  const cookieStore = await cookies();
  const role = cookieStore.get("dev-role")?.value as "admin" | "franchisee" | undefined;

  if (!role) return null;

  return {
    id: DEV_USER_ID,
    role,
  };
}
