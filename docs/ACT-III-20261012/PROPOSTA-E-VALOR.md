**Atualização R03 de 12/10/2026:** o piloto FP32 posterior teve 3/9 formatos aceitos, sendo 2/7 nos baselinecases; cinco baselinecases foram rejeitados. GPU desligada às17:39:42Z, sem endpoint ao vivo. O painel de replay preserva fontes/erros e bloqueia candidata em handoff. Não houve aprovação semântica formal nem confirmação de elegibilidade. Consulte [AMD-PILOT-R03-RESULTS.md](AMD-PILOT-R03-RESULTS.md), [matriz atual](REQUISITOS-E-EVIDENCIAS.md) e [README atual](../../README.md).

**O texto original abaixo conserva a observação da etapa anterior e não deve ser usado como descrição do estado R03.**

# PatientKeeper — Retorno: proposta e valor

Preparação ACT III em 12/10/2026. Público principal: **recepção e coordenação de clínicas**. Proposta candidata à trilha Health and Wellbeing. Dados da demonstração inteiramente fictícios; ganho processual ainda é hipótese a testar.

## Decisão de produto

Um retorno cancelado precisa continuar visível até que uma pessoa confira a reposição e registre sua resolução administrativa. O produto reúne responsável, próxima ação, origem da informação e histórico para apoiar o trabalho entre recepção, coordenação e equipe médica.

O relato de Athos sobre concentração de responsabilidades na recepção orientou a hipótese. Ainda não há pesquisa com clínicas, piloto operacional ou baseline de desempenho. A proposta deve ser discutida como apoio à continuidade do trabalho, sem atribuir culpa, negligência ou desempenho individual à equipe.

## Narrativa que diferencia o produto

**Pendência → fonte → revisão → cartão.**

| Etapa | O que a pessoa vê | O que fica registrado |
|---|---|---|
| Pendência | Estado administrativo, responsável ou ausência de atribuição e próxima ação | O cancelamento permanece acompanhável; um rascunho não encerra a tarefa. |
| Fonte | Trechos literais do caso, com origem e condição vigente ou histórica | A consulta lexical local mostra correspondências. Não encontrar trechos não comprova falta de informação. Caso já registrado como divergente exibe todas as fontes vigentes. |
| Revisão | Pessoa confere o trecho e escolhe o que pode integrar o cartão | Conferência explícita; a citação literal ainda precisa ser relevante para a pergunta. Caso com divergência administrativa registrada segue para a equipe e não permite cartão. |
| Cartão | Informação selecionada, com citações legíveis e identificação da conferência | Recibo separado e seleção sem duplicação; fontes anteriores exigem nova consulta. O cartão não comprova envio, confirmação de agenda ou encerramento. |

O diferencial está na continuidade entre informação e responsabilidade. A recepção encontra a origem, a coordenação identifica o handoff incompleto e a pessoa responsável confere antes de transformar informação em um cartão utilizável.

## Três escolhas concretas de UX

1. **Origem junto da informação.** Abrir a pendência e ler a frase original no mesmo percurso. Fontes históricas aparecem como histórico; a regra vigente determina o contexto administrativo atual.
2. **Revisão que muda o estado do texto.** Encontrado, conferido e incluído no cartão são etapas distintas. Fontes que mudarem depois da consulta exigem nova conferência; não reutilizar aprovação antiga como se ainda fosse válida. A divergência administrativa já registrada impede preparar cartão até a revisão do caso.
3. **Cartão com responsabilidade visível.** O resultado mostra os trechos selecionados e a revisão humana, enquanto a fila conserva o estado administrativo próprio. Isso permite explicar o trabalho sem confundir texto preparado com ação concluída.

Priorizar tipografia legível, contraste suficiente, linguagem simples e marcadores por texto. Cor apoia a leitura; o significado de pendente, conflito ou revisão não deve depender dela. Mostrar a condição do resultado próximo ao cartão, sem esconder limites em uma tela secundária.

## O que é factual agora e o que é plano

| Camada | Declaração adequada |
|---|---|
| Base de 05/10 | Aplicação administrativa anterior ao evento, com casos fictícios, fila, atribuição, histórico e persistência local. |
| Acréscimo local de 12/10 | Consulta lexical por fontes ativas, histórico separado e cartão de trechos literais após conferência; implementação e testes locais concluídos. Persistência separada, deduplicação, digest e bloqueio de conflito na UI/API. |
| Contrato offline de 12/10 | Entrada e validação de candidatos artificiais implementadas, sem executar modelo ou transporte de rede. |
| IA futura | Modelo para síntese administrativa sustentada em fontes, sob contrato de entrada e saída, abstenção e revisão. Modelo ainda desconectado; inferência não executada. |
| AMD futura | Carga relevante do novo produto deve ser executada e comprovada em AMD. GPU e inferência AMD ainda não executadas. |
| Uso real | Pesquisa com usuários, condições de uso em clínica e avaliação operacional ainda não realizadas. |

O valor atual demonstrável é organizar o percurso de conferência. O valor futuro da IA deve ser provado com saídas reais e uma comparação, antes de ser usado como argumento de desempenho.

