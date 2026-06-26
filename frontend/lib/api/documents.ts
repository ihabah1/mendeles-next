import api from "./client";

export type DocType = "quote" | "visit_summary" | "call_summary";
export type DocStatus = "draft" | "sent" | "viewed" | "signed" | "cancelled";

export type DocumentField = {
  key: string;
  label: string;
  type: string;
};

export type DocumentTemplate = {
  id: number;
  slug: string;
  docType: DocType;
  name: string;
  description: string;
  fieldsSchema: DocumentField[];
};

export type BusinessDocument = {
  id: number;
  documentNumber: string;
  docType: DocType;
  title: string;
  status: DocStatus;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  fieldsData: Record<string, string | number>;
  notes: string;
  templateId: number | null;
  sentAt: string | null;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
  signatureToken: string | null;
  guest?: boolean;
};

export type BusinessProfile = {
  businessName: string;
  trade: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  taxId: string;
  logoUrl: string;
  logoData?: string;
  hasLogo?: boolean;
};

export type GenerateDocumentResult = {
  document: BusinessDocument;
  source: string;
  notice: string;
  guest: boolean;
  registerHint: string;
  business: Partial<BusinessProfile> & { businessName?: string; logoData?: string; hasLogo?: boolean };
};

const DOC_TYPE_LABELS: Record<DocType, string> = {
  quote: "הצעת מחיר",
  visit_summary: "סיכום ביקור",
  call_summary: "סיכום שיחה",
};

const DOC_STATUS_LABELS: Record<DocStatus, string> = {
  draft: "טיוטה",
  sent: "נשלח",
  viewed: "נצפה",
  signed: "נחתם",
  cancelled: "בוטל",
};

export function docTypeLabel(type: DocType): string {
  return DOC_TYPE_LABELS[type] ?? type;
}

export function docStatusLabel(status: DocStatus): string {
  return DOC_STATUS_LABELS[status] ?? status;
}

export const documentsService = {
  async list(): Promise<BusinessDocument[]> {
    const { data } = await api.get<{ documents: BusinessDocument[] }>("/documents/");
    return data.documents;
  },

  async templates(): Promise<DocumentTemplate[]> {
    const { data } = await api.get<{ templates: DocumentTemplate[] }>("/documents/templates/");
    return data.templates;
  },

  async create(payload: {
    templateId?: number;
    docType?: DocType;
    title?: string;
    recipientName?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    fieldsData?: Record<string, unknown>;
  }): Promise<BusinessDocument> {
    const { data } = await api.post<BusinessDocument>("/documents/", payload);
    return data;
  },

  async getBusinessProfile(): Promise<BusinessProfile> {
    const { data } = await api.get<BusinessProfile>("/business-profile/");
    return data;
  },

  async updateBusinessProfile(patch: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const { data } = await api.patch<BusinessProfile>("/business-profile/", patch);
    return data;
  },

  async generate(payload: {
    topic: string;
    logoData?: string;
    businessName?: string;
    docType?: DocType;
  }): Promise<GenerateDocumentResult> {
    const { data } = await api.post<GenerateDocumentResult>("/documents/generate/", payload, {
      timeout: 90000,
    });
    return data;
  },
};
