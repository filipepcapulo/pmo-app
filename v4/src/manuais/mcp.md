# Manual da IA (MCP)

Para quem vai ligar uma IA ao PMO (quem tem a permissão de MCP) · app PMO v3 (web)

*Os exemplos deste manual usam nomes fictícios. Nenhum token de verdade aparece aqui.*

## 1. O que é e quem vê

No menu (☰): **Sistema › IA (MCP)**.

O MCP é a porta por onde uma IA (o Claude e outras) conversa com o PMO. Você gera um **token pessoal**, coloca na sua IA e ela passa a consultar e gravar no app **em seu nome**.

- Aparece para quem tem a permissão `mcp.usar`. Por padrão, só o Admin. Os outros perfis (inclusive o GP) nascem com ela desligada; quem cuida das permissões pode ligar.
- Você vê os seus tokens (**Meus tokens**). Quem tem a permissão `integracao.gerenciar` vê os de todos (**Tokens do escritório**, com a coluna **De quem**) e pode revogar qualquer um.

## 2. Gerar o token

1. Toque em **Gerar token**.
2. Em **Nome**, diga onde vai usar, por exemplo "Claude no notebook" (até 60 letras).
3. Em **Validade**, escolha **30 dias**, **90 dias**, **180 dias** ou **1 ano**. O padrão é 90 dias. (O banco aceita de 1 a 365 dias; a tela oferece essas quatro opções.)
4. Toque em **Gerar**.

Abre a janela **Token gerado — copie agora**. Ela mostra o token (começa com `pmo_mcp_…`), o comando do Claude Code e a configuração para outros clientes, cada um com o seu botão de copiar.

- **O token aparece uma única vez.** Depois de **Já copiei**, não há como ver de novo. O banco guarda só o hash (uma impressão digital) do token, nunca o token em si. Na lista fica apenas o começo dele, para você reconhecer.
- Guarde-o no seu gerenciador de senhas.
- Cada pessoa pode ter até **5 tokens ativos**. Para gerar o sexto, revogue um.
- Perdeu o token? Revogue e gere outro.

## 3. Ligar no Claude Code

No terminal, rode o comando que a janela do token mostra em **Claude Code (terminal)** (botão **Copiar comando**). Ele tem este formato:

`claude mcp add --transport http pmo-bpms https://<projeto>.supabase.co/functions/v1/mcp --header "Authorization: Bearer <seu token>"`

- Troque `https://<projeto>.supabase.co/functions/v1/mcp` pelo endereço que a tela mostra em **Endereço do servidor MCP** (botão **Copiar**).
- Troque `<seu token>` pelo token que você acabou de gerar.
- O comando copiado pela janela já vem com o endereço e o token certos: é só colar.

Para outros clientes (Claude Desktop etc.), use o bloco **Outros clientes (configuração JSON)** com **Copiar configuração**. Os dados são os mesmos: tipo HTTP, o endereço do servidor e o cabeçalho `Authorization: Bearer <seu token>`.

## 4. O que a IA alcança

A IA age com as **mesmas permissões e a mesma visibilidade que você tem nas telas**. O que você não vê no app, ela não vê. O que você não pode gravar, ela não grava. Exemplo: quem não vê a agenda da equipe recebe só a própria agenda.

A lista de ferramentas é fechada. O quadro **O que a IA alcança** mostra as mesmas que estão aqui.

Consulta (17):

| Ferramenta | O que faz |
| --- | --- |
| Quem sou eu | Seu nome, escritório, perfil e o que você pode fazer |
| Busca global | Procura em clientes, projetos, demandas, tarefas e chamados (também pelo nº do chamado) |
| Clientes | Clientes ativos, com GP, projetos abertos, contatos e horas contratadas |
| Projetos | Projetos com cliente, fase, situação, GP e horas (contratadas, previstas, reais, saldo) |
| Projeto | O projeto completo: totais de horas, pedidos de horas, liberações e demandas |
| Demandas | Demandas e subdemandas, por projeto, status e texto |
| Minhas demandas | As demandas em que você tem tarefa |
| Demanda | A ficha da demanda: horas, atraso, subdemandas, tarefas e checklist |
| Tarefa | A ficha da tarefa (agenda), com os apontamentos |
| Agenda | A agenda entre duas datas (até 93 dias), de todos ou de alguns consultores |
| Backlog | Demandas sem agenda futura, chamados em triagem e pedidos de agenda abertos |
| Ociosidade | Horas alocadas × capacidade de um dia, com sugestões (exige a permissão de ver a Ociosidade) |
| Apontamentos (horas) | Apontamentos do período (até 366 dias): os seus e, com permissão, os da equipe. Só horas, sem valores |
| Chamados | Busca de chamados por texto, situação, cliente, fila, prioridade etc. |
| Chamado | A ficha do chamado: situação, SLA, demanda, tarefas e interações |
| Equipe | A equipe ativa: nome, e-mail, papéis, perfil e skills |
| Comentários | Os comentários de um projeto, demanda, tarefa ou chamado |

