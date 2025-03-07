const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const readline = require('readline');

puppeteer.use(StealthPlugin()); // Stealth 플러그인 사용

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('input url: ', async (url) => {
    rl.close();

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    let page = await browser.newPage();

    // User-Agent 설정
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36');

    const actions = JSON.parse(fs.readFileSync('actions.json', 'utf8'));

    console.log(`Navigating to: ${url}`);
    await page.goto(url);

    console.log('Replaying user actions...');

    browser.on('targetcreated', async (target) => {
        if (target.type() === 'page') {
            const newPage = await target.page();
            if (newPage) {
                page = newPage; // 새 창/탭으로 포커스 변경
                console.log('New tab detected, switching focus...');
                await page.bringToFront();
            }
        }
    });

    for (const action of actions) {
        if (action.type === 'click') {
            console.log(`Replaying click: (${action.x}, ${action.y})`);
            await page.mouse.click(action.x, action.y, { delay: Math.random() * 200 });
        } else if (action.type === 'input') {
            console.log(`Replaying input: ${action.selector} -> ${action.value}`);
            await page.evaluate((selector, value) => {
                const inputField = document.querySelector(`[name="${selector}"], [id="${selector}"]`);
                if (inputField) {
                    inputField.value = value;
                    inputField.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }, action.selector, action.value);
        } else if (action.type === 'keypress' && action.key === 'Enter') {
            console.log(`Replaying key press: ${action.key}`);
            await page.keyboard.press('Enter');
        } else if (action.type === 'scroll') {
            console.log(`Replaying scroll to Y=${action.scrollY}`);
            await page.evaluate((scrollY) => {
                window.scrollTo({ top: scrollY, behavior: 'smooth' });
            }, action.scrollY);
        }

        // 모든 동작 후 1초 대기
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('User actions replayed.');
});
