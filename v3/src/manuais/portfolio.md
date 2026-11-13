# Manual do Portfólio

Para quem acompanha o conjunto dos projetos (GPs e Admin) · app PMO v3 (web)

## 1. Onde fica e quem vê

Menu **☰ › Relatórios › Portfólio**. Aparece só para quem tem a permissão `portfolio.ver` (por padrão, Admin e GP).

A tela mostra os projetos ativos de clientes ativos: por fase e por GP, com Go Live, atraso, horas e os riscos abertos. É uma tela de consulta; a única gravação é criar um plano de ação (**+ Plano**).

## 2. Cartões por fase

No topo, o cartão **Projetos** mostra o total e um cartão para cada fase (P1 a P5, Operação Assistida, Sustentação, Banco de Horas, Avulso e outras que existirem).

- Toque numa fase para filtrar. Pode marcar várias.
- Toque de novo para desmarcar.
- Toque em **Projetos** para voltar a ver todas as fases.

Os números dos cartões já consideram os GPs escolhidos.

## 3. Projetos por GP

Gráfico de barras com a quantidade de projetos de cada GP e, ao lado, quantos estão atrasados. Projeto sem GP entra em "Sem GP". O GP é o do projeto; se não houver, o do cliente.

- Toque numa barra para filtrar por aquele GP. Pode marcar vários.
- Toque de novo para desmarcar.

As barras já consideram as fases escolhidas.

## 4. Riscos ativos

Lista os planos de ação (5W2H) abertos: Nível, Plano de ação, Cliente, Projeto, Responsável, Vencimento e Dias. O nome abre a demanda do plano.

| Nível | Quando |
| --- | --- |
| **Crítico** (vermelho) | Vencido ou com prioridade urgente. |
| **Alto** (laranja) | Prioridade alta e vence em até 7 dias. |
| **Moderado** (cinza) | Os demais. |

Em **Dias**, o número é quanto falta para o vencimento; vencido aparece "venceu há N".

## 5. Filtros

Abaixo dos quadros há a barra de filtros, que vale para o cronograma e para a tabela:

- **Fases** e **GPs**: seleção múltipla, igual aos cartões e às barras.
- **Buscar projeto, cliente, GP ou fase**: busca por texto.
- **Limpar filtros**: zera tudo.

## 6. Saldo dos pedidos (Experience)

Compara o saldo dos pedidos do Experience com as horas das tarefas agendadas no app. O título mostra quantos estão em alerta e a linha abaixo diz de quando é a última verificação.

- Filtros: **Em alerta**, **Medição**, **Empreito**, **Banco de Horas** e **Todos**.
- Colunas: Situação, Parceiro, FAP, Pedido, Tipo de operação, Negociado, Consumido, Saldo, Tarefas, Sobra e Observação.
- **Sobra** = saldo do pedido menos as horas das tarefas do período que não terminaram. Negativa aparece em destaque.
- Situações: FALTAM HORAS, SEM PEDIDO, SALDO BAIXO (sobra abaixo de 8 h), CONFERIR e OK.
- Toque numa linha para ver as tarefas que entraram na conta.
- Quem pode verificar vê os campos **De** e **Até** e o botão **Verificar**, que refaz a conta na hora.

A checagem automática roda de segunda a sexta às 08h. Cada alerta é avisado no sino do GP uma vez na semana, a menos que piore.

## 7. Cronograma

Um Gantt com uma linha por projeto. O nome abre a Tela do Projeto.

| Elemento | Significado |
| --- | --- |
| Barra verde | Do início ao fim do projeto. |
| Barra laranja listrada | Há etapa vencida em aberto. Passe o mouse para ver quais. |
| Losango azul | Go Live previsto. |
| Losango verde | Go Live concluído. |
| Losango vermelho | Go Live vencido e ainda em aberto. |
| Linha vertical azul | Hoje. |

Projeto da fase Avulso só aparece no cronograma se tiver etapa com data.

O Go Live é a demanda ou subdemanda com "Go Live" ou "Estreia" no nome ou na etapa: vale a primeira em aberto pelo prazo; com todas concluídas, a última.

## 8. Tabela de projetos

| Coluna | O que mostra |
| --- | --- |
| **Cliente** | Com a pílula "N plano(s) de ação" quando o cliente tem plano de ação aberto. |
| **Projeto** | Abre a Tela do Projeto. |
| **Fase**, **GP** | Projeto sem GP mostra "Sem GP". |
| **Início**, **Fim** | Do projeto, alargados pelas datas das etapas. |
| **Go Live** | A data, com ✓ quando concluído, ou "Sem Go Live". |
| **Atraso** | "Go Live vencido" (vermelho) ou "Etapa vencida" (laranja). |
| **Pedidas**, **Agendadas**, **Executadas** | Horas pedidas, horas das tarefas agendadas (sem as canceladas e não executadas) e horas apontadas. |
| **Demandas abertas** | Quantidade de demandas em aberto. |
| **Pedido (Experience)** | A situação do projeto no saldo dos pedidos (seção 6). |
| **Plano de ação** | O botão **+ Plano**. |

### Criar um plano de ação

Toque em **+ Plano** na linha do projeto. Abre o mesmo 5W2H da Tela do Projeto, já no projeto escolhido. Ao gravar, o plano entra em **Riscos ativos** e o cliente ganha a pílula na tabela. O botão aparece para quem tem a permissão `demanda.criar`.

## 9. Dúvidas comuns

**Um projeto não aparece.**
Só entram projetos com situação ativa, de cliente ativo. Confira também os filtros de fase, GP e a busca; **Limpar filtros** zera tudo.

**O projeto está na tabela, mas não no cronograma.**
É da fase Avulso e não tem etapa com data.

**O projeto aparece como "Sem Go Live".**
Não há demanda com "Go Live" ou "Estreia" no nome ou na etapa, ou ela está sem data de fim.

**Aparece "Etapa vencida", mas o Go Live está no prazo.**
Alguma etapa (demanda de primeiro nível) está em aberto com o fim antes de hoje. No cronograma, passe o mouse na barra laranja para ver qual.

**"Nenhum plano de ação aberto."**
Não há riscos ativos no momento.

**Não vejo o botão Verificar no saldo dos pedidos.**
Ele aparece só para quem pode rodar a verificação. A tabela mostra o resultado da última checagem.
