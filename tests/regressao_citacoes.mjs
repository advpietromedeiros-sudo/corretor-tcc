// Regressão dos falsos positivos de citação x referência (casos reais relatados em 12/11/2026,
// reproduzidos aqui com texto sintético). Uso: node tests/regressao_citacoes.mjs
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const T = [
  'CENTRO UNIVERSITÁRIO CATÓLICA DO RIO GRANDE DO NORTE',
  'RESUMO',
  'Este trabalho analisa o feminicídio e a quesitação no Tribunal do Júri a partir da legislação recente e da doutrina especializada sobre o tema.',
  'Palavras-chave: feminicídio; Tribunal do Júri; quesitação.',
  'LISTA DE ABREVIATURAS E SIGLAS',
  'ADC Ação Declaratória de Constitucionalidade',
  'ADPF Arguição de Descumprimento de Preceito Fundamental',
  'CF/88 Constituição Federal de 1988',
  '1 INTRODUÇÃO',
  'O tema é discutido por Bianchini, Bazzo e Chakian (2024) e por Pereira e Cabral (2023), que apontam lacunas na quesitação.',
  'Segundo Ribeiro, Dutra e Silveira (2025, p. 1-3), a tipificação autônoma reforçou a proteção penal da mulher no país.',
  'A ADC 19 e a ADPF 779 foram julgadas à luz da CF de modo convergente pelo Supremo Tribunal Federal nos últimos anos.',
  'A autora registra que o júri deve observar “razões da condição do sexo feminino” como qualificadora objetiva do delito.',
  'Souza (2015) e Souza (2025) tratam de aspectos distintos; Oliveira e Nascimento (2026) discutem a correlação no Júri, Souza (2015, p. 37-45) a emoção.',
  'Afonso, Sousa e Cury (2024) e Lopes Filho e Chacha (2025) completam o quadro, assim como Maciel Neto e Zagallo (2022).',
  '2 CONCLUSÃO',
  'Conclui-se que a reforma legislativa ampliou a resposta penal, mas exige atenção à quesitação no júri popular.',
  'REFERÊNCIAS',
  'BIANCHINI, Alice; BAZZO, Mariana; CHAKIAN, Silvia. Crimes contra mulheres. 5. ed. São Paulo: JusPodivm, 2024.',
  'CHACHA, Fernando; LOPES FILHO, Marcos Boechat. O novo crime de feminicídio. Revista Jurídica, Brasília, v. 3, n. 2, p. 10-20, 2025.',
  'DA SILVA PEREIRA, Vinícius; COLNAGO CABRAL, Thiago. O sistema de quesitação. Revista de Direito, Natal, v. 1, n. 1, p. 1-9, 2023.',
  'MACIEL NETO, Aluisio Antonio; ZAGALLO, Rogério Leão. Reflexões sobre a quesitação. Revista Penal, São Paulo, v. 8, n. 2, p. 5-15, 2022.',
  'OLIVEIRA, Flaudemir Reis de; NASCIMENTO, Gustavo Santana do. Entre a acusação e o veredicto. Revista Tópicos, 8 jun. 2026. DOI: https://doi.org/10.70773/revistatopicos/780896635.',
  'RIBEIRO, Gleicy Cristina de Araújo; DUTRA, Paulo Sergio; SILVEIRA, Gláucio Batista da. Feminicídio e justiça. Revista Ibero-Americana, São Paulo, v. 11, n. 5, p. 1-3, 2025. Disponível em: https://periodicorease.pro.br/rease/article/view/1. Acesso em: 7 nov. 2026.',
  'SOUSA, Cauê Duarte de; AFONSO, Guilherme Henrique Rodrigues; CURY, Letícia Vivianne Miranda. A quesitação. Revista Científica, Natal, v. 2, n. 1, p. 1-10, 2024.',
  'SOUZA, Fagner Gonzaga de. O feminicídio e o privilégio do domínio de violenta emoção. 2015. Trabalho de Conclusão de Curso (Graduação em Direito) – Universidade Federal, Natal, 2015.',
  'SOUZA, Maria Clara. A nova lei do feminicídio. Revista Brasileira, Recife, v. 4, n. 1, p. 2-9, 2025.',
];

const PROIBIDOS = [
  [/não consta nas referências/i, 'citação acusada como ausente das referências'],
  [/Ano divergente/i, 'ano divergente entre citação e referência'],
  [/Sigla “(ADC|ADPF|CF)”/, 'sigla definida na lista acusada'],
  [/Citação direta sem indicação de página/i, 'expressão legal entre aspas tratada como citação direta'],
  [/Artigo sem paginação/i, 'artigo on-line/DOI cobrado de paginação'],
  [/sem a sequência “Local: Editora, ano/i, 'TCC ou artigo tratado como livro'],
  [/sem a chamada autor-data: (RIBEIRO|PEREIRA|SOUSA|MACIEL)/i, 'coautor citado acusado sem chamada'],
  [/não localizada no texto: (RIBEIRO|PEREIRA|SOUSA|CHACHA|MACIEL|OLIVEIRA|SOUZA)/i, 'referência citada acusada como não citada'],
  [/falta “Disponível em:”/, 'DOI cobrado de “Disponível em:”'],
];

const b = await puppeteer.launch({ executablePath: CHROME, headless: true });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(pathToFileURL(path.join(ROOT, 'index.html')).href);
const itens = await p.evaluate((T) => {
  const doc = { kind: 'PDF', lines: T.map(t => ({ t })) };
  return window.__cx.analyze(doc, { curso: 'geral', tipo: 'A' }).C.map(c => c.problema);
}, T);
await b.close();
let falhas = 0;
for (const [re, nome] of PROIBIDOS) {
  const hit = itens.filter(x => re.test(x));
  if (hit.length) { falhas++; console.log('  ✘ ' + nome + ': ' + hit.join(' | ')); } else console.log('  ✔ sem ' + nome);
}
if (errs.length) { falhas++; console.log('  ✘ erros JS: ' + errs.join(' | ')); }
console.log('\nRESUMO: ' + (PROIBIDOS.length - falhas) + ' ok · ' + falhas + ' falha(s) · ' + itens.length + ' pendências no total');
process.exit(falhas ? 1 : 0);
