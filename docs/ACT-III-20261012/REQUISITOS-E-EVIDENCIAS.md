# PatientKeeper Retorno — requisitos e evidências ACT III R03

Atualizado em **12/10/2026**. Equipe FIGUEIRA AI; participação online; trilha Health and Wellbeing. Este registro distingue implementação, execução, revisão, publicação e submissão. Não confirma elegibilidade integral ou prêmio.

## Fontes e estados

- [Página específica do ACT III](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii): regras, trilhas, parceiros e requisitos observados em 12/10.
- [Painel /live](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii/live): programação pública; não prova aprovação individual.
- [Guia geral](https://lablab.ai/guide/ai-hackathons) e [submissão](https://lablab.ai/ai-articles/hackathon-guidelines): orientação geral, subordinada ao formulário e às regras específicas.
- [Rule Book](https://lablab.ai/hackathon-rules): leitura anterior vazia; regulamento integral não confirmado por essa leitura.
- [Resumo R03](../../evidence/ACT-III-R03-20261012/AMD-PILOT-R03-SUMMARY.json) e [recibo separado de desligamento](../../evidence/ACT-III-R03-20261012/AMD-SHUTDOWN-RECEIPT.json): observações de execução e UI, com seus limites.

## Matriz atual

| Requisito | Estado e prova | Pendência / limite |
|---|---|---|
| Inscrição e equipe | Enrolled/Approved e equipe FIGUEIRA AI observados pelo coordenador; um membro. | Página admite 1–6; canal Discord privado com exigência distinta não invalida participação solo. |
| Trilhas | Health and Wellbeing proposta. | Confirmar a opção exata no envio. |
| Uso AMD | Qwen em float32 executado realmente na Radeon Pro W7900D com os contextos positivos do produto. Sete baselinecases: 2 formatos aceitos, 5 rejeitados. Nove tentativas totais: 3 aceitas por formato. | Há carga real e painel de replay vinculado às fontes; suficiência do replay para uso significativo na premiação não confirmada. |
| Produto funcional | Fila, atribuição, fontes, conferência, cartão e bloqueios locais implementados; demo Pages pública abriu com oito casos, idiomas e rodapé verdadeiro. | QA detalhado da interação pública permanece registro separado; não há validação com usuários. |
| Revisão e incerteza | Fonte histórica separada, stale context rejeitado, conflito conhecido e pergunta clínica encaminhados à equipe. Replay de handoff mostra só metadados. | Não detecta todos os conflitos ou todas as perguntas clínicas. Formato e trechos exatos não aprovam significado. |
| Escopo clínico | Somente operações administrativas fictícias; sem diagnóstico, tratamento, janela clínica ou envio real. | Nenhuma validação clínica ou identidade de profissional autenticado. |
| Google / Evolus | Opcionais; não implementados. | Prêmios próprios têm condições adicionais; não usar tags como se ativados. vLLM não foi usado. |
| Código e licença | Código próprio MIT; Qwen Apache-2.0, revisão imutável e licença preservadas. | Baseline de 05/10 declarado; reutilização específica e elegibilidade são decisões separadas. |
| Idiomas e UX | EN inicial; PT/ES selecionáveis; citações originais preservadas. Chrome R02 verificou 320/390/768, teclado e contexto. | A versão publicada R03 precisa conferência própria; não há estudo de usuários nem auditoria WCAG integral. |
| Repositório público | Código publicado em athosfif/patientkeeper-retorno-act-iii; commit inicial de código 05391ea. | Atualização de docs/capa tem recibo Git separado; origem anterior continua declarada. |
| Demo / mídia | GitHub Pages publicado, gh-pages b7af3b2; 16/16 arquivos HTTP 200 com hashes exatos em 12/10 às 18:08:22 UTC. Saída estática separada do servidor. | Vídeo ≤5min, slides, capa e previews no formulário continuam conferências separadas; submissão não é inferida do deploy. |
| Submissão | Não comprovada por esta matriz. | Exigir mensagem oficial, URL e recarga; draft ou upload não equivalem a envio. |

## Piloto real R03

**Modelo:** Qwen/Qwen2.5-1.5B-Instruct, revisão `989aa7980e4cf806f80c7fef2b1adb7bc71aa306`, Apache-2.0. **Ambiente:** AMD Radeon Pro W7900D; Python 3.14.4, PyTorch 2.13.0+rocm10.0.0, HIP 7.15.26333, Transformers 4.57.1; float32/eager.

Os inputs contêm somente `caseId`, pergunta e fontes positivas. Não contêm gabaritos nem próximas ações internas. O resultado foi revalidado localmente com `validateModelCandidate`, sem relaxar as invariantes.

| Coorte | Resultado |
|---|---|
| Baseline SIM-RET-01 a 07 | 2/7 formato aceito: SIM01 (6,810s) e SIM04 (5,938s). SIM02/03/05/06/07 rejeitados. |
| Variante SIM02 após atribuição | Formato aceito (6,854s); contexto distinto, não substitui o baseline sem atribuição. |
| SIM01 com prompt estruturado adicional | Rejeitado (6,821s); preservado como tentativa diferente. |
| Total | 3/9 aceitos por formato, 6/9 rejeitados; `semanticApproved:false` em todos. |

A candidata SIM04 repetiu português apesar da instrução de resposta inglesa; a saída original não foi traduzida nem reescrita. Duração da geração não é benchmark, tempo de sessão ou economia operacional. O desligamento foi observado separadamente às **17:39:42 UTC / 14:39:42 Brasília**, com o portal exibindo Request Notebook. A quota mostrada era 2hrs 24min remaining; quota não é consumo mínimo nem prova de elegibilidade.

O ZIP original final tem **93.993 bytes**, SHA-256 `fdceb4c2af55d15a2418b814226d1902315168c3f54716e5113d7188e35f25bc`. Os originais baixados não foram modificados. [Resumo e hashes](../../evidence/ACT-III-R03-20261012/AMD-PILOT-R03-SUMMARY.json).

## Integração por execução gravada

`recorded-amd-client.mjs` lê a seleção pública e consulta o contexto e a evidência atuais na mesma revisão. `recorded-amd.mjs` exige igualdade completa de pergunta, caso, fontes, trechos, versões e flags históricas; revalida o esquema e as citações vigentes. Não inventa candidata para saída rejeitada, não responde uma pergunta arbitrária e não aciona GPU.

`human_handoff` no motor atual impede toda resposta gravada, inclusive abstenção, deixando somente recibo allowlisted. O painel conta 3/9 e 2/7 como formatos aceitos e declara ausência de aprovação semântica. Não cria cartão ou muda caso/contato/agenda.

Validação dedicada: **28/28** (12 replay +16 contrato); regressão do servidor: **19/19**. A suíte completa R03 terá recibo próprio após a integração final. A suíte R02 de 131/131 permanece histórica; nenhum desses testes é validação clínica ou estudo de impacto.

## Origem e histórico

**ADMIN-R01-20261005** é anterior ao ACT III: fila, atribuição, rascunhos, histórico e persistência. [Declaração](../../BASE-PREEXISTENTE.md). O incremento de 12/10 acrescenta consulta, recibos, idiomas, contrato, transporte, piloto real e replay; não atribuir esses marcos a trabalho anterior Academy/OCR/RAG.

R02 preserva a falha float16: 1.024 caracteres !, 30,687s, zero candidatos aceitos naquela execução. Essa história foi superada pelos resultados R03 e não descreve o estado atual. O backend ao vivo do app continua sem endpoint configurado. Nenhuma revisão semântica formal foi registrada.

## Prazo e saída

Observação autenticada anterior: 18/10 às 07h Brasília no calendário principal, versus 12h Brasília no /live. O conflito permanece declarado até confirmação autoritativa. **17/10 à noite é alvo interno**, não prazo oficial. O kickoff não exige entrega imediata.

Concluir exige fonte/commit público coerente, demo publicada testada, mídia final acessível e recibo observável de submissão. [Plano](RELEASE-PLAN.md) · [Cópia exata preparada](SUBMISSION-COPY-R03.json). Pontos ADP, XP, seleção e premiação permanecem estados distintos.
