// Teste rápido da página publicada: carrega, roda a demonstração, abre as abas e conta erros de JavaScript.
// Uso: node tests/smoke_url.mjs [url]
import puppeteer from 'puppeteer-core';
const URL = process.argv[2] || 'https://advpietromedeiros-sudo.github.io/corretor-tcc/';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, protocolTimeout: 60000 });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(URL, { waitUntil: 'load', timeout: 90000 });
await p.evaluate(() => document.querySelector('[data-a=demo]').click());
await p.waitForSelector('.cx-it', { timeout: 60000 });
const r = await p.evaluate(() => ({ pend: document.querySelectorAll('.cx-it').length, auto: !!document.querySelector('.cx-auto'), abas: [...document.querySelectorAll('.mh-tabs [data-t]')].map(x => x.textContent.trim()) }));
console.log(JSON.stringify({ url: URL, ...r, errosJS: errs.length, erros: errs.slice(0, 3) }));
await b.close();
process.exit(errs.length || !r.pend ? 1 : 0);
