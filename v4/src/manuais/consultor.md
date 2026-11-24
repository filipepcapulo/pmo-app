# Manual do consultor

Para os consultores · app PMO (web)

*As telas deste manual são do celular e usam dados de exemplo (consultora, clientes e tarefas fictícios). No computador a tela é a mesma, mais larga.*

## 1. O que você faz no app

| O que | Onde |
| --- | --- |
| Consultar a sua agenda | **Execução › Minha agenda** |
| Apontar as horas (OS e atendimento sem OS) | No cartão da tarefa, botão **Apontar** |
| Comentar na demanda | Na demanda, aba **Comentários** |
| Informar desvio de agenda e pedir mais agenda | No cartão da tarefa |
| Solicitar ausência (vai para aprovação) | **Execução › Ausências** |
| Ver as suas ordens de serviço e o seu fechamento | **Relatórios › Ordens de Serviço** e **Meu fechamento** |
| Vincular a sua conta Sankhya | **Minha agenda**, aba **Minha conta Sankhya** |

O que você **não** faz: criar ou mudar tarefa (data, período, cliente), lançar ausência direto na agenda e ver as horas ou o fechamento dos colegas. Mudança na agenda é com o GP.

- **As OS que você lança no Sankhya OM continuam valendo** e chegam sozinhas ao app, com a origem "Sankhya OM". Não lance de novo.
- **O atendimento sem OS** é apontado no próprio app (origem "Apontamento no APP").

## 2. Entrar no app

1. Abra **https://filipepcapulo.github.io/pmo-app/v4/** (no celular, use "Adicionar à tela inicial").
2. Digite o seu e-mail da Sankhya e toque em **Receber código**.
3. Digite o código de 6 dígitos que chegou por e-mail. Não chegou? Olhe o spam e espere 1 minuto antes de pedir outro.
4. Se aparecer "e-mail não cadastrado", fale com o PMO.

![Tela de entrada: e-mail e Receber código](01-login.png)

*Tela de entrada: digite o e-mail e toque em Receber código.*

![Tela do código de 6 números](02-codigo.png)

*Digite o código que chegou por e-mail e toque em Entrar.*

## 3. Consultar a sua agenda

1. Toque no menu (☰) e, em **Execução**, escolha **Minha agenda**.
2. A tela abre no dia de hoje. Use **‹ Hoje ›** para mudar de dia e **Dia / Semana** para ver a semana.
3. Cada cartão é uma tarefa sua: período (Manhã, Tarde…), modalidade, nome da tarefa e, embaixo, cliente · projeto · demanda.
4. Toque no nome da tarefa para abrir a tarefa; toque no cliente, no projeto ou na demanda para ver um resumo e abrir a ficha.

As abas da tela:

- **Minha agenda**: as tarefas do dia ou da semana e, embaixo, os seus pedidos de mais agenda.
- **Agenda em grade**: a sua agenda no mesmo formato da Agenda da equipe (dias lado a lado, cada tarefa no horário dela), só para consulta. Role para os lados para ver outras semanas, ou filtre por **De** / **Até**; **Hoje** volta para hoje. Clique numa tarefa para abrir o detalhe (cliente, demanda, período, detalhamento e as atividades a cumprir) e use **Ir para o apontamento** para apontar. Nessa aba não dá para mover nem editar tarefa.
- **Minhas demandas**: as demandas em que você tem tarefa.
- **Meus apontamentos**: tudo o que conta como hora sua.
- **Meus desvios**: os desvios que você informou e a resposta do GP.
- **Minha conta Sankhya**: o vínculo com a sua conta Sankhya (seção 9).

![Menu aberto com Minha agenda em Execução](03-menu.png)

*No menu (☰), em Execução, toque em Minha agenda.*

![Minha agenda com as tarefas do dia](04-minha-agenda.png)

*Minha agenda: cada cartão é uma tarefa, com os botões Apontar, Preciso de mais agenda e Informar desvio.*

## 4. Apontar as horas

1. No cartão da tarefa, toque em **Apontar**.
2. **Início** e **Fim** já vêm preenchidos com o horário da agenda (Manhã 08:00–12:00 · Tarde 14:00–18:00 · Dia 08:00–18:00 com 120 min de intervalo · Noite 18:00–22:00). **Troque pelo horário real do atendimento.**
3. **Intervalo (min)**: o tempo de almoço ou pausa dentro do período.
4. **O que foi feito**: descreva o atendimento.
5. Confira **Horas**, que o app calcula sozinho: fim − início − intervalo. Exemplo: 08:00 a 12:30 com 30 min de intervalo = 4 h.
6. Se a demanda tem **atividades a cumprir**, elas aparecem em **Atividades da demanda**: para cada uma, diga o que você realizou nesta tarefa — **Não realizei**, **Parcial** ou **Total**. Todas as que estão em aberto precisam de resposta; **Marcar as demais como não realizadas** preenche o resto de uma vez.
7. Toque em **Gravar**. O cartão passa a mostrar "X h apontadas" e o apontamento ganha um número interno. A lista de atividades da demanda é atualizada com o que você apontou.

