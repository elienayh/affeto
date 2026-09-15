/**
 * Service: Notificações Push & In-App (Pós-MVP - Seção 4)
 * Tabela no Postgres: notifications
 */
export const notificationService = {
  sendPushNotification: async (customerId: string, title: string, body: string): Promise<boolean> => {
    console.info(`[NotificationService Stub] sendPushNotification - Pós-MVP`);
    return false;
  },

  listUnreadNotifications: async (customerId: string) => {
    return [];
  },
};
