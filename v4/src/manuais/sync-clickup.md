# Manual da Sincronização com o ClickUp

Para quem acompanha o espelho com o ClickUp (Admin e GP) · app PMO v3 (web)

## 1. Onde fica e quem vê

No menu (☰): **Sistema › Sincronização com o ClickUp**.

- Aparece para quem tem a permissão `sync_clickup.ver`. Por padrão: Admin e GP.
- A tela é **só leitura**. Ela mostra a saúde do espelho; não há nada para gravar nem botão que mexa na sincronização.
- Ela se atualiza sozinha a cada minuto. O botão **Atualizar** recarrega na hora.

## 2. O que é o espelho

O app e o ClickUp ficam iguais por uma sincronização que roda de minuto em minuto. O que muda no ClickUp chega ao app, e o que muda no app vai para o ClickUp. Esta tela responde a uma pergunta: isso está funcionando agora?

## 3. O semáforo

O primeiro quadro traz a situação geral, com a lista dos motivos quando não está verde.

| Cor | Rótulo | Frase na tela | O que quer dizer |
| --- | --- | --- | --- |
| Verde | **Tudo em dia** | "O espelho com o ClickUp está em dia." | Nada a fazer |
| Amarelo | **Atenção** | "Há pontos para acompanhar." | Algo falhou ou atrasou, mas ainda pode se resolver sozinho |
| Vermelho | **Parado** | "A sincronização está parada ou falhando." | O espelho não está andando |

Fica **vermelho** quando:

- um modo do sync falhou 3 ou mais vezes seguidas;
- o sync não roda há 90 minutos ou mais (ou nunca rodou);
- o webhook do ClickUp não está registrado, ou a conferência dele acusou alerta;
- uma fila tem item parado há 30 minutos ou mais.

Fica **amarelo** quando:

- um modo falhou 1 ou 2 vezes seguidas, ou a cota do ClickUp se esgotou na última execução;
- o merge não roda há 75 minutos ou mais;
- o webhook estava suspenso e foi reativado na última conferência;
- o merge completo terminou com alerta;
- uma fila tem item com erro, ou item parado há mais que o tempo escolhido em **Parados há mais de**.

Embaixo do semáforo: quando foi conferido, há quanto tempo foi a última execução do sync e, se for o caso, "uma execução está em andamento".

## 4. Modos do sync

O sync trabalha em cinco modos. A tabela **Modos do sync** mostra um por linha.

| Modo | O que faz |
| --- | --- |
| **Puxar** | Aplica no banco os eventos que o webhook do ClickUp entregou |
| **Merge** | Confere o que mudou no ClickUp (a cada 15 min no expediente, 60 min fora) |
| **Merge completo** | Varredura diária de todas as tarefas (3h de MS) |
| **Enviar** | Manda para o ClickUp o que está na fila de saída |
| **Projetar** | Leva o espelho para o app e as mudanças do app para a fila de saída |

Colunas: **Modo**, **Situação**, **Última execução boa**, **Última execução**, **Falhas seguidas** e **Último erro**.

A **Situação** de cada modo é **Ok** ("Funcionando"), **Atenção**, **Falhando** ou **Sem execução** (nenhuma nos últimos 7 dias). "Falhas seguidas" conta as execuções com erro desde a última boa. A tela olha os últimos 7 dias do registro.

## 5. Filas

São quatro filas. Em dia, todas esvaziam em 1 a 2 minutos.

| Fila | O que guarda |
| --- | --- |
| **Eventos do ClickUp** | O que o webhook recebeu e ainda não entrou no banco |
| **Saída para o ClickUp** | O que falta enviar ao ClickUp |
| **ClickUp → app** | O que o "projetar" ainda não levou do espelho para o app |
| **App → ClickUp** | As mudanças do app que ainda não foram para a fila de saída |

Cada quadro mostra o número de itens pendentes e, em cima, "vazia", "mais antigo há X" ou "só itens em espera", além de "N com erro" quando houver. A faixa colorida segue o semáforo da seção 3.

