# netlify/functions/gerar-fio.py
#
# Gera o PowerPoint das Fichas de Inteligência das Obras (FIO), substituindo o
# antigo script PowerShell (que dependia de Excel/PowerPoint instalados localmente).
# Roda inteiramente em Python puro (biblioteca padrão), sem dependências externas.
#
# Não usa a service role key: qualquer usuário autenticado pode gerar/exportar a
# apresentação (é uma ação de leitura/exportação, protegida pelas mesmas políticas
# de RLS que já liberam SELECT em `obras` e `fio_edicoes` para todo autenticado).

import json
import base64
import os
import re
import urllib.request
import urllib.error
from datetime import datetime

from fio_builder import build_fio_pptx

SUPABASE_URL = "https://vstqinwjlhrrouxvwzpx.supabase.co"
SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzdHFpbndqbGhycm91eHZ3enB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MTAzMTAsImV4cCI6MjEwMDQ4NjMxMH0."
    "ahKstSpgeb2mOeo8XMj3RGw-zZReKmg3-Ahs1aTWe_s"
)

TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "FIO_SIGOM_modelo.pptx")


def _http_json(url, token, method="GET"):
    req = urllib.request.Request(url, method=method)
    req.add_header("apikey", SUPABASE_ANON_KEY)
    req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _get_header(headers, name):
    for k, v in (headers or {}).items():
        if k.lower() == name.lower():
            return v
    return None


def _fmt_moeda(v):
    if v is None:
        return ""
    try:
        return "R$ " + f"{float(v):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (ValueError, TypeError):
        return str(v)


def _fmt_pct(v):
    if v is None:
        return ""
    try:
        return f"{float(v):.2f}".replace(".", ",") + "%"
    except (ValueError, TypeError):
        return str(v)


def _fmt_data(v):
    if not v:
        return ""
    try:
        return datetime.fromisoformat(str(v).replace("Z", "+00:00")).strftime("%d/%m/%Y")
    except ValueError:
        return str(v)


def _montar_ficha(obra_row, conteudo):
    dados = obra_row.get("dados") or {}
    c = conteudo or {}

    return {
        "TITULO": c.get("TITULO") or obra_row.get("descricao") or obra_row.get("nome_obra") or "",
        "OPUS": obra_row.get("opus") or "",
        "AO": c.get("AO") or dados.get("Ação Orçamentaria") or "",
        "CONCEP": c.get("CONCEP") or "",
        "FUND": c.get("FUND") or "",
        "ESTR": c.get("ESTR") or "",
        "COB": c.get("COB") or "",
        "PAR": c.get("PAR") or "",
        "TERRA": c.get("TERRA") or "",
        "INICIO": _fmt_data(dados.get("Início (OS)")),
        "EMPRESA": obra_row.get("empresa") or "",
        "VALOR": _fmt_moeda(obra_row.get("valor_atual")),
        "EMPENHO": _fmt_moeda(dados.get("Total NE")),
        "EXEC": _fmt_pct(obra_row.get("percentual_medido")),
        "MEDMENSAL": _fmt_pct(dados.get("media mensal global")),
        "ENTREGA": _fmt_data(dados.get("data projetada") or dados.get("Fim Vigência") or dados.get("Término de Vigência")),
        "PA": c.get("PA") or "",
        "IDP": (f'{dados.get("IDP"):.2f}'.replace(".", ",") if isinstance(dados.get("IDP"), (int, float)) else ""),
        "OBS": c.get("OBS") or "",
    }


def handler(event, context):
    if event.get("httpMethod") != "POST":
        return {"statusCode": 405, "body": json.dumps({"ok": False, "msg": "Método não permitido"})}

    token = None
    auth_header = _get_header(event.get("headers"), "authorization") or ""
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
    if not token:
        return {"statusCode": 401, "body": json.dumps({"ok": False, "msg": "Não autenticado"})}

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return {"statusCode": 400, "body": json.dumps({"ok": False, "msg": "Corpo inválido"})}

    obra_ids = body.get("obraIds") or []
    if not obra_ids:
        return {"statusCode": 400, "body": json.dumps({"ok": False, "msg": "Nenhuma obra selecionada"})}

    # valida o token consultando o próprio usuário (falha => 401)
    try:
        _http_json(f"{SUPABASE_URL}/auth/v1/user", token)
    except urllib.error.HTTPError:
        return {"statusCode": 401, "body": json.dumps({"ok": False, "msg": "Sessão inválida ou expirada"})}

    ids_filtro = ",".join(obra_ids)
    cols = "id,opus,contrato,rm,om_beneficiada,empresa,descricao,nome_obra,valor_atual,percentual_medido,percentual_estimado,dados"
    try:
        obras = _http_json(f"{SUPABASE_URL}/rest/v1/obras?id=in.({ids_filtro})&select={cols}", token)
        fio_rows = _http_json(f"{SUPABASE_URL}/rest/v1/fio_edicoes?obra_id=in.({ids_filtro})&select=obra_id,conteudo", token)
    except urllib.error.HTTPError as e:
        return {"statusCode": 502, "body": json.dumps({"ok": False, "msg": f"Erro ao consultar Supabase: {e}"})}

    conteudo_por_obra = {r["obra_id"]: r.get("conteudo") for r in fio_rows}

    grupos_por_rm = {}
    for obra in obras:
        rm = obra.get("rm") or "Sem RM"
        ficha = _montar_ficha(obra, conteudo_por_obra.get(obra["id"]))
        grupos_por_rm.setdefault(rm, []).append(ficha)

    if not grupos_por_rm:
        return {"statusCode": 404, "body": json.dumps({"ok": False, "msg": "Nenhuma das obras informadas foi encontrada"})}

    with open(TEMPLATE_PATH, "rb") as f:
        template_bytes = f.read()

    pptx_bytes = build_fio_pptx(template_bytes, grupos_por_rm, data_ficha=datetime.now().strftime("%d/%m/%Y"))

    filename = f"FIO_SIGOM_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pptx"
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
        "isBase64Encoded": True,
        "body": base64.b64encode(pptx_bytes).decode("ascii"),
    }
