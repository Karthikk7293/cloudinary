import { create } from "zustand";
import type { Toast, ToastType } from "@/types";

export interface PreviewFile {
  public_id: string;
  secure_url: string;
  format: string;
  bytes: number;
  resource_type: "image" | "video" | "raw";
}

interface UIStore {
  // Breadcrumbs
  breadcrumbs: string[];
  setBreadcrumbs: (crumbs: string[]) => void;
  pushBreadcrumb: (crumb: string) => void;
  popBreadcrumb: () => void;
  resetBreadcrumbs: () => void;

  // Selected folder
  selectedFolder: string;
  setSelectedFolder: (folder: string) => void;

  // Upload modal
  isUploadModalOpen: boolean;
  openUploadModal: () => void;
  closeUploadModal: () => void;

  // Preview modal
  isPreviewModalOpen: boolean;
  previewUrl: string | null;
  previewType: "image" | "video" | "raw" | null;
  previewFile: PreviewFile | null;
  openPreview: (file: PreviewFile) => void;
  closePreview: () => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;

  // Loading
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

let toastCounter = 0;

export const useUIStore = create<UIStore>((set, get) => ({
  // Breadcrumbs
  breadcrumbs: [],
  setBreadcrumbs: (crumbs) => set({ breadcrumbs: crumbs }),
  pushBreadcrumb: (crumb) =>
    set({ breadcrumbs: [...get().breadcrumbs, crumb] }),
  popBreadcrumb: () =>
    set({ breadcrumbs: get().breadcrumbs.slice(0, -1) }),
  resetBreadcrumbs: () => set({ breadcrumbs: [] }),

  // Selected folder
  selectedFolder: "",
  setSelectedFolder: (folder) => set({ selectedFolder: folder }),

  // Upload modal
  isUploadModalOpen: false,
  openUploadModal: () => set({ isUploadModalOpen: true }),
  closeUploadModal: () => set({ isUploadModalOpen: false }),

  // Preview modal
  isPreviewModalOpen: false,
  previewUrl: null,
  previewType: null,
  previewFile: null,
  openPreview: (file) =>
    set({
      isPreviewModalOpen: true,
      previewUrl: file.secure_url,
      previewType: file.resource_type,
      previewFile: file,
    }),
  closePreview: () =>
    set({
      isPreviewModalOpen: false,
      previewUrl: null,
      previewType: null,
      previewFile: null,
    }),

  // Toast notifications
  toasts: [],
  addToast: (type, message) => {
    const id = `toast-${++toastCounter}`;
    set({ toasts: [...get().toasts, { id, type, message }] });
    setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    }, 4000);
  },
  removeToast: (id) =>
    set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  // Loading
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
}));
