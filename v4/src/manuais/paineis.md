# Painéis (relatórios dinâmicos)

Para Admin, GP e Líder Tech · app PMO V4 (web)

## 1. Onde fica e quem vê

**Relatórios › Painéis**. Aqui você monta os seus próprios relatórios, escolhendo os campos, parecido com os dashboards do ClickUp.

- Os dados vêm sempre do banco do app, com os nomes do app: a etapa é a do cadastro de etapas e o chamado aparece com o lugar dele no fluxo.
- **Cada pessoa vê só o que já pode ver no app.** Um painel compartilhado mostra, para cada pessoa, apenas as tarefas, demandas, chamados e horas que ela enxerga nas outras telas.
- Nenhum painel traz valores financeiros.

| O que | Quem pode |
|---|---|
| Abrir os painéis | Admin, GP e Líder Tech (permissão *Abrir os painéis e relatórios dinâmicos*) |
| Criar, gravar, compartilhar e excluir | Admin e GP |
| Alterar um painel gravado | Quem criou (ou um Admin) |

Quem abre um painel de outra pessoa pode mexer na configuração para olhar de outro jeito, mas a mudança vale só enquanto a tela estiver aberta.

## 2. Criar um painel

Toque em **+ Novo painel**, dê um nome e escolha o formato:

| Formato | Para quê |
|---|---|
| **Tabela** | Escolher as colunas e agrupar por um ou mais campos, abrindo os níveis |
| **Linha do tempo** | Uma linha por item (consultor, cliente…) e as datas agrupadas nas colunas |
| **Painel de gráficos** | Vários gráficos de barras e de linhas na mesma tela |

Depois escolha os **Dados**:

| Dados | O que traz |
|---|---|
| **Tarefas (agenda)** | Uma linha por tarefa de agenda no período |
| **Demandas e subdemandas** | As abertas e as encerradas no período |
| **Chamados** | Os abertos e os abertos ou resolvidos no período |
| **Horas apontadas** | Uma linha por apontamento no período (as suas; todas, para quem vê a produtividade de todos) |

O **período** é contado a partir de hoje: *Dias para trás* e *Dias para frente* (até 400 dias no total). Assim o painel anda sozinho com o calendário.

## 3. Tabela

- **Colunas**: adicione os campos e use as setas para mudar a ordem. As colunas de número vão para o fim e ganham total.
- **Agrupar por (descida de nível)**: até 4 campos, na ordem em que os níveis abrem. Cada grupo mostra a quantidade e a soma das colunas de número; toque no grupo para abrir. **Abrir tudo** e **Fechar tudo** ficam no alto da tabela.
- A primeira coluna de cada linha leva à ficha (tarefa, demanda ou chamado).
- **CSV** baixa as linhas filtradas.

## 4. Linha do tempo

Escolha **Uma linha por** (ex.: consultor), a **Data usada**, como **agrupar as datas** (dia, semana, mês, trimestre ou ano) e o **Valor da célula** (quantidade ou a soma de um campo de horas). Quanto maior o valor, mais forte a cor da célula. A tabela traz o total por linha e por coluna.

## 5. Painel de gráficos

Cada gráfico tem a sua configuração:

- **Tipo**: barras ou linhas.
- **Eixo X**: um campo de texto (cliente, etapa, lugar…) ou uma data, que você agrupa por dia, semana, mês, trimestre ou ano.
- **Eixo Y**: quantidade ou a soma de um campo de horas.
- **Uma série por**: divide o gráfico por um campo (ex.: status). São até 8 cores; o que passar disso soma em **Outros**.
- **Filtros** próprios de cada gráfico.

Passe o mouse (ou toque) para ver os valores. **Ver tabela** mostra os mesmos números em tabela. **+ Gráfico** acrescenta outro (até 8).

## 6. Filtros

Em **+ Filtrar por…**, escolha o campo e marque os valores. Sem nada marcado, o filtro não corta nada. O **×** tira o filtro.

## 7. Gravar e compartilhar

- **Gravar** guarda o painel na sua lista.
- **Compartilhar com o escritório** faz o painel aparecer para os outros. Os dados continuam seguindo a permissão de quem abre.
- **Excluir** apaga o painel.

## 8. Se algo der errado

- **"Há mais linhas do que o limite"**: reduza o período.
- **Um campo sumiu do painel**: o campo saiu do catálogo; abra a configuração e escolha outro.
- **Não vejo o item Painéis no menu**: peça a permissão ao Admin em Cadastros › Equipe.
