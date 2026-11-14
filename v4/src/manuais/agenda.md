# Manual da Agenda da equipe, Desvios e Ociosidade

Para quem agenda e acompanha a equipe (GPs e Admin) · app PMO v3 (web)

Este manual é a referência das três telas: filtros, cores, arrastar e botões. O passo a passo do dia a dia (atender pedido de agenda, decidir desvio) está no **Manual do GP**.

## 1. Onde fica e quem vê

- **☰ › Execução › Agenda da equipe**: aparece para todos. O que cada um consegue fazer depende das permissões: mover tarefas exige `tarefa.editar`, criar exige `tarefa.criar`, lançar ausência exige `equipe.editar` e o lápis da demanda exige `demanda.editar`.
- **☰ › Execução › Desvios de agenda**: só para quem tem a permissão `desvio.aprovar` (por padrão, Admin e GP).
- **☰ › Execução › Ociosidade**: só para quem tem a permissão `ociosidade.ver` (por padrão, Admin e GP).

## 2. Agenda da equipe: as duas visões

No topo há dois botões: **Grade** e **Kanban**. O app lembra a última escolha neste navegador.

- **Grade**: consultores nas linhas, dias nas colunas. Serve para agendar e mudar data ou consultor.
- **Kanban**: só as agendas em aberto (não iniciadas ou em andamento, de qualquer data), em colunas.

Quem tem `desvio.aprovar` vê no canto a pílula "N desvio(s) pendente(s)" quando há desvio pendente no dia de hoje. Tocar nela abre **Desvios de agenda**.

## 3. A Grade

### Barra de filtros

| Controle | O que faz |
| --- | --- |
| **Equipe** | Escolhe quem aparece na grade (vários de uma vez). A escolha fica guardada neste navegador. |
| **Consultor…** | Filtra as linhas pelo nome digitado. |
| **De**, **Até** e **Filtrar** | Mostra só o intervalo informado (até 93 dias). |
| **Hoje** | Limpa o intervalo e volta a grade para o dia de hoje. |
| **Recolher consultores** / **Expandir consultores** | Fecha ou abre todas as linhas. A setinha ao lado do nome faz o mesmo para um consultor. |
| **Selecionar** / **Concluir seleção** | Liga o modo de marcar várias tarefas (ver "Mover"). |
| **+ Ausência** | Abre o cadastro de ausência. |

Sem intervalo filtrado, a grade abre em hoje e busca mais uma semana sozinha quando você rola até a borda, para trás ou para a frente.

### Como ler a célula

- **Linha aberta**: cada dia é uma escala de horas (07h às 19h, maior só se alguma agenda cair fora). O cartão da tarefa fica no horário dela, com o cliente, o nome da tarefa, o período e o tipo de agenda (Remoto, Interno, Presencial, Unidade Sankhya). A faixa cinza clara é o almoço (12h às 14h). Tarefa sem horário aparece com borda tracejada e o texto "sem horário".
- **Linha recolhida**: a célula mostra só o total de horas do dia e uma mini-faixa com os turnos ocupados. Tocar nela abre a linha.
- **Cabeçalho do dia**: mostra a soma de horas alocadas na equipe visível naquele dia.
- Tarefa concluída fica esmaecida; tarefa não executada fica riscada.

### Cores

| Cor do cartão | Turno |
| --- | --- |
| Amarelo | Manhã |
| Azul | Tarde |
| Roxo | Dia inteiro |
| Cinza | Noite |

| Cor do total de horas | Significado |
| --- | --- |
| Cinza | livre |
| Amarelo | até 7 h |
| Verde | 8 h |
| Laranja | até 12 h |
| Vermelho | mais de 12 h |

A legenda fica no rodapé da grade.

### Agendar

- **Arrastando**: arraste a demanda do backlog e solte na célula do consultor e do dia. Abre a tarefa já com demanda, consultor e data.
- **Sem mouse (celular)**: marque a caixa da demanda no backlog e toque no **+** da célula.
- **Vários de uma vez**: marque várias demandas no backlog e solte (ou toque no **+**). Abre **Alocar agenda**: escolha **Período** e **Tipo de agenda** e toque em **Criar N tarefa(s)**. O app cria uma tarefa por demanda; se uma falhar, as outras continuam.
- **Tarefa avulsa**: sem nada marcado no backlog, o **+** da célula abre uma tarefa nova com o consultor e o dia.

Se a demanda agendada tinha pedido de mais agenda, o pedido fica atendido sozinho.

### Mover

- **Arrastando**: arraste o cartão para outro dia ou outro consultor. Aparece "Tarefa movida.".
- **Várias**: toque em **Selecionar** e marque os cartões (no computador, Ctrl ou Cmd + clique também marca). Aparece a barra "N selecionada(s)": informe **Mover para** (data) e/ou o consultor e toque em **Mover**. **Limpar** desmarca tudo.
- Arrastando um cartão marcado, os demais marcados andam os mesmos dias.
- Tocar no cartão, fora do modo de seleção, abre a tarefa.

### Ausências

- **+ Ausência**: informe **Pessoa**, **De**, **Até**, **Duração** (**Dia inteiro** ou **Só algumas horas**), **Tipo** (Férias, Folga, Licença, Ausência) e **Motivo**. Toque em **Gravar**.
- Ausência de dia inteiro bloqueia a célula: não dá para soltar tarefa nem aparece o **+**.
- **Só algumas horas** pede **Hora de início** e **Hora de fim** e desconta só essas horas da capacidade do dia (8 h).
- Tocar numa ausência abre para alterar ou **Excluir**. Ausência que veio do ClickUp não abre.