"Em espera" é item com nova tentativa agendada ou segurado de propósito. **Não conta como parado.**

## 6. Itens com erro ou parados

A tabela lista os itens que estão com erro ou parados na fila há mais que o tempo escolhido em **Parados há mais de** (5 min, 10 min, 30 min ou 1 h; o padrão é 10 min).

Colunas: **Fila**, **Tipo**, **Item**, **Cliente**, **Na fila desde**, **Tentativas** e **Erro**.

- O nome do item é um link que abre a tarefa, a lista ou a pasta no ClickUp, quando há.
- "nova tentativa em …" indica que o próprio sync vai tentar de novo naquele horário.
- Se houver muitos, a tela avisa "Mostrando os N mais antigos de T".
- Sem nada parado: "Nenhum item com erro ou parado."

## 7. Webhook e merge completo

- **Webhook**: "Registrado em …" ou "NÃO registrado". É por ele que o ClickUp avisa o app de cada mudança. Depois vem o resultado da última conferência; "(reativado)" indica que estava suspenso no ClickUp e voltou.
- **Último evento recebido**: quando o ClickUp mandou o último aviso. Em dia útil, o normal é ser recente.
- **Último merge**: a última conferência do que mudou no ClickUp e até quando ela conferiu.
- **Merge completo**: a varredura diária. Mostra o estado, o início, quantas tarefas recebeu, quantas foram excluídas e, se houver, "ALERTA: …".

Se aparecer "ClickUp desligado (o banco processa as filas sozinho)", o espelho com o ClickUp foi desligado de propósito: só as filas ClickUp → app e App → ClickUp são acompanhadas.

## 8. Últimas execuções

A tabela do fim lista as execuções mais recentes do sync: **Quando**, **Modos**, **Resultado** (Ok ou Falhou), **Duração**, **Chamadas ao ClickUp** e **Erro**. Serve para ver se a falha é de agora ou vem se repetindo.

## 9. O alerta do vigia no sino

Você não precisa ficar olhando a tela. Um vigia confere o espelho a cada 5 minutos e avisa no sino (🔔) quem tem `sync_clickup.ver`.

Ele avisa quando:

- um modo do sync falha 5 vezes seguidas;
- o sync fica 90 minutos sem rodar;
- uma fila tem item parado há mais de 30 minutos.

O aviso chega como "Sincronização com o ClickUp com problema: …", com o motivo. Tocar nele abre esta tela. Enquanto o problema durar, o aviso se repete a cada 2 horas. Quando normalizar, chega "Sincronização com o ClickUp voltou ao normal (problema de … a …)".

Repare: a tela fica vermelha com 3 falhas seguidas; o sino só avisa com 5.

## 10. Dúvidas comuns

- **Está amarelo. Preciso fazer algo?** Em geral, não. Acompanhe: se voltar ao verde em alguns minutos, foi passageiro.
- **Está vermelho. E agora?** A tela não tem botão de correção. Se passar de alguns minutos, avise o administrador do app, com o motivo que aparece no semáforo e o **Último erro** do modo.
- **Mudei uma tarefa no app e não apareceu no ClickUp.** Veja as filas **App → ClickUp** e **Saída para o ClickUp**. Se o item estiver lá, ainda vai ser enviado; se estiver com erro, a coluna **Erro** diz o motivo.
- **Mudei no ClickUp e não chegou ao app.** Veja **Eventos do ClickUp** e **ClickUp → app**, e o **Último evento recebido** do webhook.
- **Um modo está "Sem execução".** É normal para o **Merge completo** fora da hora da varredura. Para os outros, vale olhar o semáforo.
- **"Cota do ClickUp esgotada na última execução".** O ClickUp limitou as chamadas por um tempo. O sync volta sozinho.
- **Não vejo a tela no menu.** Falta a permissão `sync_clickup.ver` no seu perfil.
