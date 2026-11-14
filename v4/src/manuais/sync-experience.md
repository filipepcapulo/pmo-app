# Manual do Sync com o Experience

Para quem roda o sync dos lançamentos (GP e Admin) · app PMO v3 (web)

*Os exemplos deste manual usam nomes fictícios ("Fulano", "Cliente Exemplo").*

## 1. Onde fica e quem vê

No menu (☰): **Sistema › Sync com o Experience**.

- Aparece para quem tem a permissão `sync_experience.gerenciar`. Por padrão: Admin e GP. Os outros perfis nascem sem ela.
- Trocar o modo (simulação ou real) é só para quem tem a permissão `integracao.gerenciar`. Quem não tem não vê os botões de modo.
- O sync fala com o Experience usando a **sua** Conta Sankhya. Cadastre-a antes em **Equipe › ficha › Conta Sankhya**.

## 2. O que o sync faz

Ele deixa os lançamentos do Experience iguais às tarefas do app. Entram as tarefas do período com Apontamento **OS Experience** ou **Hora Dobrada**. O campo **Experience** da tarefa decide a ação:

| Campo Experience da tarefa | Ação | O que acontece no Experience |
| --- | --- | --- |
| Vazio ou "Não lançado" | Criar | Cria o lançamento com a data e o horário da tarefa |
| "Alterar" | Alterar | Acerta a data e o horário do lançamento da tarefa; se não achar o lançamento, cria de novo |
| "Lixeira" | Excluir (Lixeira) | Exclui só o lançamento que tem a TAG da tarefa |

- A TAG é o que liga o lançamento à tarefa: `[ClickUp:id]` quando a tarefa veio do ClickUp, `[PMO:id]` quando nasceu no app. Lançamento sem a TAG da tarefa nunca é excluído.
- A ordem da rodada é sempre: Excluir, depois Alterar, depois Criar.
- Depois de criar ou alterar, o campo Experience da tarefa vira "Lançado". Depois de excluir, continua "Lixeira" e a próxima rodada não tenta de novo.
- **O sync nunca exclui nada no app.** A tarefa fica, com a observação do que foi feito na ficha dela.

## 3. O que fica de fora ou bloqueado

- Só entra projeto "Em Andamento" e com FAP.
- Nesta etapa, só o modelo Avulso (15/72) e a etapa "Personalização / Customização". Os demais modelos aparecem como **Bloqueado** e seguem pela Central.
- Lançamento que já virou OS no Experience não é alterado nem excluído.
- Ficam fora: clientes Z (inativos), 1-BP-MS, Horas Cruzadas, Planos de Ação e a Agenda "Planejamento".
- Para criar ou alterar, a tarefa precisa estar planejada, em andamento ou concluída.

## 4. Simulação × real

No alto da tela aparece **Modo: Simulação (só mostra o que faria)** ou **Modo: Real (grava no Experience)**, com quem ligou e quando.

- **Simulação** é o padrão. O sync lê tudo no Experience e mostra o que faria, sem gravar nada lá nem na tarefa. O botão de rodar se chama **Simular o sync**.
- **Real** grava de verdade: cria, altera e exclui lançamentos. O botão passa a se chamar **Rodar o sync** e pede confirmação a cada rodada.
- Quem tem `integracao.gerenciar` troca o modo com **Ligar modo real** ou **Voltar para simulação**. Ao ligar o real, o app pede confirmação e lembra de conferir antes uma simulação.
- O modo vale para o escritório inteiro, não só para você.

## 5. Rodar o sync

1. Escolha o período em **De** e **Até**. O padrão é de hoje até 13 dias à frente.
2. Se quiser, filtre por **FAP** (só o número, 4 a 6 dígitos) e por **Consultor**.
3. Toque em **Simular o sync** (ou **Rodar o sync**, no modo real).
4. Aguarde. A rodada pode levar até uns 2 minutos.

Regras do período: no máximo 31 dias, e dentro de 62 dias de hoje (para trás ou para a frente).

Só roda uma rodada por vez no escritório. Enquanto houver uma, a tela mostra "Rodada em andamento desde hh:mm" e o botão fica desligado.

