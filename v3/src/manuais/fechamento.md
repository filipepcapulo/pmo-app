# Manual do Fechamento de produtividade

Para quem tem o papel Dono ou Fechamento no cofre financeiro · app PMO v3 (web)

*Nomes e valores citados neste manual são exemplos fictícios.*

## 1. Onde fica e quem vê

No menu (☰): **Financeiro › Fechamento de produtividade**.

O módulo só aparece para quem tem o papel **Dono** ou **Fechamento** no cofre financeiro. Admin e GP não entram por serem Admin ou GP, e o papel Rentabilidade sozinho também não.

Quem abre o endereço sem o papel vê **Sem acesso**, com o link para **Meu fechamento**, onde cada pessoa consulta só o próprio.

Cada consulta a esta tela fica registrada no cofre (quem e quando, sem valores).

## 2. Período e situação

O fechamento é sempre do dia **21 ao dia 20**. A tela abre no último período já encerrado.

1. Em **Período**, escolha um dos últimos 24 períodos. O campo mostra o nome do período e as datas.
2. Ao lado aparece a situação: **Aberto** (nunca fechado), **Fechado** ou **Reaberto**. Com o período fechado, parar o mouse sobre a situação mostra quando e por quem.
3. Marque **Mostrar sem horas** para incluir consultores sem horas no período. Sem a marca, a lista traz quem tem horas ou tem valor fixo.

Os valores em reais começam ocultos ("R$ •••"). Toque em **Mostrar valores** quando estiver em um lugar reservado e em **Ocultar valores** ao terminar. As horas aparecem sempre.

## 3. Como o valor é calculado

O cálculo é feito no servidor: horas dos apontamentos do PMO × remuneração vigente **na data de cada atendimento**.

- **Horas**: vêm dos apontamentos (OS do Sankhya OM e apontamentos do app). Na tela, os do app aparecem como **Planilha**.
- **Vigência**: vale o período de remuneração do consultor que cobre a data do atendimento. Se houve reajuste no meio do período, cada atendimento usa o valor da sua data.
- **CLT**: o trecho do atendimento depois das 18:00 é hora extra, paga em dobro.
- **PJ e COOP**: não têm hora extra; toda hora conta como normal.
- **Valor hora interno**: atendimentos de planilha usam o valor hora interno quando ele está cadastrado, conforme a regra do período de remuneração (todas as horas de planilha, ou só as de cliente "Interno").
- **Valor mínimo / fixo**: se a soma do período não passa do fixo, o consultor recebe o fixo, e a linha ganha a marca **mínimo**.
- **Meta**: total de horas dividido pela meta de horas da remuneração (154 quando não informada).

Exemplo fictício: um consultor PJ com valor hora de R$ 100,00 e 150:00 horas no período soma R$ 15.000,00. Se o fixo dele fosse R$ 16.000,00, valeria o fixo.

## 4. Totais e tabela por consultor

No alto ficam os totais: **Horas no período**, **Horas extras**, **Valor total**, **Meta da equipe** e **Ajustes** (quantidade e saldo de horas ajustadas).

A tabela tem uma linha por consultor e o total no rodapé:

| Coluna | Significado |
| --- | --- |
| **Modalidade** | CLT, PJ ou COOP. **sem período** = não há remuneração que alcance o período |
| **Valor hora** | Os valores hora aplicados nas horas normais ("int." marca o valor interno) |
| **Planilha**, **OS** | Horas de cada origem |
| **Ajustes** | Saldo de horas ajustadas manualmente |
| **Normais**, **Extras**, **Total h** | Horas consideradas |
| **Valor normais**, **Valor extras**, **Valor total** | Valores em reais |
| **Meta** | Percentual da meta de horas |

Toque na linha de um consultor para abrir o detalhe.

## 5. Detalhe do consultor e ajuste manual

O detalhe mostra o resumo do consultor e todos os atendimentos do período: data, origem, cliente, atividade, horário, horas normais e extras, valor hora e valor. Atendimentos de apoio comercial e internos vêm marcados (**Apoio comercial**, **Interna**).

Para ajustar as horas consideradas de um atendimento:

