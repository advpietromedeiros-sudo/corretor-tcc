// Regressão: pré-projeto com sumário, texto de lei entre parênteses, entidade com sigla, apud e
// citação indireta sem apud (casos reais relatados em 12/11/2026, reproduzidos com texto sintético).
// Uso: node tests/regressao_caso2.mjs
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const P = (s) => ({ t: s });
const T = [
  'CENTRO UNIVERSITÁRIO CATÓLICA DO RIO GRANDE DO NORTE',
  'VIOLÊNCIA VICÁRIA COMO FORMA DE VIOLÊNCIA DE GÊNERO',
  'SUMÁRIO',
  '1 INTRODUÇÃO 4', '2 JUSTIFICATIVA 6', '3 HIPÓTESES 8', '4 OBJETIVOS 9', '5 FUNDAMENTAÇÃO TEÓRICA 9',
  '6 METODOLOGIA 19', '7 CRONOGRAMA 20', '8 PROPOSTA DE SUMÁRIO PARA A MONOGRAFIA 20', 'REFERÊNCIAS DO PROJETO 22',
  'INTRODUÇÃO',
  'A violência vicária é associada à psicóloga Sonia Vaccaro (Vaccaro, 2023) e atinge a mulher por meio dos filhos, segundo a literatura recente.',
  'A Convenção de Belém do Pará define a violência contra a mulher (OEA, 1994, art. 1º) e o Protocolo para julgamento com perspectiva de gênero (CNJ, 2021) orienta os juízes.',
  'O art. 227 da Constituição (Redação dada pela Emenda Constitucional nº 65, de 2010) assegura prioridade absoluta à criança e ao adolescente.',
  'Duas observações se impõem (Protocolo do CNJ e Resolução CNJ nº 492/2023) para a análise das decisões judiciais selecionadas.',
  'Magalhães (2025), com base em Coelho (2023) e Lima et al. (2023), descreve os efeitos sobre os filhos em diferentes níveis.',
  'A violência só se torna inteligível como estrutura (Saffioti, 2004 apud Façanha, 2026), e não como episódio isolado de conflito familiar.',
  'Diante desse cenário, pergunta-se: em que medida o ordenamento jurídico brasileiro reconhece a instrumentalização dos filhos, considerando as Leis nº 14.713/2023 e nº 15.384/2026?',
  '2 JUSTIFICATIVA', 'Segundo pesquisa nacional, 27% das brasileiras declararam ter sofrido violência doméstica. Entre elas, 58% não comunicaram a agressão (Brasil, 2025). A pesquisa se justifica pela atualidade do tema.',
  '3 HIPÓTESES', 'Hipótese 1 - As alterações legislativas ampliam a proteção da mulher.',
  '4 OBJETIVOS', '4.1 Objetivo geral', 'Analisar em que medida o ordenamento jurídico brasileiro reconhece a instrumentalização dos filhos, considerando as Leis nº 14.713/2023 e nº 15.384/2026.',
  '4.2 Objetivos específicos', 'Examinar a evolução legislativa;', 'Identificar critérios de prova.',
  '5 FUNDAMENTAÇÃO TEÓRICA', 'A literatura (Vaccaro, 2023; Magalhães, 2025) descreve o fenômeno como violência de gênero por substituição.',
  '6 METODOLOGIA', 'Pesquisa qualitativa, bibliográfica e documental, com análise de decisões judiciais.',
  '7 CRONOGRAMA', 'Etapas', 'Levantamento bibliográfico',
  '8 PROPOSTA DE SUMÁRIO PARA A MONOGRAFIA',
  '1 INTRODUÇÃO 2 VIOLÊNCIA VICÁRIA E TUTELA JURÍDICA 2.1 Gênero e poder 2.2 Lei nº 15.384/2026 e o art. 121-B 3 A PROVA DA FINALIDADE 3.1 Elementos de prova',
  '4 CONSIDERAÇÕES FINAIS',
  'REFERÊNCIAS',
  'REFERÊNCIAS DO PROJETO',
  'BRASIL. Senado Federal. Pesquisa Nacional de Violência contra a Mulher. Brasília, DF: Senado Federal, 2025.',
  'CONSELHO NACIONAL DE JUSTIÇA. Protocolo para julgamento com perspectiva de gênero. Brasília, DF: CNJ, 2021. Disponível em: https://www.cnj.jus.br/protocolo. Acesso em: 1 nov. 2026.',
  'FAÇANHA, Josanne Cristina Ribeiro Ferreira. Matar para punir. 2026. Trabalho de Conclusão de Curso (Graduação em Direito) – Universidade Federal, Fortaleza, 2026.',
  'MAGALHÃES, Roberta Cordeiro de Melo. Violência vicária. Revista de Ciências Jurídicas, Recife, v. 5, n. 2, p. 10-30, 2025.',
  'ORGANIZAÇÃO DOS ESTADOS AMERICANOS. Convenção Interamericana para Prevenir, Punir e Erradicar a Violência contra a Mulher. Belém do Pará: OEA, 1994.',
  'VACCARO, Sonia. Violencia vicaria: golpear donde más duele. Bilbao: Desclée De Brouwer, 2023.',
].map(P);

