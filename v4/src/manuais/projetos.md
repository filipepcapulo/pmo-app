# Manual de Projetos

Para GPs, Líderes Tech e quem acompanha projetos · app PMO v3 (web)

*Os exemplos deste manual são fictícios ("Cliente Exemplo", "Fulano").*

## 1. Onde fica e quem vê

No menu (☰):

- **Cadastros › Projetos**: a lista de projetos. Todos os perfis têm o item no menu.
- **Cadastros › Modelos de projeto**: só aparece para quem tem a permissão de criar projeto (por padrão, Admin e GP).

O que cada um enxerga:

- Admin, GP e Líder Tech veem todos os projetos.
- O Consultor vê os projetos em que tem tarefa.
- A Triagem vê os projetos que têm chamado.

O que cada um faz, pelo padrão dos perfis (o Admin pode mudar as permissões):

| Ação | Quem pode |
| --- | --- |
| **+ Novo projeto**, **Editar** o projeto, **+ Pedido** de horas, modelos | Admin e GP |
| **+ Demanda** e **+ Plano de ação** | Admin, GP, Líder Tech e Triagem |
| Mexer no cronograma e nas dependências | Admin, GP e Líder Tech |
| Anexar e comentar | Todos os perfis |
| **Aceite de OS** | Admin e GP |

## 2. A lista de projetos

Cada linha mostra **Cliente**, **Projeto**, **Fase**, **Situação**, **GP**, **Contratadas** e **Saldo** (em vermelho quando negativo). Toque na linha para abrir a ficha do projeto.

Filtros no topo:

- Busca por cliente, projeto ou fase.
- **Fase**, **GP** e **Cliente**: aceitam vários de uma vez.
- **Situação**: começa em **Ativos e suspensos**; troque para Ativo, Suspenso, Encerrado, Cancelado ou **Todos**.
- **Filtros salvos…**: escolha um filtro guardado. **Salvar filtro** guarda o filtro atual com um nome; marque **Abrir a tela com este filtro** para ele virar o padrão.

## 3. Criar um projeto

1. Toque em **+ Novo projeto**.
2. Escolha o **Cliente** (só os ativos aparecem) e informe o **Nome do projeto**.
3. Escolha a **Fase**: P1, P2, P3, P4, P5, Avulso, Sustentação ou Horas Cruzadas. É obrigatória.
4. Se quiser, informe **GP**, **Início previsto** e **Fim previsto**.
5. **Modelo de projeto** é opcional: cria as demandas padrão do modelo e sugere a fase dele.
6. Quem pode gravar pedido de horas vê o quadro **1º pedido de horas (opcional)**: **Nº do pedido**, **Tipo** (Empreito, Medição ou Banco de horas), **Horas**, **Vigência até** e **Observação**.
7. Toque em **Criar projeto**. A ficha abre em seguida.

O app avisa "Projeto criado" e que a lista no ClickUp é criada em instantes.

## 4. A ficha do projeto

No topo ficam o cliente, o nome do projeto, a fase e a **barra de horas**: horas reais numa cor, horas só planejadas em outra, sobre o total previsto. Passou do previsto, aparece "acima do previsto".

Botões do topo:

- **☆ Favoritar**: põe o projeto nos favoritos do menu lateral. Toque em **★ Favorito** para tirar.
- **Aceite de OS**: abre o Aceite de OS já com a FAP do projeto. Só aparece para quem tem a permissão e quando o nome do projeto traz o número da FAP.
- **Editar**: muda **Nome**, **Fase**, **Situação**, **GP**, **Início previsto** e **Fim previsto**. Situação Encerrado ou Cancelado equivale ao "Z" na lista do ClickUp.

As abas: **Indicadores**, **Horas**, **Cronograma**, **5W2H**, **Demandas**, **Equipe**, **Anexos**, **Comentários** e **Histórico**. O app lembra a última aba que você usou. A aba **Rentabilidade** só aparece para quem tem o papel no cofre financeiro e tem manual próprio.

## 5. Aba Indicadores

- Os quadros: **Contratadas**, **Liberadas**, **Previstas (entregáveis)**, **Realizadas**, **Planejadas**, **Saldo**, **% concluído**, **Demandas atrasadas** e **Go Live** (com os dias que faltam ou que já passaram).
- **Riscos (planos de ação abertos)**: cada plano de ação aberto com o nível. **Crítico** = prazo vencido ou prioridade Urgente. **Alto** = prioridade Alta com prazo em até 7 dias. Os demais são **Moderado**.
- **Próximos marcos**: as cinco próximas entregas abertas com data de hoje em diante.
- **Dados**: situação, GP, datas previstas e quantidade de demandas e subdemandas.
- **Pedidos de agenda**: os pedidos de "Preciso de mais agenda" dos consultores, com **Recusar** e **Atendido** (veja o Manual do GP).

## 6. Aba Horas

### Pedidos de horas

A tabela mostra **Nº do pedido**, **Tipo**, **Horas**, **Data**, **Vigência até**, **Observação** e **Origem** (Manual ou Sankhya OM).

1. Toque em **+ Pedido**.
2. Informe **Nº do pedido** e **Horas contratadas** (obrigatórios), **Tipo**, **Data**, **Vigência até** e **Observação**.
3. Toque em **Gravar**.

Para alterar, toque na linha do pedido. **Excluir** pede confirmação. Pedido vindo do Sankhya OM é só leitura.

Quando houve liberação de horas, aparece a lista **Liberações acima do contratado**, com data, horas, justificativa e quem liberou.

### Saldo dos pedidos (Experience)

