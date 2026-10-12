**Atualização R03 de 12/10/2026:** o piloto FP32 posterior teve 3/9 formatos aceitos, sendo 2/7 nos baselinecases; cinco baselinecases foram rejeitados. GPU desligada às17:39:42Z, sem endpoint ao vivo. O painel de replay preserva fontes/erros e bloqueia candidata em handoff. Não houve aprovação semântica formal nem confirmação de elegibilidade. Consulte [AMD-PILOT-R03-RESULTS.md](AMD-PILOT-R03-RESULTS.md), [matriz atual](REQUISITOS-E-EVIDENCIAS.md) e [README atual](../../README.md).

**O texto original abaixo conserva a observação da etapa anterior e não deve ser usado como descrição do estado R03.**

# PatientKeeper — Retorno: roteiro de demonstração de até cinco minutos

Preparação em 12/10/2026. Alvo de gravação: **4min50s**, deixando dez segundos de margem. O percurso local foi implementado e testado, o recibo foi emitido e o bloqueio do conflito foi verificado no Chrome: DIVERGENCIA-BLOQUEADA.png (recibo local preservado fora do repositório público). Este roteiro não é vídeo gravado, publicação ou submissão.

## Abertura factual obrigatória

“Esta demonstração usa apenas casos fictícios. A base administrativa foi preparada em 05/10, antes do ACT III. O acréscimo atual consulta fontes locais e produz um cartão de trechos literais após revisão humana. A integração nova de IA e sua execução em AMD ainda estão pendentes.”

Declarar isso no início e conservar rótulos claros nas telas. A consulta local não deve ser chamada de LLM, inferência, síntese gerada ou execução AMD. Se houver uma nova versão com IA efetivamente executada depois deste documento, preparar roteiro e evidências próprios antes de mudar essa declaração.

## Preparação para gravar

- Preservar o estado sintético atual antes de usar o reinício da demonstração; a base já contém progressão de testes.
- Abrir a aplicação local conforme o [README de 05/10](../../README.md). Acesso em localhost não é URL pública para jurados.
- Consultar os resultados dos testes (recibo local preservado fora do repositório público) e o recibo consolidado emitido (recibo local preservado fora do repositório público). A suíte registra 93/93 testes, sem falhas ou testes pulados; o estado administrativo foi preservado. Isso não comprova inferência ou execução AMD. Ensaiar o tempo e preparar os casos SIM-RET-01, 05, 06 e 07.
- Manter dados reais, notificações, chaves e áreas privadas fora da gravação. Nada é enviado ou agendado pela demonstração.
- Usar telas legíveis e texto curto. O vídeo explica o que a pessoa faz e qual decisão continua com a equipe.

## Sequência cronometrada

| Tempo | Tela / ação humana | Fala proposta e prova |
|---|---|---|
| 0:00–0:25 | Pendências do retorno | “Um retorno foi cancelado, mas a reposição continua pendente. Recepção e coordenação precisam ver quem assume o próximo passo e de onde vem a informação.” Declarar dados fictícios, baseline de 05/10 e IA/AMD pendentes. |
| 0:25–0:55 | Abrir SIM-RET-01; mostrar estado e origem | “Cancelar não resolve a reposição. Esta fila administrativa mantém a pendência e o responsável visíveis.” O estado é registro da simulação, não avaliação clínica. |
| 0:55–1:45 | Consultar: “Qual pendência continua aberta depois do cancelamento?”; acionar “Conferir com fontes” | “A consulta extrativa local encontra trechos nas fontes ativas. Vamos conferir a origem antes de usar o resultado.” Abrir fonte e ler a frase original. Não narrar os trechos como resposta gerada por modelo. |
| 1:45–2:30 | Selecionar fonte pertinente; confirmar a conferência; acionar “Preparar cartão revisado”; abrir “Revisões salvas deste caso” | “A pessoa escolhe o trecho e confirma a revisão. O cartão guarda a citação e a conferência em arquivo separado.” Mostrar recuperação e explicar que a mesma seleção reaproveita o recibo. A criação do cartão não registra contato, modifica agenda ou encerra a pendência. |
| 2:30–3:15 | SIM-RET-05: pergunta de intervalo; SIM-RET-07: perguntar “Há confirmação consistente na agenda e na fila?” | “Sem janela clínica registrada, a decisão pertence à equipe médica. Este caso já está registrado como divergente: a consulta mostra todas as fontes vigentes e bloqueia o cartão.” Mostrar registros da agenda e fila e ausência de ação de preparar cartão. A API também rejeita criação com 409 EVIDENCE_CONFLICT. Isso não é diagnóstico nem detecção de conflito novo por IA. |
| 3:15–3:45 | SIM-RET-06: fontes V1 histórica e V2 vigente | “A fonte antiga continua visível como histórico. A consulta distingue a regra vigente para que a conferência não use uma política superada.” Citação literal ainda exige pertinência e revisão. |
| 3:45–4:15 | Voltar à fila e ao cartão | “O percurso é pendência, fonte, revisão e cartão. Queremos testar se isso reduz o tempo de procurar registros e torna o handoff mais claro.” Informar que a comparação manual versus produto ainda não foi medida. |
| 4:15–4:40 | Tela simples com próximos marcos | “O próximo marco é uma nova integração de IA em AMD, com entradas permitidas, saídas reais, abstenção e revisão. O requisito AMD ainda não foi cumprido nesta demonstração local.” Não exibir resultado simulado como execução. |
| 4:40–4:50 | Encerramento | “Este é um protótipo administrativo para recepção e coordenação, com dados fictícios e decisão humana. A base anterior está declarada; os próximos resultados serão registrados com sua evidência.” |

