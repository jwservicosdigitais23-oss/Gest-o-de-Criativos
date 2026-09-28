import type { Metadata } from "next";
import { Vitrine } from "@/components/design-system/vitrine";
import { exigirAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Design System" };

/** Vitrine do Design System v2 — só para o administrador aprovar. */
export default async function DesignSystemPage() {
  await exigirAdmin();
  return <Vitrine />;
}
