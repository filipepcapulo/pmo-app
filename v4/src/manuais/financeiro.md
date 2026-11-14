# Manual de Acessos e Remuneração

Para as pessoas autorizadas no cofre financeiro · app PMO v3 (web)

*Nomes e valores citados neste manual são exemplos fictícios.*

## 1. Onde fica e quem vê

No menu (☰): **Financeiro › Acessos e Remuneração**.

A área **Financeiro** só aparece no menu para quem foi nomeado no cofre financeiro, pessoa por pessoa. Ser Admin ou GP **não** dá acesso: só entra quem está na lista de autorizados.

Quem abre o endereço sem estar na lista vê **Sem acesso**: "Você não está entre as pessoas autorizadas a ver o Financeiro. O acesso é concedido pelo dono do cofre, pessoa por pessoa."

## 2. Os três papéis

Cada autorizado recebe um ou mais papéis:

| Papel | O que pode |
| --- | --- |
| **Dono** | Vê e edita tudo e decide quem entra: concede e revoga acessos, cadastra a remuneração, faz o fechamento e vê a rentabilidade |
| **Fechamento** | Vê a remuneração (só consulta) e trabalha em **Financeiro › Fechamento de produtividade**: ajusta horas, fecha e reabre o período |
| **Rentabilidade** | Vê receita, custo e margem na aba **Rentabilidade** das fichas de Cliente, Projeto e Demanda e informa o valor/hora dos pedidos de horas |

O que cada papel encontra nesta tela:

- **Dono**: as abas **Remuneração** e **Acessos**.
- **Fechamento**: só a aba **Remuneração**, sem os botões de edição.
- **Rentabilidade** (sozinho): nenhuma aba, apenas uma mensagem sobre o papel. O trabalho desse papel é feito nas fichas de Cliente, Projeto e Demanda.

O papel Fechamento sozinho não vê valor de pedido nem margem. O papel Rentabilidade sozinho não vê a remuneração de ninguém.

## 3. Como o cofre protege os valores

- Os valores ficam cifrados no banco. Só aparecem em claro nas telas do Financeiro, para quem tem o papel certo.
- Na tela, os valores começam **ocultos** ("R$ •••"). Toque em **Mostrar valores** quando estiver em um lugar reservado e em **Ocultar valores** ao terminar.
- Cada consulta e cada mudança fica registrada, com quem fez e quando, sem valores (seção 8).

## 4. Aba Remuneração: a lista

A lista tem uma linha por consultor, com a remuneração que vale **hoje**:

| Coluna | Significado |
| --- | --- |
| **Modalidade** | CLT, PJ ou COOP |
| **Valor hora** | Valor pago por hora |
| **V. hora interno** | Valor hora para atendimentos de planilha, quando existe |
| **Fixo (mín.)** | Valor mínimo / fixo do período |
| **Meta (h)** | Meta de horas no período |
| **Desde** | Início do período de remuneração vigente |
| **Períodos** | Quantos períodos de remuneração a pessoa tem cadastrados |

Na coluna **Modalidade** também podem aparecer:

- **sem cadastro**: a pessoa não tem nenhum período de remuneração.
- **sem período vigente**: tem períodos, mas nenhum vale hoje.
- **ilegível**: o registro não pôde ser decifrado (veja a seção 9).

Use **Buscar consultor** para filtrar pelo nome e marque **Mostrar inativos** para incluir quem saiu. Toque na linha para abrir os períodos da pessoa.

Sem remuneração cadastrada com vigência na data do atendimento, o Fechamento de produtividade, o Meu fechamento e a Rentabilidade mostram as horas, mas não calculam valor nem custo daquele consultor.

## 5. Cadastrar um período de remuneração (Dono)

A remuneração é guardada por **períodos com vigência** (início e fim). O cálculo usa sempre o período que vale na **data de cada atendimento**; por isso um reajuste não muda o que já passou.

1. Na aba **Remuneração**, toque na linha do consultor. Abre **Remuneração de Fulano**, com os períodos do mais novo para o mais antigo.
2. Toque em **+ Novo período**.
3. Preencha os campos (tabela abaixo).
4. Toque em **Gravar período**. Aparece "Período gravado".

| Campo | Como preencher |
| --- | --- |
| **Início** | Obrigatório. Primeiro dia em que a remuneração vale |
| **Fim** | Deixe vazio para o período ficar vigente |
| **Modalidade** | CLT, PJ ou COOP |
| **Valor hora (R$)** | Obrigatório. Use 0 se for só fixo. Exemplo fictício: 85,50 |
| **Valor hora interno (R$)** | Opcional. Vale para atendimentos de planilha |
| **Regra do valor hora interno** | **Todas as horas de planilha** ou **Só planilha com cliente "Interno"** |
| **Valor mínimo / fixo (R$)** | Se a soma do período não passar deste valor, paga-se o fixo |
| **Meta de horas no período** | Vazio vale 154 |
| **Observação** | Até 300 letras (por exemplo: reajuste anual) |

