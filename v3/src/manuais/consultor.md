# Manual do apontamento

Para os consultores · app PMO v3 (web)

*As telas deste manual são do celular e usam dados de exemplo (consultora, clientes e tarefas fictícios). No computador a tela é a mesma, mais larga.*

## 1. O que muda

- O app web do PMO agora é o **v3**. O endereço antigo abre o v3 sozinho.
- **As OS que você lança no Sankhya OM continuam valendo** e chegam sozinhas ao app, com a origem "Sankhya OM". Não lance de novo.
- **O atendimento sem OS**, que antes ia na planilha do Drive, passa a ser apontado no próprio app (origem "Apontamento no APP"). As planilhas do Drive deixam de ser usadas.
- O apontamento é feito na versão web: abra no navegador do celular ou do computador.

## 2. Entrar no app

1. Abra **https://filipepcapulo.github.io/pmo-app/v3/** (no celular, use "Adicionar à tela inicial").
2. Digite o seu e-mail da Sankhya e toque em **Receber código**.
3. Digite o código de 6 dígitos que chegou por e-mail. Não chegou? Olhe o spam e espere 1 minuto antes de pedir outro.
4. Se aparecer "e-mail não cadastrado", fale com o PMO.

![Tela de entrada: e-mail e Receber código](01-login.png)

*Tela de entrada: digite o e-mail e toque em Receber código.*

![Tela do código de 6 números](02-codigo.png)

*Digite o código que chegou por e-mail e toque em Entrar.*

## 3. Encontrar a sua agenda

1. Toque no menu (☰) e, em **Execução**, escolha **Minha agenda**.
2. A tela abre no dia de hoje. Use **‹ Hoje ›** para mudar de dia e **Dia / Semana** para ver a semana.
3. Cada cartão é uma tarefa sua: período (Manhã, Tarde…), modalidade, nome da tarefa e, embaixo, cliente · projeto · demanda.

![Menu aberto com Minha agenda em Execução](03-menu.png)

*No menu (☰), em Execução, toque em Minha agenda.*

![Minha agenda com as tarefas do dia](04-minha-agenda.png)

*Minha agenda: cada cartão é uma tarefa, com os botões Apontar, Preciso de mais agenda e Informar desvio.*

## 4. Apontar as horas

1. No cartão da tarefa, toque em **Apontar**.
2. **Início** e **Fim** já vêm preenchidos com o horário da agenda (Manhã 08:00–12:00 · Tarde 14:00–18:00 · Dia 08:00–18:00 com 120 min de intervalo · Noite 18:00–22:00). **Troque pelo horário real do atendimento.**
3. **Intervalo (min)**: o tempo de almoço ou pausa dentro do período.
4. **O que foi feito**: descreva o atendimento, como você fazia na planilha.
5. Confira **Horas**, que o app calcula sozinho: fim − início − intervalo. Exemplo: 08:00 a 12:30 com 30 min de intervalo = 4 h.
6. Toque em **Gravar**. O cartão passa a mostrar "X h apontadas" e o apontamento ganha um número interno.

![Formulário Apontar horas preenchido](06-apontar-preenchido.png)

*Apontar horas: 08:15 a 12:30 com 15 min de intervalo = 4 h. Toque em Gravar.*

![Cartão com 4 h apontadas](07-agenda-apontada.png)

*Depois de gravar, o cartão mostra as horas apontadas.*

Regras do apontamento:

- A data é sempre a da tarefa. Atendeu em outro dia? Peça ao GP para ajustar a agenda antes de apontar.
- Só aparece **Apontar** em tarefas suas de hoje ou de dias anteriores. Tarefa futura, cancelada ou "não executada" não aceita apontamento.
- Um apontamento não pode cruzar o horário de outro seu. Se cruzar, o app recusa e mostra o motivo.
- Pode apontar mais de uma vez na mesma tarefa (por exemplo, antes e depois de uma pausa longa).
- Você aponta, mas não altera a tarefa (data, período, cliente). Mudanças na agenda são com o GP.

## 5. Corrigir ou excluir um apontamento

1. Em **Minha agenda**, abra a aba **Meus apontamentos**.
2. Na linha do apontamento, toque em **Editar**, corrija e toque em **Gravar**. Para apagar, use **Excluir**.
3. Depois que a gerência marca o apontamento como **Conferido**, ele não pode mais ser editado nem excluído. Precisa corrigir? Peça ao GP para reabrir.

## 6. Conferir o que você apontou

Na aba **Meus apontamentos** você vê tudo o que conta como hora sua:

- **Origem**: Sankhya OM (as OS) ou Apontamento no APP. Dá para filtrar por uma delas.
- **De / Até**: o período. Os totais em cima mostram o total, o das OS e o do app.
- **Conferência**: Pendente ou Conferido (só nos apontamentos do app).
- Botões **Excel** e **CSV** para baixar a lista.

![Meus apontamentos com os totais e a lista](08-meus-apontamentos.png)

*Meus apontamentos: totais de OS e do app no período e a lista (arraste a tabela para o lado para ver as outras colunas, como Conferência e Editar).*

## 7. Quando a agenda não bate com o que aconteceu

- **Precisa de mais horas na demanda**: no cartão, toque em **Preciso de mais agenda**, informe as horas e o motivo. O pedido vai para o GP e aparece em "Meus pedidos de agenda", embaixo da agenda.
- **Atendeu outro cliente ou projeto no horário da agenda**: no cartão da tarefa do dia, toque em **Informar desvio**, escolha o **cliente**, a **demanda** e, se houver, a **subdemanda** que você atendeu e diga o motivo. Só dá para escolher entre as demandas que já existem: se a certa não estiver na lista, peça ao GP para criá-la. O GP do projeto atendido aprova ou recusa (acompanhe na aba **Meus desvios**). Aprovado, o app cria a tarefa certa na sua agenda: aponte nela.

![Formulário Preciso de mais agenda](09-mais-agenda.png)

*Preciso de mais agenda: informe as horas estimadas e o motivo.*

![Formulário Informar desvio](10-desvio.png)

*Informar desvio: escolha cliente, demanda e subdemanda atendidos e diga o motivo.*

## 8. Fechamento do mês

- O fechamento de produtividade vai do **dia 21 ao dia 20** e soma as OS do Sankhya OM e os apontamentos do app.
- Em **Relatórios › Produtividade** você vê o **seu** fechamento (dias úteis, capacidade, horas de OS e do app, normais, extras e ocupação) e os seus apontamentos. A produtividade dos colegas só aparece para a gerência. Na aba **Meus travados** aparecem as suas OS travadas no Experience que passaram do prazo de 3 dias úteis (as que podem descontar): lance as OS em dia para não cair nela.
- Aponte no próprio dia do atendimento, enquanto o horário está fresco. Assim nada fica de fora no fechamento.
- A gerência confere os apontamentos do app. Os conferidos ficam travados.

## 9. Dúvidas frequentes

- **Não aparece o botão Apontar**: a tarefa é futura, foi cancelada, está como "não executada" ou não é sua.
- **Horas aparece como "—"**: o fim está antes do início ou o intervalo é maior que o período. Confira os três campos.
- **"Sobreposição" ao gravar**: você já tem outro apontamento nesse horário. Ajuste o horário ou corrija o outro em Meus apontamentos.
- **A minha OS não apareceu**: as OS chegam do Sankhya OM em alguns minutos. Se não aparecer até o dia seguinte, avise o PMO com o número da OS.
- **Outras dúvidas**: fale com o PMO.
