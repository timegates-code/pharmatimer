#!/usr/bin/env python3
"""PharmaTimer -- inventario di struttura e qualita (audit in sola lettura).

Uso:  python3 scripts/audit/inventario.py [--voce N] [--compatto]
Non modifica nulla. Stampa, per ciascuna delle diciannove voci, lo elenco vivo
rigenerato dal disco. Nessun atteso e cablato: le liste si DERIVANO, cosi
non possono invecchiare. Uscita 0 sempre: e un inventario, non un gate.

Con --compatto stampa il SOLO esito per voce, che e la forma usata da
make check; il dettaglio resta su make inventario. Lo esito non e un
riassunto scritto a mano: lo calcola la voce stessa dai propri dati, e in
modo esteso viene stampato in coda alla voce, cosi le due forme non
possono divergere.

Origine: sessione di audit par.22.198-unoctogies.
"""
import contextlib, io, json, os, re, subprocess, sys, tomllib

SKIP_DIRS = {"node_modules", "venv", ".git", "dist", "dist-mini",
             "__pycache__", ".pytest_cache", "pharmatimer_api.egg-info"}


def walk(base, exts):
    out = []
    for root, dirs, files in os.walk(base):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fn in files:
            if fn.endswith(exts) and ".bak" not in fn:
                out.append(os.path.join(root, fn))
    return sorted(out)


def read(p):
    try:
        return io.open(p, encoding="utf-8", errors="ignore").read()
    except Exception:
        return ""


def tracked(p):
    return subprocess.run(["git", "ls-files", "--error-unmatch", p],
                          capture_output=True).returncode == 0


COMPATTO = False
_REALE = sys.stdout          # lo stdout vero, prima di ogni redirect


def head(n, titolo):
    if COMPATTO:
        _REALE.write("VOCE %2d  %s\n" % (n, titolo))
        return
    print("\n" + "=" * 72)
    print("VOCE %d -- %s" % (n, titolo))
    print("=" * 72)


def esito(fmt, *a):
    """Lo esito di una voce: una riga sola, derivata dai dati della voce.

    Scrive sul flusso VERO, non su quello redirezionato, cosi sopravvive
    alla soppressione del dettaglio in modo compatto.
    """
    _REALE.write("         %s\n" % (fmt % a if a else fmt))


def righe(items, vuoto="nessuna"):
    if not items:
        print("  %s" % vuoto)
    for i in items:
        print("  %s" % i)


# ---------------------------------------------------------------- 1
def voce1():
    head(1, "file non importati da nessuno; rotte non registrate")
    src = [p for p in walk("src", (".js", ".jsx")) if ".test." not in p and ".spec." not in p]
    corpus = "".join(read(p) for p in walk("src", (".js", ".jsx")))
    corpus += read("vite.config.js") + read("vitest.config.js") + read("index.html")
    imported = set(re.findall(r"""['"][^'"]*?/?([A-Za-z0-9_.-]+\.jsx?)['"]""", corpus))
    orfani = []
    for p in src:
        b = os.path.basename(p)
        if b not in imported:
            orfani.append("%-52s %3d righe" % (p, len(read(p).split("\n"))))
    print("-- frontend: moduli non-test mai importati per nome di file")
    righe(orfani)
    print("\n-- backend: moduli .py mai nominati da altro modulo")
    py = walk("backend", (".py",))
    bod = {p: read(p) for p in py}
    orf = []
    for p in py:
        b = os.path.basename(p)
        if b == "__init__.py" or b == "conftest.py" or b.startswith("test_"):
            continue
        stem = b[:-3]
        if not any(q != p and re.search(r"\b%s\b" % re.escape(stem), t) for q, t in bod.items()):
            orf.append("%-56s %3d righe" % (p, len(bod[p].split("\n"))))
    righe(orf)
    print("\n-- router definiti contro registrati in app.py")
    app = read("backend/pharmatimer_api/app.py")
    rd = "backend/pharmatimer_api/routers"
    n_router, n_reg = 0, 0
    for fn in sorted(os.listdir(rd)):
        if not fn.endswith(".py") or fn == "__init__.py":
            continue
        r = fn[:-3]
        reg = ("include_router(%s" % r) in app or ("include_router(_%s_module" % r) in app
        n_router += 1
        n_reg += 1 if reg else 0
        print("  %-16s registrato=%s" % (r, "SI" if reg else "NO -- ROTTA NON REGISTRATA"))
    esito("orfani: frontend %d, backend %d; router registrati %d/%d%s",
          len(orfani), len(orf), n_reg, n_router,
          "" if n_reg == n_router else "  <-- ROTTA NON REGISTRATA")


# ---------------------------------------------------------------- 2
def voce2():
    head(2, "file duplicati o quasi duplicati")
    import hashlib
    by_hash, by_name = {}, {}
    out = subprocess.run(["git", "ls-files"], capture_output=True, text=True).stdout.split("\n")
    for p in [x for x in out if x]:
        if not os.path.isfile(p):
            continue
        h = hashlib.md5(open(p, "rb").read()).hexdigest()
        by_hash.setdefault(h, []).append(p)
        by_name.setdefault(os.path.basename(p), []).append(p)
    print("-- duplicati ESATTI (md5 identico, esclusi file vuoti)")
    dup = [v for h, v in by_hash.items() if len(v) > 1 and os.path.getsize(v[0]) > 0]
    righe([" | ".join(v) for v in dup], "nessuno")
    print("\n-- basename identico in cartelle diverse (candidati quasi-duplicati)")
    nm = [(k, v) for k, v in by_name.items() if len(v) > 1 and k != "__init__.py"]
    for k, v in sorted(nm):
        dims = ["%s(%d righe)" % (p, len(read(p).split("\n"))) for p in v]
        print("  %-24s %s" % (k, " | ".join(dims)))
    esito("duplicati esatti %d; basename ripetuti in cartelle diverse %d",
          len(dup), len(nm))


