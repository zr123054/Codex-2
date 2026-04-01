from zipfile import ZipFile, ZIP_DEFLATED
from datetime import datetime, timezone
from xml.sax.saxutils import escape

slides = [
    ("2026上海国际路亚钓鱼及装备展览会调研汇报", ["硬件产品线机会识别与研发建议", "汇报人：_______  部门：_______  日期：2026-__-__", "【请替换封面大图：展馆入口 / 品牌墙】"]),
    ("目录", ["1. 展会概览与调研方法", "2. 市场与产品趋势", "3. 重点竞品拆解", "4. 对我司产品线的启发", "5. 研发协同建议与行动计划", "【右侧插入2~4张现场拼图】"]),
    ("展会概览与样本覆盖", ["时间/地点/规模：________", "走访品牌数：____（国产____ / 海外____）", "深度访谈对象：销售 / 工程师 / 供应链", "采集资料：照片____张、参数单____份、报价区间____", "【插入展馆地图或现场全景图】"]),
    ("调研框架与评价维度", ["评价维度：结构设计 / 传动系统 / 电子化 / 制造一致性 / 成本带", "评分规则：1~5分（请补充具体定义）", "建议图表：雷达图或四象限", "【插入评分模型图】"]),
    ("行业趋势总览", ["趋势1：轻量化材料应用增加（镁合金/碳纤）", "趋势2：卷线与刹车系统可调性提升", "趋势3：中高端产品强化人机反馈", "趋势4：品牌叙事从参数转向场景体验", "【每条趋势配1张证据图 + 1条对我司影响】"]),
    ("重点趋势深挖：结构与材料", ["对比字段：机身材料 / 重量区间 / 防腐方案 / 工艺成熟度", "BOM影响：请填写增减幅度（%）", "量产风险：良率、供应稳定性、工艺窗口", "【插入3张细节特写：壳体/转轴/连接件】"]),
    ("重点趋势深挖：传动与手感", ["关注点：齿轮啮合、轴承配置、阻尼结构", "体验维度：顺滑度 / 噪音 / 回弹 / 回差", "常见风险：异响、寿命衰减、一致性波动", "【插入结构示意图或爆炸图】"]),
    ("重点竞品拆解（总览）", ["竞品A：定位 / 卖点 / 价格带 / 风险点", "竞品B：定位 / 卖点 / 价格带 / 风险点", "竞品C：定位 / 卖点 / 价格带 / 风险点", "【建议三列卡片布局，统一产品图角度】"]),
    ("竞品技术拆解（页1）", ["结构：核心部件设计特点", "参数：重量/线容量/传动比/刹车配置", "体验：上手感受与目标用户匹配", "量产判断：难点工艺与潜在专利风险", "【插入竞品A拆解大图+局部放大】"]),
    ("竞品技术拆解（页2，可选）", ["结构：核心部件设计特点", "参数：重量/线容量/传动比/刹车配置", "体验：上手感受与目标用户匹配", "量产判断：难点工艺与潜在专利风险", "【插入竞品B/C拆解图】"]),
    ("我司产品对比定位", ["对比矩阵：性能 / 重量 / 成本 / 外观 / 可靠性", "优势项：________", "短板项：________", "差距原因假设：设计 / 供应链 / 验证", "【插入热力图或象限图】"]),
    ("机会点清单（建议3项）", ["机会点1：________（用户价值 / 技术抓手 / 成本影响 / 预估收益）", "机会点2：________（同上）", "机会点3：________（同上）", "【每张机会卡配证据图，目标尽量量化】"]),
    ("研发协同建议", ["结构研发：关键预研方向 + 样机建议", "电子研发：可导入传感/提醒功能", "测试团队：寿命/盐雾/跌落/异响验证补强", "供应链：新材料与新工艺打样计划", "【补充负责人和截止时间】"]),
    ("路线图与里程碑", ["0~1个月：方案冻结与样机定义", "1~3个月：EVT样机 + 核心风险验证", "3~6个月：DVT/PVT + 小批量试产", "决策闸门：Go/No-Go条件", "【插入甘特图时间轴】"]),
    ("风险与应对", ["风险1：关键材料供应不稳定 → 备选供应商", "风险2：手感一致性难控 → 公差与EOL标准收敛", "风险3：成本超目标 → 分级配置策略", "【左侧风险热力图，右侧责任人与时限】"]),
    ("结论与决策请求", ["结论1：趋势判断________", "结论2：我司差距________", "结论3：优先机会________", "请求决策1：批准预研预算", "请求决策2：成立跨部门专项小组", "请求决策3：确认Q3样机评审节点"]),
]


