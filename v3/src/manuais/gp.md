# Manual do GP — agenda, desvios e aprovações

Para os gerentes de projeto · app PMO v3 (web)

*As telas deste manual usam dados de exemplo (pessoas, clientes e tarefas fictícios).*

## 1. Onde o GP trabalha

Entre em **https://filipepcapulo.github.io/pmo-app/v3/** com o seu e-mail da Sankhya e o código de 6 dígitos que chega por e-mail. No menu (☰):

- **Execução › Agenda da equipe**: a grade dos consultores e o backlog do lado, para agendar e mudar agendas.
- **Execução › Desvios de agenda**: aprovar ou recusar os desvios dos seus projetos.
- **Execução › Ociosidade**: quem está sem agenda ou com horas livres no dia, com sugestões.
- **Relatórios › Produtividade**: conferir os apontamentos e fazer o fechamento.
- **Relatórios › Portfólio** e **Execução › Controle de Férias**: visão geral dos projetos e prazos de férias. No Portfólio, fases e GPs aceitam vários de uma vez, o cliente com plano de ação aberto fica marcado e **+ Plano** cria um 5W2H ali mesmo.
- **O sino (🔔) no topo**: os avisos que pedem a sua ação. Tocar no aviso abre a tela certa.
- **Geral › Manuais**: este manual e o do consultor, para consultar ou imprimir.

## 2. Os avisos que chegam para você

| Aviso | Quando chega | O que fazer |
| --- | --- | --- |
| "Fulano pediu mais X h de agenda: Demanda" | Um consultor pediu mais agenda numa demanda de projeto seu | Ver a seção 3 |
| "Fulano informou desvio em dd/mm" | Um consultor atendeu um projeto seu no horário da agenda de outro | Ver a seção 4 |
| "Desvio aprovado: dd/mm ficou sem atendimento em Demanda" | Outro GP aprovou um desvio e a agenda do seu projeto não foi cumprida | A demanda voltou ao seu backlog: reagende |

O GP do projeto é o do cadastro do projeto; se o projeto não tiver GP, vale o GP do cliente.

![Sino aberto com um pedido de agenda e um desvio](g01-avisos.png)

*O sino mostra quantos avisos estão sem ler. Tocar no aviso abre a demanda ou a tela de desvios.*

## 3. Pedidos de mais agenda

O consultor pede pelo botão **Preciso de mais agenda**, informando as horas e o motivo. O pedido aparece em três lugares:

1. No **sino**, com o link da demanda.
2. Na **Tela do Projeto**, aba Indicadores, no quadro **Pedidos de agenda** (demanda, horas, quem pediu, quando e o motivo).
3. No **backlog da Agenda da equipe**, destacado na demanda: "Pedido de agenda: X h — motivo".

![Quadro Pedidos de agenda na Tela do Projeto](g03-projeto-pedidos.png)

*Tela do Projeto, aba Indicadores: o quadro Pedidos de agenda, com Recusar e Atendido.*

Para atender:

- **Agendando pela grade (recomendado)**: em Agenda da equipe, arraste a demanda do backlog para a célula do consultor e do dia. Abre a Nova tarefa já com a demanda, o consultor e o dia; complete e grave. O pedido fica atendido sozinho.
- **Pela Tela do Projeto**: toque em **Atendido** (se já agendou por outro caminho) ou **Recusar** (se não vai dar a agenda).

![Agenda da equipe com o pedido destacado no backlog](g02-agenda-backlog-pedido.png)

*Agenda da equipe: no backlog, a subdemanda com o pedido aparece destacada ("1 pedido(s)" no cliente). Arraste-a para a célula do consultor e do dia. No canto, a pílula dos desvios pendentes.*

Nos dois casos o consultor recebe o aviso "Seu pedido de agenda foi atendido/recusado".

## 4. Desvios de agenda

Desvio é quando o consultor estava agendado num projeto e atendeu outro no mesmo horário. Ele informa pelo botão **Informar desvio** na tarefa do dia (cliente, demanda e subdemanda atendidos — só entre as existentes, sem criar —, quem orientou e motivo). **Quem decide é o GP do projeto atendido.**

1. Abra **Desvios de agenda** (pelo sino ou pelo menu). Na Agenda da equipe aparece a pílula "N desvio(s) pendente(s)".
2. Filtre por **Situação** (Pendentes) e pelo período **De / Até**.
3. Na linha do desvio, toque em **Aprovar** ou **Recusar**.
4. **Aprovar**: confira previsto × atendido e o motivo. Desvios informados antes da 3.14 podem vir sem demanda: nesse caso escolha a **Demanda atendida**. Ao aprovar, o app troca a agenda numa operação só: cria a tarefa no projeto atendido (onde o consultor vai apontar) e marca a tarefa prevista como "não executada". A demanda prevista volta ao backlog.
5. **Recusar**: informe o **Motivo da recusa** (obrigatório). A agenda prevista continua valendo.

![Aprovar desvio com a escolha da demanda atendida](g05-aprovar-desvio.png)

*Aprovar desvio: previsto × atendido, o motivo do consultor e a Demanda atendida (quando ele não soube). Atrás, o log com Aprovar e Recusar na linha pendente.*

![Recusar desvio com o motivo](g06-recusar-desvio.png)

*Recusar desvio: o motivo da recusa é obrigatório e vai no aviso para o consultor.*

Depois de decidido, o desvio não pode ser decidido de novo. Avisos: o consultor sabe da decisão; aprovado, o GP do projeto abandonado também é avisado.

**Indicador por consultor** (topo da tela): quantidade de desvios, pendentes, recusados, horas desviadas, horas agendadas e o % da agenda desviada no período. Use para acompanhar quem desvia com frequência.

