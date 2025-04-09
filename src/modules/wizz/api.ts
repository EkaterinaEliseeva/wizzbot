import puppeteer from 'puppeteer';
import axios from 'axios';
import { IWizzairSearchParams, IWizzairSearchResponse } from './types';

/**
 * Получает сессию и данные для аутентификации из Wizzair с отслеживанием конкретных запросов
 * @param targetOrigin Код IATA аэропорта отправления для тестового запроса
 * @param targetDestination Код IATA аэропорта назначения для тестового запроса
 * @returns Объект с cookies и headers для использования в API запросах
 */
export async function getWizzairSearchHeaders(
  targetOrigin: string = 'EVN',
  targetDestination: string = 'ROM'
): Promise<{
  cookies: string;
  headers: Record<string, string>;
}> {
  let browser = null;
  
  try {
    // Запускаем браузер в headless режиме
    browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ],
    });
    
    const page = await browser.newPage();
    
    // Устанавливаем реалистичный User-Agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
    );
    
    // Объект для хранения перехваченных заголовков конкретно от запроса к search API
    let searchRequestHeaders: Record<string, string> = {};
    let searchRequestCaptured = false;
    
    // Перехватываем все запросы к API для сбора заголовков
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = request.url();
      
      // Ищем конкретно запрос к API поиска билетов
      if (url.includes('be.wizzair.com') && url.includes('/Api/search/search')) {
        // Сохраняем заголовки запроса к API поиска
        searchRequestHeaders = request.headers();
        searchRequestCaptured = true;
        console.log('Перехвачен запрос к API поиска:', url);
        console.log('Заголовки поиска:', JSON.stringify(searchRequestHeaders, null, 2));
      }
      
      request.continue();
    });
    
    // Выбираем текущую дату + 30 дней для тестового запроса
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 30);
    const year = testDate.getFullYear();
    const month = String(testDate.getMonth() + 1).padStart(2, '0');
    const day = String(testDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Открываем страницу поиска билетов для активации API
    const searchUrl = `https://www.wizzair.com/ru-ru/booking/select-flight/${targetOrigin}/${targetDestination}/${dateStr}/null/1/0/0/null`;
    
    console.log(`Открываем страницу поиска билетов: ${searchUrl}`);
    await page.goto(searchUrl, { 
      waitUntil: 'networkidle2', 
      timeout: 90000 
    });
    
    // Дополнительное ожидание, чтобы дать время для выполнения запроса к API
    await new Promise(resolve => setTimeout(resolve, 5000));

    
    // Собираем cookies
    const cookies = await page.cookies();
    const cookieString = cookies
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');
    
    // Если не удалось перехватить заголовки, создаем базовые и добавляем информацию из страницы
    if (!searchRequestCaptured || Object.keys(searchRequestHeaders).length === 0) {
      console.log('Не удалось перехватить заголовки API поиска. Пытаемся получить необходимые данные со страницы...');
      
      // Пытаемся получить verification token из страницы
      const verificationToken = await page.evaluate(() => {
        // Сначала пробуем найти через скрытое поле формы
        const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');
        if (tokenInput) return (tokenInput as HTMLInputElement).value;
        
        // Затем пробуем найти через meta тег
        const metaToken = document.querySelector('meta[name="RequestVerificationToken"]');
        if (metaToken) return metaToken.getAttribute('content');
        
        // Попробуем поискать в localStore
        const localToken = localStorage.getItem('RequestVerificationToken');
        if (localToken) return localToken;
        
        // Наконец, попробуем извлечь токен из всех скриптов на странице
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const content = script.textContent || '';
          const tokenMatch = content.match(/"RequestVerificationToken"\s*:\s*"([^"]+)"/);
          if (tokenMatch && tokenMatch[1]) return tokenMatch[1];
        }
        
        return '';
      });
      
      // Пытаемся получить kpsdk токены
      const kpsdkTokens = await page.evaluate(() => {
        // Поиск в localStorage
        try {
          const kpsdkCt = localStorage.getItem('kpsdk-ct');
          const kpsdkCd = localStorage.getItem('kpsdk-cd');
          
          return { 
            ct: kpsdkCt, 
            cd: kpsdkCd 
          };
        } catch (e) {
          return { ct: null, cd: null };
        }
      });
      
      searchRequestHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8,ru-RU;q=0.7',
        'Origin': 'https://www.wizzair.com',
        'Referer': searchUrl,
        'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site'
      };
      
      if (verificationToken) {
        console.log('Найден verification token:', verificationToken);
        searchRequestHeaders['x-requestverificationtoken'] = verificationToken;
      }
      
      if (kpsdkTokens.ct) {
        console.log('Найден kpsdk-ct token');
        searchRequestHeaders['x-kpsdk-ct'] = kpsdkTokens.ct;
      }
      
      if (kpsdkTokens.cd) {
        console.log('Найден kpsdk-cd token');
        searchRequestHeaders['x-kpsdk-cd'] = kpsdkTokens.cd;
      }
      
      searchRequestHeaders['x-kpsdk-v'] = 'j-1.0.0'; // Стандартная версия kpsdk
    }
    
    // Удаляем заголовки, которые не нужно отправлять
    delete searchRequestHeaders['content-length'];
    delete searchRequestHeaders['host'];
    
    console.log('Полученные cookies:', cookieString.substring(0, 100) + '...');
    console.log('Полученные заголовки поиска:', Object.keys(searchRequestHeaders).join(', '));
    
    return {
      cookies: cookieString,
      headers: searchRequestHeaders
    };
  } catch (error) {
    console.error('Ошибка при получении заголовков Wizzair:', 
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  } finally {
    // Закрываем браузер
    if (browser) {
      await browser.close();
    }
  }
}

