#!/usr/bin/env python3
"""Põe coordenadas na base (data/base) usando o arquivo de endereços do IBGE (CNEFE 2022), sem serviço externo.
Uso: python3 scripts/geocodificar.py <3550308_SAO_PAULO.zip>     (rodar depois de scripts/base.py)"""
import csv, io, json, math, re, statistics, sys, unicodedata, zipfile
sys.path.insert(0, 'scripts')
from base import CAMPOS, seguro

TIPOS = {'rua', 'r', 'avenida', 'av', 'alameda', 'al', 'praca', 'pca', 'pc', 'travessa', 'tv', 'largo', 'estrada', 'rodovia', 'viela'}
TITULOS = set('doutor dr doutora dra professor prof professora engenheiro eng padre pe dom coronel cel capitao cap major maj general gen marechal mal presidente pres deputado dep senador sen vereador ver conego monsenhor mons frei sao santo santa nossa senhora sra barao visconde conde duque almirante brigadeiro brig comendador com ministro min governador gov desembargador des conselheiro cons maestro tenente ten sargento sgt dona padres'.split())
LIGACOES = {'de', 'da', 'do', 'dos', 'das', 'e'}

def palavras(s):
    return re.findall(r'[a-z0-9]+', unicodedata.normalize('NFD', s or '').encode('ascii', 'ignore').decode().lower())

def chave(tokens):
    t = [w for w in tokens if w not in LIGACOES]
    sem = [w for w in t if w not in TITULOS]
    return ' '.join(sem or t)

def separar(endereco):
    """'Av. Paulista, 1510 - loja 2' -> (tipo, chave da rua, número)."""
    m = re.match(r'\s*([^,\d][^,]*?)\s*(?:,|\s(?=\d+\b))\s*(?:n[º°o.]*\s*)?(\d{1,3}\.\d{3}(?!\d)|\d+)', endereco or '')
    if not m:
        return None
    t = palavras(m.group(1))
    tipo = ''
    if t and t[0] in TIPOS:
        tipo, t = t[0], t[1:]
    tipo = {'r': 'rua', 'av': 'avenida', 'al': 'alameda', 'pca': 'praca', 'pc': 'praca', 'tv': 'travessa'}.get(tipo, tipo)
    return tipo, chave(t), int(m.group(2).replace('.', ''))

def metros(a, b):
    p = math.pi / 180
    return 12742000 * math.asin(math.sqrt(math.sin((b[0] - a[0]) * p / 2) ** 2 + math.cos(a[0] * p) * math.cos(b[0] * p) * math.sin((b[1] - a[1]) * p / 2) ** 2))

def indice(zip_path, ruas):
    z = zipfile.ZipFile(zip_path)
    f = io.TextIOWrapper(z.open(z.namelist()[0]), encoding='latin-1', newline='')
    achados = {}
    for r in csv.DictReader(f, delimiter=';'):
        k = chave(palavras(r['NOM_TITULO_SEGLOGR'] + ' ' + r['NOM_SEGLOGR']))
        if k not in ruas:
            continue
        try:
            n, ponto = int(r['NUM_ENDERECO']), (float(r['LATITUDE']), float(r['LONGITUDE']))
        except ValueError:
            continue
        if n > 0:
            achados.setdefault(k, []).append((n, ponto, palavras(r['NOM_TIPO_SEGLOGR'])[:1], chave(palavras(r['DSC_LOCALIDADE']))))
    return achados

def localizar(linhas, tipo, n, bairro):
    do_tipo = [l for l in linhas if l[2] == [tipo]]
    linhas = do_tipo or linhas
    bairros = {chave(palavras(b)) for b in (bairro or '').split(',') if b.strip()}
    exato = [l for l in linhas if l[0] == n]
    precisao = 'número exato'
    if not exato:
        mesmo_lado = [l for l in linhas if l[0] % 2 == n % 2]
        if not mesmo_lado:
            return None
        perto = min(abs(l[0] - n) for l in mesmo_lado)
        if perto > 100:
            return None
        exato = [l for l in mesmo_lado if abs(l[0] - n) == perto]
        precisao = 'número vizinho'
    no_bairro = [l for l in exato if any(b and (b in l[3] or l[3] in b) for b in bairros if l[3])]
    escolhidos = no_bairro or exato
    ponto = (statistics.median(l[1][0] for l in escolhidos), statistics.median(l[1][1] for l in escolhidos))
    if max(metros(ponto, l[1]) for l in escolhidos) > 500:
        return None  # ruas homônimas distantes: não dá para escolher com segurança
    return ponto, precisao

if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    base = json.load(open('data/base/lugares.json', encoding='utf-8'))
    alvos = [(b, separar(b['endereco'])) for b in base if b['cidade'] == 'São Paulo']
    idx = indice(sys.argv[1], {s[1] for _, s in alvos if s and s[1]})
    conta = {}
    for b, s in alvos:
        r = s and s[1] in idx and localizar(idx[s[1]], s[0], s[2], b['bairro'])
        if r:
            b['lat'], b['lon'], b['ponto'] = round(r[0][0], 6), round(r[0][1], 6), 'IBGE, ' + r[1]
        res = b['ponto'] if r else ('sem endereço completo' if not s else 'rua ou número não encontrado')
        conta[res] = conta.get(res, 0) + 1
    for b in base:
        b.setdefault('ponto', 'mapa do criador, a confirmar' if b['lat'] != '' else '')
    json.dump(base, open('data/base/lugares.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    with open('data/base/lugares.csv', 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, CAMPOS + ['ponto'])
        w.writeheader()
        w.writerows({k: seguro(v) for k, v in b.items()} for b in base)
    print('São Paulo:', len(alvos), conta)
    print('com coordenada no total:', sum(1 for b in base if b['lat'] != ''), 'de', len(base))
    print('exemplos não encontrados:', [(b['nome'], b['endereco']) for b, s in alvos if not b.get('ponto', '').startswith('IBGE')][:25])
