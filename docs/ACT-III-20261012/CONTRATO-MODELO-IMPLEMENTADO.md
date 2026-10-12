**Atualização R03 de 12/10/2026:** o piloto FP32 posterior teve 3/9 formatos aceitos, sendo 2/7 nos baselinecases; cinco baselinecases foram rejeitados. GPU desligada às17:39:42Z, sem endpoint ao vivo. O painel de replay preserva fontes/erros e bloqueia candidata em handoff. Não houve aprovação semântica formal nem confirmação de elegibilidade. Consulte [AMD-PILOT-R03-RESULTS.md](AMD-PILOT-R03-RESULTS.md), [matriz atual](REQUISITOS-E-EVIDENCIAS.md) e [README atual](../../README.md).

**O texto original abaixo conserva a observação da etapa anterior e não deve ser usado como descrição do estado R03.**

# Contrato do modelo preparado offline — 12/10/2026

`app/ai-contract.mjs` e seus testes foram desenvolvidos em **12/10/2026 como núcleo novo**, a partir de `CONTRATO-IA-PENDENTE.md` e da projeção `getModelInput` do motor administrativo preexistente. A distinção de datas e baseline deve acompanhar qualquer demonstração. Este documento não confirma elegibilidade de reutilização no ACT III.

O módulo cria um corpo de requisição e valida respostas candidatas em memória. **O backend de modelo continua desconectado:** não houve requisição de rede, instalação ou download de modelo, ativação de GPU, serviço, conta ou publicação. O endpoint administrativo existente continua fora desta mudança. Nenhuma saída de inferência foi obtida, nenhum desempenho em AMD foi medido e nenhuma validação clínica foi feita.

## Funções implementadas

`buildModelRequest(input, { model })` retorna um corpo no formato Chat Completions compatível com uma futura integração OpenAI/vLLM: `model`, duas `messages`, `temperature: 0`, `max_tokens: 1024` e `response_format` com JSON Schema fechado. O modelo é um identificador informado pelo chamador. Não há URL, chave, header, `fetch`, ferramentas ou transporte no módulo. Compatibilidade com uma versão concreta de vLLM, disponibilidade do modelo e custo de tokens permanecem por testar no backend real.

A entrada aceita exatamente `caseId`, `question` e `sources`. O caso deve ser um dos oito IDs fictícios da demonstração. Cada fonte aceita somente `id`, `trecho` e, se já presentes, `versao`, `vigente`, `substituida_por`. Propriedades extras são rejeitadas, não omitidas silenciosamente. A aplicação deve chamar `getModelInput` a partir do estado conferido para selecionar as fontes da fase ativa; este módulo, sozinho, **não consegue distinguir uma fonte futura injetada por um chamador que forge um contexto permitido**. O teste de integração confirma que o motor exclui essas fontes antes da etapa humana e que uma referência ausente é rejeitada.

Os trechos e a pergunta entram como dados JSON na mensagem `user`. O prompt fixo `system` instrui o futuro modelo a tratar instruções embutidas como dados, a não executar ações e a se abster diante de falta de suporte, conflito relevante ou decisão clínica. Esse desenho não comprova resistência a prompt injection: nenhum modelo foi executado, e fontes podem conter conteúdo adversarial com formato permitido.

`validateModelCandidate(input, candidate)` aceita um objeto JSON simples ou uma string contendo somente JSON. A resposta precisa ter exatamente `answer`, `citations`, `abstention`, `reason` e `humanReviewRequired`. Cada citação precisa ter exatamente `sourceId` e `trecho`. O ID deve pertencer ao contexto recebido; o trecho inteiro precisa ser idêntico ao da fonte, sem correção de acentos, recorte, normalização ou espaço extra. IDs repetidos nas fontes e citações repetidas são recusados. Uma fonte com `vigente: false` ou `substituida_por` não pode sustentar a resposta atual; ela pode permanecer no contexto como histórico identificado.

Abstenção exige `answer: ""`, `citations: []`, `abstention: true` e motivo não vazio de até 300 caracteres. Resposta afirmativa exige texto não vazio, pelo menos uma citação, `abstention: false` e `reason: null`. `humanReviewRequired` precisa ser `true` em ambos os casos. Propriedades de ação, funções, ferramentas ou instruções são recusadas por não pertencerem ao esquema. O módulo não registra revisão humana nem muda estado administrativo.

Na aceitação de formato, o retorno é `formatValid: true` e **`requiresSemanticHumanReview: true`**, acompanhado de uma cópia da candidata. Na recusa, é `formatValid: false`, `requiresSemanticHumanReview: true`, `candidate: null` e erros com código. Entrada inválida é erro explícito do chamador, lançado antes de avaliar a candidata. Uma resposta recusada não é preenchida com gabarito ou rascunho.

## Limites reais

O validador confirma forma, presença de referências, correspondência textual e sinalização de revisão. Ele **não comprova que o significado da resposta é sustentado pela citação**, não identifica todos os conflitos, não sabe se uma pergunta é clínica e não garante abstenção correta. Texto livre pode alegar confirmação, ação ou tratamento sem suporte e ainda cumprir o formato. Um teste deliberado registra exatamente esse limite. Essa saída continua candidata a revisão semântica humana; jamais recebe rótulo `verified` ou aprovação clínica.

O protocolo fechado impede campos executáveis, e o módulo não possui mecanismo para executar ações. Isso não equivale a detectar todas as instruções ou alegações indevidas dentro do texto livre. Expressões regulares verificam apenas identificadores e forma do nome do modelo; **não são um mecanismo completo de segurança clínica**. A pessoa deve conferir cada afirmação e sua fonte, conflito, vigência e competência antes de qualquer uso ou decisão.

Limites implementados, em unidades de `String.length` do JavaScript (UTF-16): pergunta 2.000; trecho 4.000; soma dos trechos 64.000; fontes 64; ID e versão 80; nome do modelo 128; resposta 2.000; citações 32; motivo 300; string JSON candidata 140.000. O JSON Schema enviado usa os limites do formato, mas as invariantes cruzadas de abstenção e igualdade das citações são conferidas novamente no validador local. Esses números não representam um orçamento confirmado de tokens ou latência.

## Verificação offline

Os testes usam candidatos artificiais, fontes independentes alteradas e as fixtures fictícias existentes. Cobrem fonte removida, IDs inventados, trecho adulterado, fonte histórica, exclusão de fontes futuras pelo motor, separação de gabaritos/rascunhos/próximas ações, dados com instruções embutidas, campos extras de ação, propriedades acessoras, listas malformadas, limites e preservação das entradas. Eles verificam contrato e projeção; **não são avaliação de modelo, prova de abstenção semântica, validação clínica ou demonstração de execução AMD**.

Comando de teste dedicado:

```sh
node --test app/tests/ai-contract.test.mjs
```

Resultado executado em 12/10/2026: **16 testes dedicados passaram, nenhum falhou**. A execução conjunta com `app/tests/engine.test.mjs` terminou com **48 testes aprovados e zero falhas**, confirmando o contrato novo junto da projeção e das transições administrativas já existentes. Essa conferência não iniciou o servidor.

Antes de conectar o backend, permanecem necessários: escolha e registro do modelo/versão/configuração; avaliação independente dos oito casos e das falhas semânticas; revisão humana registrada; verificação de resistência a instruções em dados; comprovação separada de execução significativa em AMD; e confirmação das regras de reutilização. O estado final desta entrega é **contrato e testes implementados offline; modelo ainda não conectado**.
