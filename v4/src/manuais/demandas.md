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

## 2. As abas Gráfico e Lista

A tela tem duas abas, com a mesma barra de filtros: o que você filtra numa vale na outra. O app guarda no aparelho a aba em que você parou.

- **Gráfico** (a primeira): uma barra por cliente, em ordem alfabética, com a quantidade de demandas e subdemandas que passam nos filtros. Clique na barra para ver, logo abaixo, as demandas daquele cliente, do mesmo jeito da Lista. Clique de novo na barra para recolher.
- **Lista**: todas as demandas, como descrito a seguir.

### A lista de demandas

As demandas aparecem agrupadas por cliente e projeto. Toque no nome do grupo para abrir o projeto, ou na linha para abrir a demanda.

Cada linha mostra o nome, o status, a marca **Atrasada** (quando é o caso), as datas, o % concluído e a barra de horas. A seta à esquerda recolhe ou expande as subdemandas; **Recolher tudo** e **Expandir tudo** fazem isso de uma vez.

### Edição múltipla

Para trocar o **Status**, a **Etapa** ou o **Responsável** de vários itens de uma vez:

1. Passe o mouse sobre a linha da demanda, subdemanda ou tarefa: a caixa de seleção aparece no lugar do sinal do status (na tarefa, à esquerda da linha). No celular ou tablet, toque em **Selecionar** (acima da lista) para mostrar as caixas.
2. Marque a primeira: as caixas das outras linhas passam a ficar à mostra. **Selecionar tudo** marca todas as demandas e subdemandas que estão na tela; na lista de tarefas, **Todas as N tarefas** marca as daquela demanda.
3. Na barra que aparece no rodapé, escolha o novo Status, a nova Etapa e/ou o novo Responsável. O campo deixado em **manter** não muda.
4. Toque em **Aplicar em N**.

Só os campos escolhidos são alterados; quem já estava com o valor escolhido não é gravado de novo. Se algum item não puder ser alterado (por exemplo, tarefa com OS, sem a permissão), ele continua marcado e a barra mostra o motivo; os demais são gravados normalmente. Com demandas e tarefas marcadas juntas, o Status mostra só os que existem nos dois. Mudar os filtros limpa a seleção; **Limpar seleção** esconde as caixas de novo. Vale a mesma permissão de editar demanda e de editar tarefa. A mesma função existe na aba **Demandas** do projeto.

À esquerda do nome fica o **sinal do status**: círculo vazio (Não iniciado), azul (Em andamento), roxo (Em validação), verde com ✓ (Concluído), cinza com ✕ (Cancelado) e laranja (Suspenso). Passe o mouse para ler o nome do status.

Atalhos na linha: **+ Sub** (nova subdemanda), **+ Tarefa** e **Editar**.

A demanda ou subdemanda que tem tarefas mostra a pílula **N tarefas** (as canceladas não contam; na demanda entram também as tarefas das subdemandas). Clique na pílula para listar as tarefas ali mesmo, com data, período, consultor, status e horas; clique numa tarefa para abri-la e na pílula de novo para recolher.

Filtros:

- Busca por demanda, cliente ou projeto.
- **Status**: começa em **abertas** (Não iniciado, Em andamento, Em validação e Suspenso). Marque os que quiser, com **Exibir** ou **Ocultar**; **Limpar** mostra todos. O app guarda a escolha no aparelho.
- **Fase**, **Responsável**, **Etapa**, **Cliente**, **Projeto**, **Tipo** (Entregável, Plano de ação, Chamado) e **Prioridade**: aceitam vários de uma vez. Dentro de cada um há os botões **Exibir** (mostra só os marcados) e **Ocultar** (mostra todos, menos os marcados): para ver tudo menos um cliente, toque em **Ocultar** e marque só ele.
- **Situação do projeto** (Ativo, Suspenso, Encerrado, Cancelado — as mesmas da tela de Projetos): a tela abre com **Ativo** e **Suspenso** marcados. Para ver as demandas de projetos encerrados ou cancelados, marque-os; **Limpar** mostra todas as situações.
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
- **Subdemanda de chamado não tem Excluir**: o chamado precisa ter um fim. Conclua ou cancele o chamado. Se a tarefa for apagada no ClickUp, o chamado volta para a Triagem.

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
- **Anexos**: **+ Anexar** (até 20 MB por arquivo). Toque no nome para abrir e em **⬇ Baixar** para baixar; **×** remove (quem anexou, ou Admin, GP e Líder Tech).
- **Comentários**: veja a seção 9.
- **Rentabilidade**: só para quem tem o papel no cofre financeiro; tem manual próprio.

## 7. Criar ou editar uma tarefa

Toque em **+ Tarefa**.

1. Confira o cliente e a demanda e informe o **Título** (obrigatórios).
2. Monte a agenda: **Consultor**, **Data**, **Período** e **Tipo de agenda**. Toque em **+ Adicionar combinação**. Repita para outras pessoas, dias ou horários; **+ dia útil** repete no dia útil seguinte. Cada combinação vira uma tarefa (até 100 por vez).
3. Se quiser: **Status**, **Etapa**, **Apontamento**, **Agendamento**, **Experience** e **Detalhamento**. A tarefa nova já vem com a sugestão **Apontamento = OS Experience**, **Agendamento = Agendar** e **Experience = Não lançado** (troque se for outro caso); a **Etapa** é a do cadastro de Etapas do app.
4. Se quiser, em **Anexos** toque em **+ Anexar** e escolha os arquivos (até 10, de 20 MB cada). Eles sobem ao gravar; criando várias tarefas de uma vez, vão para todas.
5. Toque em **Gravar** (ou **Criar N tarefas**).

Períodos: Manhã (08h-12h), Tarde (14h-18h), Dia (08h-18h), Noite (18h-22h) ou **Horário livre**. No horário livre, informe **Início** e **Fim** no formato hh:mm; os minutos são aceitos (ex.: 13:30 às 14:15), então a agenda pode ter menos de uma hora. Enquanto o ClickUp estiver em paralelo, lá a tarefa aparece na hora cheia que contém a janela (13:30 às 14:15 aparece como 13h-15h); no app valem o horário e as horas exatos.

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
- **Anexos** e **Comentários**: iguais aos da demanda. Os anexos da tarefa também aparecem no popup **Editar**, onde **+ Anexar** já grava na hora.

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
| "No horário livre, informe início e fim no formato hh:mm…" | Use o formato hh:mm (ex.: 13:30), com o fim depois do início |
| "Confira início, fim e intervalo." | O apontamento precisa de fim depois do início e intervalo menor que o total |
| "Informe as horas estimadas." / "Informe o motivo." | Complete o pedido de mais agenda |
| "Arquivo acima de 20 MB." | Reduza o arquivo |
| "Carregadas X de Y; refine o status." | A lista veio parcial: marque menos status |