O roteiro soma **4min50s**. Se uma interação demorar, reduzir a fala, preservar a declaração de origem e os limites e evitar ultrapassar cinco minutos.

## Citações concretas do caso inicial

SIM-RET-01 contém a fonte **SIM01-AGENDA**:

> O retorno foi cancelado. Nao ha reposicao confirmada na agenda.

Usar o trecho literal do registro carregado. Se a pessoa avançar o caso, as fontes da fase ativa mudarão; a apresentação precisa acompanhar essa mudança. Não usar antecipadamente as fontes futuras SIM01-EVOL-* nem o gabarito de teste.

Um cartão com esse trecho comprova somente que a pessoa selecionou e conferiu aquele registro fictício. Confirmação de reposição e encerramento administrativos continuam sujeitos aos registros e ações humanas próprios.

## Estados que o apresentador deve separar

| Estado | Como dizer |
|---|---|
| Fato da simulação | “O registro fictício informa…” |
| Resultado da consulta local | “Encontramos este trecho na fonte ativa…” |
| Conferência humana | “A pessoa selecionou e confirmou a revisão…” |
| Recibo recuperado | “Este registro de revisão/cartão foi salvo separadamente…” |
| IA futura | “Pretendemos implementar e avaliar…” |
| AMD futura | “A execução relevante em AMD ainda precisa ocorrer e ser comprovada…” |
| Métrica futura | “Vamos medir; ainda não temos baseline de desempenho…” |

Literalidade não comprova compreensão semântica, benefício clínico ou validação médica. Testes administrativos anteriores não contam como testes da IA futura. Trechos guardados ou uma reprodução de tela não comprovam inferência ao vivo.

O digest das fontes e a revisão administrativa rejeitam seleção anterior quando o estado muda; é preciso consultar e conferir de novo. Uma conferência registrada não autentica a identidade da pessoa. O contrato de modelo preparado e testado offline não faz inferência; a integração AMD continua como próximo marco.

## Materiais de entrega ainda necessários

O [guia oficial](https://lablab.ai/guide/ai-hackathons) descreve vídeo de até cinco minutos, slides PDF, protótipo por URL e GitHub público. As [instruções de submissão](https://lablab.ai/ai-articles/hackathon-guidelines) indicam título, descrições, tags, capa e links. Conferir o formulário vigente antes de finalizar.

Este percurso local ainda não satisfaz a exigência de AMD do [evento](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii). Antes da candidatura final, confirmar reutilização do baseline, acrescentar a integração nova, guardar prova real e verificar demo e repositório acessíveis aos jurados.

A [licença MIT local](../../LICENSE) foi preparada; a revisão das licenças de terceiros e a publicação permanecem pendentes. Não chamar esta preparação de entrega pública concluída.

**Prazo aberto:** o registro de 12/10 apresenta fechamento em 18/10 às **07h ou 12h de Brasília**, conforme a página. **Alvo interno: 17/10 à noite.** Não apresentar essa meta como prazo oficial. Detalhes e evidências estão em [Requisitos e evidências](REQUISITOS-E-EVIDENCIAS.md).

Nenhuma gravação, publicação, mensagem, submissão, infraestrutura ou GPU foi acionada por este roteiro.
