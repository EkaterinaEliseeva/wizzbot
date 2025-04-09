import puppeteer, { Browser, Page } from 'puppeteer';
import { handleCookiesAndPopups } from './handle-cookies';

// Функция для получения случайного User-Agent
function getRandomUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Расширенная стратегия обхода защиты
async function bypassCaptchaAndTracking(page: Page): Promise<void> {
    // Отключение WebDriver
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
    });
  
    // Удаление признаков автоматизации
    await page.evaluateOnNewDocument(() => {
      // @ts-ignore
      window.chrome = {
        runtime: {}
      };
      Object.defineProperty(navigator, 'languages', {
        get: () => ['ru-RU', 'ru', 'en-US', 'en']
      });
    });
  
    // Настройка дополнительных параметров для имитации реального браузера
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });
  }


// Симуляция человеческого ввода
async function simulateHumanInput(page: Page, selector: string, text: string): Promise<void> {
  await page.waitForSelector(selector, { visible: true });
  await page.focus(selector);
  await page.click(selector, { clickCount: 3 });
  await page.keyboard.press('Backspace');
  
  // Имитация печати с задержками и возможными опечатками
  for (let char of text) {
    await page.keyboard.type(char, { 
      delay: 50 + Math.random() * 100 
    });
    
    // Случайные опечатки
    if (Math.random() < 0.05) {
      await page.keyboard.type(String.fromCharCode(char.charCodeAt(0) + 1));
      await page.keyboard.press('Backspace');
    }
  }

  // Выбор первого варианта из списка с повторными попытками
  const locationSelectors = [
    '[data-test="locations-container"]',
    '.location-suggestion',
    '.autocomplete-dropdown'
  ];

  for (const locSelector of locationSelectors) {
    try {
      await page.waitForSelector(locSelector, { visible: true, timeout: 5000 });
      await page.click(locSelector);
      break;
    } catch {
      console.warn(`Не удалось найти селектор ${locSelector}`);
    }
  }
}

// Выбор даты с навигацией по месяцам
async function selectDateWithNavigation(page: Page, formattedDate: string): Promise<void> {
  const maxAttempts = 12;
  let attempt = 0;
  let dateFound = false;

  while (!dateFound && attempt < maxAttempts) {
    const dateSelector = `.id-${formattedDate} [role="button"]`;
    const dateElement = await page.$(dateSelector);

    if (dateElement) {
      await dateElement.click();
      dateFound = true;
    } else {
      // Переход к следующему месяцу
      const nextMonthButton = await page.$('[data-test="calendar-page-forward"]');
      if (nextMonthButton) {
        await nextMonthButton.click();
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      }
      attempt++;
    }
  }

  if (!dateFound) {
    throw new Error(`Не удалось найти дату ${formattedDate} в календаре`);
  }
}

// Открытие сайта и заполнение формы
export async function fillSearchForm(
  origin: string,
  destination: string,
  date: string
): Promise<{success: boolean, message: string}> {
  let browser: Browser | null = null;

  try {
    // Параметры запуска браузера с расширенной маскировкой
    const launchOptions = {
      headless: false,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1366,768',
        // Дополнительные опции для стабильности
        '--disable-gpu',
        '--no-first-run',
        '--disable-extensions',
        '--mute-audio',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync'
      ],
      defaultViewport: { width: 1366, height: 768 },
      ignoreHTTPSErrors: true,
      protocolTimeout: 90000 // Увеличиваем время ожидания
    };

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // Случайный User-Agent
    const userAgent = getRandomUserAgent();
    await page.setUserAgent(userAgent);

    // Расширенный обход защиты
    await bypassCaptchaAndTracking(page);

    // Установка обработчиков ошибок
    page.on('pageerror', (err) => {
      console.error('Ошибка страницы:', err);
    });

    page.on('requestfailed', (request) => {
      console.warn(`Не удалось загрузить ресурс: ${request.url()}. Ошибка: ${request.failure()?.errorText}`);
    });

    // Навигация с расширенными опциями и обработкой ошибок
    try {
      await page.goto('https://www.wizzair.com/ru-ru', { 
        waitUntil: 'networkidle2', 
        timeout: 90000,
        referer: 'https://www.google.com'
      });
    } catch (navigationError) {
      console.error('Ошибка навигации:', navigationError);
      
      // Попытка альтернативной навигации
      try {
        await page.goto('https://www.wizzair.com/ru-ru', { 
          waitUntil: 'domcontentloaded', 
          timeout: 90000
        });
      } catch (fallbackError) {
        throw new Error(`Не удалось загрузить страницу: ${fallbackError}`);
      }
    }

    // Обработка кук и всплывающих окон
    await handleCookiesAndPopups(page);

    // Перехват и логирование запросов
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      request.continue();
    });

    page.on('response', async (response) => {
      if (response.status() === 429) {
        console.warn(`Получен 429 статус для ${response.url()}`);
      }
    });

    // Проверка загрузки страницы
    await page.waitForSelector('input[data-test="oneway"]', { 
      visible: true, 
      timeout: 30000 
    });

    // Выбор режима "В одну сторону"
    await page.evaluate(() => {
      const oneWayRadio = document.querySelector('input[data-test="oneway"]') as HTMLInputElement;
      if (oneWayRadio) oneWayRadio.click();
    });

    // Случайные паузы между действиями
    const randomDelay = (min = 500, max = 2000) => 
      new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));
    
    await randomDelay();

    // Заполнение полей с имитацией человеческого ввода
    await simulateHumanInput(page, 'input[data-test="search-departure-station"]', origin);
    await randomDelay();
    await simulateHumanInput(page, 'input[data-test="search-arrival-station"]', destination);
    await randomDelay();

    // Открытие и выбор даты
    await page.click('[data-test="date-inputs"] input');
    await randomDelay();

    // Выбор даты с перелистыванием месяцев
    const [day, month, year] = date.split('.');
    const formattedDate = `${year}-${month}-${day}`;
    await selectDateWithNavigation(page, formattedDate);

    // Финальный поиск
    await randomDelay();
    await page.click('button[data-test="flight-search-submit"]');
  
    // Ожидание результатов с большим таймаутом и обработкой ошибок
    try {
      await page.waitForNavigation({ 
        waitUntil: 'networkidle2', 
        timeout: 90000 
      });
    } catch (navError) {
      console.warn('Ошибка при ожидании навигации:', navError);
    
      // Попытка альтернативного ожидания
      await page.waitForSelector('.search-results', { 
        visible: true, 
        timeout: 60000 
      });
    }

    return {
      success: true,
      message: 'Форма успешно заполнена и отправлена'
    };

  } catch (error) {
    console.error('Критическая ошибка при заполнении формы:', error);
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Ошибка при закрытии браузера:', closeError);
      }
    }
    
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}