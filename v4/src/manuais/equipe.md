# Manual de Equipe e Organograma Sankhya

Para quem consulta e administra a equipe · app PMO v3 (web)

## 1. Onde fica e quem vê

No menu: **☰ › Cadastros › Equipe** e **☰ › Cadastros › Organograma Sankhya**. Todos os usuários abrem as duas telas. O que cada um pode fazer depende da permissão:

| Para fazer | Precisa de | Padrão |
| --- | --- | --- |
| Cadastrar e editar pessoas, papéis e skills | `equipe.editar` | Admin e GP |
| Mudar o perfil e as permissões; ver **Acessos por funcionalidade**, **App 2.x/APK** e a aba **App/APK** | `permissao.editar` | Admin |
| Editar o catálogo de skills | `skill.catalogo` | Admin |
| Ver a aba **Conta Sankhya** de outra pessoa | `integracao.gerenciar` | Admin |
| Editar o Organograma Sankhya | `organograma.editar` | Admin e GP |

A tela Equipe tem visões no alto: **Pessoas**, **Acessos por funcionalidade**, **App 2.x/APK** e **Catálogo de skills**.

## 2. Visão Pessoas

A lista mostra **Nome**, **E-mail (login)**, **E-mail do ClickUp**, **Papéis**, **Perfil** e **Skills** (por exemplo, *2 cert. / 5*: 2 certificadas de 5).

- **Buscar nome ou e-mail** filtra a lista.
- **Todos os papéis** filtra por papel: Consultor, Desenvolvedor, GP, GS ou Outros.
- **Mostrar inativos** inclui quem foi inativado (etiqueta **Inativo**).
- Toque na linha para abrir a ficha da pessoa.

Papel e perfil são coisas diferentes. O **papel** diz o que a pessoa faz. O **perfil** (Admin, GP, Líder Tech, Consultor, Triagem) diz o que ela acessa.

## 3. Cadastrar um usuário

1. Toque em **+ Novo usuário**.
1. Preencha o **E-mail (login)** e o **Nome** (obrigatórios).
1. Se quiser, preencha o **E-mail do ClickUp** (liga a pessoa ao membro do ClickUp; pode ser diferente do login), as **Iniciais** (até 4 letras) e a **Cor**.
1. Escolha o **Perfil de acesso** e marque os **Papéis**.
1. Deixe **Ativo neste escritório** marcado e toque em **Cadastrar**.

A pessoa já pode entrar no app com o código por e-mail. A ficha abre em seguida para você completar acessos e skills.

## 4. Ficha: aba Info

Mostra os dados do cadastro. Abaixo do e-mail, o app informa se a pessoa *Já entrou no v3* ou *Ainda não entrou no v3*.

- Mude os campos e toque em **Gravar**.
- O **Perfil de acesso** só é mudado por quem edita permissões.
- **Trocar e-mail de login** (só o Admin): informe o **Novo e-mail de login** e toque em **Trocar**. A pessoa passa a entrar com o e-mail novo no v3, no app 2.x e no APK, e os aparelhos do app 2.x/APK pedem login de novo.
- **Inativar**: a pessoa some da Agenda da equipe, da Minha agenda, do Kanban, da Ociosidade e das listas de responsável. O histórico fica. **Reativar** desfaz.
- **Excluir**: só aparece para quem não tem histórico. Apaga o cadastro, os acessos e as skills, sem volta. Quem tem histórico só pode ser inativado.

Você não inativa nem exclui o seu próprio usuário.

## 5. Ficha: aba Acessos

Lista todas as funcionalidades do app, agrupadas por módulo, com uma caixa de marcação em cada uma. Você vê os seus próprios acessos; os de outra pessoa, só com a permissão `permissao.editar`.

- A marcação vem do perfil: ao lado aparece *pelo perfil*.
- Marcar ou desmarcar diferente do perfil cria uma exceção só para aquela pessoa: *exceção: liberado* ou *exceção: bloqueado*.
- Voltar a caixa ao que o perfil manda apaga a exceção.
- A mudança grava na hora, sem botão.
- O Admin acessa tudo: na ficha de um Admin as caixas ficam travadas.

## 6. Ficha: aba Skills

As skills são os módulos que a pessoa conhece. No alto, as etiquetas resumem: a certificada leva **✓**.

- Para incluir: escolha em *— adicionar módulo —*, marque **Certificado** se for o caso e toque em **Adicionar**.
- Para marcar ou tirar a certificação: use a caixa **Certificado** na linha da skill.
- Para tirar a skill: toque em **Remover**.

Só quem tem `equipe.editar` altera; os demais só consultam.

## 7. Ficha: aba App/APK

Aparece para quem tem `permissao.editar`. Controla o acesso da pessoa ao **app 2.x** e ao **APK**.

- **Permissão completa** marca tudo de uma vez.
- **Ativo (pode entrar no app 2.x/APK)** liga ou desliga a entrada.
- **Módulos que pode ver**: Agenda dos Consultores, Ociosidade, Demandas, Backlog Base, Backlog Desenvolvimento, Portfólio de Projetos e Controle de Férias.
- **Ações**: **Agendar**, **Editar agendas** e **Administrador**.
- **Receber notificação de Ociosidade**: 1 vez por dia útil. Exige o módulo Ociosidade marcado.

