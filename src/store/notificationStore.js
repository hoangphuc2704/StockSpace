import { create } from 'zustand'

export const useNotificationStore = create((set) => ({
  notifications: [
    { id: 1, title: 'New Booking Request', message: 'TechBuild Ltd. requested Saigon Hub A', type: 'booking', isRead: false, time: '2m ago' },
    { id: 2, title: 'Inventory Alert', message: 'Solar Panels stock is low', type: 'inventory', isRead: false, time: '15m ago' },
    { id: 3, title: 'Payment Confirmed', message: 'Deposit for ORDER-8821 received', type: 'payment', isRead: true, time: '1h ago' },
  ],

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        { id: Date.now(), isRead: false, time: 'Just now', ...notification },
        ...state.notifications,
      ],
    })),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    })),

  clearAll: () => set({ notifications: [] }),
}))
