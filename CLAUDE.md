# CLAUDE.md — Corretor Acadêmico de Pré-Projeto e TCC

> As regras gerais estão em `C:\Users\advpi\Repositório\CLAUDE.md` e no
> `C:\Users\advpi\Repositório\0 Readme First\HARNESS.md`. Aqui fica só o que é deste projeto.

## O que é

**Uma página HTML única, 100% offline** (`index.html`, cerca de 3,5 MB), que corrige a **forma** de
pré-projetos (TCC I) e de monografias (TCC II) dos cursos da UniCatólica do RN:

- estrutura do modelo de TCC I;
- Manual de Normalização da FCRN e guia de normas para monografia da Biblioteca (2026);
- ABNT vigente e linguagem acadêmica.

A página também gera o DOCX do aluno (vermelho + balões), o relatório, a **correção automática com
download do arquivo corrigido** e a Declaração de Uso de IA.

- **Dentro do HTML:** fontes, pdf.js, JSZip, o modelo de TCC I, o modelo da declaração e o PDF do manual.
- **Única chamada de rede:** a revisão gramatical opcional, no LanguageTool público.
- **Destino:** é funcionalidade futura do portal Pietro Medeiros (ordem de 31/10/2026).

## Pilha e comandos

Não segue a pilha do portal: é um HTML autossuficiente. Node e Python servem só para os testes.

| o quê | comando (máquina local, pasta do projeto) | volta na hora? |
| --- | --- | --- |
| instalar dependências de teste | `npm install` | volta em ~10 s |
| teste de ponta a ponta (Chrome sem interface) | `npm test` | prende a tela ~5 min |
| teste sem rede (pula LanguageTool) | `SEM_REDE=1 npm test` | prende a tela ~4 min |
| teste rápido da página publicada | `node tests/smoke_url.mjs` | prende a tela ~30 s |

**Publicação:** GitHub Pages da branch `master` → https://advpietromedeiros-sudo.github.io/corretor-tcc/ (repositório **público**, D-009). Todo push na `master` republica.

O teste abre o `index.html` no Chrome e percorre **todas as funções**: abas, tema, demonstração,
filtros, status, guia, Prompt Mestre, impressão, DOCX do aluno, relatório, gramática on-line, envio de
DOCX, PDF e .txt, declaração de IA, biblioteca, regras novas e correção automática. Os arquivos de
teste com erros propositais são gerados por `tests/fixtures/gerar_fixtures.py`.

## Estrutura

- `index.html` — o corretor (versão de trabalho).
- `versoes/` — versões anteriores, como chegaram do Downloads.
- `tests/` — teste de ponta a ponta e gerador de arquivos de teste.
- `.scratch/` — rascunhos e saídas de teste (fora do Git).
