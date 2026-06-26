"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import LandingNav from "@/components/landing/LandingNav";
import DocumentComposer from "@/components/documents/DocumentComposer";
import RegisterNudge from "@/components/documents/RegisterNudge";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  documentsService,
  docStatusLabel,
  docTypeLabel,
  extractApiError,
  type BusinessDocument,
} from "@/lib/api";
import { loadGuestDocuments } from "@/lib/guest-documents";

function statusClass(status: string): string {
  if (status === "signed") return "docs-status--signed";
  if (status === "sent" || status === "viewed") return "docs-status--sent";
  if (status === "cancelled") return "docs-status--cancelled";
  return "docs-status--draft";
}

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (isAuthenticated) {
        const docs = await documentsService.list();
        setDocuments(docs);
      } else {
        setDocuments(loadGuestDocuments());
      }
    } catch (e) {
      if (!isAuthenticated) {
        setDocuments(loadGuestDocuments());
      } else {
        setError(extractApiError(e));
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    load();
  }, [load]);

  const onCreated = () => {
    load();
  };

  return (
    <>
      <LandingNav />
      <main className="page-wrap docs-dashboard landing-page-inner">
        <div className="page-hero">
          <h1>צור מסמך</h1>
          <p>
            {isAuthenticated
              ? "כתוב נושא, העלה לוגו — ואנחנו נייצר לך מסמך מקצועי עם AI"
              : "התחל מיד כאורח — או הירשם כדי לשמור ולשלוח לחתימה"}
          </p>
        </div>

        {error ? <div className="warn-box">{error}</div> : null}

        <DocumentComposer onCreated={onCreated} />

        <section className="docs-dashboard-section">
          <h2 className="docs-section-title">
            {isAuthenticated ? "המסמכים שלי" : "מסמכים בסשן זה (אורח)"}
          </h2>
          {!isAuthenticated ? (
            <RegisterNudge hint="מסמכי אורח נשמרים בדפדפן בלבד — הרשמה שומרת אותם בענן" />
          ) : null}
          {loading ? (
            <p className="docs-empty-hint">טוען...</p>
          ) : documents.length === 0 ? (
            <div className="docs-empty-state card">
              <div className="docs-empty-icon" aria-hidden>
                📄
              </div>
              <p>עדיין אין מסמכים.</p>
              <p className="docs-empty-sub">כתוב נושא למעלה — המסמך הראשון שלך יופיע כאן.</p>
            </div>
          ) : (
            <div className="docs-table-wrap card">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>מספר</th>
                    <th>כותרת</th>
                    <th>סוג</th>
                    {!isAuthenticated ? <th>מצב</th> : null}
                    <th>סטטוס</th>
                    <th>תאריך</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={`${doc.documentNumber}-${doc.createdAt}`}>
                      <td className="docs-mono">{doc.documentNumber}</td>
                      <td>{doc.title}</td>
                      <td>{docTypeLabel(doc.docType)}</td>
                      {!isAuthenticated ? (
                        <td>
                          {doc.guest ? (
                            <span className="docs-status docs-status--draft">אורח</span>
                          ) : (
                            "—"
                          )}
                        </td>
                      ) : null}
                      <td>
                        <span className={`docs-status ${statusClass(doc.status)}`}>
                          {docStatusLabel(doc.status)}
                        </span>
                      </td>
                      <td>{new Date(doc.createdAt).toLocaleDateString("he-IL")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!isAuthenticated ? (
                <p className="docs-guest-foot">
                  <Link href="/auth">הירשם</Link> כדי לשמור מסמכים לצמיתות ולשלוח לחתימה.
                </p>
              ) : null}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
