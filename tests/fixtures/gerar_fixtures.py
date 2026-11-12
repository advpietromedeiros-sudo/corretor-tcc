"""Gera DOCX de teste com erros propositais (pré-projeto e monografia).

Uso: python -I tests/fixtures/gerar_fixtures.py <pasta_de_saida>
Só biblioteca padrão: o DOCX é montado à mão (document.xml + styles.xml).
"""
import os
import sys
import zipfile
from xml.sax.saxutils import escape

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

CT = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      '<Default Extension="xml" ContentType="application/xml"/>'
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
      '</Types>')
RELS = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        '</Relationships>')
DREL = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        '</Relationships>')


def styles(font, sz, line):
    return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            f'<w:styles xmlns:w="{W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="{font}" w:hAnsi="{font}" w:cs="{font}"/>'
            f'<w:sz w:val="{sz}"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="{line}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
            '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>'
            '<w:style w:type="paragraph" w:styleId="Ttulo1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/></w:rPr></w:style>'
            '</w:styles>')


def para(text, kind='body', page_break=False, hsz=None):
    ppr = ''
    if kind == 'head':
        ppr = '<w:pPr><w:pStyle w:val="Ttulo1"/>' + ('<w:pageBreakBefore/>' if page_break else '') + '</w:pPr>'
        rpr = f'<w:rPr><w:b/><w:sz w:val="{hsz}"/></w:rPr>' if hsz else '<w:rPr><w:b/></w:rPr>'
    elif kind == 'center':
        ppr = '<w:pPr><w:jc w:val="center"/></w:pPr>'
        rpr = ''
    else:
        ppr = '<w:pPr><w:jc w:val="left"/></w:pPr>'
        rpr = ''
    return f'<w:p>{ppr}<w:r>{rpr}<w:t xml:space="preserve">{escape(text)}</w:t></w:r></w:p>'


def build(path, blocks, font, sz, line, mar):
    body = ''.join(blocks)
    doc = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
           f'<w:document xmlns:w="{W}"><w:body>{body}'
           f'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="{mar}" w:right="{mar}" w:bottom="{mar}" w:left="{mar}" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>'
           '</w:body></w:document>')
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', CT)
        z.writestr('_rels/.rels', RELS)
        z.writestr('word/_rels/document.xml.rels', DREL)
        z.writestr('word/document.xml', doc)
        z.writestr('word/styles.xml', styles(font, sz, line))


LOREM = ('A pesquisa examina a aplicação da Lei Geral de Proteção de Dados pelas decisões do Tribunal de Justiça do Rio Grande do Norte, '
         'considerando a responsabilidade civil das empresas de comércio eletrônico diante de incidentes de vazamento de dados pessoais. ')


def preprojeto(out):
    b = []
    for t in ['ASSOCIAÇÃO SANTA TERESINHA DE MOSSORÓ', 'UNICATÓLICA DO RIO GRANDE DO NORTE', 'CURSO DE DIREITO', 'MARIA EDUARDA SOUZA LIMA',
              'RESPONSABILIDADE CIVIL POR VAZAMENTO DE DADOS EM EMPRESAS DE COMÉRCIO ELETRÔNICO NO RIO GRANDE DO NORTE (2020-2025)', 'MOSSORÓ/RN', '2026.1']:
        b.append(para(t, 'center'))
    b.append(para('1 INTRODUÇÃO', 'head', True))
    for _ in range(3):
        b.append(para(LOREM * 4 + 'Segundo a doutrina, a proteção de dados é direito fundamental (SILVA, 2020, p. 10).'))
    b.append(para('Em que medida o Tribunal de Justiça do Rio Grande do Norte tem aplicado a LGPD nas decisões sobre vazamento de dados por empresas de comércio eletrônico entre 2020 e 2025?'))
    b.append(para('2 JUSTIFICATIVA', 'head'))
    for _ in range(3):
        b.append(para('A relevância social do tema decorre do número crescente de consumidores afetados por vazamentos. ' + LOREM * 3 + 'Apesar disso, ainda há lacuna na análise da jurisprudência estadual.'))
    b.append(para('3 HIPÓTESES', 'head'))
    for h in ['H1: O tribunal aplica a LGPD de forma parcial.', 'H2: O tribunal privilegia o Código de Defesa do Consumidor.',
              'H3: A indenização depende da prova do dano.', 'H4: Não há uniformidade entre as câmaras.']:
        b.append(para(h))
    b.append(para('4 OBJETIVOS', 'head'))
    b.append(para('4.1 Objetivo geral', 'head'))
    b.append(para('Analisar em que medida o Tribunal de Justiça do Rio Grande do Norte aplica a LGPD nas decisões sobre vazamento de dados por empresas de comércio eletrônico.'))
    b.append(para('4.2 Objetivos específicos', 'head'))
    for o in ['Identificar os fundamentos normativos aplicáveis ao vazamento de dados.', 'Mapear as decisões do tribunal entre 2020 e 2025.',
              'Comparar as linhas de entendimento das câmaras cíveis.', 'Discutir os critérios de fixação da indenização.']:
        b.append(para(o))
    b.append(para('5 FUNDAMENTAÇÃO TEÓRICA', 'head'))
    for _ in range(8):
        b.append(para(LOREM * 5 + 'Para Doneda (2021, p. 45), a autodeterminação informativa orienta a interpretação da lei.'))
    b.append(para('6 METODOLOGIA', 'head'))
    b.append(para('A pesquisa possui natureza básica, abordagem qualitativa e objetivos exploratórios e descritivos. ' + LOREM * 2))
    b.append(para('Os procedimentos compreendem pesquisa bibliográfica, documental e jurisprudencial, com análise de acórdãos do tribunal. ' + LOREM * 2))
    b.append(para('7 CRONOGRAMA', 'head'))
    b.append(para('Etapas previstas de fevereiro a junho, com levantamento bibliográfico, coleta de acórdãos, redação e revisão final do trabalho.'))
    b.append(para('8 PROPOSTA DE SUMÁRIO PARA A MONOGRAFIA', 'head'))
    for s in ['1 INTRODUÇÃO', '2 PROTEÇÃO DE DADOS NO BRASIL', '3 ANÁLISE DOS ACÓRDÃOS', '4 CONSIDERAÇÕES FINAIS', 'REFERÊNCIAS']:
        b.append(para(s))
    b.append(para('REFERÊNCIAS', 'head'))
    refs = ['BRASIL. Lei nº 13.709, de 14 de agosto de 2018. Lei Geral de Proteção de Dados Pessoais. Brasília, DF: Presidência da República, 2018. Disponível em: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm.',
            'DONEDA, Danilo. Da privacidade à proteção de dados pessoais. 3. ed. São Paulo: Revista dos Tribunais, 2021.',
            'MENDES, Laura Schertel. Habeas data e autodeterminação informativa. Revista Brasileira de Direitos Fundamentais, Brasília, v. 12, n. 1, p. 185-216, 2018. doi:10.18593/rbdf.v12i1.17823.',
            'SILVA, João. Proteção de dados e consumo. São Paulo: Atlas, 2020.']
    for r in refs:
        b.append(para(r))
    build(os.path.join(out, 'preprojeto_erros.docx'), b, 'Calibri', 22, 240, 1418)


