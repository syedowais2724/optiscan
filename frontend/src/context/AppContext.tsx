import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { getDocument, listDocuments } from "../api/client";
import type { Document } from "../types";

interface AppContextValue {
  documents: Document[];
  selectedDocument: Document | null;
  isLoadingDocuments: boolean;
  isLoadingDocument: boolean;
  error: string | null;
  refreshDocuments: () => Promise<void>;
  selectDocument: (documentId: number) => Promise<void>;
  setSelectedDocument: (document: Document | null) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDocuments = useCallback(async () => {
    setIsLoadingDocuments(true);
    setError(null);
    try {
      setDocuments(await listDocuments());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []);

  const selectDocument = useCallback(async (documentId: number) => {
    setIsLoadingDocument(true);
    setError(null);
    try {
      setSelectedDocument(await getDocument(documentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load document");
    } finally {
      setIsLoadingDocument(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      documents,
      selectedDocument,
      isLoadingDocuments,
      isLoadingDocument,
      error,
      refreshDocuments,
      selectDocument,
      setSelectedDocument,
    }),
    [
      documents,
      selectedDocument,
      isLoadingDocuments,
      isLoadingDocument,
      error,
      refreshDocuments,
      selectDocument,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
}