# ---------------------------------------------------------------- 3
def voce3():
    head(3, "cartelle fuori convenzione")
    dichiarata = "CONVENZIONE DI CARTELLE" in read("CLAUDE.md")
    if dichiarata:
        print("-- convenzione di cartelle DICHIARATA in CLAUDE.md (sezione omonima).")
        print("   Il confronto fra struttura viva e norma resta da fare a occhio:")
        print("   qui si stampa la struttura, che e la meta misurabile.")
    else:
        print("-- NESSUNA convenzione di cartelle e DICHIARATA in CLAUDE.md.")
        print("   Senza norma dichiarata non esiste il predicato *fuori convenzione*:")
        print("   qui si stampa la struttura viva, che e un inventario e non un giudizio.")
    print("\n-- cartelle di primo livello sotto src/ (con conteggio moduli non-test)")
    for d in sorted(x for x in os.listdir("src") if os.path.isdir(os.path.join("src", x))):
        n = len([p for p in walk(os.path.join("src", d), (".js", ".jsx"))
                 if ".test." not in p and ".spec." not in p])
        print("  src/%-22s %3d moduli" % (d + "/", n))
    print("\n-- file transitori .bak dentro alberi di CODICE (ignorati da git, ma in sede tracciata)")
    baks = []
    for base in ("src", "backend/pharmatimer_api", "backend/tests", "scripts"):
        for root, dirs, files in os.walk(base):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            baks += [os.path.join(root, f) for f in files if ".bak" in f]
    righe(["%-58s %s" % (p, "TRACCIATO" if tracked(p) else "ignorato") for p in sorted(baks)])
    esito("%s; .bak in alberi di codice: %d (tracciati %d)",
          "convenzione DICHIARATA in CLAUDE.md" if dichiarata else "nessuna convenzione dichiarata",
          len(baks), sum(1 for p in baks if tracked(p)))


# ---------------------------------------------------------------- 4
def voce4():
    head(4, "codice morto dentro i file: export mai referenziati altrove")
    files = {p: read(p) for p in walk("src", (".js", ".jsx"))}
    exp_re = re.compile(r"^export\s+(?:async\s+)?(?:function|const|class|let)\s+([A-Za-z_$][\w$]*)", re.M)
    exp_ls = re.compile(r"^export\s*\{([^}]*)\}", re.M)
    out = []
    for p, t in files.items():
        names = set(exp_re.findall(t))
        for grp in exp_ls.findall(t):
            for n in grp.split(","):
                n = n.strip().split(" as ")[-1].strip()
                if n and n.isidentifier():
                    names.add(n)
        for n in sorted(names):
            if not any(q != p and re.search(r"\b%s\b" % re.escape(n), tt) for q, tt in files.items()):
                out.append("%-50s %-28s (%d occorrenze nel proprio file)"
                           % (p, n, len(re.findall(r"\b%s\b" % re.escape(n), t))))
    righe(sorted(out))
    esito("export mai referenziati fuori dal proprio file: %d", len(out))


# ---------------------------------------------------------------- 5
def voce5():
    head(5, "dipendenze npm e pip: non usate, duplicate, non fissate")
    pkg = json.load(open("package.json"))
    corpus = "".join(read(p) for p in walk(".", (".js", ".jsx", ".mjs", ".html", ".cjs"))
                     if "package" not in os.path.basename(p))
    print("-- npm (la sorgente package.json e ESCLUSA dal corpus: evita la tautologia)")
    npm_tot, npm_non_usate, npm_non_fissate = 0, 0, 0
    for lab in ("dependencies", "devDependencies"):
        print("   [%s]" % lab)
        for k, v in sorted(pkg.get(lab, {}).items()):
            used = bool(re.search(r"""(from\s+['"]%s['"/]|require\(['"]%s['"/]|['"]%s['"])"""
                                  % ((re.escape(k),) * 3), corpus)) or k in corpus
            pin = "SI" if not re.match(r"^[\^~]", v) else "no"
            npm_tot += 1
            npm_non_usate += 0 if used else 1
            npm_non_fissate += 0 if pin == "SI" else 1
            print("     %-28s %-12s usato=%-3s fissato=%s" % (k, v, "SI" if used else "NO", pin))
    print("\n-- pip: requirements.txt contro pyproject.toml")
    ha_req = os.path.exists("backend/requirements.txt")
    req = [l.strip() for l in read("backend/requirements.txt").split("\n") if l.strip()]
    # Il pyproject si legge con un parser vero, non con un regex. Il regex
    # precedente, "dependencies = \[(.*?)\]" non greedy, si fermava sul primo
    # ] della stringa -- cioe su quello DENTRO "uvicorn[standard]" -- e rendeva
    # una sola dipendenza su sei. La voce ha misurato male finche il confronto
    # con requirements.txt ha nascosto lo sbaglio.
    with open("backend/pyproject.toml", "rb") as fh:
        _proj = tomllib.load(fh).get("project", {})
    pyp = list(_proj.get("dependencies", []))
    pyp_dev = list(_proj.get("optional-dependencies", {}).get("dev", []))
    if not ha_req:
        print("   requirements.txt : ASSENTE -- fonte unica pyproject.toml.")
        print("   Rimosso alla sessione di rimedio: nessuno lo leggeva, e")
        print("   deploy/02-setup-pharmatimer-venv.sh lo saltava di proposito")
        print("   installando da pyproject (rimedio D-NEW#3 e D-NEW#4).")
    else:
        print("   requirements.txt : %d voci, fissate=%d" % (len(req), sum(1 for r in req if re.search(r"[<>=~]", r))))
    righe(["req  " + r for r in req], "nessuna -- il file non esiste piu")
    print("   pyproject        : %d voci di prodotto, fissate=%d; piu %d dev, fissate=%d"
          % (len(pyp), sum(1 for r in pyp if re.search(r"[<>=~]", r)),
             len(pyp_dev), sum(1 for r in pyp_dev if re.search(r"[<>=~]", r))))
    righe(["pyp  " + r for r in pyp] + ["dev  " + r for r in pyp_dev])
    def nome(x): return re.split(r"[<>=~\[]", x)[0]
    solo_req = sorted(set(map(nome, req)) - set(map(nome, pyp)))
    solo_pyp = sorted(set(map(nome, pyp)) - set(map(nome, req)))
    print("   presenti SOLO in requirements.txt: %s" % (solo_req or "nessuna"))
    print("   presenti SOLO in pyproject.toml  : %s" % (solo_pyp or "nessuna"))
    req_non_fissate = sum(1 for r in req if not re.search(r"[<>=~]", r))
    pyp_non_fissate = sum(1 for r in pyp if not re.search(r"[<>=~]", r))
    if ha_req:
        esito("npm %d: non usate %d, non fissate %d | pip: solo-req %d, solo-pyp %d, "
              "non fissate req %d pyp %d",
              npm_tot, npm_non_usate, npm_non_fissate,
              len(solo_req), len(solo_pyp), req_non_fissate, pyp_non_fissate)
    else:
        esito("npm %d: non usate %d, non fissate %d | pip: fonte unica pyproject, "
              "%d voci, non fissate %d",
              npm_tot, npm_non_usate, npm_non_fissate, len(pyp), pyp_non_fissate)