def monografia(out):
    b = []
    for t in ['ASSOCIAÇÃO SANTA TERESINHA DE MOSSORÓ', 'UNICATÓLICA DO RIO GRANDE DO NORTE', 'CURSO DE DIREITO', 'JOÃO PEDRO ALVES',
              'A PROTEÇÃO DE DADOS NO COMÉRCIO ELETRÔNICO: ANÁLISE DA JURISPRUDÊNCIA DO TJRN', 'MOSSORÓ/RN', '2026']:
        b.append(para(t, 'center'))
    b.append(para('JOÃO PEDRO ALVES', 'center'))
    b.append(para('Monografia apresentada ao curso de Direito da UniCatólica do Rio Grande do Norte. Orientador: Prof. Me. Fulano de Tal.', 'center'))
    b.append(para('DEDICATÓRIA', 'center'))
    b.append(para('Aos meus pais, por todo o apoio.'))
    b.append(para('RESUMO', 'head', True, 24))
    b.append(para('Este trabalho analisa a aplicação da Lei Geral de Proteção de Dados pelo tribunal estadual. ' + LOREM * 6))
    b.append(para('Palavras-chave: Proteção de dados, Responsabilidade civil, Consumidor'))
    b.append(para('1 INTRODUÇÃO', 'head', True, 24))
    for _ in range(6):
        b.append(para(LOREM * 5 + 'Conforme Doneda (2021), o tema exige atenção (Mendes, 2018) e debate (Silva, 2020).'))
    b.append(para('2 A PROTEÇÃO DE DADOS NO BRASIL', 'head', True, 24))
    for _ in range(14):
        b.append(para(LOREM * 6 + 'Para Doneda (2021, p. 45), a autodeterminação informativa orienta a interpretação da lei.'))
    b.append(para('3 ANÁLISE DOS ACÓRDÃOS', 'head', False, 24))
    for _ in range(14):
        b.append(para(LOREM * 6 + 'Os acórdãos examinados confirmaram a tendência observada pela doutrina (Mendes, 2018).'))
    b.append(para('4 CONCLUSÃO', 'head', False, 24))
    for _ in range(4):
        b.append(para('Conclui-se que a hipótese foi confirmada. ' + LOREM * 4))
    b.append(para('REFERÊNCIAS', 'head', True, 24))
    for r in ['DONEDA, Danilo. Da privacidade à proteção de dados pessoais. 3. ed. São Paulo: Revista dos Tribunais, 2021.',
              'MENDES, Laura Schertel. Habeas data e autodeterminação informativa. Revista Brasileira de Direitos Fundamentais, Brasília, v. 12, n. 1, p. 185-216, 2018.',
              'SILVA, João. Proteção de dados e consumo. São Paulo: Atlas, 2020.']:
        b.append(para(r))
    b.append(para('APÊNDICE A - Roteiro de coleta dos acórdãos', 'center'))
    b.append(para('Roteiro utilizado para a coleta: tribunal, câmara, data, ementa e resultado de cada acórdão analisado na pesquisa.'))
    build(os.path.join(out, 'monografia_erros.docx'), b, 'Arial', 24, 360, 1701)


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    os.makedirs(out, exist_ok=True)
    preprojeto(out)
    monografia(out)
    print('ok', out)
