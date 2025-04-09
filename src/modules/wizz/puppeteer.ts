import puppeteer, { Browser, Page } from 'puppeteer';

/**
 * Закрывает всплывающее окно с куками, если оно появилось
 * @param page Страница браузера
 * @returns true, если окно было закрыто, false - если окно не найдено
 */
async function handleCookiePopup(page: Page): Promise<boolean> {
  try {
    // Проверяем, появилось ли окно с куками
    const cookiePopupSelector = '#onetrust-banner-sdk';
    const hasCookiePopup = await page.$(cookiePopupSelector) !== null;

    if (!hasCookiePopup) {
        await page.waitForSelector(cookiePopupSelector, { visible: true, timeout: 60000 });
    }


    const removeCookiePopup = async () => {
        console.log('Обнаружено всплывающее окно с куками, закрываем...');
        
        // Находим кнопку "Принять все"
        const acceptButtonSelector = '#onetrust-accept-btn-handler';
        const acceptButton = await page.$(acceptButtonSelector);
        
        if (acceptButton) {
            // Нажимаем кнопку "Принять все"
            await acceptButton.click();
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log('Окно с куками успешно закрыто');
            return true;
        } else {
            console.log('Не удалось найти кнопку принятия куков');
        }
    }
    
    if (hasCookiePopup) {
      console.log('Обнаружено всплывающее окно с куками, закрываем...');
      
      await removeCookiePopup()
    } else {
        await page.waitForSelector(cookiePopupSelector, { visible: true, timeout: 60000 });
        await removeCookiePopup()
    }
    
    return false;
  } catch (error) {
    console.error('Ошибка при обработке всплывающего окна с куками:', error);
    return false;
  }
}

/**
 * Открывает сайт aviasales и заполняет форму поиска
 * @param origin Пункт отправления
 * @param destination Пункт назначения
 * @param date Дата вылета (DD.MM.YYYY)
 * @returns Объект с результатом операции
 */
export async function fillSearchForm(
  origin: string,
  destination: string,
  date: string
): Promise<{success: boolean, message: string}> {
  let browser: Browser | null = null;

  try {
    console.log(`Заполнение формы поиска: ${origin} -> ${destination}, дата: ${date}`);
    
    // Запускаем браузер
    browser = await puppeteer.launch({
      headless: false, // Для отладки используем видимый режим
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,768'],
      defaultViewport: { width: 1366, height: 768 }
    });

    // Открываем новую страницу
    const page = await browser.newPage();
    
    // Устанавливаем User-Agent как у обычного браузера
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36');
    
    // Открываем сайт
    console.log('Открываем страницу поиска...');
    await page.goto(`https://www.wizzair.com/ru-ru`, { waitUntil: 'networkidle2', timeout: 60000 });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    // Проверяем, нужно ли закрыть всплывающее окно с куками
    await handleCookiePopup(page);
    
    // Проверяем, что форма поиска загрузилась
    const formSelector = 'form[data-test="flights"]';
    await page.waitForSelector(formSelector, { visible: true, timeout: 30000 });

    console.log('Выбираем режим "В одну сторону"...');
    await page.click('input[data-test="oneway"]');
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log(`Заполняем поле "Пункт вылета": ${origin}`);
    await page.click('input[data-test="search-departure-station"]', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('input[data-test="search-departure-station"]', origin, { delay: 100 });
    
   // Ждем появления выпадающего списка с подсказками
   const suggestionSelector = '[data-test="locations-container"]';
   await page.waitForSelector(suggestionSelector, { visible: true, timeout: 10000 });
   
   // Выбираем первый вариант из списка
   await page.click(suggestionSelector);
   await new Promise(resolve => setTimeout(resolve, 1000));
   
   // Заполняем поле "Пункт назначения"
   console.log(`Заполняем поле "Пункт назначения": ${destination}`);
   await page.click('input[data-test="search-arrival-station"]', { clickCount: 3 });
   await page.keyboard.press('Backspace');
   await page.type('input[data-test="search-arrival-station"]', destination, { delay: 100 });

    // Ждем появления выпадающего списка с подсказками
    await page.waitForSelector(suggestionSelector, { visible: true, timeout: 10000 });

    // Выбираем первый вариант из списка
    await page.click(suggestionSelector);
    await new Promise(resolve => setTimeout(resolve, 1500));
   
   
    // Открываем календарь
    console.log('Открываем календарь...');
    await page.click('[data-test="date-inputs"] input');
    
    // Ждем появления календаря
    await page.waitForSelector('.vc-container', { visible: true, timeout: 20000 });
    
    // Преобразуем дату из формата DD.MM.YYYY в формат YYYY-MM-DD для поиска в календаре
    const [day, month, year] = date.split('.');
    const formattedDate = `${year}-${month}-${day}`;
    
    // Проверяем, есть ли эта дата в текущем видимом месяце
    console.log(`Выбираем дату: ${date} (${formattedDate})`);
    let dateSelector = `.id-${formattedDate} [role="button"]`;
    let dateElement = await page.$(dateSelector);

    // Если даты нет в текущем месяце, пробуем переключать месяцы
    const maxAttempts = 12; // Максимальное количество месяцев для просмотра
    let attempt = 0;
    
    while (!dateElement && attempt < maxAttempts) {
      // Нажимаем кнопку "Следующий месяц"
      console.log('Переключаемся на следующий месяц...');
      const nextMonthButton = await page.$('[data-test="calendar-page-forward"]');
      if (nextMonthButton) {
        await nextMonthButton.click();
        await new Promise(resolve => setTimeout(resolve, 400));
        dateElement = await page.$(dateSelector);
        attempt++;
      } else {
        break;
      }
    }
    
    if (!dateElement) {
      throw new Error(`Не удалось найти дату ${date} в календаре`);
    }
    
    // Выбираем дату
    await dateElement.click();
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // Нажимаем кнопку "Поиск"
    console.log('Нажимаем кнопку "Поиск"...');
    await page.click('button[data-test="flight-search-submit"]');
    
    // Ждем начала загрузки результатов
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log('Форма успешно заполнена и отправлена');


    
    
    // Оставляем браузер открытым для проверки результатов
    // Для реального использования нужно раскомментировать закрытие браузера
    // await browser.close();
    
    return {
      success: true,
      message: 'Форма успешно заполнена и отправлена'
    };
    
  } catch (error) {
    console.error('Ошибка при заполнении формы:', error);
    
    // Закрываем браузер в случае ошибки
    if (browser) {
      await browser.close();
    }
    
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}