# ---------------------------------------------------------------- 6
def voce6():
    head(6, "file generati o binari committati; gitignore")
    ls = [x for x in subprocess.run(["git", "ls-files"], capture_output=True, text=True).stdout.split("\n") if x]
    bins = [p for p in ls if re.search(r"\.(png|jpe?g|ico|webp|woff2?|ttf|zip|pdf|db|sqlite|map)$", p)]
    print("-- binari tracciati")
    righe(bins, "nessuno")
    print("\n-- fra questi, quali sono GENERATI da uno script del repo")
    gen = read("scripts/genera-icone.mjs")
    righe([p for p in bins if os.path.basename(p) in gen], "nessuno")
    print("\n-- artefatti di build tracciati (attesi ZERO)")
    build = [p for p in ls if re.match(r"^(dist|dist-mini|node_modules)/", p)]
    righe(build, "nessuno")
    print("\n-- untracked NON ignorati (produrrebbero DRIFT sul CP0)")
    porc = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True).stdout
    drift = [l for l in porc.split("\n") if l.strip()]
    righe(drift, "nessuno -- TREE pulito")
    esito("binari tracciati %d; artefatti di build tracciati %d; TREE sporco %d",
          len(bins), len(build), len(drift))


# ---------------------------------------------------------------- 7
def voce7():
    head(7, "variabili d ambiente lette e definite; config duplicate")
    settings = set(re.findall(r"^\s{4}([A-Z_]+):", read("backend/pharmatimer_api/config.py"), re.M))
    osenv = set()
    for p in walk("backend", (".py",)):
        osenv |= set(re.findall(r"""os\.environ(?:\.get\(|\[)['"]([A-Z_]+)""", read(p)))
    vite = set()
    for p in walk("src", (".js", ".jsx")) + ["vite.config.js"]:
        vite |= set(re.findall(r"import\.meta\.env\.(VITE_[A-Z0-9_]+)", read(p)))
    envs = {}
    for f in (".env.mini", "backend/.env.dev.example", "backend/.env.dev"):
        if os.path.exists(f):
            envs[f] = set(re.findall(r"^([A-Z_][A-Z0-9_]*)=", read(f), re.M))
    lette = settings | osenv
    print("-- lette dal backend (%d): %s" % (len(lette), sorted(lette)))
    print("-- lette dal frontend (%d): %s" % (len(vite), sorted(vite)))
    alldef = set().union(*envs.values()) if envs else set()
    print("\n-- DEFINITE e MAI LETTE")
    n_mute = 0
    for f, ks in envs.items():
        mute = sorted(ks - lette - vite)
        n_mute += len(mute)
        righe(["%s: %s" % (f, k) for k in mute], "%s: nessuna" % f)
    print("\n-- LETTE e MAI DEFINITE in alcun file .env (hanno default nel codice o vengono da CLI)")
    orfane = sorted((lette | vite) - alldef)
    righe(orfane)
    print("\n-- divergenza .env.dev contro .env.dev.example")
    n_div = 0
    if "backend/.env.dev" in envs and "backend/.env.dev.example" in envs:
        a, b = envs["backend/.env.dev"], envs["backend/.env.dev.example"]
        n_div = len(a ^ b)
        print("   solo nel reale: %s" % (sorted(a - b) or "nessuna"))
        print("   solo nello example: %s" % (sorted(b - a) or "nessuna"))
    esito("lette be %d fe %d; definite e mai lette %d; lette e mai definite %d; "
          "divergenza dev/example %d",
          len(lette), len(vite), n_mute, len(orfane), n_div)


