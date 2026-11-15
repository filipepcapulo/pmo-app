# Manual da Rentabilidade

Para quem tem o papel Dono ou Rentabilidade no cofre financeiro · app PMO (web)

*Nomes e valores citados neste manual são exemplos fictícios.*

## 1. Onde fica e quem vê

A rentabilidade aparece em dois lugares: a tela **Relatórios › Rentabilidade geral**, com o escritório inteiro em gráficos (seção 9), e a aba **Rentabilidade** dentro de três fichas:

- **Ficha do Cliente**: aparecem as abas **Dados** e **Rentabilidade**.
- **Ficha do Projeto**: a aba **Rentabilidade** fica depois das outras abas do projeto.
- **Ficha da Demanda**: idem, depois das outras abas da demanda.

A aba só existe para quem tem o papel **Dono** ou **Rentabilidade** no cofre financeiro. Admin e GP não veem por serem Admin ou GP, e o papel Fechamento sozinho também não. Para os demais, as fichas continuam como sempre, sem a aba.

Os papéis são concedidos pelo Dono em **Financeiro › Acessos e Remuneração**. Cada consulta à aba fica registrada no cofre (quem e quando, sem valores).

## 2. De onde vêm os números

A aba cruza três informações:

| Informação | Onde é cadastrada | Quem cadastra |
| --- | --- | --- |
| Horas contratadas | Pedido de horas do projeto (aba **Horas**) | Quem tem a permissão de gravar pedido de horas |
| Valor/hora vendido | Dentro do pedido de horas | Dono ou Rentabilidade |
| Custo da hora | Remuneração do consultor, com vigência | Dono, em **Acessos e Remuneração** |

As horas executadas vêm dos apontamentos do projeto (Sankhya OM e app). A conta considera todos os apontamentos, sem filtro de período.

## 3. Informar o valor/hora vendido do pedido

1. Abra o **Projeto**, aba **Horas**, quadro **Pedidos de horas**.
2. Toque na linha do pedido. Abre **Pedido de horas**.
3. No campo **Valor/hora vendido (R$)** aparece "não informado" ou "R$ •••". Toque em **Informar** (ou **Mostrar e editar**, quando já existe valor).
4. Digite o valor (exemplo fictício: 185,50) e toque em **Gravar**.

O que saber:

- O valor fica cifrado no cofre. Só Dono e Rentabilidade veem o campo; para os demais o pedido aparece sem ele.
- Deixar o campo vazio e gravar remove o valor do pedido.
- Em pedido vindo do Sankhya OM os outros campos são só leitura, mas o valor/hora pode ser informado.
- Para criar um pedido novo (**+ Pedido**) continua sendo preciso a permissão de gravar pedido de horas. Quem tem só o papel do cofre abre os pedidos existentes e grava apenas o valor/hora.
- Depois de gravar, a aba **Rentabilidade** do projeto recalcula.

## 4. Os indicadores

Os valores começam ocultos ("R$ •••" e "•••" na porcentagem). Toque em **Mostrar valores** quando estiver em um lugar reservado e em **Ocultar valores** ao terminar.

| Indicador | Significado |
| --- | --- |
| **Receita contratada** | Horas dos pedidos × valor/hora vendido. Ao lado, o total de horas dos pedidos |
| **Receita das horas executadas** | Horas já executadas × valor/hora médio vendido do projeto. Ao lado, as horas executadas |
| **Custo das horas executadas** | Horas executadas × remuneração do consultor vigente na data de cada atendimento |
| **Margem** | Receita das horas executadas − custo, em reais e em porcentagem da receita executada |
| **Sobra do contrato (receita − custo)** | Receita contratada − custo até agora: quanto ainda resta do que foi vendido |
| **Valor/hora médio vendido · custo/hora** | Média do valor/hora dos pedidos (ponderada pelas horas) e custo médio da hora executada |

A margem muda de cor quando é negativa e quando fica abaixo de 20%.

