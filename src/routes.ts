import { Request, Response } from 'express';
import { fillSearchForm } from './modules/wizz';

/**
 * Маршрут для тестирования заполнения формы поиска билетов
 */
export const testFormFillRoute = async (req: Request, res: Response) => {
  try {
    // Получаем параметры из запроса
    const origin = req.query.origin as string || 'Ереван';
    const destination = req.query.destination as string || 'Рим';
    const date = req.query.date as string || '18.06.2025';
    
    console.log(`Запрос на заполнение формы: ${origin} -> ${destination}, дата: ${date}`);
    
    // Вызываем функцию заполнения формы
    const result = await fillSearchForm(origin, destination, date);
    
    // Отправляем результат
    res.json({
      success: result.success,
      message: result.message,
      parameters: {
        origin,
        destination,
        date
      }
    });
  } catch (error) {
    // Отправляем информацию об ошибке
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера',
      error: error instanceof Error ? error.message : String(error)
    });
  }
  }