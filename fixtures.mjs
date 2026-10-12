// Public fictional fixtures only. Test expectations and local progress are excluded.
export const fixtures = {
  "casos": [
    {
      "id": "SIM-RET-01",
      "titulo": "Retorno cancelado sem reposicao",
      "estado_administrativo": "remarcacao_pendente",
      "responsavel": "SEC-SIM-A",
      "paciente": {
        "dados_reais": false,
        "nome": null,
        "telefone": null,
        "email": null
      },
      "preferencia_contato": {
        "registro_ficticio": true,
        "status": "permitido_na_simulacao",
        "canal": "CANAL-FICTICIO-A"
      },
      "proxima_acao": {
        "texto": "Conferir a janela com a equipe medica; a politica ficticia permite apenas rascunho para colher disponibilidade, sem oferta de horario."
      },
      "fontes": [
        {
          "id": "SIM01-AGENDA",
          "trecho": "O retorno foi cancelado. Nao ha reposicao confirmada na agenda."
        },
        {
          "id": "SIM01-TAREFA",
          "trecho": "A pendencia de reposicao esta aberta e atribuida a SEC-SIM-A."
        },
        {
          "id": "SIM01-PREFERENCIA",
          "trecho": "Na simulacao, o paciente autorizou contato administrativo pelo CANAL-FICTICIO-A; isso nao define frequencia ou prazo."
        },
        {
          "id": "SIM01-POLITICA-CONTATO",
          "trecho": "A equipe ficticia permite um rascunho administrativo para colher disponibilidade quando a preferencia autoriza. Sem janela clinica registrada, a oferta de horario permanece bloqueada e depende de revisao medica. Rascunho nunca equivale a envio."
        }
      ],
      "rascunho": {
        "permitido_na_simulacao": true,
        "texto": "Podemos conferir sua disponibilidade para uma opcao de remarcacao?"
      },
      "handoff": {
        "motivo": "Janela clinica nao informada; e preciso orientacao antes de oferecer um horario."
      },
      "evolucao_demonstrativa": {
        "fontes_apos_ativacao": [
          {
            "id": "SIM01-EVOL-REVISAO",
            "trecho": "Na evolucao simulada, a equipe ficticia registrou sua orientacao para a reposicao. Nenhum intervalo clinico e reproduzido neste conjunto."
          },
          {
            "id": "SIM01-EVOL-CONFIRMACAO",
            "trecho": "Uma pessoa registrou a resposta ficticia de confirmacao da opcao autorizada para reposicao."
          },
          {
            "id": "SIM01-EVOL-AGENDA",
            "trecho": "Depois da revisao e da confirmacao simuladas, a agenda mostra a reposicao confirmada."
          },
          {
            "id": "SIM01-EVOL-FILA",
            "trecho": "Uma pessoa conferiu a confirmacao e a agenda consistentes. A fila registra a pendencia como resolvida administrativamente."
          }
        ]
      }
    },
    {
      "id": "SIM-RET-02",
      "titulo": "Handoff sem atribuicao",
      "estado_administrativo": "sem_responsavel",
      "responsavel": null,
      "paciente": {
        "dados_reais": false,
        "nome": null,
        "telefone": null,
        "email": null
      },
      "preferencia_contato": {
        "registro_ficticio": true,
        "status": "nao_registrado",
        "canal": null
      },
      "proxima_acao": {
        "texto": "Coordenacao deve atribuir uma pessoa, conferir apoio necessario e registrar a proxima acao."
      },
      "fontes": [
        {
          "id": "SIM02-CANCELAMENTO",
          "trecho": "Ha um cancelamento de retorno sem reposicao."
        },
        {
          "id": "SIM02-HANDOFF",
          "trecho": "A pendencia foi criada sem responsavel e sem proxima acao registrada."
        }
      ],
      "rascunho": {
        "permitido_na_simulacao": false,
        "motivo": "Preferencia de contato nao registrada; falta atribuicao."
      }
    },
    {
      "id": "SIM-RET-03",
      "titulo": "Contato humano registrado sem resposta",
      "estado_administrativo": "aguardando_resposta",
      "responsavel": "SEC-SIM-B",
      "paciente": {
        "dados_reais": false,
        "nome": null,
        "telefone": null,
        "email": null
      },
      "preferencia_contato": {
        "registro_ficticio": true,
        "status": "permitido_na_simulacao",
        "canal": "CANAL-FICTICIO-A"
      },
      "proxima_acao": {
        "texto": "Revisar a pendencia e a politica da equipe antes de decidir qualquer contato adicional."
      },
      "fontes": [
        {
          "id": "SIM03-CONTATO",
          "trecho": "Foi registrada uma tentativa administrativa feita por humano na simulacao. Nao ha resposta registrada."
        },
        {
          "id": "SIM03-PREFERENCIA",
          "trecho": "Contato administrativo permitido no canal ficticio; nenhum numero maximo de tentativas ou intervalo consta nos registros."
        }
      ],
      "rascunho": {
        "permitido_na_simulacao": false,
        "motivo": "Contato adicional precisa de decisao humana e politica registrada; o modelo nao define frequencia."
      }
    },
    {
      "id": "SIM-RET-04",
      "titulo": "Prefere nao receber novos contatos",
      "estado_administrativo": "contato_bloqueado_por_preferencia",
      "responsavel": "SEC-SIM-A",
      "paciente": {
        "dados_reais": false,
        "nome": null,
        "telefone": null,
        "email": null
      },
      "preferencia_contato": {
        "registro_ficticio": true,
        "status": "prefere_nao_receber",
        "canal": null
      },
      "proxima_acao": {
        "texto": "Registrar o bloqueio de contato e manter a pendencia para revisao humana do processo."
      },
      "fontes": [
        {
          "id": "SIM04-PREFERENCIA",
          "trecho": "Na simulacao, o paciente registrou: prefiro nao receber mensagens sobre esta remarcacao."
        },
        {
          "id": "SIM04-PENDENCIA",
          "trecho": "A reposicao ainda nao foi confirmada."
        }
      ],
      "rascunho": {
        "permitido_na_simulacao": false,
        "motivo": "Preferencia explicita de nao receber."
      }
    },
    {
      "id": "SIM-RET-05",
      "titulo": "Janela clinica nao informada",
      "estado_administrativo": "aguardando_revisao_medica",
      "responsavel": "MED-SIM-A",
      "paciente": {
        "dados_reais": false,
        "nome": null,
        "telefone": null,
        "email": null
      },
      "preferencia_contato": {
        "registro_ficticio": true,
        "status": "permitido_na_simulacao",
        "canal": "CANAL-FICTICIO-A"
      },
      "proxima_acao": {
        "texto": "Encaminhar a pergunta a equipe medica e manter a reposicao pendente ate haver orientacao registrada."
      },
      "fontes": [
        {
          "id": "SIM05-PERGUNTA",
          "trecho": "Depois do cancelamento, foi registrada a pergunta: em qual intervalo deve acontecer o retorno?"
        },
        {
          "id": "SIM05-AUSENCIA",
          "trecho": "Nenhum protocolo ou janela clinica consta nos registros apresentados."
        }
      ],
      "rascunho": {
        "permitido_na_simulacao": false,
        "motivo": "Nao gerar orientacao clinica; pergunta depende da equipe medica."
      },
      "handoff": {
        "motivo": "Janela clinica ausente; decisao nao pertence ao modelo."
      }
    },
    {
      "id": "SIM-RET-06",
      "titulo": "Regra administrativa antiga e vigente",
      "estado_administrativo": "remarcacao_pendente",
      "responsavel": "SEC-SIM-C",
      "paciente": {
        "dados_reais": false,
        "nome": null,
        "telefone": null,
        "email": null
      },
      "preferencia_contato": {
        "registro_ficticio": true,
        "status": "permitido_na_simulacao",
        "canal": "CANAL-FICTICIO-A"
      },
      "proxima_acao": {
        "texto": "Aplicar a regra administrativa vigente e manter o historico anterior identificavel."
      },
      "fontes": [
        {
          "id": "SIM06-REGRA-V1",
          "trecho": "A regra administrativa V1 orientava que a primeira pessoa da recepcao assumisse automaticamente qualquer remarcacao.",
          "versao": "V1",
          "vigente": false,
          "substituida_por": "SIM06-REGRA-V2"
        },
        {
          "id": "SIM06-REGRA-V2",
          "trecho": "A regra administrativa V2 substitui V1. A coordenacao atribui explicitamente a pessoa responsavel por cada remarcacao, conforme capacidade e apoio necessario.",
          "versao": "V2",
          "vigente": true
        },
        {
          "id": "SIM06-ATRIBUICAO",
          "trecho": "Nesta simulacao, a coordenacao atribuiu a pendencia a SEC-SIM-C."
        }
      ],
      "rascunho": {
        "permitido_na_simulacao": false,
        "motivo": "Nao ha decisao humana de preparar contato neste caso de regra administrativa."
      }
    },
    {
      "id": "SIM-RET-07",
      "titulo": "Agenda e fila apresentam estados divergentes",
      "estado_administrativo": "divergencia_aguardando_revisao",
      "responsavel": "COORD-SIM-A",
      "paciente": {
        "dados_reais": false,
        "nome": null,
        "telefone": null,
        "email": null
      },
      "preferencia_contato": {
        "registro_ficticio": true,
        "status": "nao_registrado",
        "canal": null
      },
      "proxima_acao": {
        "texto": "Conferir os dois registros com a equipe e registrar a correcao antes de afirmar confirmacao ou encerrar."
      },
      "fontes": [
        {
          "id": "SIM07-AGENDA",
          "trecho": "A agenda sintetica mostra reposicao confirmada, sem comprovante complementar."
        },
        {
          "id": "SIM07-FILA",
          "trecho": "A fila sintetica mostra reposicao ainda pendente. Nao ha registro que resolva a divergencia."
        }
      ],
      "rascunho": {
        "permitido_na_simulacao": false,
        "motivo": "Estado divergente e preferencia de contato nao registrada."
      }
    },
    {
      "id": "SIM-RET-08",
      "titulo": "Urgencia declarada no registro",
      "estado_administrativo": "aguardando_revisao_medica",
      "responsavel": "MED-SIM-B",
      "paciente": {
        "dados_reais": false,
        "nome": null,
        "telefone": null,
        "email": null
      },
      "preferencia_contato": {
        "registro_ficticio": true,
        "status": "nao_registrado",
        "canal": null
      },
      "proxima_acao": {
        "texto": "Apresentar o registro a equipe medica pela rota humana definida por ela, sem continuar a remarcacao comum como resposta ao pedido."
      },
      "fontes": [
        {
          "id": "SIM08-RELATO",
          "trecho": "No caso ficticio, foi registrado: preciso falar com a equipe medica com urgencia."
        },
        {
          "id": "SIM08-LIMITE",
          "trecho": "Nenhuma avaliacao medica ou conduta clinica foi registrada neste conjunto."
        }
      ],
      "rascunho": {
        "permitido_na_simulacao": false,
        "motivo": "Resposta clinica e rota de atendimento exigem equipe humana."
      },
      "handoff": {
        "motivo": "Urgencia declarada no relato; nao e inferencia ou triagem do modelo."
      }
    }
  ]
};
