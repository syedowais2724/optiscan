import axios from "axios";
import type {
  AnalyticsSummary,
  Document,
  OperationalRecord,
  OperationalRecordUpdate,
  RecordSearchParams,
} from "../types";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8001",
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail;
      if (typeof detail === "string") {
        return Promise.reject(new Error(detail));
      }
      if (Array.isArray(detail)) {
        return Promise.reject(new Error("Request validation failed."));
      }
    }

    return Promise.reject(error);
  },
);

export async function uploadDocument(file: File): Promise<Document> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<Document>("/api/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function extractDocument(documentId: number): Promise<OperationalRecord> {
  const response = await apiClient.post<OperationalRecord>(`/api/documents/${documentId}/extract`);
  return response.data;
}

export async function listDocuments(skip = 0, limit = 50): Promise<Document[]> {
  const response = await apiClient.get<Document[]>("/api/documents/", {
    params: { skip, limit },
  });
  return response.data;
}

export async function getDocument(documentId: number): Promise<Document> {
  const response = await apiClient.get<Document>(`/api/documents/${documentId}`);
  return response.data;
}

export async function updateRecord(
  recordId: number,
  payload: OperationalRecordUpdate,
): Promise<OperationalRecord> {
  const response = await apiClient.put<OperationalRecord>(`/api/records/${recordId}`, payload);
  return response.data;
}

export async function approveRecord(recordId: number): Promise<OperationalRecord> {
  const response = await apiClient.post<OperationalRecord>(`/api/records/${recordId}/approve`);
  return response.data;
}

export async function flagRecord(recordId: number): Promise<OperationalRecord> {
  const response = await apiClient.post<OperationalRecord>(`/api/records/${recordId}/flag`);
  return response.data;
}

export async function searchRecords(params: RecordSearchParams): Promise<OperationalRecord[]> {
  const response = await apiClient.get<OperationalRecord[]>("/api/records/search", { params });
  return response.data;
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const response = await apiClient.get<AnalyticsSummary>("/api/analytics/summary");
  return response.data;
}