1. Na linha do atendimento, toque em **Ajustar**.
2. Informe **Horas normais consideradas** (por exemplo 2:30 ou 2,5) e, se houver, **Horas extras consideradas** (vazio = nenhuma).
3. Preencha **Observação (obrigatória)**: o motivo do ajuste, com pelo menos 3 letras e até 500 (por exemplo: glosa do cliente).
4. Toque em **Gravar ajuste**. Aparece "Ajuste gravado".

O que saber sobre o ajuste:

- Ele muda só as horas consideradas no fechamento. O apontamento não é alterado.
- A linha passa a mostrar "era" com as horas originais e a observação. O link vira **Ajuste**; por ele você altera ou toca em **Remover ajuste**.
- O consultor vê o ajuste e a observação no **Meu fechamento** dele.
- Quem ajustou e quando ficam no registro de acessos do cofre.
- As horas ajustadas também valem para o custo na aba Rentabilidade.

## 6. Pendências e falta de remuneração

Abaixo dos totais, o quadro **Pendências** lista o que impede um cálculo completo:

- "Fulano: N atendimento(s) sem período de remuneração vigente na data."
- "Fulano está com valor hora zerado."
- "N registro(s) do cofre não puderam ser decifrados e ficaram fora do cálculo."

Quando o consultor não tem remuneração cadastrada com vigência na data, a tela mostra as horas normalmente, mas não calcula valor: a modalidade aparece como **sem período**, a coluna **Valor hora** fica vazia, os valores ficam zerados e, no detalhe, cada atendimento traz **sem valor** no lugar do valor hora.

Para resolver, o Dono cadastra o período de remuneração em **Financeiro › Acessos e Remuneração**. O cálculo é refeito ao abrir a tela de novo.

## 7. Fechar, atualizar e reabrir

Fechar grava os números do período para consulta futura.

1. Confira os totais, as pendências e os ajustes.
2. Toque em **Fechar período** e confirme. Aparece "Período … fechado".

Depois de fechado:

- A situação vira **Fechado** e o consultor passa a ver **Valor fechado** no Meu fechamento (antes ele vê uma prévia).
- Se alguém alterar horas, ajustes ou remuneração depois, a tela mostra **Houve alterações depois do fechamento**, com a diferença total e, por consultor, as horas e o valor de antes e de agora.
- **Atualizar fechamento** grava de novo com os números atuais e zera a diferença.
- **Reabrir** muda a situação para **Reaberto**. O último fechamento gravado continua guardado para comparação, e o consultor volta a ver os números como prévia.

O que é gravado é sempre o cálculo do servidor naquele momento, nunca o que está na tela.

## 8. Exportar e períodos importados

**Excel** e **PDF** só ficam liberados depois de **Mostrar valores**. Os dois saem com os consultores que estão na lista (respeitam **Mostrar sem horas**) e a linha de total.

- **Excel**: horas em número decimal, valor hora, valor hora interno, fixo, meta, valores e a coluna "Pago pelo mínimo".
- **PDF**: a mesma tabela da tela, com o período, a situação e a data em que foi gerado.

Períodos antigos podem trazer a marca **histórico importado**: os atendimentos vieram do Produtividade SK. Nesses períodos o detalhe do consultor é só para consulta e não há **Ajustar**. A tela não tem botão de importação.

## 9. Se algo der errado

| Mensagem | O que fazer |
| --- | --- |
| **Sem acesso** | Falta o papel Dono ou Fechamento. Peça ao Dono do cofre |
| "Informe as horas como 2:30 ou 2,5." | Corrija o formato das horas do ajuste |
| "A observação é obrigatória para alterar as horas consideradas." | Escreva o motivo do ajuste |
| "este período não está fechado" | Só dá para reabrir um período fechado. Recarregue a tela |
| "O fechamento gravado deste período não pôde ser decifrado; feche de novo para regravar." | Toque em **Atualizar fechamento** |
| "há registro do cofre que não decifra; corrija antes de fechar o período" | Veja em **Acessos e Remuneração** o período marcado como ilegível e peça ao Dono para gravá-lo de novo |
| "o cofre ainda não foi aberto pelo dono" | O Dono precisa abrir **Acessos e Remuneração** uma vez |
| "Nenhum consultor com horas neste período." | Não há apontamentos no período; confira o período ou marque **Mostrar sem horas** |
| Excel e PDF apagados | Toque em **Mostrar valores** |
| "Sem conexão com o servidor. Confira a internet e tente de novo." | Problema de rede; tente novamente |
