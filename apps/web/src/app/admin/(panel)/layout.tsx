import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { pickContextEvent } from "@/lib/admin-nav";
import { requireAdmin } from "@/lib/auth-guard";
import { listEvents } from "@/lib/events";

/**
 * Admin shell (docs/design/admin): the dark sidebar on the left, the screen centered up to
 * 1200px on the right. From 900px down the sidebar becomes a bar above the content.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await requireAdmin();
  const events = await listEvents();

  return (
    <div className="admin-ui flex min-h-dvh flex-col bg-block wide:flex-row">
      <AdminSidebar
        user={{ name: user.name, email: user.email }}
        fallbackEventId={pickContextEvent(events)}
      />
      <main className="min-w-0 flex-1 px-[clamp(16px,4vw,44px)] py-7">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col">{children}</div>
      </main>
    </div>
  );
}
