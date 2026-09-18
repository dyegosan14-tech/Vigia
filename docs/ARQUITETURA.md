# Arquitetura do Vigia

Este documento detalha como o protótipo se encaixa na arquitetura de quatro
camadas proposta para o desafio "Ampliação da segurança em praças públicas
via tecnologia".

## As quatro camadas

| Camada | Função | Status neste protótipo |
|---|---|---|
| Campo | Câmeras com analítica, iluminação inteligente, botões de pânico, sensores de fluxo, drones de patrulhamento (opcional) | Simulada com dados de exemplo em `src/data/` |
| Borda | Conectividade 4G/5G/fibra, energia solar com backup | Fora do escopo de software — depende de infraestrutura física |
| Central | Processamento de eventos, IA de vídeo, banco de dados histórico | Implementada de forma simplificada: rotas Express + arquivos JSON fazendo o papel de banco de dados, com um indicador de tendência (`variacaoOcorrenciasPct`) como proxy de análise de dados |
| Apresentação | Dashboard da gestão/guarda municipal, canal de denúncia cidadã | Implementada: painel web (gestão) + formulário público `/denuncia` (cidadão) |

O Vigia entrega as camadas central e de apresentação como protótipo
funcional. As camadas de campo e borda dependem de hardware real e são
representadas aqui por dados de exemplo e por um endpoint de integração
(`POST /api/eventos`) que já documenta o contrato esperado quando os
sensores reais estiverem disponíveis.

### Drones de patrulhamento

Drones são uma tecnologia de campo complementar às câmeras fixas — úteis
para cobrir praças grandes ou áreas sem infraestrutura elétrica para
postes inteligentes, sobretudo em horários de baixo movimento. Neste
protótipo eles não são modelados como um tipo de equipamento separado
porque dependem de operação (piloto ou rota autônoma) e regulação
específica (ANAC), mas o mesmo contrato do `POST /api/eventos` serviria
para receber os alertas gerados pela análise de vídeo do drone.

### Canal de denúncia cidadã

O endpoint público `GET/POST /denuncia` (sem login) implementa a camada
de apresentação voltada ao cidadão: qualquer pessoa pode reportar um
problema em uma praça (emergência, vandalismo, comportamento suspeito,
falha de iluminação) sem se identificar. O registro entra na mesma lista
de ocorrências usada pela Central, marcado com `origem: "cidadao"`, para
diferenciar do que vem de sensores/câmeras. Em produção, isso evoluiria
para um aplicativo móvel nativo com geolocalização e, opcionalmente,
envio de foto.

## Fluxo de um evento real

1. Um sensor ou câmera na praça detecta algo (ex: botão de pânico acionado).
2. O dispositivo de borda envia o evento para `POST /api/eventos` com
   `praca_id`, `tipo`, `severidade` e o header `Authorization: Bearer
   <DEVICE_TOKEN>` — a requisição é rejeitada com 401 se o token não
   bater (ver `src/routes/api.js`).
3. A camada central grava o evento — neste protótipo, adiciona à mesma
   lista de ocorrências usada pelo painel e persiste em
   `src/data/ocorrencias.json` (ver `src/utils/persistencia.js`); em
   produção, isso seria um banco de dados de verdade — e o disponibiliza
   para a camada de apresentação.
4. O dashboard exibe o evento na lista de ocorrências e no painel geral,
   e a Central de Operações pode acionar a Guarda Municipal.

## Privacidade e LGPD

O desafio lista "questões de privacidade" como risco associado — ponto
sensível por envolver câmeras com reconhecimento de atividades e um
canal de denúncia. Diretrizes que qualquer implementação real deste
sistema deve seguir:

- **Câmeras**: usar analítica de vídeo (detecção de aglomeração, objeto
  abandonado, movimento atípico) sem armazenar ou expor reconhecimento
  facial nominal; se reconhecimento facial for usado, restringir a casos
  previstos em lei e com base legal específica, nunca como monitoramento
  geral da população.
- **Retenção**: definir prazo máximo de retenção de vídeo (ex: 30 dias)
  e descarte automático após esse período, exceto quando vinculado a uma
  ocorrência aberta.
- **Acesso**: log de auditoria de quem acessou qual gravação e quando;
  autenticação multiusuário com papéis (operador, gestor, auditor) antes
  de ir para produção — hoje o protótipo tem um único usuário de
  demonstração.
- **Aviso**: sinalização física nas praças informando presença de
  câmeras, conforme exigido pela LGPD para tratamento de dados por
  videomonitoramento.
- **Canal de denúncia**: o formulário `/denuncia` deste protótipo já
  nasce sem campos de identificação (nome, e-mail, telefone) — minimiza
  a coleta de dados pessoais por padrão.

## Continuidade operacional

O desafio lista "dependência tecnológica" como risco: se câmeras,
conectividade ou energia falharem, a praça não pode ficar sem nenhuma
cobertura. Diretrizes para produção:

- **Energia**: iluminação e botões de pânico com bateria/energia solar de
  backup (camada de borda), para continuar funcionando em quedas de
  energia — é justamente o motivo de a arquitetura já separar campo/borda.
- **Conectividade**: fila local no dispositivo de borda quando a rede cai,
  com reenvio automático dos eventos perdidos assim que a conexão volta,
  em vez de descartar o evento.
- **Detecção de falha**: o `uptimePct` deste protótipo já mostra queda de
  equipamentos operacionais; em produção isso deveria gerar um alerta
  automático para manutenção, não só aparecer como número no painel.
- **Canal humano de reserva**: mesmo com toda a automação, a praça precisa
  de um canal que não dependa de tecnologia (ex: ronda física periódica
  da guarda municipal), para os casos em que campo/borda/central falham
  ao mesmo tempo.

## De protótipo a produção

Para transformar este protótipo em um sistema de produção, os principais
pontos de evolução são:

- Substituir os arquivos JSON em `src/data/` por um banco de dados
  (PostgreSQL, MySQL ou similar).
- Trocar o `DEVICE_TOKEN` único (usado hoje para autenticar
  `POST /api/eventos`) por um token individual por dispositivo, com
  possibilidade de revogação e auditoria por sensor.
- Conectar `POST /api/eventos` aos sensores, câmeras e botões de pânico
  reais, e à central de vídeo/analítica de IA.
- Adicionar autenticação multiusuário (hoje há um único usuário de
  demonstração) e níveis de permissão (operador, gestor, auditor).
- Trocar o polling do painel (`GET /resumo` a cada 15s, ver
  `public/js/dashboard.js`) por notificações push (WebSocket ou SSE),
  para reduzir a latência de alertas críticos (ex: botão de pânico).
- Persistir os KPIs históricos para permitir comparações mês a mês.
- Validar os valores de `custo_manutencao_unitario` em `src/data/pracas.json`
  contra custos reais de contrato antes de usar o indicador para decisão
  orçamentária — hoje são estimativas de exemplo.
