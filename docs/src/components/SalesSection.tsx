import React, { useState, useEffect } from 'react';
import { TelegramService } from '../services/TelegramService';

interface Sale {
  id: number;
  date: string;
  product: string;
  amount: number;
  epk: string;
}

const SalesSection: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Состояния для новой продажи
  const [newProduct, setNewProduct] = useState<string>('');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newEpkId, setNewEpkId] = useState<string>('');
  const [showSaleForm, setShowSaleForm] = useState<boolean>(false);
  
  const telegram = TelegramService.getInstance();
  
  // Загрузка продаж при монтировании компонента
  useEffect(() => {
    fetchSales();
  }, []);
  
  // Получение продаж с сервера
  const fetchSales = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const userId = telegram.getUserId();
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/sales/${userId}`);
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить данные о продажах');
      }
      
      const data = await response.json();
      setSales(data.sales || []);
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError('Не удалось загрузить данные о продажах');
    } finally {
      setIsLoading(false);
    }
  };

  // Добавление новой продажи
  const addNewSale = async () => {
    if (!newProduct || !newAmount || !newEpkId) {
      telegram.showPopup('Пожалуйста, заполните все поля');
      return;
    }
    
    if (!/^\d+$/.test(newEpkId)) {
      telegram.showPopup('EPK_ID должен содержать только цифры');
      return;
    }
    
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      telegram.showPopup('Сумма должна быть положительным числом');
      return;
    }
    
    setIsLoading(true);
    telegram.showLoader();
    
    try {
      const userId = telegram.getUserId();
      
      const saleData = {
        user_id: userId,
        product: newProduct,
        amount: amount,
        epk: newEpkId
      };
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(saleData)
      });
      
      if (!response.ok) {
        throw new Error('Не удалось сохранить продажу');
      }
      
      // Обновляем список продаж
      await fetchSales();
      
      telegram.showPopup('Продажа успешно добавлена!');
      setNewProduct('');
      setNewAmount('');
      setNewEpkId('');
      setShowSaleForm(false);
    } catch (err) {
      console.error('Error adding sale:', err);
      telegram.showPopup('Произошла ошибка при сохранении продажи');
    } finally {
      setIsLoading(false);
      telegram.hideLoader();
    }
  };

  return (
    <div className="section sales-section">
      <h2>Мои продажи</h2>
      
      {isLoading && !showSaleForm && (
        <div className="loading-indicator">Загрузка данных...</div>
      )}
      
      {error && (
        <div className="error-message">{error}</div>
      )}
      
      {!showSaleForm ? (
        <button className="primary-button" onClick={() => setShowSaleForm(true)}>
          Добавить новую сделку
        </button>
      ) : (
        <div className="sale-form">
          <h3>Новая сделка</h3>
          
          <div className="input-group">
            <label>Продукт:</label>
            <input 
              type="text" 
              value={newProduct} 
              onChange={(e) => setNewProduct(e.target.value)} 
              placeholder="Название продукта"
            />
          </div>
          
          <div className="input-group">
            <label>Сумма (руб.):</label>
            <input 
              type="text" 
              value={newAmount} 
              onChange={(e) => setNewAmount(e.target.value)} 
              placeholder="Сумма сделки"
            />
          </div>
          
          <div className="input-group">
            <label>EPK_ID клиента:</label>
            <input 
              type="text" 
              value={newEpkId} 
              onChange={(e) => setNewEpkId(e.target.value)} 
              placeholder="Только цифры"
            />
          </div>
          
          <div className="button-group">
            <button className="primary-button" onClick={addNewSale}>Сохранить</button>
            <button className="secondary-button" onClick={() => setShowSaleForm(false)}>Отмена</button>
          </div>
        </div>
      )}
      
      <div className="sales-list">
        <h3>История сделок</h3>
        {sales.length === 0 ? (
          <p>У вас пока нет сохраненных сделок</p>
        ) : (
          sales.map(sale => (
            <div key={sale.id} className="sale-item">
              <div className="sale-header">
                <span className="sale-date">{sale.date}</span>
                <span className="sale-amount">{sale.amount.toLocaleString()} руб.</span>
              </div>
              <div className="sale-details">
                <p><strong>Продукт:</strong> {sale.product}</p>
                <p><strong>EPK_ID:</strong> {sale.epkId}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SalesSection;
