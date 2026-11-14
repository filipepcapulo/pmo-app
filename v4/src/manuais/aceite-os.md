# Manual do Aceite de OS

Para quem confere e envia o aceite das OS do Experience aos clientes · app PMO v3 (web)

## 1. Onde fica e quem vê

Menu **☰ › Execução › Aceite de OS**. Aparece só para quem tem a permissão `aceite_os.gerenciar` (por padrão, GP; o Admin pode tudo).

A tela faz duas coisas:

- **Conferir**: lê no Experience as OS de cada FAP no período e diz quais estão prontas. Só leitura, nada é enviado.
- **Enviar**: gera um aceite por OS marcada. O Experience manda o e-mail aos aprovadores do cliente. **Não tem como desfazer.**

Para conferir e enviar, o app usa a sua Conta Sankhya. Cadastre-a em **Equipe › ficha › Conta Sankhya**.

## 2. O quadro do envio

No topo, a linha **Envio:** mostra a situação no escritório:

- **desligado (só conferência)**: dá para conferir, mas as OS não podem ser marcadas.
- **liberado**: as OS de FAP pronta podem ser marcadas e enviadas.

Ao lado aparecem o solicitante e quem fez a configuração.

Quem pode configurar vê também o campo **Solicitante (id da pessoa no Experience)** e os botões **Liberar o envio**, ou, com o envio já liberado, **Gravar solicitante** e **Desligar o envio**. Os aceites saem em nome desse solicitante. Antes de liberar, compare uma conferência com a tela do Experience.

## 3. Conferir

1. Informe **De** e **Até**. A tela abre na semana anterior (segunda a domingo).
2. Em **FAPs**, deixe vazio para todas ou digite os números (4 a 6 dígitos) separados por vírgula.
3. Toque em **Conferir**.

Com todas as FAPs a conferência pode levar até 2 minutos. Digitar as FAPs é mais rápido.

Regras do período: a data final não pode passar de hoje, o intervalo é de no máximo 62 dias e de até 400 dias para trás.

Ao terminar, aparece o resumo: quantas prontas, bloqueadas, sem OS no período e quantas OS para VERIFICAR, com "Nada foi enviado.".

Entram as FAPs dos projetos ativos do app e os projetos "Em Andamento" no Experience. Só FAP Em Andamento recebe aceite; as que ficaram fora por isso são listadas na tela.

## 4. Ler o resultado

A linha acima das tabelas diz de quando é a conferência, quem a fez e com qual conta. Em **Conferências anteriores** você abre outra.

### Situação da FAP

| Situação | Significado |
| --- | --- |
| **PRONTA** (verde) | As OS podem ser enviadas. |
| **BLOQUEADA** (vermelho) | Tem algo a corrigir; a coluna **Bloqueios** diz o quê. |
| **VAZIA** (cinza) | Sem OS no período. Fica oculta. |

Bloqueiam a FAP: Realizado fora de :00/:30, contagem diferente do Experience, projeto sem aprovador e OS sem número Sankhya.

Os botões **Prontas e bloqueadas**, **Prontas**, **Bloqueadas** e **Sem OS no período** filtram as duas tabelas. Os contadores mostram **Prontas**, **Bloqueadas**, **OS no período** e **VERIFICAR**.

### Tabela das FAPs

Situação, FAP (abre o projeto), Parceiro, OS, Horas, Aprovadores, Bloqueios e Fora do período.

### Tabela das OS

| Coluna | O que mostra |
| --- | --- |
| **Enviar** | A caixa de marcar, só nas OS que podem ser enviadas. |
| **Realizado** | Em vermelho quando o valor está errado ou vazio. |
| **VERIFICAR** | Pílula laranja com avisos (mais de 8 h sem intervalo, horas quebradas). Só avisa, não bloqueia; passe o mouse para ler. |
| **Período** | "no período" ou "fora (não entra)". |
| **Envio** | "Aceite N enviado", "Aceite N gerado, e-mail falhou" ou "Falhou: motivo". |

As demais colunas são FAP, Parceiro, Nº OS, Data, Executante, Início, Fim, Intervalo, Processo e Solução.

## 5. Enviar o aceite

Uma OS só pode ser marcada quando: o envio está liberado, a FAP está PRONTA na conferência mais recente que a trouxe, a OS está no período e ainda não tem aceite gerado.

1. Marque as OS na coluna **Enviar**, ou toque em **Marcar todas as prontas** (**Desmarcar todas** desfaz).
2. Toque em **Enviar marcadas (N)**.
3. Leia a confirmação: ela informa quantos aceites, de quantas FAPs, e que não tem como desfazer. Confirme só se tiver certeza.

Antes de gerar, o app reconfere a FAP. Ao terminar aparece "Envio concluído: X de Y aceite(s) de OS enviado(s)."; cada OS que falhou gera um aviso próprio.

Enquanto um envio está em andamento, a tela mostra "Envio em andamento desde hh:mm" e o botão fica travado.

### E-mail que falhou

Se a coluna **Envio** mostrar "Aceite N gerado, e-mail falhou", o aceite existe, mas o cliente não recebeu o e-mail. Toque em **Reenviar e-mail**: só o e-mail é reenviado, o aceite não é gerado de novo.

## 6. Histórico de envios

No fim da tela, o quadro **Envios** lista cada tentativa: Quando, FAP, Parceiro, Nº OS, Horas, Aceite, Etapa (Gerar, E-mail ou Reenvio do e-mail), Resultado, Para e Por.

## 7. Atalho pelo projeto

Aberta pelo atalho do projeto, a tela vem com o título "Aceite de OS · FAP N", a FAP já digitada e só os envios daquela FAP.

## 8. Se algo der errado

| Mensagem | O que fazer |
| --- | --- |
| "Cadastre sua Conta Sankhya em Equipe › ficha › Conta Sankhya para usar o Aceite de OS." | Cadastre a conta e tente de novo. |
| "A Sankhya recusou o login, por isso nada foi conferido/enviado. Atualize a senha em Equipe › ficha › Conta Sankhya." | A senha mudou. Atualize na sua ficha. |
| "A Sankhya recusou o último login: aguarde 60 segundos." | Espere um minuto antes de repetir. |
| "Não foi possível falar com o Experience agora: …" | O Experience não respondeu. Tente mais tarde. |
| "FAPs: só os números (4 a 6 dígitos), separados por vírgula." | Corrija o campo **FAPs**. |
| "A data final é antes da inicial." / "Período de no máximo 62 dias." / "Período até 400 dias para trás." | Ajuste **De** e **Até**. |
| "O aceite é das OS já executadas: a data final não pode passar de hoje." | Use uma data final até hoje. |
| "… · incompleta (confira de novo o que faltou)" | A conferência parou antes do fim. Confira de novo, de preferência digitando as FAPs que faltaram. |
| "… · há uma conferência mais nova" | Você está vendo uma conferência antiga. Só a mais recente permite marcar. |
| "Solicitante: o id (número) da pessoa no Experience." | No campo do solicitante, digite só o número. |
| Não consigo marcar nenhuma OS | Veja se o envio está **liberado** e se a FAP está **PRONTA** na conferência mais recente. |
