# 🔦 FAROL — Corretor Acadêmico

**Atualizado em 12/11/2026, 22h04.**

🌐 **Publicado (público, D-009):** https://advpietromedeiros-sudo.github.io/corretor-tcc/ · repositório `advpietromedeiros-sudo/corretor-tcc`.

## Estado

- `index.html` é a versão de trabalho, com o teste de ponta a ponta **verde**: 50 ok e 0 falhas, medido em 12/11/2026, 16h15.
- **Feito hoje:**
  - Testes de todas as funções.
  - Normas atualizadas (NBR 15287:2025, NBR 6023:2025 para DOI).
  - Arial aceita e títulos em 14.
  - Regras da monografia (TCC II) e regras estruturais dos e-books.
  - Metodologia diferenciada entre pré-projeto e monografia.
  - **Correção com um clique e download do arquivo corrigido.**
  - Conserto de 2 defeitos:
    1. O quadro de pendências era reanalisado quando o aluno reenviava o DOCX.
    2. Uma nova análise do mesmo arquivo marcava tudo como "não corrigido".

- **17h00:** corrigidos os falsos positivos do teste real (pré-projeto de duas alunas: de 40 para 24 pendências, todas reais); curso removido (padrão único); correção automática direta, sem alterações controladas. Link enviado por e-mail ao titular. Teste: 49 ok, 0 falhas.

- **21h13 (commit 55f2fec):** varredura de falsos positivos de citação e referência a partir de uma monografia real (PDF): de 6 altas, 16 médias e 20 baixas para 0 altas, 1 média e 8 baixas, todas conferidas no arquivo. Novo teste tests/regressao_citacoes.mjs (9 verificações) entra no npm test. Teste: 49 ok + 9 ok, 0 falhas. Pages publicado e conferido.

- **22h04 (commit 9f5e6ca):** dupla checagem citação x referência (referências primeiro, filtro de forma da chamada, contraprova antes de acusar) e introdução logo após o sumário do Word. Pré-projeto real: de 10 para 3 altas, as 3 restantes reais. Novo teste tests/regressao_caso2.mjs (7 verificações). Teste: 9 + 7 + 49 ok, 0 falhas. Pages conferido.

## Pendente

- D-010: substituir o PDF do manual embutido pela versão "corrigido", depois que o arquivo for salvo no computador.
- A cópia para uso fica em `C:\Users\advpi\Downloads\Corretor_Academico_PreProjeto_TCC_3.html`. As versões antigas do Downloads continuam lá, intocadas.

## Próximo passo

Testar com trabalhos reais de alunos (pré-projeto e monografia) e ajustar falsos positivos.