const PROIBIDOS = [
  [/A seção “Introdução” não foi localizada/, 'introdução logo após o sumário dada como ausente'],
  [/“(REDAÇÃO|PROTOCOLO|OEA|CNJ)” é citado/, 'texto de lei ou entidade com sigla acusado como citação sem referência'],
  [/Ano divergente.*FAÇANHA/, 'ano do autor original (apud) comparado com a obra consultada'],
  [/não localizada no texto: (CONSELHO NACIONAL|ORGANIZACAO DOS ESTADOS)/, 'entidade citada pela sigla acusada como não citada'],
  [/“(COELHO|LIMA)” é citado no texto, mas não consta/, 'citação indireta tratada como referência faltante'],
  [/Dado numérico sem fonte/, 'dado com fonte na frase seguinte acusado sem fonte'],
  [/alinhamento ao problema/, 'pergunta cortada no ponto de “15.384/2026”'],
  [/Numeração progressiva do sumário|“Proposta de sumário” tem apenas|Proposta de sumário” não foi/, 'proposta de sumário em parágrafo único ignorada'],
  [/^FIX:.*Oea/, 'sigla OEA convertida para “Oea” na correção'],
];
const EXIGIDOS = [
  [/“COELHO” é citado por meio de Magalhães/, 'citação indireta sem apud apontada'],
];

const b = await puppeteer.launch({ executablePath: CHROME, headless: true });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(pathToFileURL(path.join(ROOT, 'index.html')).href);
const itens = await p.evaluate((T) => window.__cx.analyze({ kind: 'PDF', lines: T }, { curso: 'geral', tipo: 'B' }).C.flatMap(c => [c.problema, c.fix ? 'FIX: ' + c.fix : '']).filter(Boolean), T);
await b.close();
let falhas = 0;
for (const [re, nome] of PROIBIDOS) { const hit = itens.filter(x => re.test(x)); if (hit.length) { falhas++; console.log('  ✘ ' + nome + ': ' + hit.join(' | ')); } else console.log('  ✔ sem ' + nome); }
for (const [re, nome] of EXIGIDOS) { if (itens.some(x => re.test(x))) console.log('  ✔ ' + nome); else { falhas++; console.log('  ✘ faltou: ' + nome); } }
if (errs.length) { falhas++; console.log('  ✘ erros JS: ' + errs.join(' | ')); }
const n = PROIBIDOS.length + EXIGIDOS.length;
console.log('\nRESUMO: ' + (n - falhas) + ' ok · ' + falhas + ' falha(s) · ' + itens.length + ' pendências no total');
process.exit(falhas ? 1 : 0);
