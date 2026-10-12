**Atualização R03 de 12/10/2026:** o piloto FP32 posterior teve 3/9 formatos aceitos, sendo 2/7 nos baselinecases; cinco baselinecases foram rejeitados. GPU desligada às17:39:42Z, sem endpoint ao vivo. O painel de replay preserva fontes/erros e bloqueia candidata em handoff. Não houve aprovação semântica formal nem confirmação de elegibilidade. Consulte [AMD-PILOT-R03-RESULTS.md](AMD-PILOT-R03-RESULTS.md), [matriz atual](REQUISITOS-E-EVIDENCIAS.md) e [README atual](../../README.md).

**O texto original abaixo conserva a observação da etapa anterior e não deve ser usado como descrição do estado R03.**

# PatientKeeper — Retorno: transporte e piloto AMD

Preparação de 12/10/2026. **Não houve inferência real, download de pesos, ativação de GPU ou consumo de serviço para produzir este módulo e este plano.** O transporte foi validado com respostas e falhas artificiais. Configuração, resposta do endpoint e execução AMD são estados diferentes.

## O que foi preparado

`app/model-transport.mjs` monta uma requisição a partir de `buildModelRequest` e valida a candidata com `validateModelCandidate`. Os testes correspondentes estão em `app/tests/model-transport.test.mjs`.

- `validateModelConfiguration(config)` retorna `valid`, `enabled`, `endpoint`, `model` e `errors`. Não retorna a chave. Configuração ausente, `null` ou `{}` mantém o transporte desativado. Configuração parcial ou inválida é recusada.
- `executeModelQuery(input, config, options)` aceita somente configuração explícita: `endpoint`, `model` e, quando necessário, `apiKey`. O endereço precisa terminar em `/v1`, `/v1/` ou `/v1/chat/completions`; as duas bases viram `/v1/chat/completions`. Aceita HTTPS ou HTTP apenas em loopback. Recusa usuário/senha, query, fragmento, caminhos normalizados e redirecionamentos.
- Configuração e chave pertencem ao servidor. Não devem vir de campos livres do navegador, armazenamento do cliente, URL pública ou pacote de entrega. O backend ainda deve controlar quem pode consultar e qual endpoint pode ser configurado; o filtro de URL do módulo não é uma autorização de acesso ou uma proteção completa contra SSRF.
- Envia uma única requisição, sem descoberta de modelo, retry, tools ou função de startup. O retorno é não streaming; o corpo HTTP é lido por partes para impor o limite. Prazo padrão de 15 segundos, configurável entre 10 e 60.000 ms; corpo padrão de 262.144 bytes, configurável entre 256 e 1.048.576 bytes. São limites de proteção local, não latência ou orçamento de tokens medidos.
- A pergunta e as fontes permanecem dados separados do prompt fixo. Uma instrução fixa pede resposta e motivo de abstenção em inglês, conservando cada citação literalmente no idioma original. Não se força uma tradução que possa alterar a evidência.
- `candidate` e `abstained` significam formato aceito, acompanhado de `requiresSemanticHumanReview:true`. `invalid_candidate`, `unavailable`, `error` ou `disabled` não fornecem candidata. O resultado inclui `durationMs`, `httpStatus` e `transportAttempted`, sem prompt, corpo bruto, URL ou chave. O módulo não imprime logs. **`amdVerified` permanece `false` em todos os resultados.**

Timeout, corpo excessivo, erro HTTP/rede, redirect, UTF-8 inválido, JSON incompleto, recusa, truncamento, ferramenta, citação alterada e campo de ação são tratados como falha. Uma resposta afirmativa bem formada ainda pode conter uma afirmação sem suporte; a conferência semântica continua indispensável.

O chamador deve usar `getModelInput` do estado vigente e conferir novamente revisão/digest antes de apresentar a saída. O transporte conserva uma cópia da projeção usada na requisição para validação posterior. Ele não autentica a origem dessa projeção, resolve divergência administrativa nem grava estado ou cartão.

## Compatibilidade que falta confirmar no ambiente real

