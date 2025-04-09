import { Page } from "puppeteer";

export async function handleCookiesAndPopups(page: Page): Promise<void> {
    try {
      // Ожидаем появления окна с куками с большим таймаутом
      await page.waitForSelector('#onetrust-banner-sdk', { 
        visible: true, 
        timeout: 30000 
      });
  
      // Функция для поиска и клика по кнопке принятия кук
      const acceptCookies = async () => {
        const cookieButtons = [
          '#onetrust-accept-btn-handler',
          '[data-test="cookie-accept"]',
          '.onetrust-close-btn-handler',
          'button[aria-label="Accept all cookies"]'
        ];
  
        for (const selector of cookieButtons) {
          try {
            // Ожидаем появления кнопки
            await page.waitForSelector(selector, { 
              visible: true, 
              timeout: 5000 
            });
  
            // Получаем элемент
            const button = await page.$(selector);
            
            if (button) {
              // Скролл к кнопке
              await page.evaluate((el) => {
                el.scrollIntoView({ block: 'center' });
              }, button);
  
              // Клик с небольшой задержкой
              await new Promise(resolve => setTimeout(resolve, 500));
              
              await button.click();
  
              // Ожидаем исчезновения баннера
              await page.waitForSelector('#onetrust-banner-sdk', { 
                hidden: true, 
                timeout: 5000 
              });
  
              console.log(`Куки успешно приняты через селектор: ${selector}`);
              return true;
            }
          } catch (error) {
            console.warn(`Не удалось обработать селектор ${selector}:`, error);
          }
        }
        return false;
      };
  
      // Пытаемся принять куки
      const cookiesAccepted = await acceptCookies();
  
      if (!cookiesAccepted) {
        // Резервный метод через JavaScript
        await page.evaluate(() => {
          const banner = document.querySelector('#onetrust-banner-sdk');
          if (banner) {
            const acceptButton = banner.querySelector('#onetrust-accept-btn-handler');
            if (acceptButton) {
              (acceptButton as HTMLElement).click();
            }
          }
        });
  
        // Ожидаем исчезновения баннера
        await page.waitForSelector('#onetrust-banner-sdk', { 
          hidden: true, 
          timeout: 5000 
        });
      }
  
      console.log('Обработка кук завершена');
    } catch (error) {
      console.warn('Ошибка при обработке кук:', error);
      
      // В случае неудачи пытаемся продолжить
      try {
        // Принудительное закрытие через JavaScript
        await page.evaluate(() => {
          const banners = [
            '#onetrust-banner-sdk',
            '.cookie-consent-banner'
          ];
          
          banners.forEach(selector => {
            const banner = document.querySelector(selector);
            if (banner) {
              banner.remove();
            }
          });
        });
      } catch (removeError) {
        console.error('Не удалось принудительно удалить баннер:', removeError);
      }
    }
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