A suíte local (recibo local preservado fora do repositório público) registra **93/93 testes**, com zero falhas ou testes pulados; 51 pertencem à base anterior, 26 à conferência e 16 ao contrato offline. O recibo consolidado emitido (recibo local preservado fora do repositório público) registra a validação local e o estado administrativo preservado. O bloqueio do caso divergente foi verificado no Chrome: DIVERGENCIA-BLOQUEADA.png (recibo local preservado fora do repositório público). Esses testes não medem ganho de processo, desempenho de IA ou eficácia clínica.

## Hipótese de valor para testar

**Ao reunir pendência, fontes ativas e revisão em um percurso curto, a recepção pode gastar menos tempo procurando registros, e a coordenação pode identificar mais claramente o que falta para o próximo passo.** Não há percentual estimado, economia já medida ou efeito clínico comprovado.

A hipótese será considerada sustentada somente se uma comparação pareada mostrar melhoria observável de processo sem aumentar afirmações sem suporte, usar fontes históricas como atuais ou contornar as abstenções necessárias. Tempo menor isolado não prova qualidade.

## Protocolo pareado manual versus produto

Plano de avaliação; **nenhuma linha de base foi medida ainda**.

1. Montar um conjunto reservado de casos inteiramente fictícios, independente dos oito casos de desenvolvimento. Incluir informação suficiente, ausência, conflito, política antiga/vigente e pergunta fora do escopo administrativo.
2. Preparar respostas esperadas e fontes de referência fora da entrada do produto e do eventual modelo. Distinguir ausência legítima de resposta e falha de encontrar suporte existente.
3. Definir a mesma tarefa para as duas condições: localizar a informação necessária, apontar sua fonte e preparar um cartão administrativo revisado.
4. Na condição manual, fornecer documentos equivalentes. Na condição produto, fornecer os mesmos registros na interface. Alternar a ordem entre pessoas e entre conjuntos equivalentes para reduzir aprendizagem e efeito de ordem.
5. Cronometrar do início da tarefa até o cartão conferido. Registrar ajuda recebida, erro ou interrupção; não excluir falhas para melhorar o resultado.
6. Fazer revisão independente das respostas e citações, com critérios definidos antes de observar resultados. Relatar resultados de forma agregada e com o tamanho do conjunto, sem ranking de trabalhadores.

| Medida | Definição a registrar |
|---|---|
| Acerto administrativo | Informação coincide com os registros da fase ativa; sem inferir fato ausente. |
| Sustentação da citação | A referência existe, o trecho permanece literal e sustenta a informação apresentada. Literalidade sozinha não basta. |
| Fonte vigente | Regra histórica não é usada como regra atual; registro anterior permanece identificável. |
| Abstenção necessária | Produto evita afirmar quando faltam fontes, há conflito ou a pergunta é clínica. |
| Abstenção indevida | Produto deixa de localizar suporte disponível e pertinente; registrar como limitação. |
| Tempo da tarefa | Duração observada até resultado revisado; apresentar distribuição e falhas, sem projetar economia anual sem dados. |
| Persistência e revisão | Recibo pode ser recuperado; cartão conserva suas fontes; ação textual não modifica o estado administrativo. |

Os oito casos conhecidos demonstram comportamento esperado e regressões. Resultados neles não estimam desempenho em entradas inéditas. Desempenho processual não comprova benefício clínico, segurança clínica, redução de complicações ou validação médica.

## Limites de operação

A ferramenta organiza tarefas administrativas. Equipe médica define orientações e janelas clínicas. Pergunta clínica, urgência declarada e decisão de alto risco exigem encaminhamento humano. A consulta não escolhe conduta nem classifica gravidade.

Preferência de não receber bloqueia o fluxo de rascunho comum; preferência ausente não vira autorização. O produto não envia mensagem, altera agenda ou encerra pendência por gerar um cartão. A implementação local usa dados fictícios e recibos separados.

O caso cujo estado administrativo já indica divergência mostra todos os registros vigentes e bloqueia o cartão, inclusive pedido direto à API. Isso trata um conflito declarado pela base; não comprova detecção semântica de conflitos novos. A conferência registrada é uma confirmação explícita da interação, sem autenticar a identidade da pessoa. A [licença MIT local](../../LICENSE) foi preparada; publicação, licenças de terceiros e reutilização específica para ACT III permanecem pendentes.

## Pitch compacto

**Português:** O PatientKeeper — Retorno ajuda recepção e coordenação a acompanhar um retorno cancelado até a conferência da reposição. Cada pendência leva às suas fontes; uma pessoa revisa e produz um cartão com trechos verificáveis. Demonstramos dados fictícios e consulta local. O próximo marco é integrar e avaliar IA em AMD. O ganho de processo ainda será medido.

**English:** PatientKeeper — Retorno helps reception and coordination teams keep a canceled follow-up visible until its administrative resolution is checked. Each pending task leads to its sources, human review and a card with verifiable excerpts. Our current demo uses synthetic data and local extractive lookup. AMD AI integration and process gains remain to be demonstrated.

## Fontes e origem

- [Trilha e requisitos oficiais ACT III](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii).
- Slides e transcrição parcial do kickoff (recibo local preservado fora do repositório público).
- Problema e escopo anterior (recibo local preservado fora do repositório público) e [declaração do baseline](../../BASE-PREEXISTENTE.md).
- [Requisitos e estados de evidência desta preparação](REQUISITOS-E-EVIDENCIAS.md).
