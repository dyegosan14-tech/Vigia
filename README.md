# Vigia — Central de Operações para Segurança em Praças Públicas

Protótipo funcional da solução tecnológica proposta para o desafio
**"Ampliação da segurança em praças públicas via tecnologia"** (ODS 11,
16 e 3). Implementa a camada central e a camada de apresentação da
arquitetura: um painel web que consolida o status dos equipamentos, o
uso das praças e as ocorrências registradas.

Os dados de câmeras, sensores e botões de pânico são simulados
(`src/data/*.json`), já que este protótipo não está conectado a hardware
real. O endpoint `POST /api/eventos` documenta como a integração com os
sensores reais aconteceria. Veja `docs/ARQUITETURA.md` para o detalhamento
completo.

## Requisitos

- Node.js 18 ou superior
- npm

## Instalação

```bash
# 1. Extraia o zip e entre na pasta do projeto
cd vigia

# 2. Instale as dependências
npm install

# 3. Copie o arquivo de variáveis de ambiente
cp .env.example .env

# 4. Rode em modo desenvolvimento (reinicia sozinho ao salvar um arquivo)
npm run dev

# ou, para rodar sem reinício automático:
npm start
```

O painel fica disponível em **http://localhost:3000**.

## Acesso de demonstração

| Campo | Valor |
|---|---|
| Usuário | `operador` |
| Senha | `vigia2026` |

Esses valores vêm de `.env` (`DEMO_USER` e `DEMO_PASS`) — altere-os antes
de usar o projeto fora de um ambiente local.

## O que o painel mostra

- **Painel geral** (`/`) — indicadores consolidados (equipamentos
  operacionais, ocorrências em aberto, tempo médio de resposta, ocupação
  média, percepção de segurança, variação de ocorrências nos últimos 7
  dias vs. os 7 dias anteriores, custo de manutenção mensal estimado),
  status de cada praça e um gráfico de uso dos últimos 14 dias. Os
  indicadores e a lista de últimas ocorrências se atualizam sozinhos a
  cada 15 segundos (`GET /resumo`), sem precisar recarregar a página.
- **Praças monitoradas** (`/pracas`) — lista de todas as praças com
  status, ocupação e equipamentos.
- **Detalhe da praça** (`/pracas/:id`) — equipamentos instalados e
  histórico de eventos daquela praça.
- **Ocorrências** (`/ocorrencias`) — todos os eventos registrados, com
  filtro por praça, severidade e status, e a origem (sensor/câmera ou
  denúncia cidadã).
- **Denúncia cidadã** (`/denuncia`) — formulário público, sem login e sem
  campos de identificação, para qualquer pessoa reportar um problema em
  uma praça. O registro entra direto na lista de ocorrências da Central.

## Estrutura de pastas

```
vigia/
├── server.js                 # ponto de entrada da aplicação
├── src/
│   ├── routes/                # rotas (painel, praças, ocorrências, login, API)
│   ├── middleware/auth.js     # exige login nas páginas do painel
│   ├── data/                  # dados de exemplo (praças, ocorrências, tendência de uso)
│   └── utils/kpis.js          # cálculo dos indicadores do painel
├── views/                     # páginas EJS
├── public/                    # CSS e JavaScript do lado do cliente
└── docs/ARQUITETURA.md        # como este protótipo se encaixa na arquitetura completa
```

## Integração com sensores reais

O endpoint abaixo representa onde a camada de borda enviaria os eventos
reais (câmeras, botões de pânico, sensores). Ele exige o token definido
em `DEVICE_TOKEN` (`.env`) no header `Authorization`; com o token
correto, o evento entra na mesma lista de ocorrências do painel — aparece
em até 15s no painel geral (`/`) e em `/ocorrencias`.

```bash
curl -X POST http://localhost:3000/api/eventos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer vigia-sensor-dev-token" \
  -d '{"praca_id": "praca-derby", "tipo": "Botao de panico acionado", "severidade": "critica"}'
```

Em produção, troque o token único por um token individual por
dispositivo — veja `docs/ARQUITETURA.md`.

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `PORT` | Porta em que o servidor sobe | `3000` |
| `SESSION_SECRET` | Chave usada para assinar a sessão de login | (defina uma própria) |
| `DEMO_USER` | Usuário de acesso à demonstração | `operador` |
| `DEMO_PASS` | Senha de acesso à demonstração | `vigia2026` |
| `DEVICE_TOKEN` | Token exigido em `POST /api/eventos` (header `Authorization: Bearer ...`) | `vigia-sensor-dev-token` |

## Próximos passos

Veja a seção "De protótipo a produção" em `docs/ARQUITETURA.md` para a
lista completa — os principais pontos são trocar os arquivos JSON por um
banco de dados de verdade e conectar o endpoint de eventos aos sensores
físicos.