# ---------------------------------------------------------------- 8
def voce8():
    head(8, "eccezioni catturate e ignorate")
    print("-- JS: catch vuoto, e catch col solo commento (assorbimento dichiarato)")
    vuoti, commentati = [], []
    for p in walk("src", (".js", ".jsx")):
        t = read(p)
        for m in re.finditer(r"catch\s*(\([^)]*\))?\s*\{\s*\}", t):
            vuoti.append("%s:%d" % (p, t[:m.start()].count("\n") + 1))
        for m in re.finditer(r"catch\s*(\([^)]*\))?\s*\{\s*(//[^\n]*\n\s*)+\}", t):
            nota = [l.strip() for l in m.group(0).split("\n") if l.strip().startswith("//")]
            commentati.append("%s:%d  %s" % (p, t[:m.start()].count("\n") + 1, nota[0][:66] if nota else ""))
    print("   MUTI (nessuna motivazione): %d" % len(vuoti))
    righe(vuoti, "nessuno")
    print("   ANNOTATI (assorbimento motivato in loco): %d" % len(commentati))
    righe(commentati, "nessuno")
    print("\n-- Python: except seguito da pass, e except nudo")
    ep, nudo = [], []
    for p in walk("backend", (".py",)):
        ls = read(p).split("\n")
        for i, l in enumerate(ls):
            if re.match(r"^\s*except\s*:\s*$", l):
                nudo.append("%s:%d" % (p, i + 1))
            if re.match(r"^\s*except[^:]*:\s*$", l) and i + 1 < len(ls) and ls[i + 1].strip().startswith("pass"):
                ep.append("%s:%d  [%s]" % (p, i + 1,
                          "MIGRAZIONE one-shot" if "/migrations/" in p else "CODICE DI PRODOTTO"))
    print("   except nudo: %d" % len(nudo)); righe(nudo, "nessuno")
    print("   except-pass: %d" % len(ep)); righe(ep, "nessuno")
    ep_prod = sum(1 for x in ep if "CODICE DI PRODOTTO" in x)
    esito("JS catch muti %d, annotati %d; py except nudo %d, except-pass %d "
          "(di cui in codice di prodotto %d)",
          len(vuoti), len(commentati), len(nudo), len(ep), ep_prod)


# ---------------------------------------------------------------- 9
def voce9():
    head(9, "endpoint backend contro chiamate frontend; copie dei tipi")
    eps = []
    rd = "backend/pharmatimer_api/routers"
    for fn in sorted(os.listdir(rd)):
        if not fn.endswith(".py") or fn == "__init__.py":
            continue
        t = read(os.path.join(rd, fn))
        m = re.search(r'APIRouter\([^)]*prefix\s*=\s*"([^"]*)"', t, re.S)
        pre = m.group(1) if m else ""
        for meth, path in re.findall(r'@router\.(get|post|put|patch|delete)\(\s*"([^"]*)"', t):
            eps.append((meth.upper(), pre + path, fn))
    src = "".join(read(p) for p in walk("src", (".js", ".jsx")) if ".test." not in p)
    calls = set(re.findall(r"""["'`](/api/[^"'`\s?]*)""", src))
    def base(p): return re.sub(r"\{[^}]+\}", "{}", p).split("{")[0].rstrip("/")
    print("-- endpoint dichiarati: %d" % len(eps))
    print("-- path /api citati dal frontend non-test: %d" % len(calls))
    print("\n-- MAI CHIAMATI dal frontend")
    muti = [(m, p, f) for m, p, f in sorted(eps, key=lambda x: x[1])
            if not any(base(c).startswith(base(p)) for c in calls)]
    righe(["%-6s %-46s %s" % (m, p, f) for m, p, f in muti], "nessuno")
    print("\n-- CHIAMATE senza endpoint dichiarato")
    orfane = sorted(c for c in calls if not any(base(c).startswith(base(p)) for _, p, _ in eps))
    righe(orfane, "nessuna")
    print("\n-- copie dei tipi di payload")
    md = "backend/pharmatimer_api/models"
    n_py = len([f for f in os.listdir(md) if f.endswith(".py") and f != "__init__.py"])
    n_js = sum(read(p).count("@typedef") for p in
               ("src/data/repository/IRepository.js", "src/domain/types.js"))
    print("   pydantic backend : %d moduli in %s" % (n_py, md))
    print("   JSDoc frontend   : %d typedef fra IRepository.js e domain/types.js" % n_js)
    n_gen = len([p for p in walk("src", (".js",)) if "openapi" in read(p).lower()])
    print("   client generato da openapi: %d file (0 = i tipi vivono in DUE copie non collegate)"
          % n_gen)
    esito("endpoint %d, mai chiamati %d; chiamate senza endpoint %d; "
          "tipi in %d copie non collegate",
          len(eps), len(muti), len(orfane), 1 if n_gen else 2)


# ---------------------------------------------------------------- 10
def voce10():
    head(10, "test presenti, saltati, rotti; copertura per area")
    ft = [p for p in walk("src", (".js", ".jsx")) if ".test." in p or ".spec." in p]
    bt = [p for p in walk("backend/tests", (".py",)) if os.path.basename(p).startswith("test_")]
    print("-- file di test: frontend %d, backend %d" % (len(ft), len(bt)))
    skip_js, skip_py = [], []
    for p in ft:
        for i, l in enumerate(read(p).split("\n")):
            if re.search(r"\b(it|test|describe)\.(skip|only|todo)\(", l):
                skip_js.append("%s:%d" % (p, i + 1))
    for p in bt:
        for i, l in enumerate(read(p).split("\n")):
            if re.match(r"^\s*@pytest\.mark\.(skip|xfail)", l):
                skip_py.append("%s:%d  %s" % (p, i + 1, l.strip()))
    print("-- marcatori di salto ATTIVI (decoratori, non commenti): js=%d py=%d"
          % (len(skip_js), len(skip_py)))
    righe(skip_js + skip_py, "nessuno")
    print("\n-- copertura per area: moduli non-test contro file di test")
    from collections import defaultdict
    agg = defaultdict(lambda: [0, 0])
    for p in walk("src", (".js", ".jsx")):
        d = os.path.dirname(p)
        agg[d][1 if (".test." in p or ".spec." in p) else 0] += 1
    zero = 0
    for d in sorted(agg):
        s, t = agg[d]
        if s and not t:
            zero += 1
        print("   %-42s src=%-3d test=%-3d%s" % (d, s, t, "   <-- ZERO TEST" if s and not t else ""))
    esito("file di test fe %d be %d; marcatori di salto js %d py %d; aree a zero test %d",
          len(ft), len(bt), len(skip_js), len(skip_py), zero)


