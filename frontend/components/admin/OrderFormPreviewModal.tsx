"use client";

import LottoFormPreview, {
  type PreviewForm,
} from "@/components/admin/LottoFormPreview";

export default function OrderFormPreviewModal({
  open,
  onClose,
  orderNumber,
  customerName,
  drawDate,
  isDouble,
  forms,
  loading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  orderNumber?: string;
  customerName?: string;
  drawDate?: string;
  isDouble?: boolean;
  forms: PreviewForm[];
  loading?: boolean;
  error?: string;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="form-preview-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,.55)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "24px 16px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 440,
          padding: "18px 16px 20px",
          marginTop: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <h2
              id="form-preview-title"
              style={{
                fontFamily: "'Frank Ruhl Libre',serif",
                fontSize: "1.05rem",
                fontWeight: 900,
                color: "var(--cream)",
                marginBottom: 4,
              }}
            >
              סימולציית טופס לוטו
            </h2>
            <p style={{ fontSize: ".72rem", color: "var(--muted)", margin: 0 }}>
              {orderNumber || "—"}
              {customerName ? ` · ${customerName}` : ""}
            </p>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
            סגור ✕
          </button>
        </div>

        {loading && (
          <p style={{ color: "var(--muted)", fontSize: ".82rem", textAlign: "center", padding: 24 }}>
            טוען טבלאות...
          </p>
        )}
        {error && (
          <p style={{ color: "#ff6b7a", fontSize: ".82rem", textAlign: "center", padding: 16 }}>
            {error}
          </p>
        )}
        {!loading && !error && (
          <LottoFormPreview
            forms={forms}
            drawDate={drawDate}
            isDouble={isDouble}
            customerName={customerName}
          />
        )}
      </div>
    </div>
  );
}
