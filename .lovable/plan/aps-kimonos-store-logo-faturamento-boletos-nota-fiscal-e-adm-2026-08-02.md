# APS Kimonos Store — logo, faturamento, boletos, nota fiscal e admins

## 1. Identidade visual (logo + favicon)

- Subir a imagem enviada como asset e usá-la no header no lugar do quadrado "K", junto do nome da loja.
- Gerar uma versão quadrada 64x64 a partir da mesma arte e salvar em `public/favicon.png`, apontando o `<link rel="icon">` no `__root.tsx` e removendo o `favicon.ico` antigo.
- Usar a mesma arte no rodapé e no drawer mobile para manter consistência.

Observação: o nome exibido continua "Kimono Store" por padrão. Se quiser trocar para "APS Kimonos Store" em todo o site (títulos, SEO, e-mails), é só avisar que ajusto no mesmo passo.

## 2. Nova aba "Faturamento"

Aba no painel admin listando todas as faturas emitidas, com filtro por tipo (com nota fiscal / sem nota fiscal), status e período.

Fluxo de faturar um pedido:
1. Admin abre um pedido em Pedidos → botão "Faturar".
2. Escolhe o tipo:
   - **Sem nota fiscal** → gera um **Recibo / Pedido de Venda** numerado, com dados da loja, cliente, itens, quantidades, valores, descontos, frete, total, forma de pagamento e observações. Layout profissional, imprimível/PDF.
   - **Com nota fiscal** → abre o formulário de nota fiscal (item 4).
3. A fatura fica registrada com número sequencial, valor, data e vínculo ao pedido.

Cada fatura tem tela de detalhe com botão de impressão/PDF e histórico (emitida, paga, cancelada).

## 3. Tela de boletos (a pagar e pagos)

Aba "Boletos" com duas visões: **A pagar** e **Pagos**, mais histórico completo.

- Cadastro manual de boleto: descrição, beneficiário/fornecedor, valor, vencimento, linha digitável (opcional), categoria da despesa, anexo/link do arquivo, observações.
- Ações: marcar como pago (com data e valor pago), reabrir, cancelar, excluir.
- Indicadores no topo: total a pagar, vencendo em 7 dias, vencidos (em vermelho), total pago no mês.
- Filtros por status, período e fornecedor; ordenação por vencimento.
- Boletos vencidos e a vencer também aparecem como alerta no Dashboard.

Sem integração bancária — é controle interno, conforme escolhido.

## 4. Nota fiscal (documento interno modelo DANFE)

Formulário com os campos exigidos pela legislação para uma NF-e modelo 55, preenchidos e validados:

- **Emitente**: razão social, nome fantasia, CNPJ, IE, IM, CRT (regime tributário), endereço completo com código IBGE do município.
- **Destinatário**: nome/razão social, CPF ou CNPJ, IE ou "ISENTO", endereço completo, e-mail e telefone.
- **Identificação**: natureza da operação, série, número, data de emissão e de saída, tipo (entrada/saída), finalidade, consumidor final, presença do comprador.
- **Itens**: código, descrição, NCM, CEST (opcional), CFOP, unidade, quantidade, valor unitário, valor total, desconto, origem da mercadoria, CST/CSOSN, base de cálculo, alíquotas e valores de ICMS, IPI, PIS e COFINS.
- **Totais**: base de cálculo, ICMS, produtos, frete, seguro, desconto, outras despesas, tributos aproximados (Lei 12.741) e total da nota.
- **Transporte**: modalidade do frete, transportadora, placa/UF, volumes, peso bruto e líquido.
- **Pagamento**: forma, valor, parcelas.
- **Informações complementares** e observações fiscais.

Configuração do emitente fica salva uma vez e é reaproveitada em toda nota.

A nota gerada abre em layout DANFE (retrato, com quadros de emitente, destinatário, cálculo do imposto, transportador, dados dos produtos e dados adicionais), pronta para impressão/PDF. O documento traz aviso de que **não possui validade fiscal** enquanto não for transmitido à SEFAZ — para transmissão oficial seria necessário certificado digital A1 e um provedor (Focus NFe, NFe.io etc.), que podemos integrar depois.

**Na aba Produtos**: cada produto ganha os campos fiscais (NCM, CEST, CFOP padrão, origem, CST/CSOSN, unidade, alíquotas) e, na listagem/edição, uma ação **"Gerar nota"** que abre a nota já pré-preenchida com aquele item.

## 5. Gestão de administradores

Nova aba "Administradores":
- Lista de usuários com nome, e-mail, data de cadastro e papel atual.
- Busca por e-mail/nome.
- Ações: **Promover a administrador** e **Remover administrador**.
- Proteções: o admin não pode remover o próprio acesso, e o sistema impede ficar sem nenhum administrador.
- Registro de auditoria de quem promoveu/removeu e quando.

## Detalhes técnicos

**Banco (migração única, com GRANTs + RLS restrita a admin):**
- `company_settings` — dados fiscais do emitente (registro único).
- `invoices` — `order_id`, `type` (`receipt` | `nfe`), `number` sequencial por tipo, `status`, valores, `issued_at`, `payload jsonb` com o snapshot fiscal completo.
- `invoice_items` — snapshot dos itens com campos fiscais (NCM, CFOP, CST, bases e tributos).
- `bills` (boletos) — fornecedor, descrição, valor, vencimento, linha digitável, categoria, `status` (`pending`/`paid`/`cancelled`), `paid_at`, `paid_amount`, anexo.
- `products` — colunas fiscais adicionais (`ncm`, `cest`, `cfop`, `origin`, `cst`, `unit`, alíquotas), todas opcionais.
- `role_audit` — histórico de mudanças de papel.
- Função `admin_set_role(_user_id, _role)` `SECURITY DEFINER`, restrita a admins, que valida "não remover a si mesmo" e "sempre existir ao menos um admin", e grava auditoria.
- Função `admin_list_users()` `SECURITY DEFINER` retornando id, nome, e-mail e papel — a listagem de usuários passa por ela, sem expor `profiles` a terceiros.
- Sequências/numeração de faturas geradas no banco para evitar duplicidade.

**Frontend:**
- Novas rotas em `src/routes/_authenticated/admin/`: `faturamento.tsx`, `faturamento.$id.tsx`, `nota-fiscal.tsx` (formulário), `boletos.tsx`, `administradores.tsx`; abas adicionadas no `route.tsx`.
- Botão "Faturar" em `pedidos.$id.tsx` e "Gerar nota" em `produtos.tsx`/`produtos.$id.tsx`.
- Impressão via layout dedicado com CSS `@media print` (sem dependência nova).
- Validações com Zod em `src/lib/fiscal-validation.ts`: CPF/CNPJ com dígito verificador, CEP, NCM (8 dígitos), CFOP (4 dígitos), UF, valores monetários.
- Formatadores fiscais reaproveitando `src/lib/format.ts`.