## 5. Agenda da equipe: agendar e ajustar

- **Agendar do backlog**: arraste a demanda (ou subdemanda) do backlog para a célula do consultor e do dia. Também dá para marcar várias no backlog e tocar numa célula para alocar em lote.
- **Mudar data ou consultor**: arraste a tarefa para outra célula. Com várias selecionadas, todas vão juntas e mantêm a distância entre os dias.
- **Repetir uma agenda**: abra a agenda e use **+ Mais agenda** para criar outra igual com nova data e horário.
- **Ausências**: **+ Ausência** (férias, folga, licença ou algumas horas). O dia de ausência inteira bloqueia a célula; ausência de algumas horas só desconta as horas.
- No backlog, "agendas em aberto" mostra o que já tem agenda futura; use o filtro para esconder.
- **GP responsável** (filtro do backlog): mostra só o que é seu — o responsável da demanda; sem responsável, o da demanda-mãe, o GP do projeto ou o do cliente.
- **Kanban** (aba ao lado de Grade): só as agendas em aberto, em colunas por **consultor**, **cliente** ou **demanda/subdemanda** (escolha em "Agrupar por"). Por consultor, arraste o cartão para outra coluna para trocar o consultor (a data fica) ou solte uma demanda do backlog na coluna para agendar. O backlog fica do lado também aqui.

## 6. Ociosidade

Em **Ociosidade** você vê, por dia, quem está sem agenda, com horas livres, com a agenda completa ou ausente. Abra o consultor para ver as sugestões do backlog (primeiro as demandas de projetos em que ele já trabalhou) e toque em **Agendar**: abre a Nova tarefa já com a demanda, o consultor e o dia. **Copiar relatório** gera o texto para mandar no WhatsApp.

![Ociosidade com as sugestões e o botão Agendar](g07-ociosidade.png)

*Ociosidade: totais por situação e, aberto o consultor, as sugestões com Agendar.*

## 7. Conferir os apontamentos dos consultores

1. Abra **Produtividade** e a aba **Apontamentos**.
2. Filtre por consultor, origem (Sankhya OM ou Apontamento no APP) e período.
3. Confira cada apontamento do app e toque em **Conferir**. Para conferir tudo o que está no filtro de uma vez, use **Conferir N do filtro**.
4. Achou um erro? **Reabrir** devolve ao consultor para ele corrigir.

Conferido, o consultor não edita nem exclui mais. As OS do Sankhya OM não passam pela conferência.

![Produtividade, aba Apontamentos, com Conferir N do filtro](g08-conferir-apontamentos.png)

*Produtividade › Apontamentos: filtros, totais e Conferir N do filtro. Na tabela, arraste para o lado até a coluna Conferência para conferir ou reabrir um por um.*

## 8. Fechamento do mês

1. Em **Produtividade**, aba **Fechamento**. Abre no período do fechamento (dia 21 do mês retrasado ao dia 20 do mês passado).
2. Por consultor: dias úteis, capacidade (dias úteis × 8 h − ausências), agendado, horas de OS, horas do app, total, horas normais, extras (acima de 8 h no dia útil e todo sábado/domingo), ocupação e apontamentos sem conferência.
3. Antes de fechar, zere a coluna **Sem conferência** (seção 7).
4. **Relatório** na linha do consultor abre o relatório dele (resumo + todos os atendimentos) pronto para imprimir ou salvar em PDF. Os botões Excel e CSV baixam a tabela.

![Produtividade, aba Fechamento](g09-fechamento.png)

*Produtividade › Fechamento: período de 21 a 20, totais da equipe e uma linha por consultor. Arraste a tabela para o lado para ver Normais, Extras, Ocupação, Sem conferência e o botão Relatório.*

**Apontamentos travados (aba Travados):** as OS que estão travadas no Experience esperando a sua liberação e já passaram do prazo de lançamento retroativo (3 dias úteis), por ciclo de 21 a 20 (Ciclo atual, Ciclo anterior ou a lista dos ciclos, que são as antigas abas #RETRO da planilha). **Atualizar do Experience** busca com a sua Conta Sankhya e só acrescenta: o que já estava na lista não muda. Erro "3" do Sankhya já vem com Desconta SIM e Motivo "Sem apontamento de OS"; os demais você preenche na própria tabela (Desconta e Motivo). A OS que você liberou depois fica na lista como **Liberada**. **Relatório do ciclo** abre pronto para imprimir/PDF; o Excel sai pela tabela. O consultor vê só os próprios.

**Quem vê a produtividade de quem:** o consultor vê só a própria (fechamento, apontamentos e relatório); GP, Admin, Líder Tech e Triagem veem a de todos. Quem decide é a permissão **produtividade.ver_todos**, em **Equipe › Acessos por funcionalidade** (Relatórios · Ver a produtividade… de todos os consultores): dá para tirar ou dar a uma pessoa sem mudar o perfil dela. A regra vale no banco, não só na tela.

## 9. Dúvidas frequentes

- **Não aparece Aprovar no desvio**: só o GP do projeto atendido (ou o admin) decide, e só enquanto está pendente.
- **Aprovar pede a demanda**: desvio antigo informado sem demanda; escolha uma demanda aberta do projeto atendido.
- **O pedido de agenda continua aberto depois que agendei**: ele só fecha sozinho quando a agenda é criada arrastando a demanda com o pedido no backlog. Feche pela Tela do Projeto com **Atendido**.
- **Conferi errado**: use **Reabrir**.
- **Um consultor diz que não vê a produtividade dos colegas**: é a regra; só quem tem produtividade.ver_todos vê todos.
- **Outras dúvidas**: fale com o PMO.
