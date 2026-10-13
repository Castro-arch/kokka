import { requireAdmin } from "@/lib/auth-guard";

export default async function AdminHomePage() {
  const { user } = await requireAdmin();
  return <h1 className="text-2xl font-semibold">Olá, {user.name}</h1>;
}
