import { Request, Response } from 'express';
import {  getFlightsFromTimetable } from './modules/wizz';

/**
 * Маршрут для тестирования заполнения формы поиска билетов
 */
export const testRoute = async (req: Request, res: Response) => {
  try {
    const result = await getFlightsFromTimetable('EVN', 'ROM', '2025-06-18');
    
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
