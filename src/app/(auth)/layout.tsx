import { LayoutAuth } from "@/components/auth/layout-auth";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <LayoutAuth>{children}</LayoutAuth>;
}
