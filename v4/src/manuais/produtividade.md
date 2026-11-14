# Manual de Produtividade e Meu fechamento

Para todos os usuários (consultores e gestão) · app PMO v3 (web)

*Os números citados neste manual são exemplos fictícios.*

## 1. Onde fica e quem vê

No menu (☰), na área **Relatórios**, há dois módulos:

- **Relatórios › Produtividade**: horas apontadas (Sankhya OM + app), com o gráfico de horas acumuladas. Todos entram.
- **Relatórios › Meu fechamento**: o seu fechamento do período de 21 a 20, com o valor calculado. Todos entram, e cada pessoa vê só o próprio.

Na Produtividade, o que aparece depende da permissão **produtividade.ver_todos**:

| Quem | O que vê | Título da tela |
| --- | --- | --- |
| Tem a permissão (padrão: Admin, GP, Líder Tech e Triagem) | A equipe toda | **Produtividade** |
| Não tem (padrão: Consultor) | Só os próprios números | **Minha produtividade** |

No **Meu fechamento** não existe essa permissão: ninguém vê o fechamento de outra pessoa por ali, nem o administrador do app.

## 2. As abas da Produtividade

| Aba (para quem vê todos) | Aba (para quem vê só o próprio) | Para que serve |
| --- | --- | --- |
| **Fechamento** | **Fechamento** | Totais de horas por consultor no período e o gráfico |
| **Apontamentos** | **Meus apontamentos** | Relatório dos apontamentos, por origem e período |
| **Travados** | **Meus travados** | OS do Experience travadas fora do prazo retroativo, por ciclo 21–20 |
| **Conferência de OS** | **Minha conferência de OS** | OS do Experience comparadas com as agendas |
| **Planilhas** | **Minha planilha** | Planilhas de horas comparadas com as agendas de planilha |

Este manual detalha a aba **Fechamento** (seções 3 a 6) e o **Meu fechamento** (seções 7 e 8).

## 3. Aba Fechamento: período e totais

A aba abre no período do fechamento: do dia 21 do mês retrasado ao dia 20 do mês anterior.

1. Para ver outro intervalo, mude **De** e **Até**.
2. Para voltar ao padrão, toque em **Período do fechamento (21 a 20)** (o link aparece quando as datas foram alteradas).

Abaixo dos filtros ficam os totais (da equipe ou os seus):

- **Total (OS + app)**: horas de OS do Sankhya OM somadas aos apontamentos do app.
- **Capacidade**: dias úteis × horas do dia − ausências (sem feriados).
- **Extras**: o que passa das horas do dia em dia útil, e todo sábado e domingo.
- **Sem conferência**: apontamentos do app ainda não conferidos.

Esta aba mostra só horas. Valores em reais aparecem apenas no **Meu fechamento** e nas telas do Financeiro.

## 4. O gráfico Horas executadas acumuladas

O gráfico fica logo abaixo dos totais e usa o mesmo período de **De** e **Até**.

- Cada barra é um dia. A altura é a soma das horas executadas **desde o início do período até aquele dia** (acumulado), não só as horas do dia.
- As cores separam o **tipo de OS**, que é o campo **Apontamento** da tarefa (por exemplo: OS Experience, Faturado (Planilha), Bonificado (Planilha), Planilha - Serviços, Treinamento).
- Tarefa sem o campo Apontamento entra como **Sem tipo**.
- O gráfico tem até seis cores. Se houver mais tipos que isso, os menores são somados em **Outros**.
- Dias depois de hoje ficam sem barra.
- O número em cima da última barra é o total acumulado até ali.
- A legenda mostra, para cada tipo, as horas do período e a porcentagem do total.

Se não houver apontamento no período, aparece "Nenhuma hora executada neste período."

## 5. Filtros e detalhes do gráfico

- **Período**: o gráfico aceita até 92 dias. Com um intervalo maior ele mostra o aviso "informe um período de até 92 dias".
- **Consultor**: quem vê a equipe toda tem o campo **Consultor** no canto do gráfico. **Toda a equipe** soma todos; escolha um nome para ver só aquela pessoa. Quem vê só o próprio não tem esse campo: o gráfico já é o seu.
- **Detalhe do dia**: passe o mouse (ou toque) em um dia. Aparece a data, as horas **No dia**, o **acumulado** e o acumulado de cada tipo.
- **Ver em tabela**: abre, abaixo da legenda, os mesmos números em tabela. Há uma linha por dia com apontamento, uma coluna por tipo, e as colunas **No dia** e **Acumulado**.

Em períodos longos o gráfico rola para o lado.

## 6. A tabela por consultor e o Relatório