Na ficha da **Demanda** não aparecem **Receita contratada** nem **Sobra do contrato**: o pedido de horas é do projeto, não da demanda.

## 5. Como a conta é feita

Exemplo fictício de um projeto:

- Um pedido de 100 h a R$ 200,00 por hora: receita contratada de R$ 20.000,00.
- Foram executadas 40 h: receita das horas executadas de 40 × R$ 200,00 = R$ 8.000,00.
- As 40 h foram feitas por um consultor com valor hora de R$ 80,00: custo de R$ 3.200,00.
- Margem: R$ 8.000,00 − R$ 3.200,00 = R$ 4.800,00 (60%).
- Sobra do contrato: R$ 20.000,00 − R$ 3.200,00 = R$ 16.800,00.

Regras do custo (as mesmas do Fechamento de produtividade):

- Vale a remuneração vigente na **data** de cada atendimento.
- Hora extra de CLT custa em dobro; PJ e COOP não têm hora extra.
- Atendimento de planilha usa o valor hora interno, quando cadastrado.
- Ajustes de horas feitos no Fechamento de produtividade valem aqui também.
- O valor mínimo / fixo do consultor **não** entra: o custo é sempre hora × valor hora.

Com mais de um pedido no projeto, o valor/hora médio é ponderado pelas horas dos pedidos que têm valor informado.

## 6. O que muda em cada ficha

Abaixo dos indicadores há uma tabela com a quebra um nível abaixo. O nome de cada linha é um link para a ficha correspondente.

| Ficha | Tabela | O que lista |
| --- | --- | --- |
| Cliente | **Por projeto** | Todos os projetos do cliente, com horas contratadas, receita contratada, horas executadas, receita executada, custo e margem |
| Projeto | **Por demanda** | As demandas de primeiro nível que têm horas executadas. As horas das subdemandas somam na demanda pai |
| Demanda | **Por subdemanda** | A própria demanda ("tarefas da própria demanda") e as subdemandas. Sem subdemandas, a tabela não aparece |

Na ficha da Demanda, a receita é sempre a das horas executadas, calculada pelo valor/hora médio dos pedidos do projeto.

## 7. O quadro Pedidos de horas

No fim da aba, **Pedidos de horas** lista os pedidos usados na conta: **Nº do pedido**, **Data**, **Horas**, **Valor/hora** e **Total**.

- Pedido sem valor/hora aparece com a marca **sem valor** e total "—".
- Na ficha do Cliente entram os pedidos de todos os projetos dele.
- Na ficha da Demanda aparecem os pedidos do projeto da demanda.

O valor não é editado aqui: é informado no pedido, na aba **Horas** do projeto (seção 3).

## 8. Quando falta dado

O quadro **Atenção** explica o que ficou de fora:

| Aviso | O que acontece na tela |
| --- | --- |
| "O projeto não tem pedido de horas: sem receita para comparar." | Receita, margem e sobra aparecem como "—". Só há horas e custo |
| "Nenhum pedido de horas nos projetos deste cliente: sem receita para comparar." | O mesmo, na ficha do Cliente |
| "N pedido(s) de horas sem valor/hora informado (ficam fora da receita)." | A receita considera só os pedidos com valor. Se nenhum tiver valor, receita e margem ficam "—" |
| "N h executadas sem período de remuneração vigente na data: entram sem custo." | Essas horas contam nas horas executadas e na receita, mas com custo zero |
| "N registro(s) do cofre não puderam ser decifrados e ficaram fora do cálculo." | Algum valor não pôde ser lido; avise o Dono |

Atenção ao aviso de horas sem custo: sem remuneração cadastrada com vigência na data do atendimento, o custo daquelas horas não é calculado. Se nenhuma hora tiver custo, o custo aparece zerado e o custo/hora como "—". A margem fica maior do que a real até a remuneração ser cadastrada.

Nas tabelas de quebra, as marcas **sem valor** (pedido sem valor/hora) e **sem custo** (horas sem remuneração vigente) mostram em qual linha está a falta.

