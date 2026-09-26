// GET /me/notifications: the latest 50 notifications and the unread count.

export interface AppNotification {
  id: number;
  userId: number;
  title: string;
  body: string | null;
  /** lead, review, review_reply, subscription, listing, support, ... */
  type: string;
  isRead: boolean;
  dataJson: unknown;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unread: number;
}
