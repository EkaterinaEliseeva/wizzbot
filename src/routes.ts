import { Request, Response } from 'express';
import { checkFlightPriceRange } from './modules/price-checker';

/**
 * Маршрут для тестирования заполнения формы поиска билетов
 */
export const testRoute = async (req: Request, res: Response) => {
  try {
    const result = await checkFlightPriceRange('Ереван', 'Рим', '2025-06-18', '2025-06-25');
    
    console.log(result)
  } catch (error) {
    // Отправляем информацию об ошибке
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера',
      error: error instanceof Error ? error.message : String(error)
    });
  }
  }
