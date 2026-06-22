import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayoutShell from "@/components/admin/AdminLayoutShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute adminOnly>
      <AdminLayoutShell>{children}</AdminLayoutShell>
    </ProtectedRoute>
  );
}
