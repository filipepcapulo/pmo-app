# Manual de Etapas e novidades da V4

Para GPs, Líderes Tech, Triagem e Consultores · app PMO v4 (web)

*Os exemplos deste manual são fictícios ("Cliente Exemplo", "Fulano").*

## 1. O que é o cadastro de Etapas

No menu (☰), **Cadastros › Etapas**. Todos veem; Admin e GP editam.

As etapas que vinham do ClickUp eram muitas (uma lista por modelo de projeto) e diferentes entre si. Agora o app tem **as suas próprias etapas**, e cada etapa do ClickUp é ligada a uma delas (o **de/para**). Em toda tela a demanda mostra a etapa do app, numa pílula colorida.

As etapas iniciais: **Backlog Consultores** (amarelo), **Backlog Personalização** (vermelho), **Atendimento Avulso**, **Briefing**, **Levantamento/Validação do Escopo**, **Configuração**, **Treinamento/Homologação**, **Simulação**, **Go Live** e **Operação Assistida**.

## 2. Criar ou editar uma etapa

- **+ Nova etapa** ou **Editar** no cartão.
- Informe nome, cor e ordem.
- Marque as **etapas do ClickUp que correspondem** a ela. Uma etapa do ClickUp pertence a uma etapa do app só: marcar numa tira da outra.
- No fim da tela ficam as **etapas do ClickUp sem vínculo**. Demandas nessas etapas aparecem com a etapa tracejada.
- As etapas marcadas como **Fluxo** são usadas pelos chamados e não podem ser excluídas.

Ao escolher a etapa numa demanda, o app grava no ClickUp o texto correspondente (o texto definido na etapa ou a opção da mesma família do projeto, como "58 - …").

## 3. Status

O status agora é só o andamento: **Não iniciado**, **Em andamento**, **Em validação**, **Concluído**, **Cancelado** e **Suspenso**. "Planejado" deixou de existir na tela: é o mesmo que Não iniciado.

## 4. Demanda, subdemanda, tarefa e chamado

| Conceito | O que é |
| --- | --- |
| **Cliente** | A pasta do ClickUp |
| **Projeto** | A lista do ClickUp |
| **Demanda** | A tarefa-pai: o que será entregue |
| **Subdemanda** | Um pedaço da demanda, ainda sem agenda |
| **Tarefa** | A agenda de um consultor: tem responsável, data e período |
| **Chamado** | Um pedido do cliente. Em triagem, só existe na tela de Chamados |

O chamado **triado** vira subdemanda da demanda **Atendimento Avulso da Base** do cliente, no **Backlog Consultores** ou no **Backlog Personalização**, e fica marcado como **Precisa de alocação**. Quando recebe agenda, fica **Atribuído**; um chamado pode ter várias tarefas. Concluir uma tarefa não conclui o chamado: o app pergunta.

## 5. Abas, menu e filtros

- **Uma aba por tela**: ao abrir um cliente, depois um projeto e uma demanda, você continua na mesma aba. A faixa no alto da tela mostra o caminho e o **Voltar**.
- **Duas abas da mesma tela**: segure **Ctrl** (ou ⌘) ao clicar no item do menu, ou use o botão que aparece ao lado do item.
- **Menu recolhido**: passe o mouse no ícone para ver o nome.
- **Filtros**: a caixa fecha ao clicar fora ou apertar Esc.
- **Aplicar filtros em**: no fim da barra de filtros de Demandas, escolha se os filtros valem para demandas, subdemandas ou os dois. Vale para todos os filtros.
