import React, { useState, useEffect } from 'react';
import { TelegramService } from '../services/TelegramService';

interface ProfileSectionProps {
  userData: any;
  onUserDataUpdate: (data: any) => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ userData, onUserDataUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [zodiacSign, setZodiacSign] = useState('');
  const [numerologyNumber, setNumerologyNumber] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [badges, setBadges] = useState<any[]>([]);

  const telegram = TelegramService.getInstance();

  useEffect(() => {
    if (userData) {
      setName(userData.first_name || '');
      setBirthday(userData.birthday || '');
      setZodiacSign(userData.zodiac_sign || '');
      setNumerologyNumber(userData.numerology_number || '');
      setPhoto(userData.photo_url || null);
      setBadges(userData.badges || []);
    }
  }, [userData]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      
      // Создаем превью фото
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          setPhoto(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateZodiacSign = (birthdate: string): string => {
    if (!birthdate) return '';
    
    const date = new Date(birthdate);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Овен';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Телец';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Близнецы';
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Рак';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Лев';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Дева';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Весы';
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Скорпион';
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Стрелец';
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Козерог';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Водолей';
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'Рыбы';
    
    return '';
  };

  const calculateNumerologyNumber = (birthdate: string): string => {
    if (!birthdate) return '';
    
    const date = new Date(birthdate);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    // Суммируем все цифры даты рождения
    const sumDigits = (num: number): number => {
      return num.toString().split('').reduce((sum, digit) => sum + parseInt(digit), 0);
    };
    
    let sum = sumDigits(day) + sumDigits(month) + sumDigits(year);
    
    // Если сумма больше 9, суммируем цифры результата
    while (sum > 9) {
      sum = sumDigits(sum);
    }
    
    return sum.toString();
  };

  const handleBirthdayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBirthday = e.target.value;
    setBirthday(newBirthday);
    
    // Автоматически рассчитываем знак зодиака и нумерологическое число
    if (newBirthday) {
      const newZodiacSign = calculateZodiacSign(newBirthday);
      const newNumerologyNumber = calculateNumerologyNumber(newBirthday);
      
      setZodiacSign(newZodiacSign);
      setNumerologyNumber(newNumerologyNumber);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    telegram.showLoader();
    
    try {
      const userId = telegram.getUserId();
      
      // Сначала обновляем основные данные пользователя
      const userData = {
        user_id: userId,
        first_name: name,
        birthday: birthday,
        zodiac_sign: zodiacSign,
        numerology_number: numerologyNumber
      };
      
      // Отправляем основные данные пользователя
      const userResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData),
      });
      
      if (!userResponse.ok) {
        throw new Error('Ошибка при обновлении данных пользователя');
      }
      
      // Если есть новая фотография, загружаем её отдельным запросом
      let photoUrl = photo;
      if (photoFile) {
        const formData = new FormData();
        formData.append('user_id', userId.toString());
        formData.append('file', photoFile);
        
        const photoResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/upload/profile_photo`, {
          method: 'POST',
          body: formData,
        });
        
        if (photoResponse.ok) {
          const photoData = await photoResponse.json();
          photoUrl = photoData.photo_url;
        } else {
          console.error('Error uploading photo');
        }
      }
      
      // Получаем обновленные данные пользователя
      const getUserResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/users/${userId}`, {
        method: 'GET'
      });
      
      if (getUserResponse.ok) {
        const updatedUser = await getUserResponse.json();
        onUserDataUpdate(updatedUser);
        telegram.showPopup('Профиль успешно обновлен!');
        setIsEditing(false);
      } else {
        telegram.showPopup('Профиль обновлен, но не удалось получить обновленные данные.');
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      telegram.showPopup('Произошла ошибка при сохранении данных.');
    } finally {
      setIsLoading(false);
      telegram.hideLoader();
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    telegram.showMainButton('Сохранить');
    telegram.onMainButtonClick(handleSave);
  };

  const handleCancel = () => {
    // Восстанавливаем исходные данные
    if (userData) {
      setName(userData.first_name || '');
      setBirthday(userData.birthday || '');
      setZodiacSign(userData.zodiac_sign || '');
      setNumerologyNumber(userData.numerology_number || '');
      setPhoto(userData.photo_url || null);
    }
    
    setIsEditing(false);
    telegram.hideMainButton();
  };

  useEffect(() => {
    if (isEditing) {
      telegram.showMainButton('Сохранить');
      telegram.onMainButtonClick(handleSave);
    } else {
      telegram.hideMainButton();
    }
    
    return () => {
      telegram.hideMainButton();
    };
  }, [isEditing, name, birthday, zodiacSign, numerologyNumber, photoFile]);

  return (
    <div className="profile-section">
      <h1>Мой профиль</h1>
      
      <div className="profile-photo-container">
        {photo ? (
          <img src={photo} alt="Фото профиля" className="profile-photo" />
        ) : (
          <div className="profile-photo-placeholder">
            <span>👤</span>
          </div>
        )}
        
        {isEditing && (
          <div className="photo-upload">
            <label htmlFor="photo-upload" className="photo-upload-label">
              Изменить фото
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="photo-upload-input"
            />
          </div>
        )}
      </div>
      
      <div className="profile-info">
        <div className="profile-field">
          <label>Имя:</label>
          {isEditing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите ваше имя"
            />
          ) : (
            <span>{name || 'Не указано'}</span>
          )}
        </div>
        
        <div className="profile-field">
          <label>Дата рождения:</label>
          {isEditing ? (
            <input
              type="date"
              value={birthday}
              onChange={handleBirthdayChange}
              placeholder="Выберите дату рождения"
            />
          ) : (
            <span>{birthday ? new Date(birthday).toLocaleDateString() : 'Не указана'}</span>
          )}
        </div>
        
        <div className="profile-field">
          <label>Знак зодиака:</label>
          <span>{zodiacSign || 'Не определен'}</span>
        </div>
        
        <div className="profile-field">
          <label>Нумерологическое число:</label>
          <span>{numerologyNumber || 'Не определено'}</span>
        </div>
      </div>
      
      {badges && badges.length > 0 && (
        <div className="profile-badges">
          <h2>Мои достижения</h2>
          <div className="badges-container">
            {badges.map((badge, index) => (
              <div key={index} className="badge-item">
                <div className="badge-icon">{badge.icon}</div>
                <div className="badge-info">
                  <div className="badge-name">{badge.name}</div>
                  <div className="badge-description">{badge.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {!isEditing ? (
        <button className="edit-button" onClick={handleEdit}>
          Редактировать профиль
        </button>
      ) : (
        <button className="cancel-button" onClick={handleCancel}>
          Отмена
        </button>
      )}
    </div>
  );
};

export default ProfileSection;
