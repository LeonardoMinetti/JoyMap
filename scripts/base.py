#!/usr/bin/env python3
"""Monta a base própria de lugares: planilha + mapa de um criador.
Uso: python3 scripts/base.py <planilha.xlsx> <mapa.json> [legendas.json]
Saída em data/base/ (fora do repositório, que é público)."""
import csv, json, re, sys, unicodedata, zipfile
import xml.etree.ElementTree as ET

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
CAMPOS = ['nome', 'endereco', 'bairro', 'cidade', 'instagram', 'instagram_origem', 'horario_quarta', 'horario_semana', 'pagamento', 'lat', 'lon', 'fontes', 'revisar']
GENERICAS = set('a o de da do das dos e the padaria bar restaurante cafe cafeteria cozinha pizzaria pizza boteco confeitaria house shopping metro'.split())

def planilha(caminho):
    z = zipfile.ZipFile(caminho)
    textos = []
    if 'xl/sharedStrings.xml' in z.namelist():
        textos = [''.join(t.text or '' for t in s.iter(NS + 't')) for s in ET.fromstring(z.read('xl/sharedStrings.xml'))]
    linhas = []
    for r in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).iter(NS + 'row'):
        linha = {}
        for c in r.findall(NS + 'c'):
            col = 0
            for ch in re.match(r'[A-Z]+', c.get('r')).group():
                col = col * 26 + ord(ch) - 64
            v, t = c.find(NS + 'v'), c.get('t')
            if t == 's' and v is not None:
                val = textos[int(v.text)]
            elif t == 'inlineStr':
                val = ''.join(x.text or '' for x in c.iter(NS + 't'))
            else:
                val = v.text if v is not None else ''
            linha[col - 1] = (val or '').strip()
        linhas.append(linha)
    cab = linhas[0]
    return [{cab[i]: l.get(i, '') for i in cab} for l in linhas[1:] if any(l.values())]

def palavras(s):
    s = unicodedata.normalize('NFD', s or '').encode('ascii', 'ignore').decode().lower()
    return re.findall(r'[a-z0-9]+', s)

def nucleo(nome):
    p = palavras(nome.split(' (')[0])
    return frozenset(w for w in p if w not in GENERICAS) or frozenset(p)

def numero(endereco):
    m = re.search(r'\b(\d{1,5})\b', endereco or '')
    return m.group(1) if m else ''

def arroba(valor):
    m = re.fullmatch(r'@?([A-Za-z0-9_.]{2,30})', (valor or '').strip())
    return '@' + m.group(1).lower() if m else ''

def seguro(v):  # evita que uma célula vire fórmula ao abrir no Excel (o @ do Instagram é mantido)
    v = str(v)
    return "'" + v if re.match(r'^[=+\t\r]|^-(?!\d)', v) else v

def montar(xlsx, mapa, legendas=None):
    base = []
    for r in planilha(xlsx):
        base.append({**dict.fromkeys(CAMPOS, ''), 'nome': r['Nome'], 'endereco': r['Endereço'], 'bairro': r['Bairro'], 'cidade': 'São Paulo',
                     'instagram': arroba(r['Instagram']), 'instagram_origem': 'planilha' if arroba(r['Instagram']) else '',
                     'horario_quarta': r['Horário de quarta-feira'], 'horario_semana': r['Horário semanal / complementar'],
                     'pagamento': r['Pagamento'], 'fontes': 'planilha', 'revisar': '' if r['Endereço'] else 'sem endereço'})
    dados = json.load(open(mapa, encoding='utf-8'))
    criador = dados['creator']['handle']
    arrobas = set()
    if legendas:
        for item in json.load(open(legendas, encoding='utf-8'))['items']:
            for h in re.findall(r'(?<![\w.])@([A-Za-z0-9_][A-Za-z0-9_.]{1,29})', item.get('caption') or ''):
                arrobas.add(h.lower().rstrip('.'))
    arrobas.discard(criador.lower())

    novos = juntos = 0
    for p in dados['places']:
        nome = p['name'].split(' (')[0]
        cidade = p.get('municipality') or 'São Paulo'
        achados = [b for b in base if nucleo(b['nome']) == nucleo(nome) and b['cidade'] == cidade]
        igual = next((b for b in achados if numero(b['endereco']) and numero(b['endereco']) == numero(p.get('address'))), None)
        if igual:
            juntos += 1
            igual.update(lat=p['lat'], lon=p['lon'], fontes=igual['fontes'] + f'; mapa @{criador}')
            continue
        novos += 1
        novo = {**dict.fromkeys(CAMPOS, ''), 'nome': nome, 'endereco': p.get('address') or '', 'bairro': p.get('neighborhood') or '', 'cidade': cidade,
                'lat': p['lat'], 'lon': p['lon'], 'fontes': f'mapa @{criador}'}
        avisos = ['ponto aproximado'] if p.get('geoQuality') != 'address_exact' else []
        if achados:
            avisos.append('mesmo nome na planilha em outro endereço')
        novo['revisar'] = '; '.join(avisos)
        # @ só quando o nome do local aparece inteiro dentro do @ citado nas legendas, e há um único candidato
        chave = ''.join(w for w in palavras(nome) if w in nucleo(nome))
        cand = [h for h in arrobas if len(chave) >= 5 and chave in re.sub(r'[^a-z0-9]', '', h)]
        if len(cand) == 1:
            novo.update(instagram='@' + cand[0], instagram_origem='legendas (a confirmar)')
        base.append(novo)
    return base, juntos, novos

if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    base, juntos, novos = montar(*sys.argv[1:4])
    import os
    os.makedirs('data/base', exist_ok=True)
    base.sort(key=lambda b: palavras(b['nome']))
    json.dump(base, open('data/base/lugares.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    with open('data/base/lugares.csv', 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, CAMPOS)
        w.writeheader()
        w.writerows({k: seguro(v) for k, v in b.items()} for b in base)
    conta = lambda f: sum(1 for b in base if f(b))
    print(f'total {len(base)} | do mapa: {juntos} já estavam na planilha, {novos} novos')
    print(f"com endereço {conta(lambda b: b['endereco'])} | com Instagram {conta(lambda b: b['instagram'])} | com coordenada {conta(lambda b: b['lat'] != '')} | marcados para revisar {conta(lambda b: b['revisar'])}")
    print('Instagram achado nas legendas:', ', '.join(f"{b['nome']} {b['instagram']}" for b in base if 'legendas' in b['instagram_origem']))
    print('Já na planilha:', ', '.join(b['nome'] for b in base if '; mapa' in b['fontes']))
    print('Revisar mesmo nome:', ', '.join(b['nome'] for b in base if 'outro endereço' in b['revisar']))
