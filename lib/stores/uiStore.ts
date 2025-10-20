/**
 * Zustand UI State Store
 *
 * Manages transient, client-side UI state that doesn't affect game logic.
 * This is separate from XState game flow - Zustand = UI, XState = Game Logic.
 *
 * Following the architecture guidance:
 * - Zustand: Modal visibility, input values, notifications, preferences
 * - XState: Game phases, player state, roles, votes, outcomes
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// Toast Notification Types
// ============================================================

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  duration?: number; // milliseconds, default 3000
}

// ============================================================
// UI State Interface
// ============================================================

interface UiState {
  // Modal States
  isRoleRevealModalOpen: boolean;
  isRulesModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isConfirmDialogOpen: boolean;

  // Toast Notifications
  toasts: Toast[];

  // Connection Status UI
  isConnectionLost: boolean;

  // Chat UI State (temporary, not persisted)
  chatInputValue: string;

  // Sidebar State (persisted)
  isSidebarOpen: boolean;

  // Theme (persisted)
  theme: 'light' | 'dark' | 'system';

  // ============================================================
  // Actions - Modal Management
  // ============================================================

  openRoleRevealModal: () => void;
  closeRoleRevealModal: () => void;

  openRulesModal: () => void;
  closeRulesModal: () => void;

  openSettingsModal: () => void;
  closeSettingsModal: () => void;

  openConfirmDialog: () => void;
  closeConfirmDialog: () => void;

  // ============================================================
  // Actions - Toast Notifications
  // ============================================================

  showToast: (
    message: string,
    type: Toast['type'],
    duration?: number
  ) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;

  // ============================================================
  // Actions - Connection Status
  // ============================================================

  setConnectionLost: (isLost: boolean) => void;

  // ============================================================
  // Actions - Chat Input
  // ============================================================

  setChatInput: (value: string) => void;
  clearChatInput: () => void;

  // ============================================================
  // Actions - Sidebar
  // ============================================================

  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;

  // ============================================================
  // Actions - Theme
  // ============================================================

  setTheme: (theme: UiState['theme']) => void;
}

// ============================================================
// Zustand Store with Persistence
// ============================================================

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      // Initial State
      isRoleRevealModalOpen: false,
      isRulesModalOpen: false,
      isSettingsModalOpen: false,
      isConfirmDialogOpen: false,
      toasts: [],
      isConnectionLost: false,
      chatInputValue: '',
      isSidebarOpen: false,
      theme: 'system',

      // Modal Actions
      openRoleRevealModal: () => set({ isRoleRevealModalOpen: true }),
      closeRoleRevealModal: () => set({ isRoleRevealModalOpen: false }),

      openRulesModal: () => set({ isRulesModalOpen: true }),
      closeRulesModal: () => set({ isRulesModalOpen: false }),

      openSettingsModal: () => set({ isSettingsModalOpen: true }),
      closeSettingsModal: () => set({ isSettingsModalOpen: false }),

      openConfirmDialog: () => set({ isConfirmDialogOpen: true }),
      closeConfirmDialog: () => set({ isConfirmDialogOpen: false }),

      // Toast Actions
      showToast: (message, type, duration = 3000) =>
        set((state) => ({
          toasts: [
            ...state.toasts,
            {
              id: crypto.randomUUID(),
              message,
              type,
              duration,
            },
          ],
        })),
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id),
        })),
      clearAllToasts: () => set({ toasts: [] }),

      // Connection Actions
      setConnectionLost: (isLost) => set({ isConnectionLost: isLost }),

      // Chat Actions
      setChatInput: (value) => set({ chatInputValue: value }),
      clearChatInput: () => set({ chatInputValue: '' }),

      // Sidebar Actions
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

      // Theme Actions
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'insider-game-ui-preferences', // localStorage key
      // Only persist specific keys (not modals or toasts)
      partialize: (state) => ({
        isSidebarOpen: state.isSidebarOpen,
        theme: state.theme,
      }),
    }
  )
);

// ============================================================
// Convenience Hooks (Optional)
// ============================================================

/**
 * Hook to access toast notifications
 */
export const useToasts = () =>
  useUiStore((state) => ({
    toasts: state.toasts,
    showToast: state.showToast,
    removeToast: state.removeToast,
    clearAllToasts: state.clearAllToasts,
  }));

/**
 * Hook to access theme
 */
export const useTheme = () =>
  useUiStore((state) => ({
    theme: state.theme,
    setTheme: state.setTheme,
  }));

/**
 * Hook to access sidebar state
 */
export const useSidebar = () =>
  useUiStore((state) => ({
    isSidebarOpen: state.isSidebarOpen,
    toggleSidebar: state.toggleSidebar,
    setSidebarOpen: state.setSidebarOpen,
  }));

/**
 * Hook to access connection status
 */
export const useConnectionStatus = () =>
  useUiStore((state) => ({
    isConnectionLost: state.isConnectionLost,
    setConnectionLost: state.setConnectionLost,
  }));
