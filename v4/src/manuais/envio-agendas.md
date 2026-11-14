# Manual do Envio de agendas

Para quem envia a agenda da semana aos clientes (GPs e Admin) · app PMO v3 (web)

## 1. Onde fica e quem vê

Menu **☰ › Execução › Envio de agendas**. Aparece só para quem tem a permissão `agenda.enviar` (por padrão, Admin e GP).

A tela monta, para cada cliente, o e-mail com as agendas dele no período. Cada cliente recebe o próprio e-mail, só com as próprias agendas e contatos.

## 2. O que entra no e-mail

- Só as agendas **confirmadas** do período.
- Agenda de **Planejamento** fica de fora.
- Agenda de **gestor** (responsável com papel de GP ou perfil Admin/GP) fica de fora.
- Tarefas canceladas ou não executadas não entram.

O cartão avisa o que ficou de fora: "N agenda(s) não confirmada(s) ficam de fora." e "Fora do e-mail: N de Planejamento e N de gestor.".

## 3. Escolher o período

- A tela abre na **próxima semana** (segunda a domingo).
- Mude as datas em **De** e **Até** quando precisar de outro intervalo.
- **Próxima semana** volta ao padrão.

Ao trocar o período, a marcação dos clientes volta ao padrão.

## 4. O cartão de cada cliente

| Parte | O que mostra |
| --- | --- |
| Caixa de marcar + nome | Se o cliente vai receber. Fica travada quando não há contato com e-mail. |
| Pílula do último envio | "Enviado em dd/mm/aaaa", "Falhou" ou "Pendente" para este período. |
| **Copiar WhatsApp** | Copia o texto da agenda do cliente para colar no WhatsApp. |
| **Para** e **Cc** | Os destinatários: líder e patrocinador do cliente com e-mail. O primeiro contato vai no Para (líder antes de patrocinador); os demais vão em Cc. |
| Tabela | #, Consultor, Resumo da Demanda, Data, Período, Usuário Cliente e Agenda (Remoto, Interno, Presencial…). |

Se aparecer "Sem líder ou patrocinador com e-mail.", toque em **Cadastrar no cliente** e inclua o contato. Sem contato o cliente não pode ser marcado.

No fim da tela, a linha "Sem agenda confirmada: …" lista os clientes que têm agenda no período, mas nenhuma confirmada (com a quantidade).

## 5. Quem vem marcado

Ao abrir o período, vem marcado quem:

- tem agenda confirmada e contato com e-mail;
- não tem motivo para vir desmarcado;
- ainda não recebeu este período (quem deu falha volta marcado).

Você pode marcar ou desmarcar qualquer cliente antes de enviar. Desmarcado não é proibido: é só o padrão.

### Clientes que sempre vêm desmarcados

Alguns clientes vêm desmarcados com a pílula **Vem desmarcado** e o motivo (por exemplo, atendimento interno).

- Para criar a regra: no cartão, toque em **Sempre vir desmarcado…**, escreva o motivo (até 200 caracteres) e toque em **Gravar**.
- Para mudar o motivo: toque em **Alterar**.
- Para o cliente voltar a vir marcado: toque em **Alterar**, apague o motivo e toque em **Gravar**. Aparece "Volta a vir marcado".

## 6. Enviar

1. Confira os cartões marcados.
2. Toque em **Enviar a N cliente(s)**, no topo. O botão fica apagado quando não há cliente marcado que possa receber.
3. Aguarde. Aparece "X de Y e-mail(s) enviado(s)" e um quadro com o resultado por cliente: **Enviado**, **Falhou** (com o erro) ou **Fora** (com o motivo: "sem agenda confirmada" ou "sem contato com e-mail").

Depois do envio, quem recebeu sai da marcação e o cartão passa a mostrar "Enviado em …". O que você tinha desmarcado continua desmarcado.

O envio depende de o e-mail de saída (SMTP) estar configurado no servidor. Enquanto não estiver, nada é enviado e a tela mostra o erro da seção 7. Mesmo assim dá para conferir a prévia e usar **Copiar WhatsApp**.

## 7. Se algo der errado

| O que aparece | O que fazer |
| --- | --- |
| "E-mail de envio não configurado (segredos SMTP do Supabase)." | O e-mail de saída ainda não foi configurado. Nenhum e-mail saiu. Avise o administrador; enquanto isso, use **Copiar WhatsApp**. |
| "Nenhuma agenda confirmada no período." | Confira o período e se as agendas estão confirmadas. |
| "Sem líder ou patrocinador com e-mail." | Cadastre o contato no cliente (**Cadastrar no cliente**). |
| Pílula "Falhou" no cartão | O e-mail daquele cliente não saiu; passe o mouse na pílula para ver o erro. O cliente volta marcado: envie de novo. |
| "marque de 1 a 100 clientes" | Envie no máximo 100 clientes por vez. |
| "Não foi possível copiar" | O navegador bloqueou a cópia. Tente de novo com a tela em primeiro plano. |
| "Sem conexão com o servidor. Confira a internet e tente de novo." | Confira a internet e repita. |
