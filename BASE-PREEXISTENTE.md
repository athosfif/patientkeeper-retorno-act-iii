# R12 clarification · 2026-10-14

The document below is the historical October 5 preparation declaration, not a statement of current capabilities. ADMIN-R01 queue, assignment, history, local persistence and the eight fictional cases predate ACT III. The independent Retorno preparation did not copy the earlier September PatientKeeper engine/UI or the Academy OCR/RAG engine.

October 12 event-window work added source review, cited receipts, conflict/stale-context guards, multilingual navigation, model contracts, bounded optional transport, real Qwen AMD execution and replay. October 14 added the recorded five-attempt Gemma pilot, exact official service-identifier binding, explicit JSON-object adaptation with local validation, the doctor episode, local CPU ASR and extractive notes. Reuse and prior learning remain disclosed; award eligibility is not confirmed. Current features and limitations are in [README.md](README.md).

---

# Base preexistente e origem das entregas

Registro em 05/10/2026 para distinguir aprendizado anterior, preparação atual e trabalho que será produzido no ACT III. Elegibilidade de reutilização não está confirmada. Ver fontes e regras (preserved in the private local archive).

## PatientKeeper anterior — baseline de 26/09

O PatientKeeper anterior já estava publicado antes deste evento. O recibo canônico R03 (recibo local preservado fora do repositório público) registra publicação e verificação em **26/09/2026**, com dados sintéticos, armazenamento no navegador e ausência de sincronização entre dispositivos. Seus 24 testes da engine e 13 verificações funcionais de navegador são evidência dessa versão anterior; não são testes desta preparação nem validação clínica.

O registro de publicação vigente R06 (recibo local preservado fora do repositório público) também tem data de 26/09 e aponta para a pasta integral `delivery/figueira-netlify-r06/`. A existência de uma publicação R06 não transforma o PatientKeeper em trabalho novo do ACT III.

- Código a declarar se reutilizado: `web/engine.mjs`, `web/store.mjs`, `web/app.mjs`, `web/i18n.mjs`, na árvore canônica `[private local baseline archive]`.
- Pacote vigente de referência: `delivery/figueira-netlify-r06/contribuicoes/patientkeeper/`.
- Publicação anterior: [PatientKeeper](https://figueirart.com/contribuicoes/patientkeeper/).
- Não foram recalculados hashes nesta etapa. Qualquer cópia futura exige inventário do arquivo de origem, versão/hash, licença e modificação realizada.

**A preparação PatientKeeper — Retorno utiliza um HTML independente e casos sintéticos novos. Não reutiliza a engine ou a UI do PatientKeeper anterior.** O nome é provisório e o relacionamento com o projeto anterior deve permanecer explícito.

## OCR e RAG publicados — aprendizado e módulos candidatos

O recibo R05 de 05/10 (recibo local preservado fora do repositório público) confirma atualização da entrega LabLab, persistência após recarregar, preservação de MC2 OCR e inclusão de MC3 RAG. Identifica o commit público **ad2e3e5ec10bc5b0d5c4561b10e01bae953dc21c**.

- [Código fixado nesse commit](https://github.com/athosfif/figueira-ocr/tree/ad2e3e5ec10bc5b0d5c4561b10e01bae953dc21c).
- [Entrega OCR e RAG](https://lablab.ai/ai-hackathons/amd-lablab-ai-academy-challenge/athos-felipe/figueira-ocr-and-rag-reviewable-ai-on-amd).
- O piloto RAG do código registrou 14/14 casos conhecidos: dez públicos e quatro sintéticos independentes. O recibo não comprova execução GPU da imagem OCI final, precisão em perguntas inéditas, nota oficial, prêmio ou crédito ADP.
- Referências de imagens, credenciais e detalhes privados de publicação não pertencem a este documento nem a uma contribuição pública.

Aprendizados úteis: proveniência de fontes, ausência de resposta quando falta suporte, separação entre texto gerado e ação registrada, teste de interface separado de desempenho do modelo, processo persistente para inferência e preservação do runtime ROCm. São fundamentos para uma solução nova; não evidência de que a solução de retorno já funciona.

O validador de respostas curtas do MC3 não deve ser apresentado como validador clínico ou importado sem adaptação. Ele verifica trechos na representação indexada e valores presentes nesses trechos; não prova toda relação semântica nem necessidade de cada citação. Sínteses administrativas podem exigir contrato novo. Erros de OCR também podem entrar na representação indexada. Confiança do modelo não é probabilidade calibrada.

## Manifesto de preparação

| Elemento | Origem/data | Situação nesta preparação |
|---|---|---|
| Problema e jornada da secretaria | Relato de Athos e documento de 05/10 | Hipótese; sem pesquisa de mercado ou validação clínica. |
| Oito casos SIM-RET-01 a SIM-RET-08 | `CASOS-SINTETICOS.json`, 05/10 | Inteiramente fictícios; expectativas de teste, não resultados. |
| UX em HTML independente | Preparação anterior ao evento pelo coordenador | Declarar como estrutura de UX preexistente se utilizada na candidatura. |
| Engine/UI PatientKeeper de 26/09 | Baseline publicado anterior | Não copiada para esta UX; eventual uso futuro precisa de declaração e confirmação das regras. |
| OCR/RAG e modelo publicado | Entrega anterior Academy MC2/MC3 | Não executados nesta pasta; elegibilidade de reaproveitamento de núcleo de IA pendente. |
| Núcleo de IA para retorno | Trabalho planejado para a janela ACT III | Ainda não implementado, executado ou validado nesta preparação. |

Antes de integrar qualquer código anterior, registrar caminho de origem, commit ou hash, licença e quais trechos permaneceram iguais. Se não houver permissão clara, continuar com aprendizado, design e estruturas permitidas, desenvolvendo o núcleo novo durante o evento. Não alterar datas ou atribuição para fazer trabalho anterior parecer novo.

## O que o baseline não comprova

Publicação é diferente de adoção clínica. Testes anteriores são diferentes de testes do produto novo. Preparação é diferente de participação concluída. Inscrição é diferente de entrega. Entrega é diferente de resultado do júri. Nenhum desses estados comprova lançamento de pontos ADP sem observação do portal ou confirmação da equipe.

## Antecipação administrativa ADMIN-R01 — 05/10/2026

A aplicação independente em `app/` acrescenta persistência local, atribuição, histórico, revisão de rascunhos e evolução humana controlada dos casos sintéticos. O código novo e os testes são trabalho **anterior ao ACT III**. O recibo `PREPARACAO-STATE.json` registra os hashes desta versão; `evidence/ADMIN-R01-20261005/BASELINE-UX-ANTERIOR.json` preserva o registro da primeira prévia.

Não foi copiada a engine ou a UI do PatientKeeper anterior, nem conectado o OCR/RAG publicado. Somente os casos sintéticos novos desta preparação alimentam a aplicação. A API de contexto futuro está desabilitada para inferência. Essa base deve ser declarada se usada no evento; sua elegibilidade específica permanece pendente do Rule Book e do kickoff.
