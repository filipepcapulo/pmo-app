# Manual do Reembolso KM

Para quem usa o Reembolso KM · app PMO v3 (web)

## 1. Onde fica e quem vê

Menu **☰ › Execução › Reembolso KM**. Aparece só para quem tem a permissão `reembolso.usar` (por padrão, só o Admin). É um módulo pessoal: você classifica as visitas da sua própria agenda.

Como funciona, em resumo:

1. As agendas chegam da Google Agenda.
2. Você classifica cada uma: presencial, remoto/interno ou ignorar.
3. As presenciais somam o KM do cliente.
4. No fim do período você gera o relatório em PDF.

A tela tem cinco abas: **Pendentes**, **Agenda**, **Clientes**, **Relatório** e **Ajustes**.

## 2. Sincronização com a Google Agenda

No topo, uma linha informa a última sincronização. Toque em **Sincronizar agora** para pedir uma atualização: aparece "Pedido enviado: a agenda atualiza em até 5 minutos.".

Se aparecer "Última sincronização falhou: …" em vermelho, a agenda não foi atualizada; tente **Sincronizar agora** de novo.

## 3. Aba Pendentes

Mostra o que falta classificar. O número ao lado do nome da aba é a quantidade pendente.

- **A classificar**: agendas até hoje sem classificação, agrupadas por dia.
- **Próximos dias**: agendas futuras. Toque no título para abrir a lista e em **Classificar** para adiantar.

Cada cartão mostra o título, o horário, o local, a descrição e o link do Google Meet (quando há). Abaixo, o cliente da visita com o KM dele.

| Botão | O que faz |
| --- | --- |
| **🚗 Presencial** | Conta o KM do cliente escolhido. Exige cliente. |
| **💻 Remoto/Interno** | Não conta KM. |
| **Ignorar** | Tira a agenda da conta (compromisso que não é atendimento). |
| **Detalhes…** | Abre **Classificar agenda**, com KM próprio e observação. |

Dicas:

- O app já sugere o cliente quando o título ou o local da agenda casa com um cadastro. Troque na lista se estiver errado.
- Se o cliente não está na lista, escolha **+ Cadastrar cliente…**.
- Se o cliente escolhido está sem KM, o app pede o KM antes de marcar como presencial.

Quando não sobra nada, aparece "✅ Tudo classificado!" com o botão **Ir para o relatório**.

### Classificar agenda (Detalhes…)

- **Cliente**: o cliente da visita.
- **KM desta visita (presencial)**: preencha só se for diferente do cadastro. Vazio usa o KM do cliente.
- **Observação**: texto livre (até 300 caracteres).

Feche com **Presencial**, **Remoto/Interno** ou **Ignorar**.

## 4. Aba Agenda

Lista todas as agendas do mês, já classificadas ou não.

- **‹** e **›** trocam o mês. Ao lado aparece o total de KM presenciais do mês.
- Os filtros **Todas**, **A classificar**, **Presencial**, **Remoto/Interno** e **Ignorado** mostram a quantidade de cada situação.
- Toque numa linha para reclassificar (abre **Classificar agenda**).
- A linha avisa quando a agenda é "visita manual" ou "saiu da agenda" (foi removida da Google Agenda).

### Visita manual

Para uma visita presencial que não está na Google Agenda:

1. Toque em **+ Visita manual**.
2. Informe **Data** e **Cliente** (obrigatórios). **Início**, **Fim**, **Título**, **KM** e **Observação** são opcionais; sem KM, vale o do cliente.
3. Toque em **Adicionar**. A visita entra como presencial.

Para apagar, abra a visita manual na lista e toque em **Excluir visita**.

## 5. Aba Clientes

Cadastro dos clientes com o KM de cada um.

- **Buscar cliente…** filtra por nome, unidade ou palavra-chave.
- **+ Cliente** abre o cadastro. Tocar num cliente abre para alterar.

| Campo | Para que serve |
| --- | --- |
| **Nome** | Obrigatório. |
| **Unidade** | Quando o cliente tem mais de um endereço (ex.: outra cidade). |
| **KM (ida e volta)** | A distância que conta em cada visita presencial. |
| **Palavras-chave** | Separadas por vírgula. A agenda com uma delas no título ou no local casa com este cliente. Vazio = casa pelo nome. |
| **Observação** | Texto livre. |
| **Ativo** | Desmarque para o cliente sair das listas de escolha. |

**Excluir**: se o cliente já tem visitas presenciais, ele é só inativado.

O aviso "⚠ N cliente(s) sem KM cadastrado." aparece nas outras abas; **Completar** leva para cá.

### Agendas sem cliente cadastrado

Lista os nomes que aparecem em títulos no formato "Nome - assunto" e não casaram com nenhum cliente.

- **Cadastrar**: abre o cadastro com o nome preenchido. As agendas dele voltam para **Pendentes**.
- **Não é cliente**: as agendas com esse nome passam a ser ignoradas.

Em **Marcados como não cliente**, toque em **desfazer** para o nome voltar às sugestões.

## 6. Aba Relatório

1. Escolha o período: **Mês anterior**, **Mês atual** ou **Período** (datas livres). Até o dia 10, a tela abre no mês anterior; depois, no mês atual.
2. Confira os totais: **Visitas**, **KM** e **Reembolso**.
3. Veja os avisos: agendas do período ainda sem classificação (**Classificar** leva aos Pendentes) e valor por KM não definido (**Definir** leva aos Ajustes).
4. Toque em **Gerar PDF**. Abre uma janela com o relatório e a impressão do navegador: escolha "Salvar como PDF".

Abaixo ficam as **Visitas presenciais** do período e, em **Gerados anteriormente**, os relatórios já emitidos (período, data, KM e valor).

Sem valor por KM definido, o PDF sai só com os KM.

## 7. Aba Ajustes

| Grupo | Campos |
| --- | --- |
| **Relatório** | **Seu nome (sai no PDF)**, **Cargo / área**, **Empresa**, **Valor por KM (R$)** e **E-mail padrão para o relatório**. |
| **Agenda** | **Sincronizar a partir de** (vazio = desde o 1º dia do mês anterior), **Palavras que ignoram a agenda** (separadas por vírgula) e **Incluir eventos de dia inteiro**. |
| **Aviso diário** | **Horário do aviso** (6h a 22h) e **Avisar no fim de semana**. |

Toque em **Salvar ajustes**.

## 8. Dúvidas comuns

**"Escolha o cliente da visita."**
Para marcar como presencial é preciso escolher o cliente.

**"Informe o KM de Cliente Exemplo para continuar."**
O cliente está sem KM. Preencha **KM (ida e volta)** e salve; a visita é marcada em seguida.

**Uma agenda não aparece.**
Toque em **Sincronizar agora** e aguarde até 5 minutos. Confira em **Ajustes** a data de **Sincronizar a partir de**, as **Palavras que ignoram a agenda** e se é evento de dia inteiro. Veja também, na aba **Agenda**, o filtro **Ignorado**.

**Classifiquei errado.**
Abra a aba **Agenda**, toque na linha e classifique de novo.

**Toquei em Gerar PDF e nada abriu.**
O navegador pode ter bloqueado a janela. Libere pop-ups para o app e toque de novo.

**O valor do reembolso está zerado.**
Defina o **Valor por KM (R$)** em **Ajustes**.
