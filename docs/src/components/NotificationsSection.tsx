import React, { useState, useEffect } from 'react';
import { TelegramService } from '../services/TelegramService';

interface Notification {
  id: number;
  created_at: string;
  title: string;
  message: string;
  is_read: boolean;
}

const NotificationsSection: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const telegram = TelegramService.getInstance();
  
  // Загрузка уведомлений при монтировании компонента
  useEffect(() => {
    fetchNotifications();
  }, []);
  
  // Получение уведомлений с сервера
  const fetchNotifications = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const userId = telegram.getUserId();
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/notifications/${userId}`);
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить уведомления');
      }
      
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Не удалось загрузить уведомления');
    } finally {
      setIsLoading(false);
    }
  };

  // Отметить уведомление как прочитанное
  const markAsRead = async (id: number) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/notifications/${id}/read`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setNotifications(notifications.map(notification => 
          notification.id === id ? { ...notification, is_read: true } : notification
        ));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      telegram.showPopup('Не удалось отметить уведомление как прочитанное');
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
  };

  return (
    <div className="section notifications-section">
      <h2>Астрологические напоминания</h2>
      
      {isLoading && (
        <div className="loading-indicator">Загрузка уведомлений...</div>
      )}
      
      {error && (
        <div className="error-message">{error}</div>
      )}
      
      {!isLoading && notifications.length === 0 ? (
        <p className="empty-state">У вас нет новых напоминаний</p>
      ) : (
        <div className="notifications-list">
          {notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="notification-header">
                <span className="notification-date">{formatDate(notification.created_at)}</span>
                <span className="notification-status">
                  {!notification.is_read && <span className="unread-badge">Новое</span>}
                </span>
              </div>
              <h3 className="notification-title">{notification.title}</h3>
              <p className="notification-message">{notification.message}</p>
              <div className="notification-actions">
                <button 
                  className="secondary-button small"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchNotifications(); // Обновляем список вместо удаления
                  }}
                >
                  Обновить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsSection;
