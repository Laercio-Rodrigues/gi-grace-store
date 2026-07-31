# Auditoria de segurança — Kimono Store Pro

Revisei as políticas do banco, as permissões (grants), as funções e os fluxos do app (carrinho, checkout, admin, auth). A base está boa: RLS ativo em todas as tabelas, papéis em tabela separada com `has_role`, dados de usuário isolados por `auth.uid()`. Os problemas reais estão na **lógica de compra feita no navegador**.

## Riscos encontrados (verificados)

### 1. Crítico — preço e total do pedido vêm do navegador
No checkout, o app insere direto em `orders` o `subtotal`, `shipping` e `total` calculados no cliente, e em `order_items` o `price` de cada item. A política de inserção só confere que o pedido é do próprio usuário — não confere valores. Qualquer pessoa pode criar um pedido de R$ 0,01.

### 2. Crítico — cupons são públicos
A política "Public read active coupons" permite listar **todos** os cupons ativos. Basta uma requisição para descobrir todos os códigos de desconto. Além disso, o desconto é aplicado no cliente e nem é gravado no pedido.

### 3. Alto — estoque não é reservado nem validado
Nada decrementa `product_sizes.stock` ao finalizar o pedido, e não há validação de estoque no servidor. Dá para comprar item esgotado ou vender o mesmo item várias vezes.

### 4. Médio — confirmação automática de e-mail ligada
Contas são criadas sem verificar o e-mail (foi ligado para destravar seus testes). Permite cadastro em massa e uso de e-mails de terceiros.

### 5. Médio — avaliações sem compra verificada
Qualquer usuário logado pode avaliar qualquer produto, quantas vezes quiser.

### 6. Baixo — alerta do linter sobre `has_role`
É intencional: as políticas RLS precisam que usuários logados executem essa função. Já está registrado na memória de segurança.

## O que proponho fazer

**Etapa 1 — Fechar o fluxo de compra (recomendado começar por aqui)**
- Criar uma função de servidor `criarPedido` que recebe só `[{ product_id, size_id, quantity }]` + endereço + código de cupom.
- No servidor: buscar preços reais no banco, validar estoque, validar e aplicar o cupom, calcular subtotal/frete/desconto/total, gravar pedido e itens, decrementar estoque — tudo em uma função de banco transacional.
- Bloquear inserção direta: `orders` e `order_items` passam a ser gravados só por essa função; o cliente perde o direito de inserir.

**Etapa 2 — Cupons privados**
- Remover leitura pública de `coupons`; criar função de validação que recebe o código e devolve apenas "válido + percentual". Admin continua gerenciando tudo.

**Etapa 3 — Endurecer auth e avaliações**
- Reativar confirmação de e-mail (aviso: exige confirmar no e-mail para entrar).
- Limitar avaliações: uma por usuário/produto, e apenas quem tem pedido entregue com aquele produto.

**Etapa 4 — Higiene geral**
- Validação com zod em todos os formulários (endereço, produto no admin, cupom) com limites de tamanho.
- Confirmar que nenhuma rota pública expõe dados de outros usuários (`profiles`, `addresses`, `orders` já estão corretos).

## Detalhes técnicos

- Nova função de servidor em `src/lib/orders.functions.ts` usando `createServerFn` + `requireSupabaseAuth`; a lógica pesada vira uma função SQL `SECURITY DEFINER` (`public.create_order`) para garantir atomicidade entre pedido, itens e baixa de estoque.
- Migração: `REVOKE`/remover policy de INSERT do cliente em `orders`/`order_items`; remover policy de leitura pública em `coupons` e criar `public.validate_coupon(code text)` com `EXECUTE` só para `authenticated`; índice único `(user_id, product_id)` em `reviews`.
- Checkout e carrinho passam a chamar as funções de servidor em vez de escreverem direto via PostgREST.
- Nada muda no visual das páginas.

Posso executar as 4 etapas de uma vez ou só a Etapa 1 primeiro — me diga na aprovação.
