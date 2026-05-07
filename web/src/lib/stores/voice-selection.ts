import { create } from "zustand";

export interface SelectedVoice {
  id: string;
  name: string;
  audioUrl: string;
  featureUrl: string | null;
  voxcpmVersion: string | null;
}

interface VoiceSelectionState {
  selected: SelectedVoice | null;
  setSelected: (v: SelectedVoice | null) => void;
}

export const useVoiceSelection = create<VoiceSelectionState>((set) => ({
  selected: null,
  setSelected: (v) => set({ selected: v }),
}));
