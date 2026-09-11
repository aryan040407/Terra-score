"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getRoleRedirect, getSession, type UserRole } from "@/lib/auth";

export function RoleGuard({
  requiredRole,
  children,
}: {
  requiredRole: UserRole;
  children: ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    if (session.role !== requiredRole) {
      router.replace(getRoleRedirect(session.role));
      return;
    }

    setReady(true);
  }, [requiredRole, router]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-forest-700 border-t-transparent" />
          <p className="text-xs font-medium text-charcoal-500">Checking access…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
