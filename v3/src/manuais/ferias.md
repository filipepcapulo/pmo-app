# Manual do Controle de Férias

Para quem acompanha os prazos de férias da equipe (GPs e Admin) · app PMO v3 (web)

## 1. Onde fica e quem vê

Menu **☰ › Execução › Controle de Férias**. Aparece só para quem tem a permissão `ferias.ver` (por padrão, Admin e GP).

A tela cruza a programação de férias da contabilidade (prazos legais, art. 134/137 da CLT) com as férias já agendadas no app. Mostra quem está atrasado ou perto do limite e quem já agendou. É uma tela de consulta: só o administrador troca a programação.

## 2. Os cartões de status

No topo há cinco contadores. Tocar em um filtra a lista por aquele status; tocar de novo tira o filtro.

| Status | Cor | Quando |
| --- | --- | --- |
| **Atrasado** | Vermelho | O limite para gozo já passou e não há férias agendadas. |
| **Crítico** | Laranja | Faltam até 60 dias para o limite. |
| **Atenção** | Amarelo | Faltam até 120 dias para o limite. |
| **Agendado** | Verde | Há férias agendadas que cobrem o período. |
| **Ok** | Cinza | Faltam mais de 120 dias. |

Abaixo dos contadores, uma linha informa a fonte da programação, a data de referência, e quando e por quem ela foi carregada.

## 3. A lista de colaboradores

Use **Buscar colaborador** para achar pelo nome. A lista vem em ordem de urgência: atrasados primeiro, depois críticos, atenção, agendados e ok; dentro de cada grupo, quem tem menos dias até o limite vem antes.

Cada cartão mostra:

- o nome e a pílula do status;
- **Saldo N dia(s)**: dias de direito menos os já gozados do período;
- **Limite p/ gozo** e quantos dias faltam (ou "venceu há N dias");
- a ação recomendada, por exemplo "Agendar N dia(s) nas próximas semanas — prazo limite dd/mm/aaaa." ou "Férias agendadas: dd/mm/aaaa a dd/mm/aaaa".

Quem está **Agendado**, mas com o prazo já apertado, mostra duas pílulas: a verde e a do prazo (Atenção, Crítico ou Atrasado).

Toque no cartão para abrir o detalhe:

- **Admissão**;
- **Período aquisitivo**;
- **Férias agendadas** (quando houver);
- **Períodos na programação**: cada período com limite, dias de direito, gozados e saldo.

## 4. Como o app decide

- De cada colaborador, o app olha o período com saldo que tem o limite mais próximo.
- O status sai dos dias que faltam até o limite legal desse período.
- As férias agendadas vêm das ausências do tipo Férias lançadas para a pessoa. A ligação com a programação é feita pelo nome.
- Férias agendadas contam para o período quando começam entre 30 dias antes do início do período aquisitivo e o limite para gozo.

## 5. Carregar a programação (só administrador)

O botão **Carregar programação (JSON)** aparece só para o administrador.

1. Toque no botão e escolha o arquivo `.json` da programação.
2. O app confere o arquivo antes de enviar.
3. Se estiver certo, aparece "Programação carregada: N colaboradores." e a tela atualiza.

O arquivo precisa ter a lista `colaboradores`; cada um com `nome` e `periodos`; cada período com `inicio_aquisitivo`, `fim_aquisitivo` e `limite_gozo` (datas no formato aaaa-mm-dd) e `dias_direito` e `dias_gozados` (números). A carga nova substitui a anterior.

## 6. Dúvidas comuns

**A tela mostra "A programação de férias ainda não foi carregada."**
Nenhuma programação foi enviada ainda. Peça ao administrador para carregar.

**Aparece "O arquivo não é um JSON válido."**
O arquivo escolhido não é um JSON. Confira se é o arquivo certo.

**Aparece "Programação com problemas: …"**
O app lista até dez problemas, por exemplo "sem nome.", "sem períodos.", "limite_gozo deve ser aaaa-mm-dd." ou "dias_direito deve ser número.". Corrija o arquivo e carregue de novo. Nada é gravado enquanto houver problema.

**A pessoa agendou férias, mas continua como Crítico ou Atrasado.**
Confira se a ausência dela está lançada com o tipo Férias, se o nome bate com o da programação e se a data de início cai dentro do prazo do período (seção 4).

**A busca não acha ninguém ("Ninguém encontrado.").**
Confira o texto e se há um cartão de status selecionado filtrando a lista.