## 9. Rentabilidade geral (Relatórios)

**Relatórios › Rentabilidade geral** mostra, em uma tela só, o **faturado × custo** de todo o escritório em um intervalo de datas.

- **Faturado** = horas executadas no intervalo × valor/hora médio vendido do projeto (o mesmo "receita das horas executadas" da seção 5).
- **Custo** = horas executadas × remuneração vigente do consultor na data.
- **Margem** = faturado − custo; o percentual é sobre o faturado.

Como usar:

1. Escolha o intervalo em **De** / **Até** ou use os atalhos (**Últimos 3 meses**, **Últimos 6**, **Últimos 12**, **Este ano**). A tela abre com os últimos 6 meses.
2. Em **Período por**, escolha **Mês** (mês civil) ou **Fechamento (21–20)**.
3. Toque em **Mostrar valores**. Os gráficos só aparecem com os valores à mostra.

| Quadro | O que mostra |
| --- | --- |
| Indicadores | Faturado, Custo, Margem, Horas executadas e faturado/hora · custo/hora do recorte |
| **Por período — faturado × custo** | Duas colunas por mês ou período (verde = faturado, azul = custo), com a margem em % em cima |
| **Por cliente**, **Por projeto**, **Por consultor** | Barras de faturado e custo de cada um, do maior faturado para o menor, com a margem em % |
| **Detalhamento** | A tabela do nível de baixo, com horas, faturado, custo e margem, e o botão **Excel** |

Descer de nível: toque em uma coluna, em uma barra ou em um nome do Detalhamento. A escolha vira um item da trilha no topo (por exemplo, Geral › Cliente Alfa › Projeto Implantação) e **todos** os quadros passam a mostrar só aquele recorte. O Detalhamento acompanha: no geral lista os clientes; com um cliente, os projetos dele; com um projeto, os consultores; dá para trocar pelas abas Cliente, Projeto, Consultor e Período.

- Toque de novo no item escolhido, ou no **×** da trilha, para subir um nível. **Geral** limpa tudo.
- Com um projeto na trilha, **Abrir o projeto** leva à ficha dele, onde a aba Rentabilidade detalha **por demanda**.
- **sem valor**: horas em projeto sem valor/hora nos pedidos — ficam fora do faturado. **sem custo**: horas sem remuneração vigente na data.
- A quebra por consultor mostra o custo de cada pessoa: abra em lugar reservado.

## 10. Dúvidas comuns

- **Não vejo Rentabilidade geral no menu**: é o mesmo papel da aba (Dono ou Rentabilidade no cofre).
- **O faturado da Rentabilidade geral é a nota emitida?** Não. É a conta horas executadas × valor/hora vendido; o app não lê o faturamento do Sankhya.
- **Não vejo a aba Rentabilidade**: falta o papel Dono ou Rentabilidade no cofre. Depois de receber o papel, recarregue o app.
- **"A rentabilidade é só para quem tem o papel Dono ou Rentabilidade no cofre financeiro."**: o papel foi revogado. Fale com o Dono.
- **Receita e margem aparecem como "—"**: falta pedido de horas ou falta valor/hora nos pedidos (seção 3).
- **Custo zerado ou margem alta demais**: falta remuneração com vigência para os consultores que apontaram. O Dono cadastra em **Acessos e Remuneração**.
- **"Valor/hora: use um número (ex.: 185,50) ou deixe vazio."**: use só número, com vírgula nos centavos.
- **"o valor do pedido foi alterado por outra pessoa; recarregue"**: feche o pedido, abra de novo e refaça a alteração.
- **No campo do pedido aparece "não foi possível abrir"**: o valor guardado não pôde ser lido. Toque em **Informar**, digite o valor de novo e grave.
- **Sou GP e não vejo o campo Valor/hora vendido no pedido**: o campo é só para Dono e Rentabilidade.
- **A sobra do contrato é a margem final?** Não. Ela compara tudo o que foi vendido com o custo até agora. A margem compara só as horas já executadas.