# ---------------------------------------------------------------- 11
def voce11():
    head(11, "lint e formatter")
    cfgs = [f for f in os.listdir(".") if re.match(
        r"^(\.eslintrc|eslint\.config|\.prettierrc|prettier\.config|biome\.json|\.editorconfig)", f)]
    pkg = json.load(open("package.json"))
    tools = [k for k in list(pkg.get("dependencies", {})) + list(pkg.get("devDependencies", {}))
             if re.search(r"eslint|prettier|biome", k)]
    scripts = [k for k in pkg.get("scripts", {}) if re.search(r"lint|format|fmt", k)]
    pyt = [t for t in ("ruff", "black", "flake8", "isort")
           if t in read("backend/pyproject.toml") + read("backend/requirements.txt")]
    print("   config nella root      : %s" % (cfgs or "NESSUNA"))
    print("   pacchetti npm di lint  : %s" % (tools or "NESSUNO"))
    print("   script npm di lint     : %s" % (scripts or "NESSUNO"))
    print("   linter python          : %s" % (pyt or "NESSUNO"))
    print("\n   ESITO: %s" % ("configurato" if (cfgs and tools) else
          "NON CONFIGURATO -- non esiste lint da eseguire in questo repo"))
    esito("lint %s: config %d, pacchetti npm %d, script npm %d, linter python %s",
          "CONFIGURATO" if (cfgs and tools) else "NON CONFIGURATO",
          len(cfgs), len(tools), len(scripts), ",".join(pyt) or "nessuno")


# ---------------------------------------------------------------- 12
def voce12():
    head(12, "documentazione: chi e referenziato da CLAUDE.md o README")
    claude, readme = read("CLAUDE.md"), read("README.md")
    docs = sorted([f for f in os.listdir(".") if f.endswith(".md")] +
                  ["docs/" + f for f in os.listdir("docs") if f.endswith(".md")])
    print("   %-44s %-8s %-8s %s" % ("file", "CLAUDE", "README", "git"))
    for d in docs:
        b = os.path.basename(d)
        print("   %-44s %-8s %-8s %s" % (
            d, "SI" if b in claude else "no", "SI" if b in readme else "no",
            "tracciato" if tracked(d) else "IGNORED"))
    print("\n-- NON referenziati da nessuno dei due")
    muti = [d for d in docs if os.path.basename(d) not in claude
            and os.path.basename(d) not in readme]
    righe(muti)
    esito("documenti %d, non referenziati ne da CLAUDE.md ne da README %d",
          len(docs), len(muti))




def _migrazioni():
    """I file .sql di migrazione, in ordine di versione."""
    d = "backend/db/migrations"
    return [os.path.join(d, f) for f in sorted(os.listdir(d)) if f.endswith(".sql")]


def _ddl_ripiegato():
    """Schema DICHIARATO come RIPIEGAMENTO della catena di migrazioni.

    Parte dai CREATE TABLE e applica in ordine ogni MODIFY COLUMN e ADD COLUMN.
    Leggere il solo CREATE TABLE e stantio per costruzione appena esce una
    migrazione: v01 dichiara ora_ricalcolata TIME e v04 la porta a DATETIME.
    Rende {tabella: [(colonna, tipo, nullable)]} piu {tabella: [indici unici]}.
    """
    cols, uniq = {}, {}
    for f in _migrazioni():
        t = read(f)
        for m in re.finditer(r"CREATE TABLE IF NOT EXISTS (\w+)\s*\((.*?)\)\s*ENGINE", t, re.S):
            tab, corpo = m.group(1), m.group(2)
            cols.setdefault(tab, [])
            uniq.setdefault(tab, [])
            for riga in corpo.split("\n"):
                riga = riga.strip().rstrip(",")
                if not riga or riga.upper().startswith(("INDEX", "KEY", "CONSTRAINT", "PRIMARY", "UNIQUE")):
                    if riga.upper().startswith("UNIQUE"):
                        uniq[tab].append(riga)
                    continue
                mm = re.match(r"^(\w+)\s+(.+)$", riga)
                if mm:
                    # In MySQL PRIMARY KEY implica NOT NULL anche senza scriverlo.
                    # Misurato contro il DB vivo: id risultava NULL ammesso qui e
                    # NOT NULL nel reale, e la regola implicita era la causa.
                    u = riga.upper()
                    cols[tab].append([mm.group(1), mm.group(2).strip(),
                                      not ("NOT NULL" in u or "PRIMARY KEY" in u)])
        # ALTER, anche su piu righe: si normalizza a una riga sola
        piatto = re.sub(r"\s+", " ", t)
        for m in re.finditer(r"ALTER TABLE (\w+)\s+MODIFY COLUMN (\w+)\s+([^;]+);", piatto, re.I):
            tab, col, resto = m.group(1), m.group(2), m.group(3).strip()
            for c in cols.get(tab, []):
                if c[0] == col:
                    c[1] = resto
                    c[2] = "NOT NULL" not in resto.upper()
        for m in re.finditer(r"ALTER TABLE (\w+)\s+ADD COLUMN (\w+)\s+([^;]+);", piatto, re.I):
            tab, col, resto = m.group(1), m.group(2), m.group(3).strip()
            resto = re.sub(r"\s+AFTER\s+\w+$", "", resto, flags=re.I).strip()
            if tab in cols and col not in [c[0] for c in cols[tab]]:
                cols[tab].append([col, resto, "NOT NULL" not in resto.upper()])
        for m in re.finditer(r"ALTER TABLE (\w+)\s+ADD UNIQUE INDEX ([^;]+);", piatto, re.I):
            uniq.setdefault(m.group(1), []).append(m.group(2).strip())
    return cols, uniq


