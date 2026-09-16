# Render the engagement agreement markdown as a signing-ready PDF.
import io, re, sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, HRFlowable, KeepTogether)

SRC = '/home/user/golden-ratio-partnership/contracts/Dr_Daniel_Depp_Engagement_Contract.md'
OUT = '/home/user/golden-ratio-partnership/contracts/Dr_Daniel_Depp_Engagement_Contract.pdf'

body = ParagraphStyle('body', fontName='Times-Roman', fontSize=10.5, leading=14.5,
                      alignment=TA_JUSTIFY, spaceAfter=7)
sub  = ParagraphStyle('sub',  parent=body, leftIndent=12*mm, firstLineIndent=-6*mm, spaceAfter=5)
sub2 = ParagraphStyle('sub2', parent=body, leftIndent=20*mm, firstLineIndent=-6*mm, spaceAfter=4)
bullet = ParagraphStyle('bullet', parent=body, leftIndent=14*mm, bulletIndent=8*mm, spaceAfter=3)
head = ParagraphStyle('head', fontName='Times-Bold', fontSize=11.5, leading=15,
                      spaceBefore=13, spaceAfter=7, keepWithNext=1)
title = ParagraphStyle('title', fontName='Times-Bold', fontSize=15, leading=20,
                       alignment=TA_CENTER, spaceAfter=4)
party = ParagraphStyle('party', parent=body, alignment=TA_CENTER, spaceAfter=3)
partyb = ParagraphStyle('partyb', parent=party, fontName='Times-Bold')
sigl = ParagraphStyle('sigl', parent=body, alignment=0, spaceAfter=2, leading=16)
sighead = ParagraphStyle('sighead', parent=body, fontName='Times-Bold', spaceBefore=10, spaceAfter=6)
signame = ParagraphStyle('signame', parent=sigl, fontName='Times-Italic')

def esc(t):
    t = t.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
    return t.replace('\\_','_').replace('\\.','.').replace('\\-','-')

raw = io.open(SRC, encoding='utf-8').read().split('\n')
flow = []

# Everything up to the first rule is the cover/party block, centred.
i = 0
flow.append(Paragraph(esc(raw[0]), title))
flow.append(HRFlowable(width='38%', thickness=1, color='#000000', spaceBefore=2, spaceAfter=12))
i = 1
while raw[i].strip() != '---':
    ln = raw[i].strip()
    if ln:
        bold = ln.isupper() and len(ln) > 3
        flow.append(Paragraph(esc(ln), partyb if bold else party))
    i += 1

in_sig = False
while i < len(raw):
    ln = raw[i]; s = ln.strip()
    i += 1
    if not s:
        continue
    if s == '---':
        flow.append(HRFlowable(width='100%', thickness=0.5, color='#999999',
                               spaceBefore=6, spaceAfter=6))
        continue
    if s == 'END OF AGREEMENT':
        flow.append(Spacer(1, 4))
        flow.append(Paragraph('<b>END OF AGREEMENT</b>', ParagraphStyle(
            'end', parent=body, alignment=TA_CENTER)))
        continue
    if s.startswith('SIGNED as an AGREEMENT'):
        in_sig = True
        flow.append(Paragraph('<b>%s</b>' % esc(s), sighead))
        continue
    # Section heading, e.g. "3\. REMUNERATION"
    if re.match(r'^\d+\\?\.\s+[A-Z]', s) and not re.match(r'^\d+\.\d', s):
        flow.append(Paragraph(esc(s), head))
        continue
    if in_sig:
        if s.startswith(('EXECUTED by', 'COUNTERSIGNED', 'DR DANIEL DEPP')):
            flow.append(Spacer(1, 8))
            flow.append(Paragraph('<b>%s</b>' % esc(s), sigl))
        elif s.startswith('By: ') and '___' not in s:
            # Pre-signed: show the typed name as the signature, over a rule.
            flow.append(Spacer(1, 5))
            flow.append(Paragraph('By: <i>%s</i>' % esc(s[4:]), signame))
            flow.append(HRFlowable(width=68*mm, thickness=0.5, color='#000000',
                                   hAlign='LEFT', spaceBefore=0, spaceAfter=4))
        else:
            flow.append(Paragraph(esc(s), sigl))
        continue
    if s.startswith('- '):
        flow.append(Paragraph(esc(s[2:]), bullet, bulletText='•'))
        continue
    if re.match(r'^\((?:i|ii|iii|iv|v|vi|vii|viii|ix|x)\)', s):
        flow.append(Paragraph(esc(s), sub2))
        continue
    if re.match(r'^\([a-z]\)', s):
        flow.append(Paragraph(esc(s), sub))
        continue
    flow.append(Paragraph(esc(s), body))

def furniture(canvas, doc):
    canvas.saveState()
    canvas.setFont('Times-Roman', 8)
    canvas.setFillGray(0.35)
    canvas.drawString(20*mm, 12*mm,
        'Golden Ratio Clinics Pty Ltd (ACN 697 157 565)  |  Contractor Engagement Agreement  |  Dr Daniel Depp')
    canvas.drawRightString(A4[0]-20*mm, 12*mm, 'Page %d' % doc.page)
    canvas.setStrokeGray(0.8)
    canvas.line(20*mm, 15.5*mm, A4[0]-20*mm, 15.5*mm)
    canvas.restoreState()

doc = BaseDocTemplate(OUT, pagesize=A4,
                      leftMargin=20*mm, rightMargin=20*mm,
                      topMargin=20*mm, bottomMargin=22*mm,
                      title='Contractor Engagement Agreement - Dr Daniel Depp',
                      author='Golden Ratio Clinics Pty Ltd',
                      subject='Contractor Engagement Agreement')
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='f')
doc.addPageTemplates([PageTemplate(id='all', frames=[frame], onPage=furniture)])
doc.build(flow)
print('wrote', OUT)
