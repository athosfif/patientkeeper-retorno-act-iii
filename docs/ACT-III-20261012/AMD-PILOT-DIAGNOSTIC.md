**Atualização R03 de 12/10/2026:** o piloto FP32 posterior teve 3/9 formatos aceitos, sendo 2/7 nos baselinecases; cinco baselinecases foram rejeitados. GPU desligada às17:39:42Z, sem endpoint ao vivo. O painel de replay preserva fontes/erros e bloqueia candidata em handoff. Não houve aprovação semântica formal nem confirmação de elegibilidade. Consulte [AMD-PILOT-R03-RESULTS.md](AMD-PILOT-R03-RESULTS.md), [matriz atual](REQUISITOS-E-EVIDENCIAS.md) e [README atual](../../README.md).

**O texto original abaixo conserva a observação da etapa anterior e não deve ser usado como descrição do estado R03.**

# Diagnóstico do piloto AMD de 12/10/2026

O piloto executou o modelo na AMD Radeon Pro W7900D, mas não produziu candidato utilizável. A causa da repetição ainda não foi medida. A alteração local do script prepara um teste diagnóstico; não comprova correção nem autoriza nova sessão.

## Evidência preservada

- `evidence/ACT-III-R02-20261012/AMD-PILOT/RUN-20261012T165039Z-7cd07707/worker-receipt.json`: a primeira tentativa falhou na importação de dependências, com `ModuleNotFoundError`, antes da inferência. O ambiente virtual foi corrigido no trabalho interativo posterior.
- `evidence/ACT-III-R02-20261012/AMD-PILOT/RUN-20261012T165324Z-c7ffd7c2/environment.json`: Python 3.14.4, PyTorch 2.13.0+rocm10.0.0, HIP 7.15.26333, Transformers 4.57.1, huggingface_hub 0.36.2, dispositivo AMD Radeon Pro W7900D e 51.522.830.336 bytes de memória observados.
- Modelo `Qwen/Qwen2.5-1.5B-Instruct`, revisão fixa `989aa7980e4cf806f80c7fef2b1adb7bc71aa306`; licença Apache-2.0 armazenada. A cópia original do script usou `float16` e atenção `eager`.
- `result-01.json`: caso fictício SIM-RET-02, contexto completo de 654 tokens, geração de 1.024 tokens em 30,687 segundos, `formatValid:false`, `candidate:null`, `semanticApproved:false`.
- `raw-01.txt`: exatamente 1.024 caracteres `!`. O lote parou após essa primeira falha; zero candidatos foram aceitos.
- O antigo `worker_completed`/exit 0 indicava término do processo; não indicava resposta válida. A versão diagnóstica distingue `candidate_rejected` com exit 2.

O arquivo original preservado em `evidence/ACT-III-R02-20261012/AMD-PILOT/amd-pilot.py` mantém SHA-256 `7009d3562f0d35c2e29e073fd9fbab56c3414ab74c08718b789aa093ee9b61aa`. A cópia preservada, os recibos e o ZIP da evidência não foram alterados nesta correção.

O controlador principal informou desligamento oficial da sessão em 12/10/2026 às 17:01:13 UTC, dentro do limite autorizado das 17:01:45 UTC. Os recibos do worker, isoladamente, não verificam desligamento da nuvem. A autorização de 20 minutos terminou; não há reinício automático.

## O que permanece desconhecido

Não foram coletados logits, contagem de valores não finitos, comparação numérica ou distribuição dos tokens na execução original. Portanto, não é possível atribuir a falha a NaN, float16, kernel ROCm, cache KV, modelo ou compatibilidade entre versões. Float32 é a próxima condição de teste, não uma causa demonstrada nem uma solução validada.

A execução real da GPU não comprova qualidade semântica, aptidão clínica, elegibilidade final da entrega, prêmio ou execução contínua do produto publicado.

## Alteração local preparada

`scripts/amd-pilot.py` agora oferece:

- `--dtype float32` como padrão; `--dtype float16` exige escolha explícita. Registra dtype solicitado e dtype efetivo dos parâmetros.
- Modelo e licença em cache por padrão, na mesma revisão fixa. Falha fechada se faltarem arquivos; `--allow-download` é um opt-in técnico e exige autorização humana vigente para download. Não instala dependências.
- Um forward do contexto completo na GPU antes de cada geração. Salva apenas contagem de logits não finitos, desvio padrão, ID do token de maior logit e duração em `logits-NN.json`; não salva o prompt nesse diagnóstico. Qualquer logit não finito impede a geração, com `LOGITS_NONFINITE`.
- `--numeric-diagnostic`: compara multiplicação determinística de matrizes 32×32 na GPU com referência CPU float32. Registra finitude, erro relativo L2 e erro absoluto máximo. Não aplica limiar de aprovação inventado nem executa o modelo na CPU.
- `--max-new-tokens 512` por padrão, aceitando somente 64–512; preserva todas as fontes e mantém o limite de contexto. Para após 32 tokens de saída consecutivos idênticos e rejeita com `GENERATION_REPETITION`, sem nova tentativa ou restante do lote.
- `--preflight-only`: carrega o modelo em cache e faz apenas o forward do primeiro caso. Isso é computação real na GPU; não gera candidato e não aprova qualidade. O recibo distingue `gpuModelForwardExecuted:true` de `gpuInferenceExecuted:false`.
- Prazo absoluto opcional, supervisor com limite máximo de 12 minutos e limite de 120 segundos por geração. O script nunca inicia sessão, consulta credenciais nem desliga a infraestrutura por conta própria; desligamento oficial continua responsabilidade do controlador.

Mesmo um JSON válido continua exigindo revisão humana de cada afirmação e de suas referências literais. O prompt e os quatro contextos atuais do produto permanecem intactos; não se adicionam respostas esperadas, ações ou dados reais.

## Próximo teste mínimo, somente após nova autorização

1. Conferir sessão/quota gratuita, prazo de desligamento e existência do modelo, tokenizer e licença em cache na revisão fixa. Conferir versões e HIP; não substituir por inferência CPU nem outro modelo silenciosamente. Se cache ou runtime tiver sido descartado, parar e informar o requisito antes de baixar.
2. Executar um único SIM-RET-02 em float32 com `--numeric-diagnostic` e `--preflight-only`, usando as fontes completas exportadas pelo produto e um novo prazo UTC real. Inspecionar finitude e métricas; elas não aprovam a resposta.
3. Somente se esse forward estiver finito e ainda houver tempo autorizado, executar uma única geração do mesmo caso em float32, máximo 512 tokens. Sem retries automáticos. Confirmar formato, citações literais e revisão semântica antes de ampliar para os outros casos.
4. Guardar run ID, hashes, versões, hardware, licença, métricas, resposta/falha e desligamento oficial. Se repetir tokens ou falhar formato, manter o candidato rejeitado; não apresentar o piloto como IA utilizável.

Exemplo deliberadamente sem data executável; substituir o marcador apenas sob autorização atual:

```text
python3 amd-pilot.py --input amd-pilot-inputs.json --max-cases 1 \
  --dtype float32 --max-new-tokens 512 --numeric-diagnostic --preflight-only \
  --output-dir /workspace/ACT-III-RETORNO-20261012 \
  --deadline-utc NOVO_PRAZO_UTC_AUTORIZADO
```

Nesta correção foram realizados somente análise de sintaxe e verificações com biblioteca padrão sobre os quatro contextos, validação estrutural e detector de repetição. Não foram importados PyTorch/Transformers, iniciadas GPUs, executados forwards, baixados modelos ou consultados serviços externos.
