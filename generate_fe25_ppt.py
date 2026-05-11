"""Generate the FE25 product-line PowerPoint deck locally.

The generated .pptx is intentionally ignored by git because it is a binary
Office package and cannot be reviewed cleanly in text-based pull requests.
Use FE25_product_line_2026_2029_plan.md as the reviewable companion
version, and run this script to create FE25_product_line_2026_2029_plan.pptx locally.
"""

from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.sax.saxutils import escape

OUT = Path('FE25_product_line_2026_2029_plan.pptx')
W, H = 12192000, 6858000  # 16:9
EMU = 914400

def emu(inch): return int(inch * EMU)

def tx(text, size=18, color='17324D', bold=False, align='l'):
    # text can contain \n; creates line breaks inside a single paragraph
    runs = ''.join(f'<a:t>{escape(part)}</a:t>' + ('<a:br/>' if i < len(text.split("\n"))-1 else '') for i, part in enumerate(text.split('\n')))
    b = ' b="1"' if bold else ''
    return f'''<a:p><a:pPr algn="{align}"/><a:r><a:rPr lang="zh-CN" sz="{size*100}"{b}><a:solidFill><a:srgbClr val="{color}"/></a:solidFill><a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/></a:rPr>{runs}</a:r></a:p>'''

def bullet(items, size=14, color='2E4053'):
    ps = []
    for item in items:
        ps.append(f'''<a:p><a:pPr marL="260000" indent="-180000"><a:buChar char="•"/></a:pPr><a:r><a:rPr lang="zh-CN" sz="{size*100}"><a:solidFill><a:srgbClr val="{color}"/></a:solidFill><a:latin typeface="Microsoft YaHei"/><a:ea typeface="Microsoft YaHei"/></a:rPr><a:t>{escape(item)}</a:t></a:r></a:p>''')
    return ''.join(ps)

