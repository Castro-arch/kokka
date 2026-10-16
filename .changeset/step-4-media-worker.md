---
"@kokka/worker": minor
"@kokka/web": minor
"@kokka/shared": minor
---

Processamento de mídia (passo 4): o worker transforma cada envio em miniatura WebP de 480px e versão
de exibição (JPEG de até 2048px para fotos, MP4 H.264/AAC 720p com `faststart` para vídeos), com
fotos na orientação certa e sem metadados, HEIC de iPhone via libheif e vídeos acima de 3 minutos
recusados. A mídia vira "Na galeria" e entra ao vivo na galeria; envios que não puderam ser
processados viram "Falhou". "Enviados por você" e "Meus envios" atualizam sozinhos, e
`pnpm --filter @kokka/worker requeue` reprocessa mídias que ficaram presas em "Preparando".