def _tipo_base(t):
    m = re.match(r"^([A-Za-z]+)", t.strip())
    return m.group(1).upper() if m else "?"


# ---------------------------------------------------------------- 13
def voce13():
    head(13, "schema dichiarato: vincoli su log_assunzioni (catena RIPIEGATA)")
    cols, uniq = _ddl_ripiegato()
    ddl = "".join(read(f) for f in _migrazioni())
    attesi = [
        ("UNICITA DELLO SLOT", r"UNIQUE INDEX idx_log_slot_unique"),
        ("UNICITA DELLA TARGA", r"UNIQUE INDEX idx_log_client_op_unique"),
        ("FK verso utenti", r"fk_log_utente"),
        ("FK verso farmaci", r"fk_log_farmaco"),
        ("colonna client_op_id", r"client_op_id CHAR\(36\)"),
    ]
    n_dich = 0
    for nome, pat in attesi:
        ok = bool(re.search(pat, ddl))
        n_dich += 1 if ok else 0
        print("  %-26s %s" % (nome, "DICHIARATO" if ok else "ASSENTE -- RISCHIO"))
    print("\n-- colonne di log_assunzioni DOPO il ripiegamento della catena")
    print("   (fonte: CREATE TABLE piu ogni MODIFY/ADD COLUMN successivo, in ordine)")
    for nome, tipo, nullable in cols.get("log_assunzioni", []):
        print("     %-18s %-46s %s" % (nome, tipo[:45], "NULL ammesso" if nullable else "NOT NULL"))
    print("\n-- colonne MOSSE da una migrazione rispetto al CREATE iniziale")
    iniziali = {}
    t0 = read("backend/db/migrations/v01_init.sql")
    m0 = re.search(r"CREATE TABLE IF NOT EXISTS log_assunzioni\s*\((.*?)\)\s*ENGINE", t0, re.S)
    if m0:
        for riga in m0.group(1).split("\n"):
            riga = riga.strip().rstrip(",")
            mm = re.match(r"^(\w+)\s+(.+)$", riga)
            if mm and not riga.upper().startswith(("INDEX", "KEY", "CONSTRAINT", "PRIMARY", "UNIQUE")):
                iniziali[mm.group(1)] = mm.group(2).strip()
    mosse = []
    for nome, tipo, _ in cols.get("log_assunzioni", []):
        if nome not in iniziali:
            mosse.append("  %-18s AGGIUNTA da migrazione -> %s" % (nome, tipo[:40]))
        elif _tipo_base(iniziali[nome]) != _tipo_base(tipo):
            mosse.append("  %-18s %s -> %s" % (nome, _tipo_base(iniziali[nome]), _tipo_base(tipo)))
    righe(mosse, "nessuna -- il CREATE iniziale e ancora esatto")
    print("\n  NOTA: questo e lo schema DICHIARATO. Lo schema REALE si misura solo")
    print("        col DB vivo: vedi scripts/audit/db_probe.sql")
    esito("vincoli attesi dichiarati %d/%d; colonne di log_assunzioni %d, mosse dalla catena %d",
          n_dich, len(attesi), len(cols.get("log_assunzioni", [])), len(mosse))


# ---------------------------------------------------------------- 14
def voce14():
    head(14, "timestamp: semantica di fuso in DB e nel client")
    cols, _ = _ddl_ripiegato()
    per_tipo = {"DATETIME": [], "TIMESTAMP": [], "TIME": [], "DATE": []}
    for tab, lista in sorted(cols.items()):
        for nome, tipo, _ in lista:
            b = _tipo_base(tipo)
            if b in per_tipo:
                per_tipo[b].append("%s.%s" % (tab, nome))
    print("-- colonne temporali DOPO il ripiegamento della catena, per tipo")
    print("   DATETIME  (NAIVE, nessun fuso)  : %s" % (per_tipo["DATETIME"] or "nessuna"))
    print("   TIMESTAMP (convertito dal fuso) : %s" % (per_tipo["TIMESTAMP"] or "nessuna"))
    print("   TIME      (ora di parete)       : %s" % (per_tipo["TIME"] or "nessuna"))
    print("   DATE                            : %s" % (per_tipo["DATE"] or "nessuna"))
    if per_tipo["DATETIME"] and per_tipo["TIMESTAMP"]:
        print("   ESITO: DUE SEMANTICHE nella stessa base -- naive e tz-aware convivono.")
        print("          Il fuso del DB non e pinnato dalla catena: si misura con")
        print("          il blocco P4a di db_probe.sql (@@time_zone).")
    print("\n-- client: costruzioni di Date sensibili al fuso")
    n_date = 0
    for p2 in walk("src", (".js", ".jsx")):
        if ".test." in p2:
            continue
        for i, l in enumerate(read(p2).split("\n")):
            if re.search(r"new Date\(`?\$?\{?[^)]*T\$?\{?", l) or "toISOString" in l:
                n_date += 1
                print("   %s:%d  %s" % (p2, i + 1, l.strip()[:74]))
    esito("DATETIME %d, TIMESTAMP %d, TIME %d, DATE %d -> %s; sedi client sensibili al fuso %d",
          len(per_tipo["DATETIME"]), len(per_tipo["TIMESTAMP"]),
          len(per_tipo["TIME"]), len(per_tipo["DATE"]),
          "DUE SEMANTICHE nella stessa base"
          if (per_tipo["DATETIME"] and per_tipo["TIMESTAMP"]) else "una sola semantica",
          n_date)