Toque em **Liberar acesso** (primeira vez) ou **Gravar**. **Desconectar aparelhos** derruba o login dos aparelhos em até 1 minuto. **Remover acesso** tira a pessoa do app 2.x/APK.

## 8. Ficha: aba Conta Sankhya

Aparece na sua própria ficha e, para quem tem `integracao.gerenciar`, na ficha dos outros. Guarda o usuário e a senha da conta Sankhya, os mesmos do Experience, do Sankhya OM e do Zendesk, que as rotinas do app usam em nome da pessoa.

1. Preencha **Usuário Sankhya** e **Senha**.
1. Toque em **Testar e gravar**.

- A senha é testada na Sankhya antes de gravar. Se for recusada, nada é gravado.
- A senha fica cifrada e não aparece mais na tela. Para trocar, digite a **Senha nova**.
- **Testar senha gravada** confere se a senha guardada ainda vale.
- **Apagar conta** remove o usuário e a senha guardados.
- A linha de situação mostra quando o login foi aceito ou recusado pela última vez.

## 9. Visão Acessos por funcionalidade

É o caminho inverso da aba Acessos: você escolhe a **Funcionalidade** e vê quem tem.

- Em **Perfis**, marque os perfis que recebem a funcionalidade. Vale para todos daquele perfil.
- Em **Pessoas**, marque ou desmarque uma pessoa para criar uma exceção. A linha mostra o perfil e a exceção.
- O perfil Admin e as pessoas com perfil Admin ficam sempre marcados e travados.

## 10. Visão App 2.x/APK

Lista quem entra no app 2.x e no APK, com **Acesso**, **Aparelhos** e **Último uso**. Toque na pessoa para abrir a ficha direto na aba **App/APK**. Quem existe só no app antigo leva a etiqueta **Só no app 2.x/APK**.

## 11. Visão Catálogo de skills

Lista os módulos que podem virar skill, com o número de **Pessoas** e de **Certificados** em cada um.

- **+ Módulo** cria um módulo: informe o **Nome do módulo** e toque em **Gravar**.
- Toque na linha para renomear, **Inativar** ou **Reativar**.
- Módulo marcado com *ClickUp* veio do campo Módulo do ClickUp: renomear aqui não muda o ClickUp.
- **Mostrar inativos** inclui os módulos inativados.

## 12. Organograma Sankhya

Mostra quem procurar na Sankhya: grupos, e dentro de cada grupo as áreas, com as pessoas e as demandas de cada área.

- **Buscar pessoa, área, grupo ou demanda** filtra os cartões. A demanda encontrada fica em destaque.
- Em uma pessoa, *ou Beltrano* indica quem procurar como alternativa.
- No rodapé, **Última alteração** mostra quando e por quem.

Para editar (permissão `organograma.editar`):

1. Toque em **Editar**.
1. Use **+ Grupo** e **+ Área**. Em cada área, preencha o nome, as pessoas, as demandas e a observação.
1. Separe pessoas e demandas com ponto e vírgula. Pessoa com alternativa: *Fulano ou Beltrano*.
1. Use **↑** e **↓** para mudar a ordem dos grupos e **×** para remover um grupo ou uma área.
1. Toque em **Salvar** e confirme. **Cancelar** descarta tudo.

- Limites: até 20 pessoas e 60 demandas por área, e 120 letras por texto.
- **Importar JSON da Central** troca o rascunho pelo conteúdo do arquivo. Nada é gravado até você salvar.
- Ao salvar, os grupos e as áreas removidos somem para todos.

## 13. Se algo der errado

| Mensagem | O que fazer |
| --- | --- |
| *Informe um e-mail válido.* | Corrija o e-mail de login. |
| *Informe um e-mail válido (ou deixe vazio).* | Corrija ou apague o e-mail do ClickUp. |
| *No máximo 4 letras.* | Reduza as iniciais. |
| *Tem histórico: não pode ser excluído. Use Inativar.* | Inative a pessoa em vez de excluir. |
| *Você não tem permissão para ver os acessos desta pessoa.* | Só quem tem `permissao.editar` vê os acessos dos outros. |
| *A Sankhya recusou o login. Nada foi gravado.* | Confira o usuário e a senha da conta Sankhya. |
| *A Sankhya recusou o último teste: aguarde 60 segundos para tentar de novo.* | Espere um minuto e teste de novo. |
| *Senha recusada pela Sankhya. Grave a senha nova.* | A senha mudou na Sankhya. Grave a atual em **Testar e gravar**. |
| *Informe o nome do grupo.* ou *Informe o nome da área.* | No organograma, todo grupo e toda área precisam de nome. |
| *Grupo repetido.* | Dois grupos com o mesmo nome. Renomeie um. |
| *Arquivo não é um JSON válido.* | O arquivo importado não é o do organograma da Central. |