def slide_xml(title, bullets):
    y = 1600000
    paras = []
    for b in bullets:
        paras.append(f'<a:p><a:r><a:rPr lang="zh-CN" sz="2200"/><a:t>{escape(b)}</a:t></a:r></a:p>')
    body = ''.join(paras)
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Title 1"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="685800" y="342900"/><a:ext cx="11430000" cy="914400"/></a:xfrm></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="3800" b="1"/><a:t>{escape(title)}</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="Content 2"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="685800" y="1371600"/><a:ext cx="11430000" cy="5080000"/></a:xfrm></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/>{body}</p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="4" name="Note"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="685800" y="6640000"/><a:ext cx="11430000" cy="685800"/></a:xfrm><a:solidFill><a:srgbClr val="EAF2FF"/></a:solidFill></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="1800"/><a:t>图片建议占比 60%，文字建议占比 40%。请将【占位】替换为你的实拍图、参数和心得。</a:t></a:r></a:p></p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>'''


def make_pptx(path):
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    with ZipFile(path, 'w', ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' + ''.join(f'<Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' for i in range(1, len(slides)+1)) + '</Types>')
        z.writestr('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>')
        z.writestr('docProps/core.xml', f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>2026上海国际路亚展汇报模板</dc:title><dc:creator>Codex</dc:creator><cp:lastModifiedBy>Codex</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified></cp:coreProperties>')
        z.writestr('docProps/app.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft Office PowerPoint</Application><Slides>%d</Slides><Notes>0</Notes><HiddenSlides>0</HiddenSlides><MMClips>0</MMClips><PresentationFormat>Custom</PresentationFormat></Properties>' % len(slides))

        sld_ids = ''.join(f'<p:sldId id="{256+i}" r:id="rId{2+i}"/>' for i in range(len(slides)))
        z.writestr('ppt/presentation.xml', f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>{sld_ids}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle/></p:presentation>')

        rels = ['<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>']
        rels += [f'<Relationship Id="rId{2+i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i+1}.xml"/>' for i in range(len(slides))]
        z.writestr('ppt/_rels/presentation.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + ''.join(rels) + '</Relationships>')

        z.writestr('ppt/slideMasters/slideMaster1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap accent1="4F81BD" accent2="C0504D" accent3="9BBB59" accent4="8064A2" accent5="4BACC6" accent6="F79646" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>')
        z.writestr('ppt/slideMasters/_rels/slideMaster1.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>')

        z.writestr('ppt/slideLayouts/slideLayout1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="titleAndContent" preserve="1"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>')
        z.writestr('ppt/slideLayouts/_rels/slideLayout1.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>')

        z.writestr('ppt/theme/theme1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme"><a:themeElements><a:clrScheme name="Office"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1F3A5F"/></a:dk2><a:lt2><a:srgbClr val="EAF2FF"/></a:lt2><a:accent1><a:srgbClr val="1F3A5F"/></a:accent1><a:accent2><a:srgbClr val="F39C12"/></a:accent2><a:accent3><a:srgbClr val="6B7280"/></a:accent3><a:accent4><a:srgbClr val="4F81BD"/></a:accent4><a:accent5><a:srgbClr val="C0504D"/></a:accent5><a:accent6><a:srgbClr val="9BBB59"/></a:accent6><a:hlink><a:srgbClr val="0000FF"/></a:hlink><a:folHlink><a:srgbClr val="800080"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri"/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>')

        for i, (title, bullets) in enumerate(slides, start=1):
            z.writestr(f'ppt/slides/slide{i}.xml', slide_xml(title, bullets))
            z.writestr(f'ppt/slides/_rels/slide{i}.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>')


if __name__ == '__main__':
    make_pptx('2026上海国际路亚展-汇报模板.pptx')
    print('generated: 2026上海国际路亚展-汇报模板.pptx')
