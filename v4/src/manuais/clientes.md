# Manual de Clientes

Para quem consulta e mantém o cadastro de clientes · app PMO v3 (web)

## 1. Onde fica e quem vê

No menu: **☰ › Cadastros › Clientes**.

- Todos os usuários veem a lista e a ficha dos clientes.
- **+ Novo cliente** aparece para quem tem a permissão `cliente.criar`.
- **Editar**, **Inativar**, **Reativar** e o cadastro das pessoas do cliente aparecem para quem tem a permissão `cliente.editar`.
- Por padrão, as duas permissões são do Admin e do GP.

## 2. A lista de clientes

Cada linha é um cliente, com as colunas:

| Coluna | O que mostra |
| --- | --- |
| **Cliente** | O nome. Cliente inativo leva a etiqueta **Inativo**. |
| **GP** | O GP responsável. |
| **Fases** | As fases dos projetos abertos do cliente (P1 a P5, Avulso, Sustentação, Horas Cruzadas). |
| **Projetos abertos** | Quantos projetos abertos o cliente tem. |
| **Pessoas** | Quantas pessoas do cliente estão cadastradas. |
| **Horas contratadas** | O total de horas contratadas. |

- Toque na linha para abrir a ficha do cliente em uma aba.
- No computador, passar o mouse sobre o nome mostra um resumo do cliente.

## 3. Filtros da lista

Acima da tabela:

- **Buscar cliente**: filtra pelo nome.
- **Fase**: uma ou mais fases. Mostra os clientes com projeto aberto naquela fase.
- **GP**: um ou mais GPs. A opção *(sem GP)* acha os clientes sem responsável.
- **Situação**: **Ativos** (padrão), **Inativos** ou **Ativos e inativos**.

À direita, o contador mostra quantos clientes passaram no filtro (por exemplo, *8 de 40 clientes*). **Limpar filtros** volta ao padrão.

Para guardar uma combinação de filtros:

1. Monte o filtro e toque em **Salvar filtro**.
1. Dê um nome. Marque **Abrir a tela com este filtro** se quiser que ele seja o seu padrão.
1. Toque em **Salvar**.

Depois, escolha o filtro em **Filtros salvos…**. O padrão aparece com ★. Com um filtro escolhido, **Excluir** apaga esse filtro salvo. Salvar com o mesmo nome substitui o anterior.

## 4. Recursos da tabela

Valem para todas as tabelas desta tela e da ficha:

- Toque no título de uma coluna para ordenar.
- O funil ao lado do título filtra pela coluna.
- **Colunas** mostra, oculta e reordena as colunas. **Restaurar padrão** desfaz.
- **Excel** e **CSV** baixam as linhas filtradas.
- No rodapé, escolha quantas linhas por página e mude de página com **‹** e **›**.

O arranjo das colunas fica guardado neste navegador.

## 5. Criar um cliente

1. Toque em **+ Novo cliente**.
1. Preencha o **Nome** (obrigatório).
1. Escolha o **GP responsável**, ou deixe *— sem GP —*.
1. Toque em **Criar**.

O app abre a ficha do cliente novo. A pasta do cliente no ClickUp é criada sozinha, em instantes.

## 6. A ficha do cliente

No alto ficam o nome do cliente e os botões **☆ Favoritar**, **Editar** e **Inativar** (ou **Reativar**). A ficha tem três blocos.

### Dados

- **GP responsável**
- **Parceiro (ClickUp)**: só leitura.
- **Situação**: Ativo ou Inativo.

### Pessoas do cliente

Os contatos do cliente, com **Nome**, **Papel**, **E-mail** e **Telefone/WhatsApp**. Toque no e-mail para escrever para a pessoa.

### Projetos

Os projetos do cliente, com **Projeto**, **Fase**, **Situação**, **GP**, **Contratadas** e **Saldo** (em horas). Toque na linha para abrir o projeto em outra aba.

- Filtros: **Buscar projeto**, **Fase**, **GP** e **Situação** (*Todas as situações*, *Ativos e suspensos*, Ativo, Suspenso, Encerrado, Cancelado).
- **+ Projeto** cria um projeto já ligado a este cliente. Aparece para quem tem a permissão `projeto.criar`, e só em cliente ativo.

## 7. Editar o cliente

1. Na ficha, toque em **Editar**.
1. Mude o **Nome** ou o **GP responsável**.
1. Toque em **Gravar**.

O nome da aba acompanha o nome novo.

## 8. Inativar e reativar

Use **Inativar** quando o cliente deixa de ser atendido.

1. Na ficha, toque em **Inativar** e confirme.
1. O cliente some das listas de seleção e dos backlogs. O histórico fica guardado.

- Na lista, o cliente inativo só aparece com a **Situação** em **Inativos** ou **Ativos e inativos**.
- Para voltar, abra a ficha e toque em **Reativar**.
- Não existe exclusão de cliente: o caminho é inativar.

## 9. Pessoas do cliente

Para incluir um contato:

1. Na ficha, em **Pessoas do cliente**, toque em **+ Pessoa**.
1. Preencha o **Nome** (obrigatório) e escolha o **Papel**: Patrocinador, Líder do projeto, Usuário-chave ou Usuário final.
1. Se quiser, preencha **E-mail** e **Telefone/WhatsApp**.
1. Toque em **Gravar**.

Para alterar, toque na linha da pessoa, mude os campos e toque em **Gravar**. Para tirar, abra a pessoa, toque em **Remover** e confirme.

## 10. Aba Rentabilidade

Quem tem o papel **Dono** ou **Rentabilidade** no cofre financeiro vê duas abas no alto da ficha: **Dados** e **Rentabilidade**. Para os demais, a ficha aparece sem abas, só com os dados.

A Rentabilidade tem manual próprio.

## 11. Dúvidas comuns

- **Não vejo o botão + Novo cliente ou Editar.** Falta a permissão `cliente.criar` ou `cliente.editar`. Peça ao administrador.
- **O cliente sumiu da lista.** Ele pode estar inativo. Troque a **Situação** para **Ativos e inativos**. Confira também se há um filtro salvo aplicado.
- **Não aparece o botão + Projeto.** O cliente está inativo ou falta a permissão `projeto.criar`.
- **A coluna Fases está vazia.** O cliente não tem projeto aberto.

| Mensagem | O que fazer |
| --- | --- |
| *Informe o nome do cliente.* | O nome é obrigatório. |
| *Informe o nome.* | O nome da pessoa é obrigatório. |
| *E-mail inválido.* | Corrija o e-mail da pessoa ou deixe em branco. |
| *Nenhum cliente com esses filtros.* | Toque em **Limpar filtros**. |
