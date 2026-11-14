# Manual de Demandas

Para GPs, Líderes Tech e Consultores · app PMO v3 (web)

*Os exemplos deste manual são fictícios ("Cliente Exemplo", "Fulano").*

## 1. Onde fica e quem vê

No menu (☰), **Execução › Demandas**. Todos os perfis têm o item no menu.

- Admin, GP e Líder Tech veem todas as demandas.
- O Consultor vê as demandas em que tem tarefa.
- A Triagem vê as demandas dos chamados.

O que cada um faz, pelo padrão dos perfis (o Admin pode mudar as permissões):

| Ação | Quem pode |
| --- | --- |
| **+ Demanda** e **+ Subdemanda** | Admin, GP, Líder Tech e Triagem |
| **Editar** demanda | Admin, GP e Líder Tech |
| **+ Tarefa** e **Editar** tarefa | Admin, GP e Líder Tech |
| **Preciso de mais agenda**, **Apontar**, **Informar desvio** | Admin, GP, Líder Tech e Consultor |
| Comentar e anexar | Todos os perfis |

Os níveis: o projeto tem **demandas** (entregáveis); a demanda pode ter **subdemandas** (um nível só); demandas e subdemandas têm **tarefas**, que são as agendas dos consultores.

## 2. A lista de demandas

As demandas aparecem agrupadas por cliente e projeto. Toque no nome do grupo para abrir o projeto, ou na linha para abrir a demanda.

Cada linha mostra o nome, o status, a marca **Atrasada** (quando é o caso), as datas, o % concluído e a barra de horas. A seta à esquerda recolhe ou expande as subdemandas; **Recolher tudo** e **Expandir tudo** fazem isso de uma vez.

Atalhos na linha: **+ Sub** (nova subdemanda), **+ Tarefa** e **Editar**.

Filtros:

- Busca por demanda, cliente ou projeto.
- **Status**: começa em **Abertas** (Backlog, Planejada, Em andamento e Pausada). Marque os que quiser ou toque em **Todas**. O app guarda a escolha no aparelho.
- **Fase**, **Responsável**, **Etapa**, **Cliente**, **Projeto**, **Tipo** (Entregável, Plano de ação, Chamado) e **Prioridade**: aceitam vários de uma vez.
- Com um responsável escolhido, aparece o nível: **Todos os níveis**, **Só demandas (com as subdemandas)** ou **Só subdemandas**.
- **Só atrasadas**.
- **Filtros salvos…** e **Salvar filtro**: guardam o filtro com um nome.

**Relatório HTML** baixa o que está na tela, com os filtros usados. Com muitos projetos, toque em **Mostrar mais projetos**.

## 3. Os status

| Demanda | Tarefa |
| --- | --- |
| Backlog | Não iniciada |
| Planejada | Em andamento |
| Em andamento | Concluída |
| Pausada | Cancelada |
| Concluída | Não executada |
| Cancelada | |

**Atrasada** é uma marca à parte, que aparece ao lado do status. A demanda de Atendimento Avulso não recebe a marca de atrasada nem o alerta de horas acima do previsto.

## 4. A barra de horas

Fica abaixo do nome do projeto, da demanda e da subdemanda.

- Parte de uma cor: horas **reais** (apontadas por OS ou pelo app).
- Parte de outra cor: horas **planejadas** (tarefas ainda sem apontamento).
- O total da barra são as horas **previstas**.
- Quando reais + planejadas passam do previsto, aparece "acima do previsto".

## 5. Criar ou editar uma demanda

1. Toque em **+ Demanda** (na lista, ou na aba Demandas do projeto). Para subdemanda, use **+ Subdemanda** na ficha da demanda ou **+ Sub** na linha.
2. Escolha o **Projeto** (só os ativos aparecem), se ele ainda não veio preenchido.
3. **Subdemanda de**: deixe em "é uma demanda (entregável)" ou escolha a demanda mãe. Horas e datas da subdemanda sobem para a demanda.
4. Informe o **Nome** (obrigatório), o **Status** e a **Prioridade** (Baixa, Normal, Alta, Urgente).
5. Se quiser: **Início**, **Fim**, **Horas previstas**, **% concluído (ajuste manual)**, **Responsável (GP/Líder)**, **Etapa**, **Módulo** e **Descrição**.
6. Toque em **Gravar**.

Bom saber:

- Na demanda nova, o responsável já vem sugerido com o GP do cliente. Você pode trocar.
- **% concluído** vazio = automático (horas das tarefas concluídas ÷ previstas). Preenchido, a ficha mostra "(manual)".
- **Horas previstas** acima do contratado no projeto são aceitas; o estouro aparece na barra de horas e no saldo do projeto.
- **Atendimento Avulso da Base**: marque só na demanda que recebe os chamados do cliente como subdemandas.
- **Excluir** pede confirmação: as tarefas da demanda deixam de aparecer.

## 6. A ficha da demanda

No topo: cliente, projeto (e a demanda mãe, se for subdemanda), nome, status e barra de horas. Os dados mostram início → fim, previstas, reais, % concluído, prioridade, responsável, etapa e o link do ClickUp.

Botões:

- **☆ Favoritar**: põe a demanda nos favoritos do menu lateral. **★ Favorito** tira.
- **+ Tarefa** e **+ Subdemanda**.
- **Preciso de mais agenda**: informe as **Horas estimadas** e o **Motivo** e toque em **Enviar pedido**. O GP recebe o aviso.
- **Editar**.