Gravação (5):

| Ferramenta | O que faz |
| --- | --- |
| Criar ou alterar demanda | Cria ou altera uma demanda ou subdemanda |
| Criar ou alterar tarefa (agenda) | Cria tarefas de agenda (uma por responsável e data) ou altera uma |
| Mover tarefas | Muda de 1 a 100 tarefas de data ou de consultor; ou vai tudo, ou não vai nada |
| Apontar horas na própria tarefa | Lança, altera ou exclui um apontamento seu ainda não conferido |
| Comentar | Comenta num projeto, demanda, tarefa ou chamado, com menção opcional |

## 5. O que a IA NÃO alcança

- **Nada do Financeiro.** Valores de cliente, salários e remuneração, produtividade paga, fechamento e rentabilidade não existem no MCP. Continuam só nas telas do Financeiro, para quem é autorizado. Se você pedir isso à IA, ela vai dizer que só existe no app.
- **Abrir chamado não está disponível.** Chamados são só para consulta (buscar e ver a ficha).
- **Gerar ou revogar token.** Só na tela do app, nunca pela IA.
- Qualquer coisa fora da lista da seção 4.

## 6. Gravação em dois passos

Nenhuma gravação acontece direto. São sempre dois passos:

1. **Prévia.** A IA chama a ferramenta e o app devolve o que seria gravado, junto com um **código de confirmação**. Nada é gravado nesse passo.
2. **Confirmação.** A IA mostra a prévia a você. Só depois do seu OK ela repete a chamada, com os mesmos dados e o código.

Regras do código:

- vale por **10 minutos**;
- serve **uma única vez**;
- está **preso aos mesmos dados** da prévia. Se qualquer dado mudar, o app recusa e pede nova prévia.

Leia a prévia antes de dizer "pode gravar". A responsabilidade pelo que foi gravado é de quem é dono do token.

## 7. Limite e registro das chamadas

- Limite de **60 chamadas por minuto por pessoa** (somando todos os seus tokens). Passou disso, a IA recebe um aviso para aguardar.
- Cada chamada fica registrada: quem, qual ferramenta, quando e se deu certo.
- Na lista de tokens você acompanha **Último uso**, **Chamadas (30 dias)** e **Gravações (30 dias)**. Um número que você não reconhece é sinal para revogar.

## 8. Revogar o token

Na lista, toque em **Revogar** na linha do token e confirme. A IA que usa esse token **pára na hora**.

- A coluna **Situação** mostra **Ativo**, **Vencido** ou **Revogado**. A coluna **Validade** mostra "vence em N dias", "vence amanhã", "vencido" ou "revogado".
- Token vencido pára sozinho. Não dá para renovar: gere outro.
- Revogar não tem volta.

## 9. Cuidados

- **O token vale como você.** Quem tiver o token age no PMO com as suas permissões.
- Não cole o token em chat, e-mail, documento compartilhado nem repositório de código.
- Não compartilhe o token com colegas: cada pessoa gera o seu.
- Use um token por lugar ("Claude no notebook", "Claude no escritório"). Assim você revoga só o que vazou.
- **Se vazar, ou se desconfiar, revogue na hora** e gere outro.
- Prefira validade curta.

## 10. Dúvidas comuns

- **Erro 401, "TOKEN: envie o token pessoal de MCP em Authorization: Bearer".** A IA não mandou o token, ou ele não começa com `pmo_mcp_`. Confira o comando da seção 3.
- **Erro 401, "TOKEN: token de MCP inválido, vencido ou revogado; gere outro em Sistema › IA (MCP)".** O token foi digitado errado, venceu ou foi revogado. Gere outro.
- **Erro 401, "TOKEN: o dono deste token está inativo ou nunca entrou no app".** O usuário dono do token foi desativado.
- **"LIMITE: muitas chamadas do MCP em 1 minuto (60); aguarde um pouco".** Passou do limite. Espere um minuto.
- **"LIMITE: você já tem 5 tokens ativos; revogue um antes de gerar outro".** Revogue um token que não usa mais.
- **"CONFIRMACAO: código inválido, vencido ou já usado; peça uma nova prévia".** Passaram os 10 minutos ou o código já foi usado. Peça à IA para refazer a prévia.
- **"CONFIRMACAO: os dados mudaram depois da prévia; peça uma nova prévia".** A IA mudou algum dado entre a prévia e a confirmação. Peça nova prévia.
- **"FERRAMENTA: … não existe no MCP do PMO".** A IA tentou algo fora da lista da seção 4.
- **"GRANDE: o resultado passou do tamanho máximo".** Peça à IA para refinar os filtros (datas, texto, limite).
- **A IA diz que não tem permissão para algo.** Ela tem as suas permissões. Se você não faz aquilo na tela, ela também não faz. Se a permissão `mcp.usar` for desligada do seu perfil, o token pára de funcionar.
- **Não vejo a tela no menu.** Falta a permissão `mcp.usar` no seu perfil.
