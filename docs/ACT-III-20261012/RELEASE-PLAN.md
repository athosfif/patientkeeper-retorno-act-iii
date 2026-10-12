# PatientKeeper Retorno — publicação e entrega R03

Atualizado em **12/10/2026** para ACT-III-R03. Código público e demo GitHub Pages estão publicados; upload de mídia e submissão continuam estados separados. A arquitetura é **GitHub Pages**, branch `gh-pages`, diretório raiz, com saída estática separada do servidor local. Não há afirmação de publicação Netlify.

## Estado real

Fila, fontes, revisão e cartão estão implementados com casos fictícios. Inglês é inicial; PT/ES selecionáveis. O incremento R03 acrescenta um painel somente de leitura da inferência real gravada: pergunta e fontes exatas precisam coincidir com a projeção atual; handoff não exibe resposta e formatos rejeitados continuam rejeitados.

O piloto FP32 usou Qwen2.5-1.5B-Instruct na AMD Radeon Pro W7900D. **2/7 baselinecases e 3/9 tentativas totais passaram pelo formato; cinco baselinecases falharam.** Não houve aprovação semântica formal. A GPU foi observada desligada às 17:39:42 UTC. [Resumo](../../evidence/ACT-III-R03-20261012/AMD-PILOT-R03-SUMMARY.json) · [OFF separado](../../evidence/ACT-III-R03-20261012/AMD-SHUTDOWN-RECEIPT.json).

## Fontes e limites de regra

A [regra específica ACT III](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii) exige carga significativa em AMD integrada ao produto. Health and Wellbeing exige caso completo, incerteza e revisão humana. Google/Evolus são opcionais; não foram usados. As leituras anteriores não localizaram duração mínima de GPU nem aceitação explícita de replay como substituto suficiente. Uma quota disponível não impõe consumo nem comprova elegibilidade.

ADMIN-R01 de 05/10 é scaffold anterior; os novos contratos/revisão/replay foram feitos em 12/10. [Origem declarada](../../BASE-PREEXISTENTE.md). Reutilização específica não é inferida do guia geral.

## Repositório e pacote

1. Repositório Public com código enviado em [athosfif/patientkeeper-retorno-act-iii](https://github.com/athosfif/patientkeeper-retorno-act-iii). Publicação inicial: commit `05391eadb16d7fb1da9a527b21534f143733fd92`, preservando o commit inicial do repositório. A atualização de docs/capa acrescenta dois arquivos e mantém a allowlist final de 128 arquivos; seu hash final é registrado no recibo Git separado.
2. Source branch contém fonte Node/browser, oito casos sintéticos, testes, LICENSE, docs atuais e os insumos R03 sanitizados necessários ao build. `.gitignore` libera somente JSON/TXT em AMD-PILOT-FINAL e os dois recibos R03 nomeados; os demais diretórios evidence ficam privados.
3. `app/data/`, `.env*`, credenciais, cookies, URLs privadas da nuvem, modelos/pesos, caches e ZIPs locais não entram no pacote. Conferir a lista efetiva; ignore não remove um arquivo já rastreado.
4. Os arquivos permitidos foram pesquisados por e-mail real conhecido, Gmail, credenciais/token/Bearer/cookies/senha e URLs de autenticação; nenhum match foi encontrado. A revisão é sobre esse conjunto exato, não sobre toda a pasta local.
5. Código próprio MIT; Qwen Apache-2.0, checkpoint imutável e licença preservados. Não redistribuir pesos nem relabelar a licença do modelo.

## Build e GitHub Pages

```sh
node app/server.mjs
node --test app/tests/*.test.mjs
node scripts/build-public-demo.mjs
```

O servidor é loopback-only. O build gera `public-demo/` a partir de insumos sintéticos exatos e do adapter revisado. A saída gerada mantém o progresso somente no navegador do visitante; não depende de `app/data/` nem de um serviço GPU.

A saída estática está publicada no **root da branch `gh-pages`**, commit `b7af3b29cb8342b3d73f66ed07d745f6767cbc71`. O app foi aberto na UI pública com oito casos, EN/PT/ES e rodapé verdadeiro. Em **12/10 às 18:08:22 UTC / 15:08:22 Brasília**, os 16 arquivos públicos retornaram HTTP 200 e seus SHA-256 corresponderam exatamente ao checkout desse commit, incluindo JSON e módulos. [Demo publicada](https://athosfif.github.io/patientkeeper-retorno-act-iii/). A conferência foi pública, sem credenciais; o recibo completo permanece no arquivo local de release. `_headers` é um arquivo estático e não comprova que GitHub Pages aplique cabeçalhos Netlify.

Código e bytes públicos estão conferidos. Registrar separadamente o QA de interação no site publicado: fluxo administrativo, cartão persistido, refresh, reset, 320/390/768/desktop, EN/PT/ES, teclado, preferência, fonte histórica, clínica, conflito, mismatch de fontes e falhas AMD. Não anunciar experiência perfeita, teste com usuários ou auditoria WCAG completa.

## Texto e mídias

[Cópia final R03 preparada](SUBMISSION-COPY-R03.json): título21, resumo193, descrição1466 caracteres/209 palavras. Limites autenticados: título5–50, resumo50–255, descrição600–2.000 e mínimo100 palavras. Recontar após qualquer edição.

| Material | Conferência necessária |
|---|---|
| Title/description | Versão final, problema, público, 2/7 e3/9 formatos, limites e origem coerentes. |
| Main challenge | Health and Wellbeing, opção exata do formulário. |
| Technology tags | Somente JS/Node/HTML/CSS e AMD/PyTorch HIP/Qwen usados; não vLLM/Evolus/Google. |
| Cover | Arquivo final e preview após upload. |
| Video | ≤5min; demostrar fluxo real e recorded/GPUoff; verificar reprodução e duração. |
| Slides | PDF final legível e link/arquivo acessível. |
| Repo/demo links | Acesso sem depender da sessão do dono, commit e versão concordantes. |
| Submission | Mensagem oficial, URL e recarga; draft/autosave/upload não equivalem a envio. |

## Saída e prazo

Observações anteriores divergem: 18/10 às 07h Brasília no schedule autenticado e 12h Brasília no /live. Adotar 17/10 à noite como preparação interna; não como prazo oficial. O kickoff não foi identificado como obrigação de submissão imediata. [Matriz](REQUISITOS-E-EVIDENCIAS.md).

Preparação → commit → publicação → upload → submissão são estados separados. Finalizar a entrega somente quando o produto e a mídia correspondentes estiverem acessíveis e a LabLab confirmar o estado. Replay verdadeiro e JSON com citações não garantem elegibilidade, prêmio, pontos ou benefício clínico.