O quadro **Subdemandas** lista as filhas (só na demanda mãe). Abaixo, as abas:

- **Tarefas**: data, tarefa, responsável, período, tipo de agenda, status e horas. Filtros por busca, **Responsável**, **Status** e período (**De** / **até**). Horas em negrito são reais; em cinza, previstas.
- **Checklist**: quem edita a demanda cria itens em **Novo item…** + **Adicionar**, marca e exclui.
- **Anexos**: **+ Anexar** (até 20 MB por arquivo). Toque no nome para abrir; **×** remove (quem anexou, ou Admin, GP e Líder Tech).
- **Comentários**: veja a seção 9.
- **Rentabilidade**: só para quem tem o papel no cofre financeiro; tem manual próprio.

## 7. Criar ou editar uma tarefa

Toque em **+ Tarefa**.

1. Confira o cliente e a demanda e informe o **Título** (obrigatórios).
2. Monte a agenda: **Consultor**, **Data**, **Período** e **Tipo de agenda**. Toque em **+ Adicionar combinação**. Repita para outras pessoas, dias ou horários; **+ dia útil** repete no dia útil seguinte. Cada combinação vira uma tarefa (até 100 por vez).
3. Se quiser: **Status**, **Etapa**, **Apontamento**, **Agendamento**, **Experience** e **Detalhamento**.
4. Toque em **Gravar** (ou **Criar N tarefas**).

Períodos: Manhã (08h-12h), Tarde (14h-18h), Dia (08h-18h), Noite (18h-22h) ou **Horário livre**. No horário livre, informe **Início** e **Fim** em hora cheia.

Tipos de agenda: Remoto, Interno, Presencial no cliente ou Presencial na Unidade Sankhya.

Se houver choque de horário, abre **Conflito de horário**: **Voltar ao lançamento** ou **Lançar mesmo assim**.

Na tarefa já gravada, **+ Mais agenda** cria outra agenda igual pedindo só a **Nova data** e o período (**Criar agenda**). **Excluir** pede confirmação.

## 8. A ficha da tarefa

Mostra responsável, data, período, horas (reais e previstas), tipo de agenda, usuário do cliente, etapa, agendamento, Experience, apontamento e o link do ClickUp.

Botões (cada um aparece só quando se aplica):

- **☆ Favoritar**.
- **+ Tarefa na demanda**: outra tarefa na mesma demanda.
- **Preciso de mais agenda**: para o responsável da tarefa ou quem edita tarefas.
- **Apontar**: só para o responsável, com a tarefa de hoje ou de dia anterior, que não esteja Cancelada nem Não executada.
- **Informar desvio**: só para o responsável, em tarefa de hoje ou anterior, Não iniciada ou Em andamento e sem horas reais.
- **Editar**.

### Apontar horas

1. Toque em **Apontar**.
2. Confira **Início**, **Fim** e **Intervalo (min)**. O app já sugere o horário da agenda (no período Dia, com 120 minutos de intervalo).
3. Escreva **O que foi feito** e toque em **Gravar**. O total aparece em **Horas**.

### Abas da tarefa

- **Apontamentos**: origem (OS Sankhya OM, App ou Manual), número, data, início–fim, horas, texto e validação. Sem apontamento, a tarefa conta as horas previstas.
- **Checklist**: o responsável da tarefa marca e desmarca os itens; quem edita tarefas cria e exclui.
- **Anexos** e **Comentários**: iguais aos da demanda.

Quando houve desvio de agenda, a ficha mostra o quadro do desvio com o link para a outra tarefa. Tarefas criadas juntas aparecem em "Criada junto com".

## 9. Comentários e @menção

- Escreva em "Escreva um comentário…" e toque em **Comentar** (ou Ctrl+Enter).
- Digite **@** e o começo do nome: aparece a lista da equipe. Toque no nome (ou Enter). Quem foi mencionado recebe um aviso no sino.
- Se você apagar o @Nome do texto antes de enviar, a pessoa não é avisada.
- Só o autor vê **Editar** e **Excluir** no próprio comentário. O editado fica marcado "(editado)".

## 10. Favoritos

**☆ Favoritar** existe no projeto, na demanda, na tarefa e no chamado. O item passa a aparecer no menu lateral. Toque em **★ Favorito** para remover.

## 11. Se algo der errado

| Mensagem | O que fazer |
| --- | --- |
| "Projeto e nome são obrigatórios." | Preencha os dois na demanda |
| "O fim não pode ser antes do início." | Corrija as datas |
| "O % manual vai de 0 a 100." | Corrija ou deixe vazio |
| "Você não tem permissão para criar/editar demandas (ou tarefas)." | O formulário abre só para leitura; fale com o Admin |
| "Cliente, demanda e título são obrigatórios." | Complete a tarefa |
| "Escolha o consultor e a data da combinação." | Complete a combinação antes de adicionar |
| "Essa combinação já está na lista." | A agenda já foi adicionada |
| "No horário livre, informe início e fim em hora cheia…" | Use horas cheias, com o fim depois do início |
| "Confira início, fim e intervalo." | O apontamento precisa de fim depois do início e intervalo menor que o total |
| "Informe as horas estimadas." / "Informe o motivo." | Complete o pedido de mais agenda |
| "Arquivo acima de 20 MB." | Reduza o arquivo |
| "Carregadas X de Y; refine o status." | A lista veio parcial: marque menos status |
