---
"@kokka/web": minor
"@kokka/db": minor
"@kokka/shared": minor
---

Convidado (passo 3): galeria do evento em `/e/{slug}` no tema do evento, com paginação e download
do original; envio de fotos e vídeos pelo celular (tirar foto, gravar vídeo ou escolher da galeria)
direto ao storage em partes, com progresso, retomada e limites (fotos até 50 MB, vídeos até 1 GB e
3 minutos, rate limit por aparelho e IP); cada envio fica em processamento para o worker do passo 4;
a galeria se atualiza ao vivo (SSE). Ícones do app e paleta vermelha da marca Kokka no admin.
