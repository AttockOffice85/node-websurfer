import { create } from 'zustand';
import { PopupState } from '../scripts/types';

export const usePopupUserFormStore = create<PopupState>((set) => ({
    isOpen: false,
    openPopup: () => set({ isOpen: true }),
    closePopup: () => set({ isOpen: false }),
}));

export const usePopupCompanyFormStore = create<PopupState>((set) => ({
    isOpen: false,
    openPopup: () => set({ isOpen: true }),
    closePopup: () => set({ isOpen: false }),
}));
