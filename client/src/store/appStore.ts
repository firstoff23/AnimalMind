import { create } from "zustand";

interface AppState {
  selectedAnimalId: string | null;
  isRecording: boolean;
  cameraActive: boolean;
  language: "pt" | "en";
  commandPaletteOpen: boolean;
  setSelectedAnimal: (id: string | null) => void;
  setRecording: (isRecording: boolean) => void;
  setCamera: (cameraActive: boolean) => void;
  setLanguage: (language: "pt" | "en") => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedAnimalId: null,
  isRecording: false,
  cameraActive: false,
  commandPaletteOpen: false,
  language: (() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("cortex_lang");
      return saved === "pt" || saved === "en" ? saved : "pt";
    }
    return "pt";
  })(),
  setSelectedAnimal: (id) => set({ selectedAnimalId: id }),
  setRecording: (isRecording) => set({ isRecording }),
  setCamera: (cameraActive) => set({ cameraActive }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  setLanguage: (language) => {
    set({ language });
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem("cortex_lang", language);
    }
  },
}));
