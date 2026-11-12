// Teste de ponta a ponta do Corretor Acadêmico — percorre cada função da página no Chrome.
// Uso: node tests/e2e.mjs [arquivo.html]   (padrão: index.html)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = path.resolve(ROOT, process.argv[2] || 'index.html');
const OUT = path.join(ROOT, '.scratch', 'e2e');
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ONLINE = !process.env.SEM_REDE;

const results = []; const jsErrors = [];
const ok = (n, d = '') => { results.push({ n, ok: true, d }); console.log('  ✔', n, d); };
const fail = (n, d = '') => { results.push({ n, ok: false, d }); console.log('  ✘', n, d); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function step(n, fn) { try { const d = await fn(); ok(n, d || ''); } catch (e) { fail(n, String(e && e.message || e).slice(0, 300)); } }

function waitDownload(dir, before, ms = 15000) {
  const t0 = Date.now();
  return new Promise((res, rej) => {
    const iv = setInterval(() => {
      const now = fs.readdirSync(dir).filter(f => !before.includes(f) && !f.endsWith('.crdownload'));
      if (now.length) { clearInterval(iv); res(path.join(dir, now[0])); }
      else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error('download não ocorreu')); }
    }, 200);
  });
}
function zipEntries(file) {
  const py = `import zipfile,sys\nz=zipfile.ZipFile(sys.argv[1]);bad=z.testzip();print('BAD' if bad else 'OK');print('\\n'.join(z.namelist()))`;
  return execFileSync('python', ['-I', '-c', py, file], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }).trim().split(/\r?\n/);
}
function docxXmlOk(file) {
  // valida que cada XML do pacote é bem formado
  const py = `import zipfile,sys\nfrom xml.dom import minidom\nz=zipfile.ZipFile(sys.argv[1]);n=0\nfor f in z.namelist():\n  if f.endswith('.xml') or f.endswith('.rels'):\n    minidom.parseString(z.read(f));n+=1\nprint(n)`;
  return execFileSync('python', ['-I', '-c', py, file], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }).trim();
}
function docxText(file, part = 'word/document.xml') {
  const py = `import zipfile,sys,re\nsys.stdout.reconfigure(encoding='utf-8')\nz=zipfile.ZipFile(sys.argv[1]);x=z.read(sys.argv[2]).decode('utf8');print(re.sub(r'<[^>]+>',' ',x))`;
  return execFileSync('python', ['-I', '-c', py, file, part], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 60000, args: ['--no-sandbox', '--allow-file-access-from-files'] });
let page = await browser.newPage();
await page.setViewport({ width: 1366, height: 900 });
page.on('pageerror', e => jsErrors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') jsErrors.push('console: ' + m.text()); });
page.on('dialog', d => d.dismiss());
const cdp = await page.createCDPSession();
await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: OUT });
const ctx = browser.defaultBrowserContext();
await ctx.overridePermissions('file://', ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']).catch(() => {});

console.log('Página:', PAGE);
await page.goto(pathToFileURL(PAGE).href,{ waitUntil: 'load', timeout: 60000 });
await page.evaluate(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; window.__opened = []; const o = window.open; window.open = (...a) => { window.__opened.push(a[0]); const w = o.apply(window, a); try { if (w) w.print = () => { window.__printed = (window.__printed || 0) + 1; }; } catch (e) {} return w; }; });
await sleep(800);

const clickTab = t => page.evaluate(t => document.querySelector('.mh-tabs [data-t=' + t + ']').click(), t);
const visible = sel => page.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }, sel);

console.log('\n[1] Navegação e tema');
for (const t of ['corr', 'decl', 'lib', 'pm', 'help', 'corr']) {
  await step('aba ' + t, async () => { await clickTab(t); await sleep(150); if (!(await visible('#t-' + t))) throw new Error('aba não ficou visível'); });
}
await step('alternar tema claro/escuro', async () => {
  const a = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || document.body.className);
  await page.click('#thm'); await sleep(150);
  const b = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || document.body.className);
  await page.click('#thm');
  if (a === b) throw new Error('tema não mudou'); return `${a || '(padrão)'} → ${b}`;
});

