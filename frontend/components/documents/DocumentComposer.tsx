"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  documentsService,
  docTypeLabel,
  extractApiError,
  type BusinessDocument,
  type BusinessProfile,
} from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  loadGuestBusinessName,
  loadGuestLogo,
  saveGuestBusinessName,
  saveGuestDocument,
  saveGuestLogo,
} from "@/lib/guest-documents";
import RegisterNudge from "@/components/documents/RegisterNudge";

type Props = {
  onCreated?: (doc: BusinessDocument) => void;
  compact?: boolean;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("לא ניתן לקרוא את הקובץ"));
    reader.readAsDataURL(file);
  });
}

export default function DocumentComposer({ onCreated, compact = false }: Props) {
  const { isAuthenticated } = useAuth();
  const [topic, setTopic] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [logoData, setLogoData] = useState<string | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [registerHint, setRegisterHint] = useState("");
  const [lastDoc, setLastDoc] = useState<BusinessDocument | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    if (!isAuthenticated) {
      const savedLogo = loadGuestLogo();
      const savedName = loadGuestBusinessName();
      if (savedLogo) {
        setLogoPreview(savedLogo);
        setLogoData(savedLogo);
      }
      if (savedName) setBusinessName(savedName);
      return;
    }
    try {
      const bp = await documentsService.getBusinessProfile();
      setProfile(bp);
      if (bp.businessName) setBusinessName(bp.businessName);
      if (bp.logoData) {
        setLogoPreview(bp.logoData);
        setLogoData(bp.logoData);
      } else if (bp.logoUrl) {
        setLogoPreview(bp.logoUrl);
      }
    } catch {
      /* optional */
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onLogoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("יש להעלות קובץ תמונה (PNG, JPG, WebP)");
      return;
    }
    if (file.size > 400_000) {
      setError("הלוגו גדול מדי (מקסימום 400KB)");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setLogoPreview(dataUrl);
      setLogoData(dataUrl);
      if (!isAuthenticated) saveGuestLogo(dataUrl);
    } catch {
      setError("לא ניתן לטעון את הלוגו");
    }
  };

  const generate = async () => {
    const trimmed = topic.trim();
    if (!trimmed) {
      setError("כתוב נושא למסמך");
      return;
    }
    setGenerating(true);
    setError("");
    setNotice("");
    setRegisterHint("");
    setLastDoc(null);

    const name = businessName.trim();
    if (!isAuthenticated) {
      saveGuestBusinessName(name);
    }

    try {
      const res = await documentsService.generate({
        topic: trimmed,
        logoData: logoData ?? undefined,
        businessName: name || undefined,
      });
      setLastDoc(res.document);
      if (res.business?.businessName) {
        setBusinessName(res.business.businessName);
      }
      if (res.business && "logoData" in res.business && res.business.logoData) {
        setProfile(res.business as BusinessProfile);
      }
      if (res.notice) setNotice(res.notice);
      if (res.registerHint) setRegisterHint(res.registerHint);
      if (res.guest) {
        saveGuestDocument(res.document);
      }
      onCreated?.(res.document);
      setTopic("");
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className={`doc-composer${compact ? " doc-composer--compact" : ""}`}>
      {!isAuthenticated ? <RegisterNudge /> : null}

      <div className="doc-composer-card card">
        <div className="doc-composer-head">
          <h2 className="doc-composer-title">
            {compact ? "צור מסמך עכשיו" : "כתוב נושא — אנחנו נייצר לך מסמך"}
          </h2>
          <p className="doc-composer-sub">
            {isAuthenticated
              ? "תאר בקצרה את המסמך. העלה לוגו — וה-AI ימלא את כל השדות עבורך."
              : "אפשר להתחיל מיד כאורח. מומלץ להירשם כדי לשמור ולשלוח לחתימה."}
          </p>
        </div>

        <label className="doc-composer-label" htmlFor="doc-business-name">
          שם העסק (אופציונלי)
        </label>
        <input
          id="doc-business-name"
          type="text"
          className="doc-composer-input"
          placeholder="לדוגמה: כהן שיפוצים בע״מ"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          disabled={generating}
          maxLength={160}
        />

        <label className="doc-composer-label" htmlFor="doc-topic">
          נושא המסמך
        </label>
        <textarea
          id="doc-topic"
          className="doc-composer-topic"
          rows={compact ? 3 : 4}
          placeholder='לדוגמה: "הצעת מחיר לשיפוץ מטבח אצל משפחת כהן — ארונות, שיש, 45,000 ש״ח"'
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={generating}
          maxLength={2000}
        />

        <div className="doc-composer-logo-row">
          <div className="doc-composer-logo-upload">
            <label className="doc-composer-label">לוגו העסק</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="doc-composer-file"
              onChange={onLogoPick}
              disabled={generating}
            />
            <button
              type="button"
              className="doc-composer-logo-btn"
              onClick={() => fileRef.current?.click()}
              disabled={generating}
            >
              {logoPreview ? "החלף לוגו" : "העלה לוגו"}
            </button>
          </div>
          {logoPreview ? (
            <div className="doc-composer-logo-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoPreview} alt="תצוגת לוגו" />
            </div>
          ) : (
            <div className="doc-composer-logo-placeholder" aria-hidden>
              🏢
            </div>
          )}
        </div>

        {error ? <div className="warn-box doc-composer-msg">{error}</div> : null}
        {notice ? <div className="doc-composer-notice">{notice}</div> : null}

        <button
          type="button"
          className="doc-composer-submit landing-btn landing-btn--gold"
          onClick={generate}
          disabled={generating || !topic.trim()}
        >
          {generating ? "מייצר מסמך…" : "✨ צור מסמך עם AI"}
        </button>
      </div>

      {lastDoc ? (
        <div className="doc-composer-result card">
          <div className="doc-composer-result-head">
            <span className="doc-composer-result-badge">נוצר בהצלחה</span>
            <span className="docs-mono">{lastDoc.documentNumber}</span>
          </div>
          {lastDoc.guest && registerHint ? (
            <div className="doc-composer-guest-hint">
              {registerHint}{" "}
              <Link href="/auth">הירשם עכשיו</Link>
            </div>
          ) : null}
          <h3 className="doc-composer-result-title">{lastDoc.title}</h3>
          <p className="doc-composer-result-type">{docTypeLabel(lastDoc.docType)}</p>
          <dl className="doc-composer-fields">
            {Object.entries(lastDoc.fieldsData).map(([key, val]) =>
              val ? (
                <div key={key} className="doc-composer-field">
                  <dt>{key}</dt>
                  <dd>{String(val)}</dd>
                </div>
              ) : null,
            )}
          </dl>
        </div>
      ) : null}
    </section>
  );
}