## 4. O Backlog (lateral)

Lista o que há para agendar, em Cliente › Projeto › Demanda › Subdemanda. Toque no cliente para abrir. O número ao lado é a quantidade de itens.

| Controle | O que faz |
| --- | --- |
| Origem | **Tudo**, **Demandas**, **Backlog Base** ou **Personalização**. |
| **GP responsável** | Mostra só os itens de um GP (o da demanda; se não houver, o da demanda mãe, do projeto ou do cliente). |
| **Cliente ou demanda…** | Busca por texto; com busca, tudo abre. |
| **Status** | Marque quais status aparecem. Fica guardado neste navegador. |
| **Esconder o que já tem agenda** | Deixa só o que ainda não tem agenda em aberto. |
| **Relatório HTML** | Baixa o backlog como está na tela, com os filtros. |

- Faixa **verde** na borda: já tem agenda em aberto ("2 agendas em aberto · próx. 05/11").
- Faixa **laranja**: tem pedido de mais agenda ("Pedido de agenda: X h — motivo"). O cliente mostra "N pedido(s)".
- O **lápis** do cliente e do projeto abre a tela deles; o da demanda abre a edição.
- A setinha no topo recolhe o backlog numa barra fina; toque em **Backlog (N)** para voltar.

## 5. O Kanban

- **Agrupar por**: **Consultor**, **Cliente** ou **Demanda/subdemanda**.
- Filtros de seleção múltipla: **Consultores**, **Clientes**, **Projetos**, **Demandas**, **Subdemandas**. **Limpar filtros** zera. A escolha fica guardada por usuário e vale em qualquer aparelho.
- A busca procura por consultor, cliente ou demanda.
- O cabeçalho de cada coluna mostra quantas agendas e quantas horas previstas.
- Cartão com faixa **laranja**: data já passou. Faixa **azul** e pílula: em andamento.
- Agrupado por **Consultor**: arraste o cartão para outra coluna para trocar o consultor (a data não muda). Aparece "Agenda passada para Fulano.".
- Para agendar pelo Kanban: arraste do backlog para a coluna do consultor, ou marque no backlog e toque em **Alocar aqui**. Como não há dia, a tarefa sugere hoje; troque a data na tarefa.

## 6. Desvios de agenda

- Filtros: situação (**Todas as situações**, **Pendentes**, **Aprovados**, **Recusados**) e período **De** / **Até** (abre com os últimos 30 dias).
- **Indicador por consultor**: Desvios, Pendentes, Recusados, Horas desviadas, Horas agendadas e % da agenda. Quantidade e horas somam pendentes e aprovados.
- **Log**: Data, Período, Consultor, Horas, Previsto, Atendido, Quem orientou, Motivo, Situação e Decidido por. O **Previsto** abre a tarefa prevista; depois de aprovado, o **Atendido** abre a tarefa criada.
- **Aprovar** e **Recusar** aparecem só na linha pendente de projeto em que você é o GP do projeto atendido.
- **Aprovar**: se o desvio veio sem demanda, escolha a **Demanda atendida**. O app cria a tarefa no projeto atendido, marca a prevista como não executada e a demanda volta ao backlog.
- **Recusar**: o **Motivo da recusa** é obrigatório.

## 7. Ociosidade

- Escolha o dia com **‹**, **›**, o campo de data ou **Hoje**.
- Quatro contadores: **Sem agenda** (vermelho), **Com ociosidade** (laranja), **Agenda completa** (verde) e **Ausentes** (cinza).
- Os cartões de **Sem agenda** e **Com ociosidade** aparecem abertos na tela; **Agenda completa** e **Ausentes** abrem ao tocar no título.
- Cada cartão mostra o nome, as horas (disponíveis, ou alocadas / livres) e uma barra de alocação. Fechado, lista até três sugestões.
- Toque no cartão para ver a **Agenda do dia** (cada linha abre a tarefa) e as **Sugestões de alocação**: demandas do backlog, com prazo, horas previstas e quantas agendas o consultor teve no projeto em 180 dias.
- **Agendar** (para quem tem `tarefa.criar`) abre a tarefa com a demanda, o dia e o consultor.
- **Copiar relatório** copia o resumo do dia em texto, pronto para colar no WhatsApp. O botão vira "Copiado!".

## 8. Se algo der errado

| Mensagem | O que fazer |
| --- | --- |
| "Informe o intervalo (o fim não pode ser antes do início)." | Preencha **De** e **Até** antes de **Filtrar**. |
| "Filtre até 93 dias; para ver mais, use a rolagem." | Reduza o intervalo. |
| "Férias nesse dia: tarefa não movida." (ou Folga, Licença, Ausência) | O consultor está ausente o dia inteiro no destino. Escolha outro dia. |
| "Ninguém com esse filtro." | Confira **Equipe** e a busca por consultor. |
| "Informe a pessoa e o período." | Na ausência, faltou a pessoa ou as datas (o fim não pode ser antes do início). |
| "Informe a hora de início e a de fim (fim depois do início)." | Na ausência de algumas horas, corrija os horários. |
| "Escolha a demanda atendida." / "Informe o motivo da recusa." | Complete o campo ao decidir o desvio. |
| "Nada no backlog com esse filtro." | Confira Origem, GP, Status e a caixa de esconder o que já tem agenda. |

Não consigo arrastar a tarefa: mover exige a permissão `tarefa.editar`; no Kanban, só agrupado por **Consultor**.