Quando a pessoa já tem um período vigente, o formulário novo vem com os dados dele e avisa: "O período vigente (desde dd/mm/aaaa) será encerrado no dia anterior ao início deste." O novo período precisa começar depois do início do vigente.

Como a modalidade entra na conta: só **CLT** tem hora extra, paga em dobro. Em **PJ** e **COOP** a hora extra conta como hora normal.

## 6. Editar ou excluir um período (Dono)

1. Na lista de períodos da pessoa, toque em **Editar** na linha.
2. Altere os campos e toque em **Gravar período**.
3. Para apagar, toque em **Excluir** e confirme. Os valores daquele período são apagados do cofre.

Dois períodos da mesma pessoa não podem se sobrepor. Se as datas baterem, o app recusa e mostra com qual período houve conflito.

Quem tem só o papel Fechamento abre a mesma lista, mas não vê **+ Novo período** nem **Editar**.

## 7. Aba Acessos: conceder e revogar (Dono)

Em **Quem tem acesso** aparece cada autorizado com o papel, desde quando e quem concedeu.

Para conceder:

1. Em **Conceder acesso**, escolha a **Pessoa**.
2. Escolha o **Papel** (o texto abaixo do campo explica o que o papel permite).
3. Toque em **Conceder**. Aparece "Acesso concedido".

Para dar dois papéis à mesma pessoa, conceda um de cada vez.

Para revogar, toque em **Revogar** na linha e confirme. Aparece "Acesso revogado". O cofre precisa de ao menos um Dono: para revogar o último, conceda antes o papel a outra pessoa.

## 8. Registro de acessos (Dono)

Ao lado dos autorizados, o quadro **Registro de acessos** lista os 200 registros mais recentes, com **Quando**, **Quem** e **O quê**. Exemplos de texto:

- "Viu a remuneração de todos" ou "Viu a remuneração de Fulano".
- "Criou período de Fulano", "Editou período de Fulano", "Excluiu período de Fulano".
- "Concedeu acesso a Fulano (Fechamento)", "Revogou acesso de Fulano (Fechamento)".
- "Viu o fechamento 11/2026", "Fechou o período 11/2026", "Reabriu o período 11/2026".
- "Ajustou horas de Fulano", "Removeu ajuste de horas de Fulano".
- "Viu a rentabilidade de um projeto", "Gravou o valor/hora de um pedido".
- "Viu o próprio fechamento" (quando alguém abre o Meu fechamento).

O registro nunca traz valores e não pode ser alterado nem apagado.

## 9. Se algo der errado

| Mensagem | O que fazer |
| --- | --- |
| **Sem acesso** | Você não está entre os autorizados. Peça ao Dono do cofre |
| "Informe a data de início." | Preencha **Início** |
| "O fim não pode ser antes do início." | Corrija as datas |
| "Informe o valor hora (use 0 se for só fixo)." | Preencha **Valor hora (R$)** |
| "Valor hora: use um número (ex.: 85,50)." | Use só número, com vírgula nos centavos. O mesmo vale para os outros campos de valor |
| "O novo período precisa começar depois de dd/mm/aaaa." | O início tem de ser posterior ao início do período vigente |
| "conflita com o período de … a …. Ajuste o fim dele antes." | Edite o período citado e ajuste o **Fim** |
| "a vigência foi alterada por outra pessoa; recarregue" | Feche a janela, abra de novo e refaça a alteração |
| "Escolha a pessoa." | Selecione a **Pessoa** antes de **Conceder** |
| "esta pessoa já tem esse papel" | Nada a fazer: o acesso já existe |
| "o cofre precisa de ao menos um dono; conceda o papel a outra pessoa antes" | Nomeie outro Dono e depois revogue |
| "Não foi possível decifrar este período (foi alterado fora do app). Grave-o de novo." | O Dono abre **Editar**, preenche os valores e grava |
| "o cofre ainda não foi aberto pelo dono" | O Dono precisa abrir a aba **Remuneração** uma vez |
| "a FIN_CHAVE configurada não é a chave deste cofre" | Erro de configuração do sistema: avise o administrador do app |
| "Sem conexão com o servidor. Confira a internet e tente de novo." | Problema de rede; tente novamente |
