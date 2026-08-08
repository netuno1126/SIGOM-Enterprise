from pathlib import Path
import sys, shutil, datetime

root=Path(sys.argv[1] if len(sys.argv)>1 else ".").resolve()
targets=[
 (root/"public/app/objetivos.html", '<script src="/app/fase-12-34-2-integracao.js"></script>'),
 (root/"public/app.html", '<script src="/app/dashboard-projecoes-12-34-2.js"></script>')
]
for p,tag in targets:
    if not p.exists():
        print("NÃO ENCONTRADO:",p); continue
    txt=p.read_text(encoding="utf-8")
    if tag in txt:
        print("JÁ ATUALIZADO:",p); continue
    backup=p.with_suffix(p.suffix+".bak_12_34_2")
    shutil.copy2(p,backup)
    if "</body>" not in txt.lower():
        print("SEM </body>:",p); continue
    pos=txt.lower().rfind("</body>")
    txt=txt[:pos]+tag+"\n"+txt[pos:]
    p.write_text(txt,encoding="utf-8")
    print("ATUALIZADO:",p,"backup:",backup)
