const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_URL = 'https://fukuro.su/';
const CONFIG_FILE = 'music.conf';
const EXTENSIONS = ['.jpg', '.png', '.ogg', '.jpeg', '.JPG', '.PNG'];

/**
 * Рекурсивно собирает все строки, похожие на пути к файлам
 */
function collectPaths(obj, paths = new Set()) {
    if (typeof obj === 'string') {
        if (EXTENSIONS.some(ext => obj.toLowerCase().endsWith(ext))) {
            // Убираем начальный слэш, если он есть
            paths.add(obj.startsWith('/') ? obj.substring(1) : obj);
        }
    } else if (Array.isArray(obj)) {
        obj.forEach(item => collectPaths(item, paths));
    } else if (typeof obj === 'object' && obj !== null) {
        Object.values(obj).forEach(val => collectPaths(val, paths));
    }
    return paths;
}


function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(dest)) {
            console.log(`[-] Пропущено: ${dest}`);
            return resolve();
        }


        fs.mkdirSync(path.dirname(dest), { recursive: true });

        const file = fs.createWriteStream(dest);
        
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Ошибка сервера: ${response.statusCode} для ${url}`));
                return;
            }

            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`[+] Скачано: ${dest}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {}); 
            reject(err);
        });
    });
}

async function start() {
    try {
        if (!fs.existsSync(CONFIG_FILE)) {
            console.error(`Файл ${CONFIG_FILE} не найден!`);
            return;
        }

        console.log('Читаю конфиг...');
        const rawData = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const data = JSON.parse(rawData);

        const allPaths = Array.from(collectPaths(data));
        console.log(`Найдено уникальных файлов: ${allPaths.length}`);

       
        for (const filePath of allPaths) {
            const fullUrl = new URL(filePath, BASE_URL).href;
            try {
                await downloadFile(fullUrl, filePath);
            } catch (err) {
                console.error(`[!] Не удалось скачать ${fullUrl}: ${err.message}`);
            }
        }

        console.log('\nВсе ресурсы загружены!');
    } catch (err) {
        console.error('Ошибка в работе скрипта:', err);
    }
}

start();