class Slide:
    def __init__(self):
        self.items = []
        self.id = 2
    def rect(self, x,y,w,h, fill='FFFFFF', line='FFFFFF', radius=False):
        prst = 'roundRect' if radius else 'rect'
        self.items.append(f'''<p:sp><p:nvSpPr><p:cNvPr id="{self.id}" name="shape{self.id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{emu(x)}" y="{emu(y)}"/><a:ext cx="{emu(w)}" cy="{emu(h)}"/></a:xfrm><a:prstGeom prst="{prst}"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="{fill}"/></a:solidFill><a:ln w="9000"><a:solidFill><a:srgbClr val="{line}"/></a:solidFill></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/></p:txBody></p:sp>''')
        self.id += 1
    def textbox(self, x,y,w,h, xml_text, fill=None, line=None, margin=0.08):
        fill_xml = '<a:noFill/>' if fill is None else f'<a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>'
        line_xml = '<a:ln><a:noFill/></a:ln>' if line is None else f'<a:ln w="9000"><a:solidFill><a:srgbClr val="{line}"/></a:solidFill></a:ln>'
        self.items.append(f'''<p:sp><p:nvSpPr><p:cNvPr id="{self.id}" name="text{self.id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{emu(x)}" y="{emu(y)}"/><a:ext cx="{emu(w)}" cy="{emu(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>{fill_xml}{line_xml}</p:spPr><p:txBody><a:bodyPr wrap="square" lIns="{emu(margin)}" rIns="{emu(margin)}" tIns="{emu(margin)}" bIns="{emu(margin)}"/><a:lstStyle/>{xml_text}</p:txBody></p:sp>''')
        self.id += 1
    def line(self, x1,y1,x2,y2,color='8FB3D9', width=18000):
        self.items.append(f'''<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="{self.id}" name="line{self.id}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm><a:off x="{emu(min(x1,x2))}" y="{emu(min(y1,y2))}"/><a:ext cx="{emu(abs(x2-x1))}" cy="{emu(abs(y2-y1))}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="{width}"><a:solidFill><a:srgbClr val="{color}"/></a:solidFill></a:ln></p:spPr></p:cxnSp>''')
        self.id += 1
    def table(self, x,y,w,h, headers, rows, col_widths=None, head_fill='17324D'):
        ncols = len(headers); nrows = len(rows)+1
        col_widths = col_widths or [1/ncols]*ncols
        rh = h/nrows
        cx = x
        for c, head in enumerate(headers):
            cw = w*col_widths[c]
            self.textbox(cx,y,cw,rh, tx(head, 12, 'FFFFFF', True, 'ctr'), fill=head_fill, line='FFFFFF', margin=0.04)
            cy = y+rh
            for r, row in enumerate(rows):
                fill = 'F4F8FC' if r%2==0 else 'FFFFFF'
                self.textbox(cx,cy,cw,rh, tx(row[c], 9, '23374D', False, 'l'), fill=fill, line='D7E3F0', margin=0.04)
                cy += rh
            cx += cw
    def xml(self):
        return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="F7FAFC"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>{''.join(self.items)}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>'''

def title_slide(title, subtitle):
    s=Slide(); s.rect(0,0,13.333,7.5,'0B1F33','0B1F33'); s.rect(0,5.7,13.333,1.8,'0E5AA7','0E5AA7')
    s.textbox(0.65,0.75,8.6,1.0,tx('FE25 产品线规划',22,'80C8FF',True))
    s.textbox(0.65,1.65,9.9,1.5,tx(title,36,'FFFFFF',True))
    s.textbox(0.72,3.28,8.2,0.8,tx(subtitle,18,'D6E9FF'))
    s.textbox(0.75,6.08,5.5,0.5,tx('2026—2029｜视觉汇报版',18,'FFFFFF',True))
    return s

def section_title(s, title, idx):
    s.textbox(0.45,0.22,1.0,0.38,tx(f'{idx:02d}',16,'0E5AA7',True,'ctr'),fill='E6F2FF',line='E6F2FF')
    s.textbox(1.36,0.18,8.0,0.55,tx(title,22,'17324D',True))
    s.line(0.45,0.88,12.85,0.88,'C9D8E8',12000)

def make_deck():
    slides=[]
    slides.append(title_slide('2026—2029 年产品线规划', '从核心硬件单品，迈向智能水上装备生态'))
    s=Slide(); section_title(s,'战略定位与发展方向',1)
    s.textbox(0.7,1.15,5.2,1.1,tx('总体定位',18,'0E5AA7',True)+tx('以智能钓鱼装备和水上船艇控制设备为核心，构建面向钓鱼及水上运动场景的智能硬件生态。',16,'17324D'))
    cards=[('产品矩阵建立','电绞轮、顶流机首发上市，鱼探、APP、浅滩锚生态布局'),('用户体验提升','降低操作门槛，提升易用性、可靠性与智能化体验'),('生态智能化','基于真实场景数据优化中鱼判断、自动对抗、自动巡航与声呐识别'),('APP 生态建设','设备控制、数据采集、升级校准、社区、航图服务一体化')]
    for i,(a,b) in enumerate(cards):
        x=0.75+(i%2)*6.05; y=2.65+(i//2)*1.6
        s.textbox(x,y,5.55,1.18,tx(a,16,'FFFFFF',True)+tx(b,11,'EAF5FF'),fill='0E5AA7' if i==0 else '17324D',line='FFFFFF')
    slides.append(s)
    s=Slide(); section_title(s,'四阶段总体节奏',2)
    stages=[('2026','尝试期','试产验证｜数据采集｜测试体系','推进 E00/E01/E02/E03 与 TM00 迭代，建立测试标准与用例'),('2027','市场验证期','首发上市｜市场反馈｜产品修正','电绞轮、顶流机首发产品量产上市，验证接受度'),('2028','成型期','系列化｜技术壁垒｜鱼探产品化','已有品类系列化，鱼探完成关键预研并立项'),('2029','拓展期','矩阵完善｜生态互联｜品牌优势','丰富矩阵，推进多设备互联与一站式 APP')]
    for i,(year,phase,key,desc) in enumerate(stages):
        x=0.65+i*3.15
        s.textbox(x,1.35,2.6,0.65,tx(year,24,'FFFFFF',True,'ctr'),fill='0E5AA7',line='0E5AA7')
        s.textbox(x,2.05,2.6,3.05,tx(phase,18,'17324D',True,'ctr')+tx(key,11,'0E5AA7',False,'ctr')+tx(desc,12,'2E4053'),fill='FFFFFF',line='D7E3F0')
        if i<3: s.line(x+2.68,2.15,x+3.08,2.15,'0E5AA7',24000)
    slides.append(s)
    s=Slide(); section_title(s,'产品规划总表',3)
    headers=['方向','2026','2027','2028','2029']
    rows=[['电绞轮','E00/E01/E02 试产；中鱼判断与自动对抗模型','E00/E01/E02 上市；E04 试产；验证电动刹车/往复放线','E04 上市；规划迭代及最小尺寸必要性','迭代升级与降本；E05 商用捕捞立项'],['电子铃铛','建内部数据库；模型转换；50% 成功率','配套 E01 上市；成功率提升至 80%','稳定 80% 判断成功率','提升至 95% 判断成功率'],['顶流机','TM00 立项并进入 B 轮','TM00 上市；TM01 进入 B 轮','TM01 上市；TM02/TM03 进入 B 轮','TM03 上市；TM04 进入 B 轮'],['鱼探','竞品拆解；可行性分析','开发可行性/资源需求；NMEA 2000 调研','扩充研发；自家算法；FS00/FD00 进入 B 轮','F00 上市；FS01/FS02/FD01 立项'],['APP','内测数据采集/标记/导出；UI 与遥控升级校准设计','随产品上架；增加社区','航图订阅/标点；顶流机自动巡航','优化稳定易用；升级一站式 APP'],['浅滩锚','-','需求调研；可行性分析','按需求安排研发','-']]
    s.table(0.25,1.05,12.85,5.95,headers,rows,[0.12,0.22,0.22,0.22,0.22])
    slides.append(s)
    for idx,(year,phase,color,items,goal) in enumerate([
        ('2026','尝试期','0E5AA7',['电绞轮 E00/E01/E02 进入试产，建立中鱼判断与自动对抗模型','电子铃铛建立内部数据库，实现 50% 判断成功率','TM00 完成立项并进入 B 轮','APP 内测版实现数据采集、标记、导出','鱼探完成竞品拆解及可行性分析','建立 FE25 测试标准、用例与环境'],'完成基础验证和测试体系搭建，为首批产品上市打基础'),
        ('2027','市场验证期','1D8A68',['E00/E01/E02、TM00、电子铃铛配套 E01 上市','E04 进入试产，验证电动刹车与往复放线','TM01 立项并进入 B 轮','APP 上架应用市场并增加用户社区','鱼探调研开发难度、资源需求与 NMEA 2000 协议','浅滩锚完成市场需求与可行性分析'],'通过真实市场反馈验证产品方向并确定迭代路径'),
        ('2028','成型期','F39C12',['E04 上市并规划后续迭代','TM01 上市，TM02/TM03 进入 B 轮','电子铃铛稳定 80% 判断成功率','完成鱼探研发资源扩充，建立自家声呐算法','FS00/FD00 立项并进入 B 轮，实现生态互联','APP 增加航图订阅、标点与自动巡航'],'推动产品系列化与鱼探产品化，形成生态联动雏形'),
        ('2029','拓展期','C0392B',['制定电绞轮迭代升级与降本计划，E05 商用捕捞立项','TM03 上市，TM04 海钓船大型款进入 B 轮','电子铃铛判断成功率提升至 95%','F00 上市，FS01/FS02/FD01 立项','APP 持续优化并升级为水上运动一站式平台'],'完善矩阵，拓展高端、商用、大型船艇场景，建立品牌优势')], start=4):
        s=Slide(); section_title(s,f'{year}｜{phase}',idx)
        s.textbox(0.7,1.15,3.0,0.8,tx(year,34,'FFFFFF',True,'ctr'),fill=color,line=color)
        s.textbox(3.95,1.18,8.4,0.72,tx('年度关键词：' + ('试产验证｜数据采集｜测试体系｜技术预研' if year=='2026' else '首发上市｜市场反馈｜产品修正｜场景验证' if year=='2027' else '系列化｜技术壁垒｜声呐算法｜生态联动' if year=='2028' else '生态完善｜高端拓展｜商用场景｜品牌优势'),17,color,True))
        s.textbox(0.85,2.35,7.2,3.35,bullet(items,14,'23374D'),fill='FFFFFF',line='D7E3F0')
        s.textbox(8.55,2.35,3.9,2.05,tx('阶段目标',17,'FFFFFF',True,'ctr')+tx(goal,15,'FFFFFF'),fill=color,line=color)
        slides.append(s)
    s=Slide(); section_title(s,'产品矩阵演进与角色划分',8)
    steps=[('2026','基础验证','E00/E01/E02\nTM00｜APP 内测｜鱼探预研'),('2027','首发上市','电绞轮｜顶流机\n电子铃铛｜APP'),('2028','系列成型','E04｜TM01/02/03\nFS00｜FD00｜航图'),('2029','生态拓展','E05｜TM04｜F00\nFS01/02｜FD01｜一站式 APP')]
    for i,(y,a,b) in enumerate(steps):
        x=0.55+i*3.15
        s.textbox(x,1.25,2.65,1.95,tx(y,23,'FFFFFF',True,'ctr')+tx(a,15,'FFFFFF',True,'ctr')+tx(b,11,'EAF5FF',False,'ctr'),fill=['0E5AA7','1D8A68','F39C12','C0392B'][i],line='FFFFFF')
    roles=[['电绞轮','智能钓鱼核心入口'],['顶流机','船艇控制核心入口'],['鱼探','水下感知入口'],['APP','生态平台入口'],['电子铃铛','中鱼感知补充'],['浅滩锚','船艇场景补充']]
    s.table(0.8,4.05,11.7,2.15,['产品','角色'],roles,[0.28,0.72])
    slides.append(s)
    s=Slide(); section_title(s,'关键能力建设',9)
    caps=[('产品能力','电绞轮系列化\n顶流机场景化\n鱼探产品化\nAPP 平台化'),('技术能力','中鱼判断模型\n自动对抗模型\n声呐算法\n自动巡航'),('质量能力','测试标准\n环境测试\n试产验证\n质量门禁'),('生态能力','多设备互联\n用户社区\n航图订阅\n数据闭环')]
    for i,(a,b) in enumerate(caps):
        x=0.7+(i%2)*6.1; y=1.35+(i//2)*2.25
        s.textbox(x,y,5.55,1.65,tx(a,18,'FFFFFF',True)+tx(b,14,'EAF5FF'),fill=['17324D','0E5AA7','1D8A68','F39C12'][i],line='FFFFFF')
    slides.append(s)
    s=Slide(); section_title(s,'风险与应对',10)
    rows=[['产品可靠性','水上、户外、高负载环境暴露结构、电控、防水、耐久问题','建立测试标准，强化环境/寿命/防水/盐雾与实地验证'],['智能判断准确率','中鱼判断与自动对抗早期依赖数据，准确率不足','APP 与内部测试持续采集数据，分阶段设定目标并优化模型'],['APP 体验滞后','稳定性和易用性影响硬件整体体验','优先保障连接、遥控、升级、校准，再扩展社区与航图'],['鱼探技术难度','声呐算法、换能器、显示渲染、互联复杂','先拆解与可行性分析，基础款 ODM/OEM，自研算法逐步积累'],['资源分散','多品类同步推进造成研发、测试、供应链压力','2026—2027 聚焦电绞轮/顶流机，鱼探预研，浅滩锚视需求投入']]
    s.table(0.35,1.1,12.6,5.7,['风险','表现','应对策略'],rows,[0.18,0.38,0.44])
    slides.append(s)
    s=Slide(); section_title(s,'总结：从单品到生态竞争',11)
    s.textbox(0.9,1.15,11.3,1.2,tx('到 2029 年，FE25 将形成以电绞轮、顶流机、鱼探、APP 为核心的智能水上装备生态。',24,'17324D',True,'ctr'))
    comps=['产品矩阵竞争','数据算法竞争','设备互联竞争','APP 生态竞争','用户运营竞争']
    for i,c in enumerate(comps):
        s.textbox(1.15+i*2.25,3.05,1.85,1.1,tx(c,15,'FFFFFF',True,'ctr'),fill=['0E5AA7','1D8A68','F39C12','C0392B','17324D'][i],line='FFFFFF')
        if i<4: s.textbox(2.92+i*2.25,3.35,0.3,0.3,tx('+',20,'17324D',True,'ctr'))
    s.textbox(2.15,5.3,9.1,0.65,tx('最终建立面向钓鱼及水上运动人群的长期产品优势、生态优势和品牌优势',18,'0E5AA7',True,'ctr'),fill='E6F2FF',line='E6F2FF')
    slides.append(s)
    return slides

def write_deck(slides):
    content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>''' + ''.join(f'<Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' for i in range(1,len(slides)+1)) + '''<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>'''
    rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'''
    pres_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">''' + ''.join(f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i}.xml"/>' for i in range(1,len(slides)+1)) + '</Relationships>'
    sld_ids = ''.join(f'<p:sldId id="{255+i}" r:id="rId{i}"/>' for i in range(1,len(slides)+1))
    pres = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst>{sld_ids}</p:sldIdLst><p:sldSz cx="{W}" cy="{H}" type="wide"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>'''
    core='''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>FE25 产品线 2026-2029 年规划</dc:title><dc:creator>OpenAI</dc:creator><cp:lastModifiedBy>OpenAI</cp:lastModifiedBy></cp:coreProperties>'''
    app='''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>OpenAI</Application><PresentationFormat>宽屏</PresentationFormat></Properties>'''
    with ZipFile(OUT,'w',ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', content_types)
        z.writestr('_rels/.rels', rels)
        z.writestr('ppt/presentation.xml', pres)
        z.writestr('ppt/_rels/presentation.xml.rels', pres_rels)
        z.writestr('docProps/core.xml', core)
        z.writestr('docProps/app.xml', app)
        for i, sl in enumerate(slides,1):
            z.writestr(f'ppt/slides/slide{i}.xml', sl.xml())
            z.writestr(f'ppt/slides/_rels/slide{i}.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>')

if __name__ == '__main__':
    slides = make_deck()
    write_deck(slides)
    print(f'created {OUT} with {len(slides)} slides')