![Formulário Apontar horas preenchido](06-apontar-preenchido.png)

*Apontar horas: 08:15 a 12:30 com 15 min de intervalo = 4 h. Toque em Gravar.*

![Cartão com 4 h apontadas](07-agenda-apontada.png)

*Depois de gravar, o cartão mostra as horas apontadas.*

Regras do apontamento:

- A data é sempre a da tarefa. Atendeu em outro dia? Peça ao GP para ajustar a agenda antes de apontar.
- Só aparece **Apontar** em tarefas suas de hoje ou de dias anteriores. Tarefa futura, cancelada ou "não executada" não aceita apontamento.
- Um apontamento não pode cruzar o horário de outro seu. Se cruzar, o app recusa e mostra o motivo.
- Pode apontar mais de uma vez na mesma tarefa (por exemplo, antes e depois de uma pausa longa).
- A OS lançada no Sankhya OM chega sozinha em alguns minutos: não aponte de novo no app o que já tem OS.
- As **atividades a cumprir** também aparecem na ficha da tarefa, logo abaixo dos dados. Quem aponta as horas pelo Sankhya OM marca as atividades ali e toca em **Gravar atividades**.
- Uma atividade fica **Realizada** quando alguma tarefa a marca como Total, e **Parcial** quando a maior marca é Parcial. "Não realizei" não desfaz o que outra tarefa já fez. Marcou errado? Corrija na própria tarefa.

Corrigir ou excluir:

1. Em **Minha agenda**, abra a aba **Meus apontamentos**.
2. Na linha do apontamento, toque em **Editar**, corrija e toque em **Gravar**. Para apagar, use **Excluir**.
3. Depois que a gerência marca o apontamento como **Conferido**, ele não pode mais ser editado nem excluído. Precisa corrigir? Peça ao GP para reabrir.

## 5. Conferir o que você apontou

Na aba **Meus apontamentos** você vê tudo o que conta como hora sua:

- **Origem**: Sankhya OM (as OS) ou Apontamento no APP. Dá para filtrar por uma delas.
- **De / Até**: o período. Os totais em cima mostram o total, o das OS e o do app.
- **Conferência**: Pendente ou Conferido (só nos apontamentos do app).
- Botões **Excel** e **CSV** para baixar a lista.

![Meus apontamentos com os totais e a lista](08-meus-apontamentos.png)

*Meus apontamentos: totais de OS e do app no período e a lista (arraste a tabela para o lado para ver as outras colunas, como Conferência e Editar).*

## 6. Comentar na demanda

Use o comentário para registrar o que aconteceu, tirar dúvida com o GP ou avisar um colega. Fica gravado na demanda, com o seu nome e a hora.

1. Abra a demanda: em **Minha agenda**, toque na demanda embaixo do cartão da tarefa (ou abra a aba **Minhas demandas** e toque no nome).
2. Na ficha da demanda, abra a aba **Comentários**.
3. Escreva em "Escreva um comentário…" e toque em **Comentar** (ou Ctrl+Enter no computador).
4. Para avisar alguém, digite **@** e escolha a pessoa: ela recebe o aviso no sino.

- Você também pode comentar na **tarefa** e no **projeto**, do mesmo jeito.
- Só você vê **Editar** e **Excluir** no seu comentário. O editado fica marcado "(editado)".
- Comentário não muda a agenda nem as horas: para isso use o desvio, o pedido de mais agenda ou fale com o GP.

## 7. Quando a agenda não bate com o que aconteceu

- **Atendeu outro cliente ou projeto no horário da agenda (desvio)**: no cartão da tarefa do dia, toque em **Informar desvio**, escolha o **cliente**, a **demanda** e, se houver, a **subdemanda** que você atendeu e diga o motivo. Só dá para escolher entre as demandas que já existem: se a certa não estiver na lista, peça ao GP para criá-la. O GP do projeto atendido aprova ou recusa (acompanhe na aba **Meus desvios**). Aprovado, o app cria a tarefa certa na sua agenda: aponte nela.
- **Precisa de mais horas na demanda**: no cartão, toque em **Preciso de mais agenda**, informe as horas e o motivo. O pedido vai para o GP e aparece em "Meus pedidos de agenda", embaixo da agenda.

![Formulário Informar desvio](10-desvio.png)

*Informar desvio: escolha cliente, demanda e subdemanda atendidos e diga o motivo.*

![Formulário Preciso de mais agenda](09-mais-agenda.png)

*Preciso de mais agenda: informe as horas estimadas e o motivo.*

## 8. Solicitar ausência

Folga, licença, férias ou qualquer ausência é pedida pelo app e **vai para aprovação**. A ausência só entra na agenda depois de aprovada.

