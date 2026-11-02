# Deploy no Easypanel

## 1. Variáveis de ambiente (serviço da aplicação)

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | `postgresql://USUARIO:SENHA@NOME-DO-SERVICO-POSTGRES:5432/BANCO?schema=public` |
| `AUTH_SECRET` | resultado de `openssl rand -base64 48` |
| `APP_URL` | `https://seu-dominio.com.br` (sem barra no final) |
| `VITE_SITE_URL` | igual ao `APP_URL`. **Precisa estar também em "Build args"**: é lida na hora do build |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | primeiro administrador (criado pelo seed) |
| `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` | Mercado Pago (opcional para testes de catálogo) |

## 2. Popular a loja

**Opção A — uma vez, pelo console do Easypanel** (aba *Console* do serviço):

```sh
npx prisma db seed
```

**Opção B — automático no start:** defina `SEED_ON_START=true`, faça o deploy, e depois volte para `false`.

O seed é idempotente: rodar de novo não duplica produtos, cupons nem clientes.

- `SEED_DEMO=false` cria só o catálogo (use em produção real).
- Clientes de teste (com `SEED_DEMO=true`): `cliente@teste.com`, `maria@teste.com`, `joao@teste.com`, senha `Teste@123` (ou o valor de `DEMO_PASSWORD`).
- Cupons de teste: `BEMVINDO10`, `KIMONO15`, `BLACKAPS20`, `FRETEZERO`.

## 3. Depois de mudar `VITE_SITE_URL`

Faça um **novo deploy com rebuild** (não basta reiniciar o container).

## 4. Mercado Pago

- Webhook: `https://seu-dominio.com.br/api/mercadopago/webhook` (evento *Pagamentos*).
- Sem `MP_ACCESS_TOKEN` o checkout fica sem forma de pagamento. Para testar o fluxo sem o Mercado Pago, use `ALLOW_CASH_PICKUP=true` (pagamento na loja).
