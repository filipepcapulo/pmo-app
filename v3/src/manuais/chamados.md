# Manual de Chamados

Para a Triagem, GPs, Líderes Tech e quem abre chamados · app PMO v3 (web)

*Os exemplos deste manual são fictícios ("Cliente Exemplo", "Fulano").*

## 1. Onde fica e quem vê

No menu (☰), **Execução › Chamados**. Todos os perfis têm o item no menu.

- Admin, GP, Líder Tech e Triagem veem todos os chamados.
- O Consultor vê os chamados que abriu e os das demandas em que tem tarefa.

O que cada um faz, pelo padrão dos perfis (o Admin pode mudar as permissões):

| Ação | Quem pode |
| --- | --- |
| **+ Chamado** e registrar interação | Todos os perfis |
| **Triagem**, **Recusar**, **Reabrir**, **Configurar**, relacionar chamados | Admin, GP, Líder Tech e Triagem |
| **Alocar** e **+ Tarefa** | Admin, GP e Líder Tech |
| Aba **Portal Sankhya** | Admin, GP e Líder Tech |

A tela tem as abas **Busca**, **Backlog e alocação**, **Indicadores** e **Portal Sankhya**.

## 2. Abrir um chamado

Toque em **+ Chamado**. O formulário tem quatro partes; preencha tudo o que a triagem precisa para alocar sem voltar ao cliente. O rascunho fica guardado neste navegador até você abrir o chamado.

### 1 · Cliente e solicitante

- **Cliente** (obrigatório). O chamado entra como subdemanda de "Atendimento Avulso da Base" do cliente. Se o cliente ainda não tiver essa demanda ou o projeto Avulso, o app cria.
- **Projeto Avulso**: só aparece quando o cliente tem mais de um.
- **Solicitante (usuário no cliente)** e **Contato do solicitante** (telefone, WhatsApp ou e-mail).
- **Origem**. Se a origem for Service Desk, o **Nº do ticket** é obrigatório. **OS Sankhya** é opcional.

### 2 · Demanda

- **Título (resumo em uma linha)**: mínimo de 10 caracteres.
- **Tipo de solicitação**: Erro / incidente, Dúvida / orientação, Configuração / parametrização, Melhoria / personalização, Relatório / dashboard ou Integração / importação.
- **Ambiente**: Produção, Teste / homologação ou Produção e teste.
- **Etapa**: Atendimento avulso (Backlog Base) ou Personalização / Customização (Backlog Desenvolvimento). O app sugere pela escolha do tipo.
- **Descrição detalhada**: mínimo de 50 caracteres (o contador aparece abaixo).
- **Onde ocorre / passos para reproduzir**: obrigatório quando o tipo é erro.
- **Resultado esperado**.

### 3 · Prioridade e atendimento

- **Impacto** (Alto, Médio, Baixo) e **Urgência** (Alta, Média, Baixa). O app calcula a prioridade e mostra na hora.
- **Quem é afetado**: Um usuário, Um setor / equipe, Toda a empresa ou Clientes / fornecedores.
- **Prazo desejado** (opcional; com prazo, o **Motivo do prazo** é obrigatório) e **Horas estimadas** (se souber).
- **Forma de atendimento**: Remoto, Interno ou Presencial no cliente.

| Impacto | Urgência Alta | Urgência Média | Urgência Baixa |
| --- | --- | --- | --- |
| Alto | Urgente | Alta | Normal |
| Médio | Alta | Normal | Baixa |
| Baixo | Normal | Baixa | Baixa |

### 4 · Anexos

Toque em **+ Adicionar arquivos**: até 10 arquivos, de até 10 MB cada. Sem anexo, preencha **Sem anexo? Diga por quê**.

Toque em **Abrir chamado**. O app avisa "Chamado #N aberto." e abre a ficha.

## 3. As situações

| Situação | Quando |
| --- | --- |
| **Nova** | Acabou de ser aberto |
| **Em triagem** | Alguém gravou a triagem sem concluir, ou o chamado foi reaberto |
| **Em atendimento** | A triagem foi concluída ou já existe agenda (tarefa) |
| **Concluído** | A demanda do chamado foi concluída |
| **Cancelado** | A demanda do chamado foi cancelada |
| **Recusado** | A triagem recusou, com motivo |

