# Manual de Sugestões de melhoria

Para todos os usuários · app PMO v3 (web)

## 1. Onde fica e quem vê

No menu: **☰ › Geral › Sugestões de melhoria**.

- Todos os usuários do escritório veem a tela, leem todas as sugestões e podem sugerir.
- Todos veem também as respostas.
- Só quem tem a permissão `sugestao.gerenciar` muda o status e responde. Por padrão, é o Admin.

Use a tela para contar o que deixaria o app melhor: algo que falta, algo que atrapalha, uma ideia.

## 2. Ler as sugestões

Cada sugestão aparece em um cartão com:

- O **título** (toque nele para abrir).
- O **status**, em uma etiqueta à direita.
- Quem sugeriu, a data e, se houver, o número de anexos (📎).
- A descrição.
- A **Resposta**, quando já foi respondida, com o nome de quem respondeu.

Para achar uma sugestão, use os filtros no alto:

- **Todos os status**: escolha um status para ver só as sugestões naquela situação.
- **Só as minhas**: mostra apenas as que você enviou.

## 3. Enviar uma sugestão

1. Toque em **+ Sugestão**.
1. Preencha o **Título** (obrigatório, pelo menos 3 letras, até 200).
1. Preencha a **Descrição**: o que você faria diferente e por quê (até 5.000 letras).
1. Toque em **Enviar**.

A sugestão é gravada com o status **Nova** e a janela continua aberta para você anexar arquivos, se quiser.

## 4. Anexar arquivos

Os anexos só podem ser incluídos depois de enviar a sugestão.

1. Com a sugestão aberta, vá até **Anexos**.
1. Toque em **+ Anexar** e escolha um ou mais arquivos (prints, documentos).

- Cada arquivo pode ter até 20 MB.
- Toque no nome do anexo para abrir.
- Toque no **×** ao lado do anexo para remover. O app pede confirmação.
- O botão **+ Anexar** só aparece para quem tem a permissão de anexar (`anexo.gravar`).

## 5. Editar ou excluir a sua sugestão

Você pode alterar ou excluir a sua sugestão enquanto ela estiver com o status **Nova**.

1. Toque no título da sugestão.
1. Mude o **Título** ou a **Descrição** e toque em **Gravar**.
1. Para apagar, toque em **Excluir** e confirme.

Depois que o status muda (por exemplo, para **Em análise**), os campos ficam só para leitura e os botões **Gravar** e **Excluir** somem para você. Sugestões de outras pessoas abrem sempre só para leitura.

## 6. Os status

| Status | O que quer dizer |
| --- | --- |
| **Nova** | Acabou de ser enviada. Quem sugeriu ainda pode editar ou excluir. |
| **Em análise** | Está sendo avaliada. |
| **Planejada** | Foi aceita e entrou no plano. |
| **Concluída** | Foi entregue. |
| **Recusada** | Não será feita. Veja o motivo na resposta. |

## 7. Responder e mudar o status (quem gerencia)

Esta parte vale para quem tem a permissão `sugestao.gerenciar`.

1. Toque no título da sugestão.
1. Escolha o **Status**.
1. Escreva a **Resposta** (até 2.000 letras).
1. Toque em **Gravar**.

- A resposta aparece para todos no cartão da sugestão, com o seu nome.
- Quem gerencia também pode corrigir o título e a descrição e excluir qualquer sugestão, em qualquer status.

## 8. Dúvidas comuns

- **Não consigo mais editar a minha sugestão.** O status já saiu de **Nova**. Se precisar corrigir algo, fale com quem gerencia as sugestões.
- **Os outros veem o que eu sugeri?** Sim. Todos do escritório veem as sugestões e as respostas.
- **Não vejo os campos Status e Resposta.** Eles só aparecem para quem tem a permissão `sugestao.gerenciar`.
- **A lista está vazia.** Sem filtro, aparece *Nenhuma sugestão ainda. Seja o primeiro a sugerir.* Com filtro, aparece *Nenhuma sugestão neste filtro.*: limpe o status e desmarque **Só as minhas**.

| Mensagem | O que fazer |
| --- | --- |
| *Escreva um título com pelo menos 3 letras.* | Complete o título. |
| *Arquivo acima de 20 MB.* | Reduza o arquivo ou envie em partes. |
| *só quem sugeriu altera ou exclui, e enquanto a sugestão estiver nova* | A sugestão não é sua ou já mudou de status. |
| *sugestão não encontrada* | Ela foi excluída. Feche a janela e atualize a tela. |