Se a rodada parar antes do fim por tempo, ela fica marcada como "incompleta": rode de novo para o que faltou. O que já foi feito continua valendo.

## 6. Ler o resultado

Abaixo aparece a última rodada (modo, período, filtros, quando, quem rodou e a Conta Sankhya usada). Em **Rodadas anteriores** você abre uma rodada mais antiga.

Os quadros mostram os totais: **Faria** (na simulação) ou **Gravadas** (no real), **Já certas**, **Bloqueadas** e **Erros**.

Os filtros em cima da tabela: **Todas**, **Pendências**, **Feitas**, **Simulação**, **Já certas**, **Bloqueadas** e **Erros**. **Pendências** junta erro, bloqueado e ignorado.

| Resultado | O que quer dizer |
| --- | --- |
| Feito | Gravou no Experience (só no modo real) |
| Simulação | O que o sync faria, sem gravar |
| Já estava certo | O lançamento já bate com a tarefa; nada a fazer |
| Ignorado | Não foi processado agora (por exemplo: faltou tempo na rodada, ou a tarefa está sem data ou período) |
| Bloqueado | Uma regra impediu; a coluna **Observação** diz qual |
| Erro | O Experience recusou ou falhou; a **Observação** traz o motivo |

A tabela tem as colunas **Resultado**, **Ação**, **Consultor**, **Data**, **Período**, **Tarefa**, **Cliente**, **FAP**, **Lançamento** e **Observação**. Tocar no nome da tarefa abre a ficha dela.

## 7. O botão na ficha da tarefa

Na ficha de uma tarefa com Apontamento "OS Experience" ou "Hora Dobrada" aparece o quadro **Sync com o Experience**.

- Ele mostra o que foi feito por último, por exemplo: "Lançamento 123456 criado no Experience. · dd/mm/aaaa hh:mm por Fulano". Se a última passada foi simulação, mostra "Última simulação (…)". Se nunca passou: "Ainda não passou pelo sync."
- Quem tem `sync_experience.gerenciar` vê o botão **Sincronizar esta tarefa**. Ele roda o sync só para essa tarefa, no dia dela.
- O botão segue o modo do escritório: em simulação só mostra o que faria; em real grava no Experience, sem pedir confirmação.

## 8. Bloqueios mais comuns

| Observação na linha | O que fazer |
| --- | --- |
| Modelo do projeto "…" ainda não mapeado no app | Nada no app: esse modelo segue pela Central |
| "Fulano" não está vinculado ao projeto no Experience | Inclua o consultor no projeto no Experience e rode de novo |
| "Fulano" é ambíguo no projeto do Experience | Há mais de uma pessoa parecida no projeto; acerte no Experience |
| Pedido não resolvido no projeto | O projeto não tem pedido 110401/110501 liberado, ou tem mais de um e não dá para saber qual usar |
| Lançamento … já tem OS no Experience | O lançamento virou OS e não muda mais pelo sync |
| N lançamentos com a TAG desta tarefa | Há lançamento repetido; confira no Experience |
| Data ou período da tarefa ausente/inválido | Complete a data e o período da tarefa |

## 9. Se algo der errado

- **"Cadastre sua Conta Sankhya em Equipe › ficha › Conta Sankhya para rodar o sync."** Você ainda não tem a conta cadastrada.
- **"A Sankhya recusou o login, por isso nada foi feito."** A senha mudou. Atualize em **Equipe › ficha › Conta Sankhya**.
- **"A Sankhya recusou o último login: aguarde 60 segundos."** Espere um minuto e tente de novo.
- **"Já existe uma rodada do Sync em andamento. Aguarde terminar."** Outra pessoa (ou você) está rodando. Uma rodada travada se libera sozinha em 10 minutos.
- **"Não foi possível falar com o Experience agora"**: falha de rede ou do Experience. Tente mais tarde.
- **"Período de no máximo 31 dias."** ou **"Período até 62 dias de hoje."**: ajuste as datas.
- **"FAP: só o número (4 a 6 dígitos)."**: tire letras e espaços do campo FAP.
- **"A rodada parou antes do fim: rode de novo para o que faltou."**: rode de novo com o mesmo período.