## 4. O SLA

Cada chamado tem dois prazos, contados da abertura em horas úteis: **1ª resposta** e **Solução**. A 1ª resposta fica registrada quando alguém registra a primeira interação.

- "Faltam X": dentro do prazo. Muda de cor quando falta pouco (até 1 hora ou 25% do prazo).
- "Vencido há X": passou do prazo.
- "No prazo" ou "Fora: X": o prazo já foi cumprido ou estourado.

Nas listas, a coluna **SLA** mostra a 1ª resposta enquanto ninguém respondeu; depois, a solução. Mudar a prioridade recalcula o SLA desde a abertura.

## 5. Aba Busca

- Busque por número, cliente, assunto, ticket, solicitante ou texto de interação e toque em **Buscar**.
- **Situação**: **Abertos** (padrão), **SLA vencido**, **Todos** ou uma situação específica.
- **Prioridade** e **Fila** (Backlog Base ou Desenvolvimento).
- **Por página**: escolha quantos chamados ver por vez e use ‹ › para navegar.

Toque no número ou no assunto para abrir a ficha. "com agenda" indica que o chamado já tem tarefa.

## 6. Aba Backlog e alocação

A fila dos chamados abertos, por prioridade e depois por idade (o mais antigo primeiro). Mostra também a **Idade (dias)**.

- Toque no título de uma coluna para ordenar; de novo inverte; na terceira vez volta à ordem padrão. A escolha fica guardada para você.
- **Alocar** abre a **Nova tarefa** já com a demanda do chamado. Escolha consultor, data e período e grave. Criar a agenda encerra a triagem: o chamado passa a **Em atendimento**.

## 7. A ficha do chamado

No topo: cliente, projeto, número, assunto e situação. Os dados mostram os dois relógios de SLA, prioridade, fila, tipo, categoria, solicitante, origem, ambiente, afetados, forma de atendimento, prazo desejado, responsável e horas. Em **Demanda**, **Abrir** leva para a ficha da demanda do chamado.

Botões:

- **☆ Favoritar**: põe o chamado nos favoritos do menu lateral.
- **Extrato**: monta o texto para colar no WhatsApp do cliente (situação, prioridade, agenda e histórico visível). Toque em **Copiar**. Interações internas não entram.
- **+ Tarefa**: agenda o atendimento (chamado aberto).
- **Triagem**, **Recusar** e **Reabrir**: veja a seção 8.

Abas:

- **Interações**: escolha o canal (WhatsApp, E-mail, Telefone ou Interno), escreva e toque em **Registrar**. **Visível ao cliente** marcado faz a interação entrar no extrato; o canal Interno nunca entra. **Resposta pronta…** preenche o texto com um modelo.
- **Tarefas**: as agendas do chamado.
- **Anexos**: **+ Anexar** (até 20 MB por arquivo); toque no nome para abrir.
- **Relacionados**: os chamados ligados a este. Em **Abertos do mesmo cliente**, a triagem usa **Relacionar** ou **É duplicado deste** (o chamado atual é recusado como duplicado). O **×** desfaz a ligação.
- **Portal Sankhya**: os chamados do portal ligados a este chamado.

## 8. Triagem

Toque em **Triagem** na ficha.

1. Revise o **Assunto**, o **Tipo** e a **Categoria** (o app mostra as já usadas).
2. Ajuste **Impacto** e **Urgência**: a **Prioridade** é sugerida pela tabela da seção 2, mas você pode trocar.
3. Escolha a **Fila**, o **Responsável** e as **Horas previstas**.
4. **Gravar** guarda sem concluir: o chamado novo passa a **Em triagem**. **Concluir triagem** passa a **Em atendimento**.

**Recusar** exige o **Motivo** (mínimo de 5 caracteres) e cancela a demanda do chamado. O motivo fica visível na ficha. **Reabrir** devolve o chamado recusado para **Em triagem**.

### Virar demanda