# ---------------------------------------------------------------- 15
def voce15():
    head(15, "idempotenza della presa: i livelli di guardia presenti")
    rt = read("backend/pharmatimer_api/routers/log_assunzioni.py")
    ddl = "".join(read("backend/db/migrations/" + f)
                  for f in sorted(os.listdir("backend/db/migrations")) if f.endswith(".sql"))
    liv = [
        ("1. replay per targa (client_op_id) -> 200 dedup", "dedup=True" in rt),
        ("2. macchina a stati: presa su presa -> 409", "CONSTRAINT_VIOLATION" in rt or "CONFLICT" in rt),
        ("3. lock di riga SELECT ... FOR UPDATE", "FOR UPDATE" in rt),
        ("4. indice unico sullo slot in DB", "idx_log_slot_unique" in ddl),
        ("5. indice unico sulla targa in DB", "idx_log_client_op_unique" in ddl),
    ]
    for nome, ok in liv:
        print("  %-48s %s" % (nome, "PRESENTE" if ok else "ASSENTE -- RISCHIO M1"))
    print("\n-- generazione della targa nel client")
    ob = read("src/domain/outboxSplitter.js")
    m = re.search(r"function defaultNewId\(\)\s*\{([^}]*)\}", ob)
    corpo = m.group(1).strip() if m else "non trovata"
    fallback = "catch" in corpo or "||" in corpo
    print("   %s" % corpo)
    print("   fallback se crypto.randomUUID manca: %s"
          % ("SI" if fallback else "NESSUNO -- solleva e la presa non viene targata"))
    esito("livelli di guardia presenti %d/%d; fallback della targa: %s",
          sum(1 for _, ok in liv if ok), len(liv),
          "SI" if fallback else "NESSUNO -- RISCHIO")


# ---------------------------------------------------------------- 16
def voce16():
    head(16, "tipi del payload di presa: pydantic contro typedef, campo per campo")
    py = read("backend/pharmatimer_api/models/log_assunzione.py")
    blocco = re.search(r"class LogAssunzioneCreatePresa\(BaseModel\):(.*?)(?=\nclass )", py, re.S)
    campi_py = {}
    if blocco:
        for m in re.finditer(r"^\s{4}(\w+)\s*:\s*([^=\n]+)", blocco.group(1), re.M):
            campi_py[m.group(1)] = m.group(2).strip()
    js = read("src/data/repository/IRepository.js")
    tb = re.search(r"@typedef \{Object\} LogAssunzione(.*?)\*/", js, re.S)
    campi_js = {}
    if tb:
        for m in re.finditer(r"@property \{([^}]+)\}\s*\[?(\w+)\]?", tb.group(1)):
            campi_js[m.group(2)] = m.group(1)
    print("  %-26s %-34s %s" % ("campo", "pydantic (server)", "typedef (client)"))
    soli = 0
    for k in sorted(set(campi_py) | set(campi_js)):
        a = campi_py.get(k, "-- ASSENTE --")
        b = campi_js.get(k, "-- ASSENTE --")
        comune = k in campi_py and k in campi_js
        soli += 0 if comune else 1
        print("  %-26s %-34s %s%s" % (k, a[:33], b[:26],
                                      "" if comune else "   <-- SOLO IN UNA COPIA"))
    print("\n  copie: 2, non collegate da alcuno schema generato.")
    esito("campi confrontati %d (pydantic %d, typedef %d); presenti in una sola copia %d",
          len(set(campi_py) | set(campi_js)), len(campi_py), len(campi_js), soli)


# ---------------------------------------------------------------- 17
def voce17():
    head(17, "notifiche: meccanismo di consegna e capacita ad app chiusa")
    n = read("src/services/notifications.js")
    mecc = [
        ("setTimeout in contesto di pagina", "setTimeout" in n),
        ("new Notification(...) (contesto pagina)", "new globalThis.Notification" in n or "new Notification" in n),
        ("registration.showNotification (service worker)", "showNotification" in n),
        ("TimestampTrigger / showTrigger (schedulazione OS)", "TimestampTrigger" in n or "showTrigger" in n),
        ("Web Push (pushManager.subscribe)", "pushManager" in n),
    ]
    for nome, ok in mecc:
        print("  %-50s %s" % (nome, "SI" if ok else "no"))
    solo_timer = "setTimeout" in n and "showNotification" not in n and "TimestampTrigger" not in n
    print("\n  ESITO: %s" % ("SOLO TIMER DI PAGINA -- con app chiusa o device sospeso"
                              " il timer non esiste e la notifica NON parte." if solo_timer
                              else "presente almeno un meccanismo indipendente dalla pagina"))
    tab_push = "push_subscriptions" in "".join(
        read("backend/db/migrations/" + f) for f in os.listdir("backend/db/migrations")
        if f.endswith(".sql"))
    rif_push = sum(1 for p2 in walk("src", (".js", ".jsx")) + walk("backend", (".py",))
                   if "push_subscriptions" in read(p2) or "pushManager" in read(p2))
    print("  tabella push_subscriptions nello schema: %s; riferimenti nel codice: %d"
          % ("SI" if tab_push else "no", rif_push))
    esito("meccanismi presenti %d/%d -> %s; tabella push %s, riferimenti %d",
          sum(1 for _, ok in mecc if ok), len(mecc),
          "SOLO TIMER DI PAGINA: ad app chiusa la notifica NON parte" if solo_timer
          else "presente un meccanismo indipendente dalla pagina",
          "SI" if tab_push else "no", rif_push)