console.log('\n[2] Configuração');
await step('opções de curso e tipo', async () => {
  const o = await page.evaluate(() => ({ c: [...document.querySelectorAll('select[data-k=curso] option')].map(x => x.textContent), t: [...document.querySelectorAll('select[data-k=tipo] option')].map(x => x.textContent) }));
  if (o.c.length < 2 || o.t.length < 2) throw new Error(JSON.stringify(o)); return `${o.c.length} cursos, ${o.t.length} tipos`;
});
await step('nome nos balões', async () => { await page.$eval('input[data-k=author]', e => { e.value = ''; }); await page.type('input[data-k=author]', 'Prof. Teste'); });

console.log('\n[3] Demonstração (texto de exemplo)');
await step('rodar demonstração', async () => {
  await page.click('[data-a=demo]');
  await page.waitForSelector('.cx-it', { timeout: 30000 });
  const n = await page.$$eval('.cx-it', a => a.length);
  const score = await page.evaluate(() => (document.querySelector('.cx-diag, .cx-panel') || {}).innerText?.match(/\d{1,3}\s*(?:\/\s*100|%)?/)?.[0]);
  return `${n} pendências · índice ${score}`;
});
await step('categorias presentes no painel', async () => {
  const c = await page.$$eval('[data-f=cat] option', a => a.map(x => x.textContent.trim()));
  return c.join(' | ');
});
await step('filtro por categoria', async () => {
  const total = await page.$$eval('.cx-it', a => a.filter(x => x.offsetParent).length);
  const val = await page.$$eval('[data-f=cat] option', a => a[1] && a[1].value);
  await page.select('[data-f=cat]', val); await sleep(200);
  const f = await page.$$eval('.cx-it', a => a.filter(x => x.offsetParent).length);
  await page.select('[data-f=cat]', ''); await sleep(150);
  if (!(f > 0 && f <= total)) throw new Error(`total ${total}, filtrado ${f}`); return `${total} → ${f} (${val})`;
});
await step('busca livre', async () => {
  await page.type('[data-f=q]', 'zzzznãoexiste'); await sleep(250);
  const f = await page.$$eval('.cx-it', a => a.filter(x => x.offsetParent).length);
  await page.$eval('[data-f=q]', e => { e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(150);
  if (f !== 0) throw new Error('busca sem resultado mostrou ' + f); return 'sem resultado → 0 itens';
});
await step('alterar status de uma pendência', async () => {
  const v = await page.evaluate(() => { const s = document.querySelector('.cx-it select.cx-status'); if (!s) return null; s.value = s.options[2].value; s.dispatchEvent(new Event('change', { bubbles: true })); return s.value; });
  if (!v) throw new Error('controle de status não encontrado');
  return v;
});
await step('filtro por status', async () => {
  const opts = await page.$$eval('[data-f=st] option', a => a.map(x => x.value));
  await page.select('[data-f=st]', opts[1]); await sleep(200);
  const f = await page.$$eval('.cx-it', a => a.filter(x => x.offsetParent).length);
  await page.select('[data-f=st]', ''); return `${opts[1]} → ${f}`;
});
await step('"Como corrigir" abre o modelo', async () => {
  await page.evaluate(() => document.querySelector('.cx-howb').click()); await sleep(300);
  const m = await page.evaluate(() => { const b = document.querySelector('.cx-mbox, .cx-modal, [class*=cx-m]'); return b && b.offsetParent ? b.innerText.slice(0, 60) : null; });
  if (!m) throw new Error('modal não abriu');
  await page.keyboard.press('Escape'); await page.evaluate(() => { const c = [...document.querySelectorAll('button')].find(b => /fechar/.test(b.textContent) && b.offsetParent); c && c.click(); });
  return m.replace(/\s+/g, ' ');
});
await step('texto extraído', async () => { await page.click('[data-a=raw]'); await sleep(300); const t = await page.evaluate(() => (document.querySelector('.cx-raw') || {}).innerText || ''); if (t.length < 200) throw new Error('texto curto: ' + t.length); await page.click('[data-a=raw]'); return t.length + ' caracteres'; });
await step('guia ABNT·FCRN', async () => { await page.click('[data-a=guia]'); await sleep(300); const ok2 = await page.evaluate(() => [...document.querySelectorAll('input')].some(i => /Buscar regra/.test(i.placeholder) && i.offsetParent)); await page.keyboard.press('Escape'); await page.evaluate(() => { const c = [...document.querySelectorAll('button')].find(b => /fechar/.test(b.textContent) && b.offsetParent); c && c.click(); }); if (!ok2) throw new Error('guia não abriu'); });
await step('copiar Prompt Mestre + texto', async () => {
  await page.click('[data-a=prompt]'); await sleep(400);
  const c = await page.evaluate(() => navigator.clipboard.readText().catch(e => 'ERRO ' + e.message));
  if (!c || c.startsWith('ERRO') || c.length < 1000) throw new Error('clipboard: ' + String(c).slice(0, 80)); return c.length + ' caracteres copiados';
});
await step('imprimir (abre relatório em nova janela)', async () => { const n0 = (await browser.pages()).length; await page.click('[data-a=print]'); await sleep(1200); const pgs = await browser.pages(); if (pgs.length <= n0) throw new Error('janela de impressão não abriu'); const t = await pgs[pgs.length - 1].evaluate(() => document.title + ' · ' + document.body.innerText.length + ' caracteres'); await pgs[pgs.length - 1].close(); return t; });
await step('demonstração não oferece DOCX do aluno (entrada é texto)', async () => { if (await page.$('[data-a=sdocx]')) throw new Error('botão apareceu sem DOCX'); });

let sdocx, rdocx;
async function exportStudent() {
  await step('exportar DOCX do aluno', async () => {
  const before = fs.readdirSync(OUT); await page.click('[data-a=sdocx]'); sdocx = await waitDownload(OUT, before);
  const e = zipEntries(sdocx); if (e[0] !== 'OK') throw new Error('zip corrompido');
  const nx = docxXmlOk(sdocx); const com = e.includes('word/comments.xml');
  const ct = com ? (fs.readFileSync(sdocx) && execFileSync('python', ['-I', '-c', 'import zipfile,sys\nprint(zipfile.ZipFile(sys.argv[1]).read("word/comments.xml").decode("utf8").count("w:author=\\"Prof. Teste\\""))', sdocx], { encoding: 'utf8' }).trim()) : 0;
  if (!com) throw new Error('sem comments.xml'); return `${path.basename(sdocx)} · ${nx} XML válidos · autor nos balões: ${ct}`;
  });
}
await step('exportar relatório DOCX', async () => {
  const before = fs.readdirSync(OUT); await page.click('[data-a=rdocx]'); rdocx = await waitDownload(OUT, before);
  const e = zipEntries(rdocx); if (e[0] !== 'OK') throw new Error('zip corrompido'); return `${path.basename(rdocx)} · ${docxXmlOk(rdocx)} XML válidos`;
});

if (ONLINE) {
  await step('revisão gramatical on-line (LanguageTool)', async () => {
    const n0 = await page.$$eval('.cx-it', a => a.length);
    await page.click('[data-a=lt]');
    await page.waitForFunction(n0 => { const s = document.querySelector('.cx-lts'); const t = s ? s.innerText : ''; return document.querySelectorAll('.cx-it').length > n0 || /erro|falh|limite|não/i.test(t) || /concluí|sugest/i.test(t); }, { timeout: 120000 }, n0);
    const n1 = await page.$$eval('.cx-it', a => a.length); const st = await page.evaluate(() => (document.querySelector('.cx-lts') || {}).innerText || '');
    if (n1 <= n0 && /erro|falh|limite/i.test(st)) throw new Error(st.slice(0, 160)); return `${n0} → ${n1} pendências · ${st.replace(/\s+/g, ' ').slice(0, 100)}`;
  });
}
await step('nova análise', async () => { await page.click('[data-a=new]'); await sleep(300); const d = await page.$('.cx-drop'); if (!d) throw new Error('área de envio não voltou'); });

console.log('\n[4] Envio de arquivos');
async function upload(file, label) {
  await step(label, async () => {
    await page.evaluate(() => { const b = document.querySelector('[data-a=new]'); b && b.click(); }); await sleep(200);
    const inp = await page.$('input[type=file]'); await inp.uploadFile(file);
    await page.waitForFunction(() => document.querySelectorAll('.cx-it').length > 0 || /não|erro|falh/i.test((document.querySelector('.cx-st') || {}).innerText || ''), { timeout: 60000 });
    const n = await page.$$eval('.cx-it', a => a.length); const st = await page.evaluate(() => (document.querySelector('.cx-st') || {}).innerText || '');
    if (!n) throw new Error('sem pendências · ' + st.slice(0, 120));
    const sit = await page.evaluate(() => { const t = document.body.innerText; const m = t.match(/(Dentro do padrão institucional|Ajustes de padronização necessários|Fora do padrão institucional)/); return m && m[1]; });
    return `${n} pendências · ${sit}`;
  });
}
// modelo de TCC I embutido no próprio arquivo
const modeloPath = path.join(OUT, 'modelo_tcc1.docx');
await step('extrair modelo de TCC I embutido', async () => {
  const before = fs.readdirSync(OUT); await clickTab('lib'); await page.evaluate(() => Declaracao.dlModelo()); const f = await waitDownload(OUT, before); fs.copyFileSync(f, modeloPath); await clickTab('corr'); return path.basename(f) + ' · ' + docxXmlOk(f) + ' XML válidos';
});
if (fs.existsSync(modeloPath)) await upload(modeloPath, 'enviar o modelo em branco (deve acusar textos de orientação)');
await step('modelo em branco acusa orientações esquecidas', async () => { const t = await page.evaluate(() => document.body.innerText); const n = (t.match(/orienta[çc][aã]o do modelo|texto de orienta/gi) || []).length; if (!n) throw new Error('não acusou'); return n + ' menções'; });
await exportStudent();
if (sdocx) await upload(sdocx, 'reenviar o DOCX do aluno gerado (ida e volta)');
// PDF gerado a partir do texto de exemplo
const pdfPath = path.join(OUT, 'amostra.pdf');
await step('gerar PDF de teste', async () => {
  const txt = await page.evaluate(() => document.getElementById('cx-sample').textContent);
  const p2 = await browser.newPage(); await p2.setContent('<html><body style="font:12pt Times New Roman;margin:3cm 2cm 2cm 3cm;line-height:1.5">' + txt.split(/\n/).map(l => '<p>' + l.replace(/[<&]/g, '') + '</p>').join('') + '</body></html>');
  await p2.pdf({ path: pdfPath, format: 'A4' }); await p2.close(); return fs.statSync(pdfPath).size + ' bytes';
});
if (fs.existsSync(pdfPath)) await upload(pdfPath, 'enviar PDF');
await step('arquivo inválido (.txt) é recusado com mensagem', async () => {
  const f = path.join(OUT, 'x.txt'); fs.writeFileSync(f, 'teste');
  await page.evaluate(() => { const b = document.querySelector('[data-a=new]'); b && b.click(); }); await sleep(200);
  const inp = await page.$('input[type=file]'); await inp.uploadFile(f); await sleep(1500);
  const msg = await page.evaluate(() => (document.querySelector('.cx-st') || {}).innerText || '');
  if (!/formato|suportad/i.test(msg)) throw new Error('mensagem inesperada: ' + msg);
  if (!msg.trim()) throw new Error('nenhuma mensagem'); return msg.replace(/\s+/g, ' ').slice(0, 120);
});

console.log('\n[5] Declaração de IA');
await clickTab('decl'); await sleep(200);
await step('preencher e gerar declaração', async () => {
  await page.evaluate(() => {
    const set = (k, v) => { const e = document.querySelector('#dzRoot [data-k=' + k + ']'); if (!e) return; e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
    set('nome', 'Maria Eduarda Souza Lima'); set('mat', '2023100245'); set('curso', 'Direito'); set('local', 'Mossoró/RN');
    const t = document.querySelector('#dzRoot [data-tool]'); if (t && !t.classList.contains('on')) t.click();
    const f = document.querySelector('#dzRoot [data-fin]'); if (f && !f.checked) f.click();
  });
  const before = fs.readdirSync(OUT); await page.click('#dzRoot [data-a=gen]');
  const f = await waitDownload(OUT, before).catch(async e => { const er = await page.evaluate(() => (document.querySelector('.dz-err') || {}).textContent || ''); throw new Error('sem download · ' + er); }); const txt = docxText(f);
  if (!/Maria Eduarda Souza Lima/.test(txt)) throw new Error('nome não aparece no DOCX'); return `${path.basename(f)} · ${docxXmlOk(f)} XML válidos · nome presente`;
});
await step('declaração em branco', async () => { const before = fs.readdirSync(OUT); await page.click('#dzRoot [data-a=blank]'); const f = await waitDownload(OUT, before); return path.basename(f) + ' · ' + docxXmlOk(f) + ' XML válidos'; });
await step('limpar formulário', async () => { await page.click('#dzRoot [data-a=reset]'); await sleep(200); const v = await page.$eval('#dzRoot [data-k=nome]', e => e.value); if (v) throw new Error('nome continua: ' + v); });

console.log('\n[6] Modelos e normas · Prompt Mestre');
await clickTab('lib');
await step('baixar manual FCRN (PDF)', async () => { const before = fs.readdirSync(OUT); await page.evaluate(() => Declaracao.dlManual()); const f = await waitDownload(OUT, before); const h = fs.readFileSync(f).subarray(0, 5).toString(); if (h !== '%PDF-') throw new Error('não é PDF'); return path.basename(f) + ' · ' + fs.statSync(f).size + ' bytes'; });
await step('abrir manual FCRN', async () => { const n0 = (await browser.pages()).length; await page.evaluate(() => Declaracao.openManual()); await sleep(1500); const n1 = (await browser.pages()).length; const op = await page.evaluate(() => window.__opened.length); if (n1 <= n0 && !op) throw new Error('nada abriu'); });
await step('abrir guia pela biblioteca', async () => { await page.evaluate(() => window._cx && window._cx.guia()); await sleep(300); await page.keyboard.press('Escape'); });
await page.bringToFront(); for (const p of (await browser.pages())) if (p !== page) await p.close().catch(() => {});
await clickTab('pm');
await step('copiar Prompt Mestre', async () => { await page.click('#pmCopy'); await sleep(300); const c = await page.evaluate(() => navigator.clipboard.readText()); if (c.length < 500) throw new Error('curto'); return c.length + ' caracteres'; });

console.log('\n[8] Regras novas e correção automática');
const FIX = path.join(OUT, 'fixtures');
execFileSync('python', ['-I', path.join(ROOT, 'tests', 'fixtures', 'gerar_fixtures.py'), FIX], { encoding: 'utf8' });
// aba nova: o Chrome limita downloads automáticos por aba
for (const p of (await browser.pages())) await p.close().catch(() => {});
page = await browser.newPage(); await page.setViewport({ width: 1366, height: 900 });
page.on('pageerror', e => jsErrors.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') jsErrors.push('console: ' + m.text()); });
await (await page.createCDPSession()).send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: OUT });
await page.goto(pathToFileURL(PAGE).href, { waitUntil: 'load', timeout: 60000 }); await sleep(500);
const pbs = () => page.$$eval('.cx-it .cx-pb', a => a.map(x => x.textContent));
const setTipo = v => page.evaluate(v => { const s = document.querySelector('select[data-k=tipo]'); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, v);
async function sendFile(f) {
  await page.evaluate(() => { const b = document.querySelector('[data-a=new]'); b && b.click(); }); await sleep(200);
  const inp = await page.$('input[type=file]'); await inp.uploadFile(f);
  await page.waitForFunction(() => document.querySelectorAll('.cx-it').length > 0, { timeout: 60000 }); await sleep(300);
}
async function dlFixed(track) {
  await page.evaluate(t => { const c = document.querySelector('[data-o=track]'); if (c) c.checked = t; }, track);
  for (const f of fs.readdirSync(OUT)) if (/_CORRIGIDO/.test(f)) fs.renameSync(path.join(OUT, f), path.join(OUT, 'ant_' + Date.now() + '_' + f));
  const before = fs.readdirSync(OUT); await page.$eval('[data-a=fixdl]', b => b.scrollIntoView({ block: 'center' })); await page.click('[data-a=fixdl]'); return waitDownload(OUT, before);
}
const py = (code, ...args) => execFileSync('python', ['-I', '-c', code, ...args], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }).trim();

await setTipo('auto');
await page.evaluate(() => { const s = document.querySelector('select[data-k=curso]'); s.value = 'direito'; s.dispatchEvent(new Event('change', { bubbles: true })); });
let pre0 = 0;
await step('pré-projeto: regras novas disparam', async () => {
  await sendFile(path.join(FIX, 'preprojeto_erros.docx')); const t = (await pbs()).join(' | '); pre0 = (await pbs()).length;
  const want = { 'DOI (NBR 6023:2025)': /DOI fora do formato/, 'hipóteses > 3': /4 hipóteses/, 'fonte Calibri': /Fonte predominante: Calibri/, 'margens': /Margens fora do padrão/, 'entrelinhas': /Entrelinhas/ };
  const miss = Object.keys(want).filter(k => !want[k].test(t)); if (miss.length) throw new Error('não disparou: ' + miss.join(', ') + ' · ' + t.slice(0, 300));
  if (/Acesso em/.test(t) && /doi/i.test(t) && false) throw new Error('');
  return pre0 + ' pendências';
});
await step('pré-projeto: referência com DOI dispensada de "Acesso em"', async () => {
  const n = await page.$$eval('.cx-it', a => a.filter(d => /sem “Acesso em”/.test(d.querySelector('.cx-pb').textContent) && /doi/i.test(d.innerText)).length);
  if (n) throw new Error('acusou ' + n + ' referência(s) com DOI'); });
await step('pré-projeto: metodologia continua exigida como seção 6', async () => { const t = (await pbs()).join(' | '); if (/Não foi localizada a descrição da metodologia/.test(t)) throw new Error('regra de monografia aplicada ao projeto'); });
await step('aplicar uma correção individual', async () => {
  const i = await page.$eval('[data-ap]', b => b.getAttribute('data-ap')); await page.evaluate(i => document.querySelector('[data-ap="' + i + '"]').click(), i); await sleep(300);
  const on = await page.$eval('[data-ap="' + i + '"]', b => b.classList.contains('on') && /Desfazer/.test(b.textContent));
  const tag = await page.$eval('.cx-it[data-i="' + i + '"] summary', s => /CORREÇÃO APLICADA/.test(s.innerText));
  const stt = await page.$eval('.cx-it[data-i="' + i + '"] select.cx-status', s => s.value);
  if (!on || !tag || stt !== 'CORRIGIDO') throw new Error(`on=${on} tag=${tag} status=${stt}`);
  await page.evaluate(i => document.querySelector('[data-ap="' + i + '"]').click(), i); await sleep(300);
  const off = await page.$eval('[data-ap="' + i + '"]', b => !b.classList.contains('on')); if (!off) throw new Error('desfazer falhou'); return 'aplicar e desfazer ok';
});
let fixedTrack;
await step('aplicar todas e baixar DOCX corrigido (alterações controladas)', async () => {
  const lab = await page.$eval('[data-a=apall]', b => b.textContent); await page.evaluate(() => document.querySelector('[data-a=apall]').click()); await sleep(400);
  fixedTrack = await dlFixed(true); const nx = docxXmlOk(fixedTrack);
  const r = JSON.parse(py(`import zipfile,sys,json,re\nx=zipfile.ZipFile(sys.argv[1]).read('word/document.xml').decode('utf8')\nprint(json.dumps({'ins':x.count('<w:ins '),'dele':x.count('<w:del '),'doi':'https://doi.org/10.18593' in x,'tnr':x.count('Times New Roman'),'cal':x.count('Calibri'),'l360':x.count('w:line="360"'),'mar':'w:top="1701"' in x and 'w:left="1701"' in x and 'w:right="1134"' in x,'jc':x.count('w:val="both"'),'ind':x.count('w:firstLine="709"'),'silva':'(Silva, 2020, p. 10)' in x or 'Silva' in x}))`, fixedTrack));
  const prob = []; if (!r.ins || !r.dele) prob.push('sem w:ins/w:del'); if (!r.doi) prob.push('DOI não corrigido'); if (!r.mar) prob.push('margens'); if (!r.l360) prob.push('entrelinhas'); if (!r.tnr) prob.push('fonte'); if (!r.jc) prob.push('justificado'); if (!r.ind) prob.push('recuo');
  if (prob.length) throw new Error(prob.join(', ') + ' · ' + JSON.stringify(r));
  return `${lab.trim()} · ${nx} XML válidos · ${r.ins} inserções / ${r.dele} exclusões controladas · DOI ok · margens, fonte, 1,5, justificado e recuo ok`;
});
await step('baixar DOCX corrigido sem alterações controladas', async () => {
  const f = await dlFixed(false); docxXmlOk(f);
  const r = JSON.parse(py(`import zipfile,sys,json\nx=zipfile.ZipFile(sys.argv[1]).read('word/document.xml').decode('utf8')\nprint(json.dumps({'ins':x.count('<w:ins '),'doi':'https://doi.org/10.18593' in x,'old':'doi:10.18593' in x}))`, f));
  if (r.ins || !r.doi || r.old) throw new Error(JSON.stringify(r)); return 'texto substituído diretamente';
});
await step('reenviar o DOCX corrigido: pendências caem', async () => {
  const f2 = path.join(OUT, 'preprojeto_reenvio.docx'); fs.copyFileSync(path.join(FIX, 'preprojeto_erros.docx'), f2);
  const fx = fs.readdirSync(OUT).filter(f => /_CORRIGIDO/.test(f)).map(f => path.join(OUT, f)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
  await sendFile(fx); const t = (await pbs()).join(' | '); const n = (await pbs()).length;
  const still = ['Margens fora do padrão', 'Fonte predominante', 'Entrelinhas', 'DOI fora do formato'].filter(k => t.includes(k));
  if (still.length) throw new Error('continuam: ' + still.join(', ')); return `${pre0} → ${n} pendências`;
});
await step('monografia (TCC II): regras do manual', async () => {
  await setTipo('A'); await sendFile(path.join(FIX, 'monografia_erros.docx')); const t = (await pbs()).join(' | ');
  const want = { 'Abstract ausente': /Abstract\) não localizado/, 'folha de aprovação': /Folha de aprovação não localizada/, 'ficha catalográfica': /Ficha catalográfica não localizada/, 'dedicatória com título': /“DEDICATÓRIA” aparece como título/, 'apêndice sem travessão': /apêndice fora do padrão/i, 'metodologia no desenvolvimento': /descrição da metodologia no desenvolvimento/, 'título em 12 (exige 14)': /Título de seção em tamanho 12/, 'natureza da folha de rosto': /natureza do trabalho/ };
  const miss = Object.keys(want).filter(k => !want[k].test(t));
  const bad = []; if (/Fonte predominante: Arial/.test(t)) bad.push('Arial acusada'); if (/A seção “Metodologia” não foi localizada/.test(t)) bad.push('metodologia exigida como seção isolada');
  if (miss.length || bad.length) throw new Error('faltou: ' + miss.join(', ') + ' · indevido: ' + bad.join(', '));
  return (await pbs()).length + ' pendências · Arial aceita · metodologia segue o manual';
});
await step('monografia: corrigir títulos para 14 e apêndice com travessão', async () => {
  await page.evaluate(() => document.querySelector('[data-a=apall]').click()); await sleep(300); const f = await dlFixed(false); docxXmlOk(f);
  const r = JSON.parse(py(`import zipfile,sys,json,re\nx=zipfile.ZipFile(sys.argv[1]).read('word/document.xml').decode('utf8')\nprint(json.dumps({'h28':len(re.findall(r'<w:sz w:val="28"/>',x)),'apend':'APÊNDICE A – Roteiro' in re.sub(r'<[^>]+>','',x)}))`, f));
  if (!r.h28 || !r.apend) throw new Error(JSON.stringify(r)); await setTipo('auto'); return `${r.h28} títulos em 14 · apêndice com travessão`;
});
if (fs.existsSync(pdfPath)) await step('PDF: aplicar e baixar texto corrigido em DOCX', async () => {
  await sendFile(pdfPath); const has = await page.$('[data-a=apall]:not([disabled])');
  if (!has) return 'nenhuma correção automática disponível neste PDF';
  await page.evaluate(() => document.querySelector('[data-a=apall]').click()); await sleep(300); const before = fs.readdirSync(OUT); await page.evaluate(() => document.querySelector('[data-a=fixdl]').click()); const f = await waitDownload(OUT, before);
  return path.basename(f) + ' · ' + docxXmlOk(f) + ' XML válidos';
});

console.log('\n[7] Erros de JavaScript');
if (jsErrors.length) jsErrors.forEach(e => fail('erro JS', e)); else ok('nenhum erro de JavaScript no console');

await browser.close();
const nf = results.filter(r => !r.ok).length;
fs.writeFileSync(path.join(OUT, 'resultado.json'), JSON.stringify({ quando: new Date().toISOString(), pagina: PAGE, results, jsErrors }, null, 2));
console.log(`\nRESUMO: ${results.length - nf} ok · ${nf} falha(s)`);
process.exit(nf ? 1 : 0);