export async function checkWizzairPrice(
    origin: string,
    destination: string,
    date: string
  ): Promise<IWizzairSearchResponse | null> {
    try {
      // Получаем сессионные данные с фокусом на API поиска
      const session = await getWizzairSearchHeaders(origin, destination);
      
      const requestData: IWizzairSearchParams = {
        isRescueFare: false,
        adultCount: 1,
        childCount: 0,
        dayInterval: 7,
        wdc: false,
        isFlightChange: false,
        flightList: [{
          departureStation: origin,
          arrivalStation: destination,
          date: date
        }]
      };
  
      console.log(`Отправляем запрос к Wizzair API для ${origin}-${destination} на дату ${date} с точными заголовками поиска`);
      
      // Создаем Referer URL
      const refererUrl = `https://www.wizzair.com/ru-ru/booking/select-flight/${origin}/${destination}/${date}/null/1/0/0/null`;
      
      // Обновляем Referer в заголовках
      if (session.headers['Referer']) {
        session.headers['Referer'] = refererUrl;
      } else if (session.headers['referer']) {
        session.headers['referer'] = refererUrl;
      } else {
        session.headers['Referer'] = refererUrl;
      }
      
      // Отправляем запрос с полученными cookies и headers
      const response = await axios.post<IWizzairSearchResponse>(
        'https://be.wizzair.com/27.6.0/Api/search/search',
        requestData,
        {
          headers: {
            ...session.headers,
            'Cookie': session.cookies
          },
        }
      );
  
      // Проверяем, есть ли в ответе информация о рейсах
      if (!response.data.outboundFlights || response.data.outboundFlights.length === 0) {
        console.log(`Рейсы по направлению ${origin}-${destination} на дату ${date} не найдены`);
        return null;
      }
  
        return response.data
    } catch (error) {
      console.error('Ошибка при получении данных из Wizzair API с точными заголовками:', 
        error instanceof Error ? error.message : String(error)
      );
      if (axios.isAxiosError(error) && error.response) {
        console.error('Статус ответа:', error.response.status);
        console.error('Данные ответа:', error.response.data);
        
        // Если получаем ошибку 429 (too many requests), возвращаем специальную ошибку
        if (error.response.status === 429) {
          console.error('Получено ограничение запросов (429). Необходимо добавить задержку между запросами.');
        }
      }
      return null;
    }
  }