import zipfile, re, io
from xml.sax.saxutils import escape as xml_escape
from datetime import date

NS_SLIDE_CT = "application/vnd.openxmlformats-officedocument.presentationml.slide+xml"

def build_fio_pptx(template_bytes: bytes, grupos_por_rm: dict, data_ficha: str = None) -> bytes:
    """
    grupos_por_rm: dict { "1a RM": [ {token: valor, ...}, {...} ], "2a RM": [...] }
      cada obra eh um dict com as chaves dos 19 tokens da ficha (sem chaves {{ }}):
      TITULO,OPUS,AO,CONCEP,FUND,ESTR,COB,PAR,TERRA,INICIO,EMPRESA,VALOR,EMPENHO,EXEC,MEDMENSAL,ENTREGA,PA,IDP,OBS
    """
    zin = zipfile.ZipFile(io.BytesIO(template_bytes))
    parts = {name: zin.read(name) for name in zin.namelist()}
    zin.close()

    slide1 = parts["ppt/slides/slide1.xml"].decode("utf-8")
    slide2_tpl = parts["ppt/slides/slide2.xml"].decode("utf-8")
    slide5_tpl = parts["ppt/slides/slide5.xml"].decode("utf-8")
    rels2_tpl = parts["ppt/slides/_rels/slide2.xml.rels"].decode("utf-8")
    rels5_tpl = parts["ppt/slides/_rels/slide5.xml.rels"].decode("utf-8")

    # remove referencia a notesSlide dos rels (nao vamos duplicar notas)
    strip_notes = lambda xml: re.sub(r'<Relationship[^>]*notesSlide[^>]*/>', '', xml)
    rels2_tpl = strip_notes(rels2_tpl)
    rels5_tpl = strip_notes(rels5_tpl)

    # ---- capa: substitui {{DATA}} ----
    dtxt = data_ficha or date.today().strftime("%d/%m/%Y")
    slide1 = slide1.replace("{{DATA}}", xml_escape(dtxt))
    parts["ppt/slides/slide1.xml"] = slide1.encode("utf-8")

    new_slide_files = {}   # path -> bytes
    new_rels_files = {}    # path -> bytes
    slide_order = ["ppt/slides/slide1.xml"]  # capa sempre primeiro
    content_type_overrides = []
    presentation_rels = []
    sldid_entries = []

    n = 100
    rid_counter = 1000
    sldid_counter = 10000

    for rm in sorted(grupos_por_rm.keys()):
        obras = grupos_por_rm[rm]

        # --- slide divisor da RM ---
        n += 1
        div_name = f"slide{n}.xml"
        div_path = f"ppt/slides/{div_name}"
        div_xml = slide2_tpl.replace("{{RM}}", xml_escape(rm))
        new_slide_files[div_path] = div_xml.encode("utf-8")
        new_rels_files[f"ppt/slides/_rels/{div_name}.rels"] = rels2_tpl.encode("utf-8")
        slide_order.append(div_path)

        for obra in obras:
            n += 1
            f_name = f"slide{n}.xml"
            f_path = f"ppt/slides/{f_name}"
            f_xml = slide5_tpl
            for token, valor in obra.items():
                v = "(A PREENCHER)" if valor is None or str(valor).strip() == "" else str(valor)
                f_xml = f_xml.replace("{{%s}}" % token, xml_escape(v))
            new_slide_files[f_path] = f_xml.encode("utf-8")
            new_rels_files[f"ppt/slides/_rels/{f_name}.rels"] = rels5_tpl.encode("utf-8")
            slide_order.append(f_path)

    # ---- remove os slides-modelo (2 e 5) e seus vestigios ----
    for p in ["ppt/slides/slide2.xml", "ppt/slides/slide5.xml",
              "ppt/slides/_rels/slide2.xml.rels", "ppt/slides/_rels/slide5.xml.rels",
              "ppt/notesSlides/notesSlide2.xml", "ppt/notesSlides/notesSlide5.xml",
              "ppt/notesSlides/_rels/notesSlide2.xml.rels", "ppt/notesSlides/_rels/notesSlide5.xml.rels"]:
        parts.pop(p, None)

    parts.update(new_slide_files)
    parts.update(new_rels_files)

    # ---- Content_Types.xml: remove overrides de slide2/5 e notesSlide2/5, adiciona os novos slides ----
    ct = parts["[Content_Types].xml"].decode("utf-8")
    for p in ["/ppt/slides/slide2.xml", "/ppt/slides/slide5.xml",
              "/ppt/notesSlides/notesSlide2.xml", "/ppt/notesSlides/notesSlide5.xml"]:
        ct = re.sub(r'<Override PartName="%s".*?/>' % re.escape(p), '', ct)
    novos_overrides = "".join(
        '<Override PartName="/%s" ContentType="%s"/>' % (path, NS_SLIDE_CT)
        for path in list(new_slide_files.keys())
    )
    ct = ct.replace("</Types>", novos_overrides + "</Types>")
    parts["[Content_Types].xml"] = ct.encode("utf-8")

    # ---- presentation.xml.rels: remove rel de slide2/5, adiciona rel dos novos slides ----
    prels = parts["ppt/_rels/presentation.xml.rels"].decode("utf-8")
    prels = re.sub(r'<Relationship Id="rId3".*?slide2\.xml"/>', '', prels)
    prels = re.sub(r'<Relationship Id="rId6".*?slide5\.xml"/>', '', prels)

    novos_rels = []
    novos_sldids = []
    for path in slide_order[1:]:  # sem a capa, que ja tem rel (rId2)
        rid = "rId%d" % rid_counter
        rid_counter += 1
        sid = str(sldid_counter)
        sldid_counter += 1
        target = path.replace("ppt/", "")
        novos_rels.append('<Relationship Id="%s" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="%s"/>' % (rid, target))
        novos_sldids.append('<p:sldId id="%s" r:id="%s"/>' % (sid, rid))

    prels = prels.replace("</Relationships>", "".join(novos_rels) + "</Relationships>")
    parts["ppt/_rels/presentation.xml.rels"] = prels.encode("utf-8")

    # ---- presentation.xml: sldIdLst -> mantem so a capa (rId2) + novos ----
    pres = parts["ppt/presentation.xml"].decode("utf-8")
    pres = re.sub(r'<p:sldIdLst>.*?</p:sldIdLst>',
                  '<p:sldIdLst><p:sldId id="291" r:id="rId2"/>' + "".join(novos_sldids) + '</p:sldIdLst>',
                  pres, flags=re.S)
    parts["ppt/presentation.xml"] = pres.encode("utf-8")

    # ---- reempacota ----
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zout:
        for name, content in parts.items():
            zout.writestr(name, content)
    return buf.getvalue()