O chamado já nasce como demanda: uma subdemanda de "Atendimento Avulso da Base" do cliente. Por isso ele aparece em **Execução › Demandas** (tipo Chamado) e no backlog da Agenda da equipe. O assunto, o responsável, as horas previstas e a prioridade da triagem vão para essa demanda. Concluir ou cancelar a demanda conclui ou cancela o chamado.

### Configurar

Quem faz triagem tem o botão **Configurar**:

- **SLA em horas úteis**: horas de 1ª resposta e de solução por prioridade (seg–sex, 08h–12h e 14h–18h, sem feriados). **Gravar SLA**. Vale para chamados abertos ou reclassificados daí em diante.
- **Respostas prontas**: **+ Resposta pronta**, com **Título** e **Texto**. Use {numero}, {cliente}, {solicitante} e {titulo} no texto.

## 9. Aba Indicadores

Escolha **Chamados** ou **WhatsApp (Total Chat)**. Em Chamados, defina **De** e **Até** (padrão: últimos 30 dias). Os quadros: Abertos agora, Em triagem, SLA vencido, Abertos no período, Resolvidos no período, 1ª resposta no SLA, Solução no SLA e os tempos médios de resposta e de solução. Abaixo, as barras **Por tipo**, **Por prioridade** e **Por fila**.

## 10. Aba Portal Sankhya

Acompanha os chamados que o time abriu no portal de suporte da Sankhya. É só leitura: nada é respondido no portal pelo app.

### Cadastrar

1. Em **Links ou números (um ou vários)**, cole os links ou os números dos chamados. Repetido não duplica.
2. Se quiser, informe **Parceiro** e **Próximo acompanhamento**.
3. Toque em **Cadastrar**. O app já tenta ler o chamado no portal.

A leitura automática roda de hora em hora nos dias úteis. **Atualizar todos pelo portal** lê na hora.

### Os filtros e os sinais

Filtros: **Pedem atenção**, **Resposta nova**, **Aguardando você**, **Vencidos**, **Parados**, **Em andamento**, **Resolvidos** e **Todos**.

Cada cartão mostra o número (abre o portal), o parceiro, o status, a última resposta e os sinais: **Resposta nova**, **Aguardando você**, **Acompanhamento vencido** e **Parado N dias**.

### Ações no cartão

- **Vi a resposta**: tira o sinal de resposta nova. **Vi todas as respostas** faz isso em todos.
- **Atualizar**: lê só este chamado no portal.
- **Atualizar à mão**: quando o portal não aceita a leitura, copie de lá o **Status**, o **Assunto** e a **Última resposta** e toque em **Gravar**.
- **Próximo acompanhamento**: **+1**, **+3**, **+7** dias ou escolha a data.
- **Anotação**: uma nota sua no cartão.
- **Chamado do app**: informe o número do chamado do app para ligar os dois (vazio desliga). O chamado do portal passa a aparecer na aba **Portal Sankhya** da ficha.
- **Abrir no portal**.
- **Excluir**: tira o chamado da lista. Nada muda no portal.

## 11. Se algo der errado

| Mensagem | O que fazer |
| --- | --- |
| "Preencha: …" | O app lista o que falta no Novo chamado; os campos ficam marcados |
| "título (mín. 10 caracteres)" / "descrição (mín. 50 caracteres)" | Escreva mais |
| "prazo (data já passou)" | Escolha uma data de hoje em diante |
| "anexos (ou a justificativa de não ter)" | Anexe um arquivo ou explique em **Sem anexo? Diga por quê** |
| "Arquivo passa de 10 MB." | Reduza o arquivo antes de anexar no Novo chamado |
| "informe o motivo da recusa" | O motivo precisa de ao menos 5 caracteres |
| "reabra o chamado antes de alterar" | Chamado recusado: use **Reabrir** primeiro |
| "Não deu para copiar: selecione o texto." | Selecione o extrato e copie à mão |
| Botão **+ Chamado** apagado | As opções ainda estão carregando; aguarde |
| Aviso em vermelho na leitura do Portal Sankhya | O portal não aceitou a leitura automática: use **Atualizar à mão** |
