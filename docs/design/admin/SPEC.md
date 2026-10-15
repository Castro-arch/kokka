# Admin — especificação visual (passo 3.5)

Referência obrigatória para implementar o admin. O resultado em código precisa ficar **igual ou melhor** que estes mockups. Ficar pior em qualquer tela é bug.

## Arquivos

| Tela | Mockup | Referência 1440px | Referência 1280px | Rota |
|---|---|---|---|---|
| Eventos (início) | `eventos.html` | `eventos.png` | `eventos-1280.png` | `/admin` |
| Evento | `evento.html` | `evento.png` | `evento-1280.png` | `/admin/eventos/[id]` |
| Telão (controle) | `telao.html` | `telao.png` | `telao-1280.png` | `/admin/eventos/[id]/telao` |
| Mídias | `midias.html` | `midias.png` | `midias-1280.png` | `/admin/eventos/[id]/midias` |
| Configurações | `configuracoes.html` | `configuracoes.png` | `configuracoes-1280.png` | `/admin/configuracoes` |

Os `.html` abrem direto no navegador e são a fonte da verdade para medidas, cores e textos. Os `.png` servem para comparar lado a lado.

## Tokens

Converta em tema do Tailwind (`@theme` em `globals.css`) e **nunca** use hex solto nos componentes.

| Token | Valor | Uso |
|---|---|---|
| ink | `#1F2430` | texto principal, lateral |
| ink-2 | `#4B5263` | texto secundário |
| ink-3 | `#6B7280` | texto apagado |
| side | `#1F2430` / `#2B313F` / `#D5D8E0` / `#B8BDC9` | lateral: fundo / chip do usuário / item / e-mail |
| surface | `#FFFFFF` | cartões |
| canvas | `#F4F5F8` | fundo da página, campos |
| line | `#E3E5EB` | bordas; `#C9CDD6` borda forte |
| brand | `#D90F32` / hover `#BE0E2E` / base `#9E0A24` | botão principal, item ativo, ao vivo |
| brand-soft | `#FFE8EC` / borda `#F3A6B4` | seleção, estado ativo claro |
| sun | `#FFC800` / base `#C99A00` / texto `#3B2A00` | ação secundária (telão, ZIP), selos |
| sun-soft | `#FFF6D6` / borda `#F2D27A` / texto `#5A4300` | dica, avisos |
| ok | `#10A34A` / base `#0B7A37` / soft `#E6F7EE` / borda `#9BD8B5` / texto `#0B5A2A` | ativo, concluído |

- Fonte: **Nunito** 600–900 via `next/font/google` (sem `<link>` externo). Títulos 900, corpo 700–800.
- Raios: botão 14–18px, cartão 20–28px, chip 999px.
- **Assinatura visual**: botões e cartões em bloco com borda inferior mais escura (botão 5–6px, cartão 5–6px, hero 8px). Não troque por `box-shadow` genérico.
- Ícones: SVG de traço inline (stroke 2.4, pontas arredondadas), iguais aos do mockup. Sem emoji, sem biblioteca de ícones nova.

## Componentes a extrair

`AdminSidebar` (prop `active`), `Button` (variants `primary | sun | outline | ghost-on-brand`, sizes `md | lg`), `Card`, `StatTile`, `StatusChip` (`draft | active | closed | expired`), `SegmentedControl`, `Switch`, `EventTrail` + `TrailNode`, `LiveHero`, `MediaTile`, `BulkBar`, `LifecycleSteps`, `QrCard`.

## Regras por tela

- **Layout**: lateral fixa de 256px, escura, ocupando a altura toda (`min-h-dvh` e `sticky top-0`). Conteúdo com `max-w-[1200px] mx-auto` e padding lateral `clamp(16px, 4vw, 44px)`. Abaixo de 900px a lateral vira uma barra superior com menu.
- **Eventos**: a saudação do mascote usa dados reais (próximo evento e dias que faltam). O `LiveHero` só aparece se existir evento `active`; sem ele, mostre um cartão vazio com o mascote e "Novo evento". A trilha vai do próximo para o mais antigo, com nós alternando esquerda e direita **em cima** da linha tracejada, e os textos nunca podem encostar nos nós. Formas dos nós: rascunho tracejado com lápis, ativo vermelho com selo HOJE, encerrado amarelo com download, expirado cinza com check.
- **Evento**: capa na cor do tema do evento (`theme.primaryColor`), abas Visão geral / Personalização / QR e arte (as telas atuais de tema e arte viram abas), `LifecycleSteps` com datas reais (`closed_at`, `expires_at`), QR real gerado com `qrcode` (já está na stack).
- **Telão**: prévia 16:9 limitada pela coluna (os controles precisam aparecer sem rolar em 1280×800). Botões grandes Pausar / Pular / Ocultar esta.
- **Mídias**: grade `auto-fill minmax(150px, 1fr)`, seleção com checkbox; a `BulkBar` é `sticky bottom-5` e só aparece com algo selecionado; uma mídia oculta mostra sobreposição escura com olho cortado.
- **Configurações**: dois cartões (Sua conta e Padrões para novos eventos), cor selecionada com ✓.
- Funções sem backend ainda (telão, ZIP, ocultar, apagar): botão visível, `disabled`, com `title="Em breve"`. Nada de link morto.

## Acessibilidade (não negociável)

`aria-current="page"` no item ativo, `role="switch"` / `radiogroup` / `tablist` reais (ou elementos nativos), foco visível (`outline` 3px brand-soft + offset), contraste AA, alvos de toque com 44px ou mais, `prefers-reduced-motion` respeitado.

## Critério de aceite

1. Script `pnpm --filter @kokka/web design:shots` (Playwright como devDependency; se ainda não estiver no repo, peça permissão antes de adicionar, conforme o CLAUDE.md) que tira screenshots das 5 rotas em 1440×900 e 1280×800, com seed de dados igual ao dos mockups, e salva em `docs/design/admin/impl/`.
2. Comparar cada `impl/*.png` com o `.png` de referência. Diferença visível em espaçamento, cor, peso de fonte, raio ou borda inferior é bug, e você corrige antes do PR.
3. Pode ficar **melhor** (estados de hover/foco/vazio/carregando, transições sutis, responsivo), nunca diferente para pior.
4. No PR: as imagens de referência e as implementadas lado a lado.