1. Abra **Execução › Ausências** (ou toque em **Solicitar ausência** no topo da **Minha agenda**).
2. Toque em **+ Solicitar ausência**.
3. Escolha o **Tipo** (Férias, Folga, Licença ou Ausência) e as datas **De** e **Até**. Para um dia só, repita a data.
4. É só uma parte do dia? Marque **Só uma parte do dia** e informe o horário (**Das** / **Até as**).
5. Escreva o **Motivo** e toque em **Enviar para aprovação**.

O que acontece depois:

| Situação | O que significa |
| --- | --- |
| **Aguardando aprovação** | O PMO recebeu o aviso e ainda não decidiu. Você pode **Cancelar pedido**. |
| **Aprovada** | A ausência já está na agenda da equipe. Você recebe o aviso no sino. |
| **Recusada** | Não entrou na agenda. A coluna **Resposta** traz o motivo. |
| **Cancelada** | Você desistiu antes da decisão. |

- Você só pede ausência para você mesmo.
- Não dá para ter dois pedidos pendentes no mesmo período, nem alterar um pedido enviado: cancele e peça de novo.
- Ausência com mais de 30 dias passados é lançada pelo PMO.
- Se você já tem tarefa na agenda nesses dias, a aprovação não mexe nelas: o GP remaneja. Avise no motivo.
- Precisa desfazer uma ausência já aprovada? Fale com o GP.

## 9. Ordens de Serviço, fechamento e conta Sankhya

Em **Relatórios › Ordens de Serviço** a tela se chama **Minhas ordens de serviço** e mostra **só as suas informações**. As horas e o fechamento dos colegas só aparecem para a gerência.

| Aba | O que mostra |
| --- | --- |
| **Fechamento** | O seu período de 21 a 20: dias úteis, capacidade, horas de OS e do app, normais, extras e ocupação, com o gráfico das suas horas acumuladas |
| **Meus apontamentos** | A mesma lista da seção 5 |
| **Meus travados** | As suas OS travadas no Experience que passaram do prazo de 3 dias úteis (as que podem descontar): lance as OS em dia para não cair nela |
| **Minha conferência de OS** | O resultado da última conferência das suas agendas com as OS do Experience: o que está **sem apontamento no Sankhya**, aguardando o GP ou com OS sem agenda é o que falta acertar |
| **Minha planilha** | As suas horas de planilha comparadas com as agendas de planilha |

Em **Relatórios › Meu fechamento** você vê o seu fechamento do período com o valor calculado. Ninguém vê o fechamento de outra pessoa por ali.

- O fechamento de produtividade vai do **dia 21 ao dia 20** e soma as OS do Sankhya OM e os apontamentos do app.
- Aponte no próprio dia do atendimento, enquanto o horário está fresco. Assim nada fica de fora no fechamento.

Vincular a sua conta Sankhya (o mesmo usuário e senha do Experience, do Sankhya OM e do Zendesk). Com ela o app confere as suas OS e lê os seus chamados do Portal em seu nome:

1. Em **Minha agenda**, abra a aba **Minha conta Sankhya**.
2. Preencha **Usuário Sankhya** e **Senha** e toque em **Testar e gravar**.
3. A senha é testada na Sankhya antes de gravar. Se for recusada, nada é gravado: confira e tente de novo depois de 1 minuto.

- A senha fica cifrada e nunca mais aparece na tela. Trocou a senha na Sankhya? Volte aqui e grave a **Senha nova**.
- **Testar senha gravada** confere se a senha guardada ainda vale. **Apagar conta** remove o vínculo.
- Só você (e o administrador do app) mexe na sua conta. O mesmo quadro aparece em **Cadastros › Equipe**, na sua ficha, aba **Conta Sankhya**.

## 10. Dúvidas frequentes

- **Não aparece o botão Apontar**: a tarefa é futura, foi cancelada, está como "não executada" ou não é sua.
- **Horas aparece como "—"**: o fim está antes do início ou o intervalo é maior que o período. Confira os três campos.
- **"Sobreposição" ao gravar**: você já tem outro apontamento nesse horário. Ajuste o horário ou corrija o outro em Meus apontamentos.
- **A minha OS não apareceu**: as OS chegam do Sankhya OM em alguns minutos. Se não aparecer até o dia seguinte, avise o PMO com o número da OS.
- **Pedi ausência e ela não aparece na agenda**: só aparece depois de aprovada. Veja a situação em **Execução › Ausências**.
- **"Você já tem um pedido pendente nesse período"**: cancele o pedido antigo ou espere a resposta dele.
- **Não vejo as horas de um colega em Ordens de Serviço**: é assim mesmo. Cada consultor vê só as próprias.
- **A Sankhya recusou a minha senha**: confira o usuário, teste a senha no Sankhya OM e aguarde 1 minuto antes de tentar de novo.
- **Outras dúvidas**: fale com o PMO.