Abaixo do gráfico há uma linha por consultor (ou só a sua):

| Coluna | Significado |
| --- | --- |
| **Dias úteis**, **Capacidade** | Dias úteis do período e as horas disponíveis |
| **Agendado** | Horas agendadas no período |
| **Sankhya OM**, **APP**, **Total** | Horas de OS, horas apontadas no app e a soma |
| **Normais**, **Extras** | Divisão do total pela regra da seção 3 |
| **Ocupação** | Percentual de ocupação (— quando não há como calcular) |
| **Sem conferência** | Apontamentos do app ainda não conferidos |

Toque em **Relatório** na linha para abrir, em outra janela, o relatório do consultor: resumo de horas e a lista de atendimentos do período. Use **Imprimir / salvar PDF** nessa janela.

## 7. Meu fechamento: o que a tela mostra

Abra **Relatórios › Meu fechamento**. A tela abre no período que está correndo.

1. Em **Período**, escolha um dos últimos 24 períodos. Cada um vai do dia 21 ao dia 20 (por exemplo, o período que termina em 20 de novembro começa em 21 de outubro).
2. Ao lado aparece a situação: **Aberto**, **Fechado** ou **Reaberto**.
3. Os valores em reais começam ocultos (aparecem como "R$ •••"). Toque em **Mostrar valores** quando estiver em um lugar reservado. **Ocultar valores** esconde de novo.

Os indicadores:

- **Horas normais**, **Horas extras** e **Total de horas**.
- **Valor hora**, com a modalidade entre parênteses.
- **Prévia do valor** (período aberto ou reaberto) ou **Valor fechado** (período fechado). Quando aparece "(mínimo)", a soma do período não passou do valor mínimo / fixo e vale o fixo.
- **Meta**: total de horas dividido pela meta de horas do período.

Em **Atendimentos do período** há uma linha por atendimento: data, origem (OS com o número, ou Planilha), cliente, atividade, horário, horas normais e extras, valor hora e valor. Se o Financeiro ajustou as horas de um atendimento, a linha mostra "era" com as horas originais e a observação do ajuste.

## 8. Meu fechamento: prévia, fechado e exportar

- **Período ainda não fechado**: a tela avisa que os números são uma prévia e podem mudar até o fechamento.
- **Período fechado**: vale o **Valor fechado**. Se alguma hora mudou depois, aparece "Houve alterações depois do fechamento", com o que o cálculo daria hoje. O valor fechado continua valendo até o período ser fechado de novo.
- **Sem remuneração cadastrada**: o valor só é calculado quando o Financeiro cadastrou a sua remuneração com vigência na data do atendimento. Sem isso, as horas aparecem normalmente, a coluna **Valor hora** do atendimento mostra **sem valor**, o valor fica zerado e a tela avisa "N atendimento(s) sem remuneração vigente na data: avise o responsável pelo Financeiro."
- **Sem horas e sem remuneração**: aparece "Você não tem horas nem remuneração cadastrada neste período."

Para exportar, toque antes em **Mostrar valores**; só então **Excel** e **PDF** ficam liberados. Os dois trazem os atendimentos do período.

Cada vez que você abre a tela, a consulta fica registrada no cofre financeiro (sem valores).

## 9. Dúvidas comuns

- **Não vejo os colegas na Produtividade**: é a regra para quem não tem a permissão produtividade.ver_todos.
- **As horas extras da Produtividade e do Meu fechamento são diferentes**: são contas diferentes. Na Produtividade, extra é o que passa das horas do dia e todo fim de semana. No Meu fechamento, a regra é a da remuneração: só a modalidade CLT tem hora extra (o trecho depois das 18:00, pago em dobro); em PJ e COOP toda hora conta como normal.
- **O gráfico sumiu ou mostra aviso de período**: reduza o intervalo para até 92 dias.
- **Muita hora em "Sem tipo"**: as tarefas estão sem o campo Apontamento preenchido.
- **Excel e PDF do Meu fechamento estão apagados**: toque em **Mostrar valores** primeiro, e confira se o período tem atendimentos.
- **O valor está zerado ou "sem valor"**: falta remuneração com vigência na data. Fale com o responsável pelo Financeiro.
- **"O navegador bloqueou a janela do relatório; libere as janelas deste site."**: permita pop-ups para o app e toque em **Relatório** de novo.
- **"não foi possível abrir o seu fechamento; avise o responsável pelo Financeiro"**: o registro do cofre não pôde ser lido. Avise o Financeiro.
- **"Sem conexão com o servidor. Confira a internet e tente de novo."**: problema de rede; tente novamente.