# ---------------------------------------------------------------- 18
def voce18():
    head(18, "service worker: cosa entra in cache; le prese possono essere stale")
    v = read("vite.config.js")
    m = re.search(r"globPatterns:\s*(\[[^\]]*\])", v)
    print("  precache globPatterns : %s" % (m.group(1) if m else "non dichiarato"))
    print("  registerType          : %s" % (re.search(r'registerType:\s*"([^"]+)"', v).group(1)
                                            if re.search(r'registerType:\s*"([^"]+)"', v) else "?"))
    for k in ("skipWaiting", "clientsClaim", "cleanupOutdatedCaches"):
        mm = re.search(k + r":\s*(\w+)", v)
        print("  %-22s: %s" % (k, mm.group(1) if mm else "?"))
    print("\n  regole runtimeCaching")
    attive, commentate = [], []
    for l in v.split("\n"):
        if "urlPattern" in l:
            (commentate if l.strip().startswith("//") else attive).append(l.strip()[:70])
    print("   ATTIVE (%d):" % len(attive)); righe(attive, "nessuna")
    print("   COMMENTATE (%d):" % len(commentate)); righe(commentate, "nessuna")
    api_cached = any("/api/" in a for a in attive)
    print("\n  ESITO: le risposte /api %s dal service worker."
          % ("SONO messe in cache -- verificare la staleness delle prese" if api_cached
             else "NON sono messe in cache: il SW non puo servire prese stale"))
    print("  La staleness vive altrove: nello specchio IndexedDB di SyncRepository,")
    print("  che e deliberato e marcato per freschezza (getMirrorFreshness).")
    esito("runtimeCaching attive %d, commentate %d; risposte /api in cache: %s",
          len(attive), len(commentate), "SI -- verificare la staleness" if api_cached else "no")



# ---------------------------------------------------------------- 19
def voce19():
    head(19, "livello di migrazione RICHIESTO dal codice di prodotto")
    print("  Misura statica del rischio di schieramento: quali colonne introdotte")
    print("  da una migrazione sono NOMINATE dal codice che gira. Se un DB bersaglio")
    print("  sta sotto il livello richiesto, ogni scrittura che tocca quella colonna")
    print("  fallisce. Lo stato del bersaglio NON e misurabile da qui: si legge col")
    print("  blocco P0b di scripts/audit/db_probe.sql.")
    print("  Movente MISURATO a par.22.198-unoctogies: il Mini di produzione girava")
    print("  0.7.5 senza v06, coerente; il codice del repo e 0.7.6 e nomina")
    print("  client_op_id in 27 sedi. Schierarlo senza migrare romperebbe ogni presa.")
    codice = "".join(read(p2) for p2 in walk("backend/pharmatimer_api", (".py",)))
    richiesto = None
    print("\n  %-34s %-24s %-9s %s" % ("migrazione", "colonna introdotta", "nel DDL", "citata dal codice"))
    for f in _migrazioni():
        nome = os.path.basename(f)
        piatto = re.sub(r"\s+", " ", read(f))
        introdotte = re.findall(r"ALTER TABLE \w+\s+ADD COLUMN (\w+)", piatto, re.I)
        introdotte += re.findall(r"ALTER TABLE \w+\s+MODIFY COLUMN (\w+)", piatto, re.I)
        for col in sorted(set(introdotte)):
            usata = bool(re.search(r"\b%s\b" % re.escape(col), codice))
            if usata:
                richiesto = nome
            print("  %-34s %-24s %-9s %s" % (nome, col, "si", "SI" if usata else "no"))
    print("\n  LIVELLO MINIMO RICHIESTO DAL CODICE: %s" % (richiesto or "nessuna migrazione oltre v01"))
    print("  Ogni DB bersaglio sotto questo livello e INCOMPATIBILE col codice attuale.")
    print("  L ORDINE DI SCHIERAMENTO E VINCOLANTE: migrazione PRIMA, codice DOPO.")
    print("\n  applicatori di produzione presenti nel repo")
    appl = sorted("backend/db/migrations/" + f for f in os.listdir("backend/db/migrations")
                  if f.startswith("apply_") and "prod" in f)
    righe(appl, "nessuno")
    print("\n  COPERTURA DEL GATE, dichiarata e non dedotta")
    mk = read("Makefile")
    print("     versione del backend in produzione : %s (make prod-check, INFO)"
          % ("letta" if "OPENAPI_VER" in mk else "non letta"))
    print("     stato delle migrazioni del bersaglio: %s"
          % ("SORVEGLIATO da make g21, che ARROSSA se il Mini e sotto il livello"
             if "client_op_id" in mk else "NON SORVEGLIATO"))
    print("     NOTA: fino allo smontaggio del gate questa riga leggeva scripts/cp0.sh,")
    print("     che sorvegliava la versione ma NON le migrazioni. Ora la coppia e chiusa.")
    esito("livello minimo richiesto dal codice: %s; applicatori di produzione %d; "
          "migrazioni del bersaglio %s",
          richiesto or "nessuna oltre v01", len(appl),
          "sorvegliate da make g21" if "client_op_id" in mk else "NON sorvegliate")


VOCI = {1: voce1, 2: voce2, 3: voce3, 4: voce4, 5: voce5, 6: voce6,
        7: voce7, 8: voce8, 9: voce9, 10: voce10, 11: voce11, 12: voce12,
        13: voce13, 14: voce14, 15: voce15, 16: voce16, 17: voce17, 18: voce18,
        19: voce19}

if __name__ == "__main__":
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
    sel = None
    if "--voce" in sys.argv:
        sel = int(sys.argv[sys.argv.index("--voce") + 1])
    COMPATTO = "--compatto" in sys.argv
    if COMPATTO:
        print("== INVENTARIO (compatto: solo lo esito per voce; dettaglio con make inventario) ==")
        for n in sorted(VOCI):
            if sel is None or sel == n:
                with contextlib.redirect_stdout(io.StringIO()):
                    VOCI[n]()
    else:
        print("PharmaTimer -- INVENTARIO DI STRUTTURA E QUALITA (sola lettura)")
        for n in sorted(VOCI):
            if sel is None or sel == n:
                VOCI[n]()
        print("\n" + "=" * 72)
        print("FINE INVENTARIO -- nessun file e stato modificato.")
