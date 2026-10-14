# Kokka — redesign (referência visual)

Mockups do redesign "estilo Duolingo": blocos, botões 3D, Nunito, mascote com personalidade.
Fonte de verdade visual para o passo de UI; não é código de produção.

## Telas (screens/)
- Main.dc.html — Convidado · Enviar (390×844)
- Sucesso.dc.html — Convidado · Envio concluído (390×844)
- Galeria.dc.html — Convidado · Galeria (390×844)
- Admin.dc.html — Painel do organizador com barra lateral (fluido, 1280 de referência)
- canvas.json — posição das telas no canvas

As imagens nos mockups apontam para `/_blob/...` (assets do canvas online).
Os equivalentes locais são os assets da marca no repositório:
[`.github/assets/mascot.png`](../../.github/assets/mascot.png) e
[`.github/assets/logo-light.png`](../../.github/assets/logo-light.png).

## Sistema visual
- Fonte: Nunito 700/800/900 (Google Fonts)
- Botão primário: fundo #D90F32, borda inferior 6px #9E0A24, raio 18–22px, texto branco 900
- Botão secundário: fundo branco, borda 2px #E3E5EB e inferior 6px, texto #1F2430
- Destaque/conquistas: amarelo #FFC800 (texto #3B2A00, borda inferior #C99A00)
- Texto: #1F2430; texto secundário: #4B5263; fundo de blocos: #F4F5F8; bordas: #E3E5EB
- Ativo/selecionado: fundo #FFE8EC, borda #F3A6B4, texto #9E0A24
- Ícones: SVG inline em traço (2.2–2.6px), nunca emoji

## Ideias novas (a decidir antes de implementar)
1. Meta da festa (barra coletiva de fotos)
2. Conquistas por aparelho ("Fotógrafo da festa", top 10)
3. Checklist de preparação no card de rascunho do admin