A documentação oficial vLLM v0.11.2 descreve a API `/v1/chat/completions` para modelos de geração com chat template. A instalação concreta precisa preservar esse template e seu tratamento de mensagens. [vLLM: OpenAI-Compatible Server](https://docs.vllm.ai/en/v0.11.2/serving/openai_compatible_server/).

Essa versão documenta saídas estruturadas por `response_format` com `json_schema`. Isso fundamenta o protocolo preparado; **não comprova que um servidor ainda não observado aceitará este esquema, a combinação de modelo ou sua configuração**. Registrar e testar a versão efetivamente usada, sem relaxar silenciosamente o contrato se ela rejeitar o pedido. [vLLM: Structured Outputs](https://docs.vllm.ai/en/v0.11.2/features/structured_outputs/).

## Piloto mínimo proposto

Objetivo: executar a preparação de uma resposta administrativa candidata do **Retorno**, integrada ao fluxo real do produto, em hardware AMD confirmado. O piloto deve mostrar a pergunta, os registros recebidos, a saída candidata, suas citações e a conferência humana. Uma requisição genérica desconectada do produto ou a execução antiga dos projetos Academy não substituem essa prova.

**Modelo candidato, ainda não adotado:** `Qwen/Qwen2.5-1.5B-Instruct`. O repositório oficial identifica 1,54 bilhão de parâmetros e licença Apache 2.0. Esse porte é uma hipótese de partida para o piloto limitado, sem estimativa de memória, velocidade ou qualidade local. Fixar a revisão dos pesos/tokenizer, conferir o arquivo de licença dessa revisão, preservar os avisos aplicáveis e verificar compatibilidade com o ambiente AMD observado antes de qualquer download. [Model card oficial Qwen](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct), [licença publicada](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct/blob/main/LICENSE).

Hardware, memória disponível, driver, ROCm, PyTorch e build vLLM permanecem **por verificar**. Confrontar a GPU efetivamente concedida com a documentação da versão escolhida. Não inferir suporte apenas pela marca AMD ou por uma VM aparecer no portal. [vLLM: instalação em GPU](https://docs.vllm.ai/en/v0.11.2/getting_started/installation/gpu/).

1. **Antes de ativar:** registrar autorização vigente para GPU/serviço/download; confirmar a conta, o hardware, limites de uso, crédito realmente disponível e eventual cobrança. Se houver custo ou dependência ainda desconhecida, registrar essa pendência. Nenhum valor ou duração gratuita foi estimado neste plano.
2. **Fixar a execução:** manifesto do código novo ACT III e do baseline anterior, revisão imutável do modelo/tokenizer, licenças, versões de ambiente, configuração de servidor, endpoint sanitizado e `runId` local. Não armazenar chave, cookies, tokens ou referência privada de imagem no pacote público.
3. **Uma requisição inicial:** usar um caso inteiramente fictício com fonte vigente simples, via UI/API do Retorno. Conferir formato, texto e citação inteira; registrar latência ponta a ponta e evidência do mesmo `runId` no ambiente AMD. Não repetir automaticamente uma falha, truncamento ou configuração rejeitada.
4. **Lote restrito, se a primeira funcionar:** no máximo seis consultas adicionais, sequenciais, sem concorrência. Usar fontes fictícias independentes com: responsável explícito, ausência de suporte, conflito em registros, fonte substituída, instrução adversarial embutida e pergunta clínica. Reutilizar o contrato do produto; não enviar gabaritos ou próximas ações ao modelo. Os bloqueios locais de conflito e pergunta clínica podem impedir a chamada: registrar “bloqueado antes da inferência” como estado distinto de “modelo se absteve”.
5. **Conferência:** para cada consulta, marcar suporte semântico, fidelidade das citações, vigência, abstenção esperada/observada, vazamento de instruções e alteração indevida. Uma única falha de significado relevante impede declarar a candidata pronta para uso; preservar a evidência e corrigir/avaliar novamente antes de apresentar o fluxo como validado.
6. **Valor do produto:** executar comparação pareada manual versus Retorno com casos sintéticos e tarefa definida — localizar pendência, responsável e origem. Registrar tempo real e erros, separando tempo do modelo de tempo de revisão. Não apresentar ganho percentual, benefício clínico ou generalização sem os dados que sustentem isso.
7. **Encerrar:** finalizar o processo de inferência e desligar somente a sessão pertencente ao piloto. Confirmar na UI/registro oficial o estado final de GPU/serviço e eventuais recursos que ainda possam cobrar. Preservar um recibo sanitizado do desligamento. Processo local encerrado não prova recurso cloud desligado.

## Evidência a conservar por execução

| Registro | Conteúdo mínimo | O que não prova isoladamente |
|---|---|---|
| Origem do código | Manifesto e versão, baseline declarado, data do incremento ACT III | Reutilização específica permitida ou elegibilidade integral |
| Ambiente AMD | GPU/modelo de hardware observável, driver/ROCm/PyTorch/vLLM, identificador sanitizado da sessão | Que a requisição do produto passou por essa GPU |
| Modelo | Nome, revisão fixa, tokenizer/chat template, licença e configuração efetiva | Qualidade da resposta ou compatibilidade integral |
| Consulta sintética | `runId`, caso, revisão/digest, IDs e trechos enviados, pergunta, momento | Uma fonte futura não deve ser incluída para facilitar resposta |
| Resultado | Estado, latência, HTTP, candidata validada ou falha sanitizada, citações/abstenção | Suporte semântico ou execução AMD verificados pelo transporte |
| Vínculo de execução | Log sanitizado da mesma requisição/`runId`, estado do processo e hardware | Pontos, classificação ou prêmio |
| Conferência humana | Critérios, observações e pessoa autorizada que conferiu | Validação clínica ou identidade profissional sem autenticação |
| Encerramento | Momento, estado oficial de sessão/recurso, recibo sanitizado | Custo zero ou extinção de armazenamento/outros recursos |

O resultado atual é **transporte preparado com testes artificiais; piloto e integração AMD real pendentes**. Publicação, submissão, prêmio e pontos dependem de evidência e recibos próprios.
