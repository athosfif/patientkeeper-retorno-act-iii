# AMD R03 — resultados e ligação ao produto

Em 12/10, uma nova sessão autorizada executou Qwen2.5-1.5B-Instruct FP32 nos contextos positivos do Retorno. Este registro atualiza o estado posterior à falha FP16 R02; não altera os originais.

**Fato observado:** Radeon Pro W7900D / PyTorch HIP, checkpoint `989aa7980e4cf806f80c7fef2b1adb7bc71aa306`, Apache-2.0. Python3.14.4, Torch2.13.0+rocm10.0.0, HIP7.15.26333, Transformers4.57.1. A geração foi real na GPU; o demo publicado não mantém um serviço de inferência.

| Entrada / tentativa | Formato | Tempo de geração |
|---|---|---:|
| SIM02 com responsável SEC-SIM-C atribuído | Aceito | 6,854s |
| Baseline SIM01 | Aceito | 6,810s |
| Baseline SIM02 | Rejeitado | 6,544s |
| Baseline SIM03 | Rejeitado | 7,078s |
| Baseline SIM04 | Aceito | 5,938s |
| Baseline SIM05 | Rejeitado | 6,595s |
| Baseline SIM06 | Rejeitado | 9,174s |
| Baseline SIM07 | Rejeitado | 7,459s |
| SIM01 com prompt estruturado adicional | Rejeitado | 6,821s |

**2/7 baselinecases; 3/9 total por formato.** Os três objetos foram revalidados com o contrato JavaScript: campos fechados, citações literais vigentes, abstenção coerente e revisão humana obrigatória. Isso não aprova a sustentação semântica de cada frase. Todos mantêm `semanticApproved:false`. Uma resposta repetiu português apesar da instrução inglesa.

Os forwards instrumentados FP32 registraram logits finitos. O piloto FP16 anterior não mediu logits; sucesso FP32 não prova retroativamente que NaN/overflow causou a repetição ! anterior. Não afirmar causalidade sem medida comparável.

O painel de replay consulta evidência/contexto da mesma revisão atual e exige igualdade de todo o input, inclusive fontes históricas. Só um candidato válido é exibido. Um handoff atual impede inclusive abstenção gravada, mostrando metadados; falhas não são reescritas como respostas. Nenhuma ação, envio, cartão ou nova inferência acontece por abrir o painel.

A UI AMD foi observada sem notebook ativo às **17:39:42Z**, com Request Notebook e quota remanescente2h24min. O recibo do processo não observa a plataforma; o [recibo de desligamento](../../evidence/ACT-III-R03-20261012/AMD-SHUTDOWN-RECEIPT.json) é separado.

[Resumo estruturado](../../evidence/ACT-III-R03-20261012/AMD-PILOT-R03-SUMMARY.json) · [originais JSON/TXT](../../evidence/ACT-III-R03-20261012/AMD-PILOT-FINAL/). ZIP final93.993bytes, SHA256 `fdceb4c2af55d15a2418b814226d1902315168c3f54716e5113d7188e35f25bc`. Não há autorização automática neste documento para reiniciar GPU, baixar modelos ou consumir créditos.

ADMIN-R01 de05/10 é preexistente. O fluxo de revisão, contrato, transporte, piloto e replay de12/10 são declarados como incremento. A aceitação do replay para o requisito significativo AMD não é presumida; decisão do evento, revisão clínica e prêmio são estados separados.
