#!/usr/bin/env python3
"""Sport Club Renese — aggiornamento automatico delle classifiche FICSF.

Ogni giorno (GitHub Actions) legge dal sito della Federazione Italiana
Canottaggio Sedile Fisso:
  - la pagina "Classifiche" dell'anno in corso e i PDF ufficiali
    (classifica società, classifica atleti, classifiche per specialità)
  - le ultime notizie / risultati pubblicati
e scrive data/classifiche.json, letto dall'app.

Se la lettura di un blocco non riesce, resta l'ultima versione buona.
Serve `pdftotext` (pacchetto poppler-utils). Nessuna libreria esterna.
"""
import datetime as dt
import html
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request

BASE = "https://ficsf.it"
PAGINA_CLASSIFICHE = BASE + "/classifiche/"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "classifiche.json")
UA = "Mozilla/5.0 (compatible; SportClubReneseApp/1.0; +https://github.com/rupi7800-blip/SpotClubRenese)"
CLUB = re.compile(r"\brenese\b", re.I)
CATEGORIE = re.compile(r"\b(ESORDIENT\w*|ALLIEV\w*|CADETT\w*|RAGAZZ\w*|JUNIOR\w*|SENIOR\w*|MASTER\w*|UNDER\s?\d+|U\d{2})\b", re.I)
SPECIALITA = ["Jole", "Elba", "Gozzo", "VIP", "Lance", "Galeone", "Lucia"]


BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
HEADERS = {
    "User-Agent": BROWSER_UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,application/json;q=0.8,*/*;q=0.7",
    "Accept-Language": "it-IT,it;q=0.9,en;q=0.6",
    "Connection": "close",
}


def _urllib(url, timeout):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(), r.geturl()


def _curl(url, timeout):
    res = subprocess.run(["curl", "-sS", "-L", "--compressed", "--max-time", str(timeout), "--retry", "2", "--retry-delay", "3",
                          "-A", BROWSER_UA, "-H", "Accept-Language: it-IT,it;q=0.9", "-w", "\n%{url_effective}", url],
                         capture_output=True, timeout=timeout + 20)
    if res.returncode != 0:
        raise RuntimeError("curl: " + res.stderr.decode("utf-8", "replace").strip()[:200])
    body, _, final = res.stdout.rpartition(b"\n")
    return body, final.decode() or url


def get(url, binary=False, timeout=40):
    """Scarica un indirizzo: prima come un browser normale, poi con curl, con qualche tentativo."""
    import time
    ultimo = None
    for tentativo in range(3):
        for metodo in (_urllib, _curl):
            try:
                data, final = metodo(url, timeout)
                return (data if binary else data.decode("utf-8", "replace")), final
            except Exception as e:  # noqa: BLE001
                ultimo = e
        time.sleep(4 * (tentativo + 1))
    raise ultimo


def links(page_html, base_url):
    out = []
    for m in re.finditer(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', page_html, re.I | re.S):
        href = urllib.parse.urljoin(base_url, html.unescape(m.group(1)))
        text = re.sub(r"<[^>]+>", " ", m.group(2))
        text = re.sub(r"\s+", " ", html.unescape(text)).strip()
        out.append((href, text))
    return out


# ---------------------------------------------------------------- pagine
def pagina_anno():
    """Trova la pagina delle classifiche dell'anno più recente che ha PDF."""
    page, final = get(PAGINA_CLASSIFICHE)
    if not re.search(r">\s*20\d\d\s*<", page):
        t = re.search(r"<title>(.*?)</title>", page, re.S | re.I)
        print(f"  risposta inattesa da {final}: titolo={t.group(1).strip()[:80] if t else '-'} · {len(page)} caratteri · "
              + re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", page))[:300], file=sys.stderr)
    anni = {}
    for href, text in links(page, final):
        m = re.fullmatch(r"(?:classifiche\s*)?(20\d\d)", text.strip(), re.I)
        if m and "ficsf.it" in href:
            anni.setdefault(int(m.group(1)), href)
    oggi = dt.date.today().year
    for anno in sorted((a for a in anni if a <= oggi + 1), reverse=True)[:3]:
        try:
            p, f = get(anni[anno])
        except Exception as e:  # noqa: BLE001
            print(f"  pagina {anno} non raggiungibile: {e}", file=sys.stderr)
            continue
        pdf = [(h, t) for h, t in links(p, f) if h.lower().split("?")[0].endswith(".pdf")]
        if pdf:
            return anno, f, pdf
    raise RuntimeError("Nessuna pagina classifiche con PDF trovata")


def data_upload(url):
    m = re.search(r"/uploads/(\d{4})/(\d{2})/", url)
    return (int(m.group(1)), int(m.group(2))) if m else (0, 0)


def scegli(pdf, parola):
    cand = [(h, t) for h, t in pdf if parola in (t + " " + h).lower()]
    if not cand:
        return None
    # il più recente per cartella di caricamento; a parità vince il primo della pagina
    best = max(range(len(cand)), key=lambda i: (data_upload(cand[i][0]), -i))
    return cand[best]


def etichetta_agg(text):
    m = re.search(r"agg\.?\s*(?:al\s*)?(\d{1,2}\s*[a-zà]+|\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)", text, re.I)
    return ("aggiornata al " + m.group(1)) if m else ""


# ---------------------------------------------------------------- PDF → testo
def pdf_testo(url):
    data, _ = get(url, binary=True, timeout=90)
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "f.pdf")
        with open(p, "wb") as fh:
            fh.write(data)
        res = subprocess.run(["pdftotext", "-layout", "-enc", "UTF-8", p, "-"], capture_output=True, timeout=120)
        if res.returncode != 0:
            raise RuntimeError("pdftotext: " + res.stderr.decode("utf-8", "replace")[:200])
        return res.stdout.decode("utf-8", "replace")


def numero(s):
    s = s.strip()
    if re.fullmatch(r"\d{1,3}(?:\.\d{3})+", s):
        s = s.replace(".", "")
    s = s.replace(",", ".")
    try:
        v = float(s)
    except ValueError:
        return None
    return int(v) if v.is_integer() else round(v, 2)


RIGA = re.compile(r"^\s*(\d{1,4})\s*[°ºª.)]?\s+(.*?\S)\s+(\d{1,3}(?:\.\d{3})+|\d+(?:[.,]\d+)?)\s*$")
RIGA_PARI = re.compile(r"^\s{0,12}([A-Za-zÀ-ÿ'\"].*?\S)\s+(\d{1,3}(?:\.\d{3})+|\d+(?:[.,]\d+)?)\s*$")
INTESTAZIONE = re.compile(r"\b(pos\.?|posizione|class\.?|societ[aà]'?|punti|punteggio|atleta|cognome|tessera|pagina|page)\b", re.I)


def colonne(testo):
    return [c.strip() for c in re.split(r"\s{2,}|\t", testo) if c.strip()]


def leggi_righe(txt):
    """Righe di classifica generiche: posizione · colonne di testo · punti (ultimo numero)."""
    righe, sezione, ultima_pos, in_tabella, rientro = [], "", 0, False, None
    for raw in txt.splitlines():
        line = raw.rstrip()
        if not line.strip():
            continue
        m = RIGA.match(line)
        if m:
            pos, mezzo, punti = int(m.group(1)), m.group(2), numero(m.group(3))
            ind = len(line) - len(line.lstrip())
            # ex aequo: la riga non ha posizione e il primo numero è un codice
            # (più rientrata delle altre, con zeri iniziali o con un salto di posizione assurdo)
            codice = (rientro is not None and ind > rientro + 3) or (m.group(1).startswith("0") and len(m.group(1)) > 1) \
                or (in_tabella and pos > ultima_pos + 40)
            if codice:
                mezzo, pos = m.group(1) + "  " + mezzo, ultima_pos
            elif rientro is None:
                rientro = ind
            cols = colonne(mezzo)
            testo = [c for c in cols if re.search(r"[A-Za-zÀ-ÿ]", c)]
            nums = [c for c in cols if not re.search(r"[A-Za-zÀ-ÿ]", c)]
            if not testo or punti is None:
                continue
            righe.append({"pos": pos, "cols": testo, "nums": nums, "punti": punti, "sezione": sezione})
            ultima_pos, in_tabella = pos, True
            continue
        mp = RIGA_PARI.match(line)
        if in_tabella and mp and not INTESTAZIONE.search(line) and len(colonne(mp.group(1))) >= 1 and not re.match(r"^\s*(totale|pagina)", line, re.I):
            cols = colonne(mp.group(1))
            testo = [c for c in cols if re.search(r"[A-Za-zÀ-ÿ]", c)]
            if testo and numero(mp.group(2)) is not None and len(" ".join(testo)) > 3:
                righe.append({"pos": ultima_pos, "cols": testo, "nums": [c for c in cols if c not in testo], "punti": numero(mp.group(2)), "sezione": sezione, "pari": True})
                continue
        s = line.strip()
        if not re.search(r"\d", s) and len(s) <= 80 and not INTESTAZIONE.search(s) and (s.isupper() or CATEGORIE.search(s)):
            sezione = re.sub(r"\s+", " ", s).title()
            ultima_pos = 0
    return righe


def classifica_societa(txt):
    out = []
    for r in leggi_righe(txt):
        nome = max(r["cols"], key=len) if len(r["cols"]) > 1 and all(CATEGORIE.search(c) is None for c in r["cols"]) else " ".join(r["cols"])
        nome = re.sub(r"^\d+\s+", "", nome).strip(" -–")
        out.append({"pos": r["pos"], "societa": nome, "punti": r["punti"], **({"sezione": r["sezione"]} if r["sezione"] else {})})
    return valida(out)


def classifica_atleti(txt, societa_note):
    note = [s.lower() for s in societa_note if s]
    out = []
    for r in leggi_righe(txt):
        cols = list(r["cols"])
        cat = next((c for c in cols if CATEGORIE.fullmatch(c.strip()) or re.fullmatch(r"[MF]|MASCH\w*|FEMM\w*", c.strip(), re.I)), None)
        if cat:
            cols.remove(cat)
        soc = None
        for c in cols:
            lc = c.lower()
            if any(lc == s or (len(lc) > 5 and (lc in s or s in lc)) for s in note):
                soc = c
                break
        if soc is None and len(cols) >= 2:
            soc = cols[-1]
        if soc in cols:
            cols.remove(soc)
        nome = " ".join(cols).strip()
        if not nome:
            continue
        tessera = next((n for n in r["nums"] if re.fullmatch(r"\d{4,}", n)), None)
        sez = r["sezione"]
        categoria = sez if sez and (not cat or cat.lower()[:5] in sez.lower()) else (cat or sez or "")
        riga = {"pos": r["pos"], "nome": nome, "societa": soc or "", "categoria": categoria, "punti": r["punti"]}
        if tessera:
            riga["tessera"] = tessera
        out.append(riga)
    return valida(out)


def valida(righe):
    if len(righe) < 3:
        raise ValueError(f"solo {len(righe)} righe riconosciute")
    # scarta righe di totali/rumore: i punti devono essere sensati
    return [r for r in righe if isinstance(r["punti"], (int, float)) and r["punti"] >= 0]


# ---------------------------------------------------------------- notizie
def notizie():
    out, visti = [], set()

    def add(titolo, url, data):
        if url in visti:
            return
        visti.add(url)
        out.append({"titolo": titolo, "url": url, "data": (data or "")[:10], "club": bool(CLUB.search(titolo))})

    for q in ("per_page=12", "per_page=10&search=renese"):
        try:
            data, _ = get(f"{BASE}/wp-json/wp/v2/posts?{q}&_fields=date,link,title")
            if not data.lstrip().startswith("["):
                raise ValueError("risposta non JSON: " + re.sub(r"\s+", " ", data)[:160])
            for p in json.loads(data):
                add(html.unescape(re.sub(r"<[^>]+>", "", p["title"]["rendered"])).strip(), p["link"], p.get("date"))
        except Exception as e:  # noqa: BLE001
            print(f"  notizie via API non disponibili ({q}): {e}", file=sys.stderr)
    if not out:
        rss, _ = get(BASE + "/feed/")
        for it in re.findall(r"<item>(.*?)</item>", rss, re.S)[:15]:
            t = re.search(r"<title>(.*?)</title>", it, re.S)
            l = re.search(r"<link>(.*?)</link>", it, re.S)
            d = re.search(r"<pubDate>(.*?)</pubDate>", it, re.S)
            if t and l:
                try:
                    dd = dt.datetime.strptime(d.group(1).strip()[:25], "%a, %d %b %Y %H:%M:%S").date().isoformat() if d else ""
                except ValueError:
                    dd = ""
                add(html.unescape(re.sub(r"<!\[CDATA\[|\]\]>", "", t.group(1))).strip(), l.group(1).strip(), dd)
    out.sort(key=lambda x: x["data"], reverse=True)
    return out[:20]


# ---------------------------------------------------------------- principale
def blocco(titolo, url, righe):
    return {"titolo": titolo, "url": url, "aggiornamento": etichetta_agg(titolo), "righe": righe}


def main():
    try:
        with open(OUT, encoding="utf-8") as fh:
            vecchio = json.load(fh)
    except Exception:  # noqa: BLE001
        vecchio = {}
    nuovo = {"fonte": PAGINA_CLASSIFICHE, "anno": vecchio.get("anno"), "societa": vecchio.get("societa"), "atleti": vecchio.get("atleti"),
             "specialita": vecchio.get("specialita") or [], "notizie": vecchio.get("notizie") or []}
    problemi = []

    try:
        anno, pagina, pdf = pagina_anno()
        nuovo["anno"], nuovo["pagina"] = anno, pagina
        print(f"Classifiche {anno}: {len(pdf)} PDF su {pagina}")

        soc = scegli(pdf, "societ")
        if soc:
            try:
                righe = classifica_societa(pdf_testo(soc[0]))
                nuovo["societa"] = blocco(soc[1], soc[0], righe)
                print(f"  società: {len(righe)} righe")
            except Exception as e:  # noqa: BLE001
                problemi.append(f"classifica società non letta ({e})")
                if nuovo["societa"] is not None:
                    nuovo["societa"]["url"] = soc[0]

        nomi_soc = [r["societa"] for r in ((nuovo.get("societa") or {}).get("righe") or [])]
        atl = scegli(pdf, "atlet")
        if atl:
            try:
                righe = classifica_atleti(pdf_testo(atl[0]), nomi_soc)
                nuovo["atleti"] = blocco(atl[1], atl[0], righe)
                print(f"  atleti: {len(righe)} righe")
            except Exception as e:  # noqa: BLE001
                problemi.append(f"classifica atleti non letta ({e})")

        spec = []
        for nome in SPECIALITA:
            c = scegli(pdf, nome.lower())
            if not c or "societ" in c[1].lower() or "atlet" in c[1].lower():
                continue
            try:
                righe = classifica_societa(pdf_testo(c[0]))
                spec.append({"nome": nome, **blocco(c[1], c[0], righe)})
                print(f"  {nome}: {len(righe)} righe")
            except Exception as e:  # noqa: BLE001
                old = next((s for s in nuovo["specialita"] if s.get("nome") == nome), None)
                if old:
                    spec.append(old)
                problemi.append(f"{nome} non letta ({e})")
        if spec:
            nuovo["specialita"] = spec
    except Exception as e:  # noqa: BLE001
        problemi.append(f"pagina classifiche non raggiungibile ({e})")

    try:
        n = notizie()
        if n:
            nuovo["notizie"] = n
    except Exception as e:  # noqa: BLE001
        problemi.append(f"notizie non lette ({e})")

    ok = bool(nuovo.get("societa") and nuovo["societa"].get("righe"))
    nuovo["stato"] = "ok" if ok and not problemi else ("parziale" if ok else "vuoto")
    nuovo["messaggio"] = ("Ultimo controllo: " + "; ".join(problemi) + ". Restano i dati letti in precedenza.") if problemi else ""

    confronta = lambda d: json.dumps({k: v for k, v in d.items() if k not in ("aggiornato", "controllato")}, sort_keys=True, ensure_ascii=False)
    adesso = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    cambiato = confronta(nuovo) != confronta(vecchio)
    nuovo["aggiornato"] = adesso if cambiato else vecchio.get("aggiornato", adesso)
    nuovo["controllato"] = adesso
    # se non cambia nulla riscrivo solo una volta a settimana (tiene attiva l'automazione)
    ultimo = vecchio.get("controllato")
    if not cambiato and ultimo:
        try:
            if dt.datetime.fromisoformat(adesso) - dt.datetime.fromisoformat(ultimo) < dt.timedelta(days=6):
                print("Nessuna novità.")
                return 0
        except ValueError:
            pass
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(nuovo, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    print("Scritto", os.path.relpath(OUT), "·", nuovo["stato"], ("· " + nuovo["messaggio"]) if problemi else "")
    return 0


if __name__ == "__main__":
    sys.exit(main())