Mostra a linha da FAP do projeto: pedido, tipo de operação, negociado, consumido, saldo, horas das tarefas e **Sobra** (saldo do pedido menos as horas das tarefas do período que não terminaram). Toque na linha para ver as tarefas que entraram na conta. Quem pode verificar tem o botão **Verificar a semana**. A checagem automática roda de segunda a sexta às 08h.

### Consumo

- **Consumo por demanda**: previstas, reais, planejadas, saldo e %.
- **Por consultor**: horas reais, planejadas e quantidade de tarefas de cada pessoa.
- **Por mês**: barras com horas reais e planejadas.

## 7. Aba Cronograma

O Gantt mostra as demandas e subdemandas no tempo.

- Escala: **Dias**, **Semanas** ou **Meses**.
- Marque **Canceladas** para mostrar também as demandas canceladas.
- **PNG** e **PDF** baixam o cronograma que está na tela.
- Quem pode editar demanda arrasta a barra para mudar as datas (a demanda leva as subdemandas junto) e puxa as pontas para mudar só o início ou o fim. No teclado: setas ← → (com Shift muda só o fim). O app avisa "Datas gravadas".

### Dependências

1. Toque em **+ Dependência**.
2. Escolha **Antes (origem)** e **Depois (destino)**.
3. Escolha o **Tipo**: Término → início, Início → início, Término → término ou Início → término.
4. Se quiser, informe a **Folga (dias)** e toque em **Gravar**.

A dependência que as datas não respeitam fica marcada como **Descumprida**. **Excluir** tira a dependência.

## 8. Aba 5W2H (planos de ação)

Cada plano de ação vira uma demanda do projeto.

1. Toque em **+ Plano de ação** (só em projeto Ativo).
2. Preencha **O quê (What)** — obrigatório, vira o nome da demanda —, **Por quê (Why)**, **Onde (Where)**, **Quando (When)** — o prazo —, **Quem (Who)**, **Quanto (How much)**, **Prioridade** e **Como (How)**.
3. Toque em **Gravar**.

Toque numa linha para alterar o plano; aí aparece também o **Status**. **Abrir a demanda** leva para a ficha da demanda do plano. A coluna **Risco** usa a mesma regra da aba Indicadores.

## 9. Abas Demandas e Equipe

- **Demandas**: a árvore demanda → subdemanda, com a barra de horas de cada uma. **Ver N tarefas** abre as tarefas da linha. Filtros: busca, **Status**, **Responsável** (com o nível), **Etapa**, **Tipo**, **Prioridade** e **Só atrasadas**. **+ Demanda** cria uma demanda no projeto (só em projeto Ativo). **CSV** baixa demandas, subdemandas e tarefas.
- **Equipe**: quem atua no projeto e como (**GP**, **Responsável**, **Tarefas**), as demandas, as horas reais e planejadas e a data da próxima tarefa.

Os detalhes de demanda e tarefa estão no Manual de Demandas.

## 10. Aba Anexos

1. Toque em **+ Anexar** e escolha um ou mais arquivos.
2. Cada arquivo pode ter até 20 MB. O app avisa "nome do arquivo anexado".

- Para abrir ou baixar, toque no nome do anexo (📎). O arquivo abre em outra aba; o link vale por 2 minutos, então toque de novo se expirar.
- Para remover, toque no **×** ao lado do anexo e confirme. Só quem anexou, ou Admin, GP e Líder Tech, remove.
- Anexa quem tem a permissão de anexo: por padrão, todos os perfis, desde que enxerguem o projeto.

## 11. Abas Comentários e Histórico

- **Comentários**: a conversa do projeto. Digite **@** para mencionar alguém da equipe; a pessoa recebe um aviso. Só o autor edita ou exclui o próprio comentário.
- **Histórico**: quem criou, alterou ou excluiu o projeto, as demandas e as tarefas, com o valor de antes e o de depois. Mudança sem usuário aparece como "ClickUp / sistema". **Carregar mais** traz os registros mais antigos.

## 12. Modelos de projeto

Em **Cadastros › Modelos de projeto**. Um modelo guarda as demandas padrão que um projeto novo recebe.

1. Toque em **+ Novo modelo** (ou **Editar** num modelo existente).
2. Informe o **Nome**, a **Fase sugerida** e a **Descrição**.
3. Em **Demandas padrão**, toque em **+ Demanda** e preencha nome, etapa e horas de cada linha. Use ↑ e ↓ para ordenar e × para remover.
4. Deixe **Ativo (aparece ao criar projeto)** marcado e toque em **Gravar**.

Para aposentar um modelo, desmarque **Ativo**. **Mostrar inativos** traz de volta os modelos desativados.

## 13. Se algo der errado

| Mensagem | O que fazer |
| --- | --- |
| "Escolha o cliente." / "Informe o nome do projeto." / "A fase é obrigatória." | Preencha o campo indicado no Novo projeto |
| "O fim previsto não pode ser antes do início." | Corrija as datas |
| "Para lançar o pedido informe o número e as horas (> 0)." | Complete o 1º pedido ou deixe os dois campos vazios |
| "Informe o número do pedido e as horas (> 0)." | Preencha o pedido de horas |
| "A vigência não pode terminar antes da data do pedido." | Corrija a **Vigência até** |
| "Escolha as duas demandas." / "A demanda não pode depender dela mesma." | Corrija a dependência |
| "Informe o quê (vira o nome da demanda)." | Preencha **O quê (What)** no plano de ação |
| "Arquivo acima de 20 MB." | Reduza o arquivo ou divida em partes |
| "Não foi possível abrir o anexo." | Tente de novo; se continuar, avise o Admin |
| "Informe o nome do modelo." / "Horas inválidas." | Corrija o modelo |

Não achou o botão? Ele só aparece para quem tem a permissão. Fale com o Admin.
