import ProfileShell from "@/components/profile/ProfileShell";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <ProfileShell>{children}</ProfileShell>
    </ProtectedRoute>
  );
}
