import puppeteer from 'puppeteer';

/**
 * Получает цену на билеты Wizzair с помощью Puppeteer
 * @param origin Код аэропорта отправления (IATA)
 * @param destination Код аэропорта назначения (IATA)
 * @param date Дата вылета в формате YYYY-MM-DD
 * @returns Объект с минимальной ценой и валютой или null
 */
export async function checkWizzairPriceWithPuppeteer(
  origin: string,
  destination: string,
  date: string
): Promise<{ price: number; currency: string } | null> {
  let browser = null;
  
  try {
    // Запускаем браузер в режиме headless
    browser = await puppeteer.launch({
      headless: true, // Новый headless режим, более стабильный
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    // Открываем новую страницу
    const page = await browser.newPage();
    
    // Устанавливаем User-Agent как у обычного браузера
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36');
    
    // Устанавливаем языковые настройки
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8,ru-RU;q=0.7'
    });
    
    // Формируем URL для прямого перехода на страницу поиска
    const url = `https://wizzair.com/ru-ru/booking/select-flight/${origin}/${destination}/${date}/null/1/0/0/null`;
    
    console.log(`Открываем страницу: ${url}`);
    
    // Открываем страницу
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Ждем загрузки данных о рейсах или сообщения об их отсутствии
    await page.waitForSelector('.flight-select__flight-list', { timeout: 60000 });
    
    // Проверяем, есть ли сообщение об отсутствии рейсов
    const noFlightsElement = await page.$('.rf-fares__no-flights-message');
    if (noFlightsElement) {
      console.log(`Рейсы по направлению ${origin}-${destination} на дату ${date} не найдены`);
      return null;
    }
    
    // Собираем все цены с помощью JavaScript
    const priceInfo = await page.evaluate(() => {
      // Функция для получения всех цен
      function extractPrices() {
        const priceElements = document.querySelectorAll('[data-test="price"] .current-price');
        const prices: number[] = [];
        let currency = '';

        console.log(priceElements)
        
        priceElements.forEach(el => {
          const priceText = el.textContent || '';
          // Извлекаем число из строки с ценой (например, "12 345 ₽")
          const priceMatch = priceText.match(/(\d[\d\s]*[.,]?\d*)/);
          const currencyMatch = priceText.match(/([€$₽£]|EUR|USD|RUB)/);
          
          if (priceMatch && priceMatch[1]) {
            // Преобразуем строку цены в число
            const price = parseFloat(priceMatch[1].replace(/\s/g, '').replace(',', '.'));
            prices.push(price);
          }
          
          if (currencyMatch && currencyMatch[1] && !currency) {
            currency = currencyMatch[1];
            // Преобразуем символы валют в коды
            if (currency === '€') currency = 'EUR';
            if (currency === '$') currency = 'USD';
            if (currency === '₽') currency = 'RUB';
            if (currency === '£') currency = 'GBP';
          }
        });
        
        return { prices, currency };
      }
      
      const { prices, currency } = extractPrices();
      
      if (prices.length === 0) {
        return null;
      }
      
      // Находим минимальную цену
      const minPrice = Math.min(...prices);
      
      return {
        price: minPrice,
        currency: currency
      };
    });
    
    if (!priceInfo) {
      console.log(`Не удалось найти цены для рейсов ${origin}-${destination} на дату ${date}`);
      return null;
    }
    
    return priceInfo;
  } catch (error) {
    console.error('Ошибка при получении данных с помощью Puppeteer:', 
      error instanceof Error ? error.message : String(error)
    );
    return null;
  } finally {
    // Закрываем браузер
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Проверяет цены на авиабилеты в диапазоне дат с помощью Puppeteer
 * @param origin Код аэропорта отправления (IATA)
 * @param destination Код аэропорта назначения (IATA)
 * @param startDate Начальная дата диапазона (YYYY-MM-DD)
 * @param endDate Конечная дата диапазона (YYYY-MM-DD)
 * @returns Объект с минимальной ценой и соответствующей датой или null
 */
export async function checkWizzairPriceRangeWithPuppeteer(
  origin: string,
  destination: string,
  startDate: string,
  endDate: string
): Promise<{ price: number; currency: string; date: string } | null> {
  try {
    // Преобразуем строковые даты в объекты Date
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Получаем массив дат между startDate и endDate
    const dates: string[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    // Ограничиваем количество дат для проверки
    let datesToCheck = dates;
    const MAX_DAYS_TO_CHECK = 5; // Меньше дней для Puppeteer, так как он медленнее
    
    if (dates.length > MAX_DAYS_TO_CHECK) {
      console.log(`Диапазон содержит ${dates.length} дней, выбираем ${MAX_DAYS_TO_CHECK} для проверки`);
      datesToCheck = [];
      const step = Math.floor(dates.length / MAX_DAYS_TO_CHECK);
      
      for (let i = 0; i < dates.length; i += step) {
        datesToCheck.push(dates[i]);
        if (datesToCheck.length >= MAX_DAYS_TO_CHECK) break;
      }
      
      // Убедимся, что последняя дата диапазона включена
      if (datesToCheck[datesToCheck.length - 1] !== dates[dates.length - 1]) {
        datesToCheck.push(dates[dates.length - 1]);
      }
    }

    // Проверяем цены для каждой даты
    let minPrice = Number.MAX_SAFE_INTEGER;
    let bestDate = '';
    let currency = '';

    for (const date of datesToCheck) {
      const result = await checkWizzairPriceWithPuppeteer(origin, destination, date);
      
      if (result && result.price < minPrice) {
        minPrice = result.price;
        currency = result.currency;
        bestDate = date;
      }
    }

    if (minPrice === Number.MAX_SAFE_INTEGER) {
      return null;
    }

    // Преобразуем дату из формата YYYY-MM-DD в формат DD.MM.YYYY
    const [year, month, day] = bestDate.split('-');
    const formattedDate = `${day}.${month}.${year}`;

    return {
      price: minPrice,
      currency: currency,
      date: formattedDate
    };
  } catch (error) {
    console.error('Ошибка при проверке цен в диапазоне дат с Puppeteer:', 
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}