# Kimono Jiu-Jitsu Hub

PRD — E-commerce de Kimonos de Jiu-Jitsu (Lovable + Supabase)

Nome do Projeto

Kimono Store Pro

## CONTEXTO / PROPÓSITO

Desenvolver um e-commerce moderno, profissional e de alta performance especializado na venda de Kimonos de Jiu-Jitsu, faixas, rash guards, camisetas, acessórios e equipamentos para praticantes da arte suave.

O sistema será desenvolvido utilizando o Lovable como plataforma principal de desenvolvimento, com Supabase como banco de dados, autenticação e armazenamento de arquivos.

O objetivo é criar uma loja extremamente rápida, responsiva e otimizada para conversão, oferecendo uma experiência semelhante às grandes lojas virtuais como Nike, Adidas, Tatami Fightwear, Kingz, Venum e Atama.

O público-alvo inclui:

Atletas iniciantes

Atletas intermediários

Competidores

Professores

Academias

Revendedores

O foco principal deve ser:

Excelente experiência do usuário (UX)

Interface premium

Performance

SEO

Conversão em vendas

Escalabilidade

## DIRETRIZES DE LAYOUT

Design

Criar uma interface extremamente moderna.

Estilo:

Minimalista

Premium

Esportivo

Elegante

Inspirado em:

Nike

Apple

Venum

Kingz

Tatami

RVCA

Mobile First

Todo o sistema deve ser desenvolvido priorizando dispositivos móveis.

Posteriormente adaptar para:

Tablet

Desktop

Tema

Suporte completo para:

Light Mode

Dark Mode

Detectar automaticamente o tema do dispositivo.

Permitir alteração manual.

Paleta de cores

Primária

Preto (#111111)

Secundária

Branco (#FFFFFF)

Cor destaque

Vermelho (#D90429)

Cor de ação

Azul (#2563EB)

Cinzas suaves para backgrounds.

Tipografia

Utilizar fontes modernas.

Preferência:

Inter

Poppins

Componentes

Botões com animações suaves.

Cards elevados.

Hover elegante.

Sombras discretas.

Bordas arredondadas.

Micro animações.

Loading Skeleton.

Lazy Loading.

Transições suaves.

## FUNCIONALIDADES

Loja

Catálogo de produtos

Busca inteligente

Pesquisa por nome

Pesquisa por categoria

Pesquisa por marca

Pesquisa por tamanho

Pesquisa por cor

Pesquisa por preço

Filtros:

Marca

Tamanho

Peso recomendado

Faixa

Categoria

Cor

Preço

Ordenação:

Mais vendidos

Menor preço

Maior preço

Mais recentes

Promoções

Produtos

Cada produto deve possuir:

Nome

Slug

Marca

Categoria

Descrição completa

Especificações técnicas

Guia de tamanhos

Peso

Material

Cor

Fotos ilimitadas

Vídeos

Estoque

SKU

Código interno

Preço

Preço promocional

Avaliações

Perguntas

Carrinho

Adicionar produto

Remover produto

Alterar quantidade

Cupom de desconto

Calcular frete

Salvar carrinho

Favoritos

Usuário poderá salvar produtos.

Checkout

Fluxo simples.

Resumo do pedido.

Endereço.

Frete.

Pagamento.

Confirmação.

Minha Conta

Cadastro

Login

Logout

Editar perfil

Alterar senha

Endereços

Histórico de pedidos

Produtos favoritos

Cupons

Avaliações

Painel Administrativo

Dashboard

Cadastrar produto

Editar produto

Excluir produto

Cadastrar categoria

Cadastrar marca

Gerenciar estoque

Pedidos

Clientes

Cupons

Relatórios

Banner da Home

Promoções

Avaliações

Perguntas dos clientes

Controle de usuários

SEO

URL amigável

Meta Title

Meta Description

Open Graph

Schema.org

Sitemap

Robots

Canonical

Performance

Lazy Loading

Image Optimization

Infinite Scroll

Cache

Compressão

## ESTRUTURA DAS PÁGINAS

Home

Banner principal

Lançamentos

Mais vendidos

Promoções

Categorias

Marcas

Produtos em destaque

Newsletter

Rodapé completo

Produtos

Grid responsivo

Filtros laterais

Ordenação

Busca

Paginação infinita

Página do Produto

Galeria de imagens

Zoom

Vídeo

Descrição

Tabela de tamanhos

Avaliações

Perguntas

Produtos relacionados

Produtos semelhantes

Botão Comprar

Botão Favoritar

Compartilhar

Carrinho

Resumo

Cupom

Frete

Subtotal

Total

Continuar Comprando

Finalizar Compra

Checkout

Identificação

Entrega

Pagamento

Resumo

Confirmação

Minha Conta

Perfil

Pedidos

Favoritos

Endereços

Senha

Configurações

Painel Administrativo

Dashboard

Produtos

Categorias

Marcas

Pedidos

Clientes

Cupons

Relatórios

Configurações

Login

Entrar

Criar conta

Recuperar senha

Cadastro

Nome

Email

Senha

Telefone

Contato

Formulário

WhatsApp

Mapa

Redes sociais

Sobre

História

Missão

Valores

Equipe

## INTEGRAÇÕES / BANCO DE DADOS

Utilizar Supabase.

Autenticação

Supabase Auth

Login:

Email

Google

Storage

Supabase Storage

Pastas:

products/

banners/

brands/

categories/

avatars/

Banco de Dados

Criar as seguintes tabelas:

users

id

name

email

phone

avatar

created_at

categories

id

name

slug

image

active

brands

id

name

slug

logo

products

id

name

slug

description

technical_description

category_id

brand_id

price

sale_price

stock

sku

weight

material

color

featured

active

created_at

product_images

id

product_id

image_url

position

sizes

id

name

product_sizes

id

product_id

size_id

stock

orders

id

user_id

status

subtotal

shipping

discount

total

payment_method

created_at

order_items

id

order_id

product_id

quantity

price

addresses

id

user_id

street

number

district

city

state

zip_code

coupons

id

code

discount

expiration

active

favorites

id

user_id

product_id

reviews

id

user_id

product_id

rating

comment

created_at

banners

id

title

image

link

active

position

Webhooks

Criar webhooks para:

Novo pedido

Pedido pago

Pedido enviado

Pedido entregue

Novo cadastro

Novo produto

Estoque baixo

Integrações Futuras

Mercado Pago

Stripe

PagSeguro

Correios

Melhor Envio

Google Analytics

Google Tag Manager

Meta Pixel

WhatsApp API

n8n

ERP

CRM

## REGRAS DO SISTEMA

Utilizar Row Level Security (RLS) do Supabase.

Permissões:

Administrador

acesso total

Cliente

apenas seus próprios pedidos

seus favoritos

seus endereços

suas avaliações

Produtos inativos não devem aparecer na loja.

Produtos sem estoque devem exibir:

"Produto indisponível"

Aplicar paginação.

Aplicar filtros combinados.

Aplicar busca por texto.

Validar estoque antes do checkout.

Impedir compra acima do estoque.

Atualizar estoque automaticamente após confirmação do pagamento.

Avaliações apenas para clientes que compraram o produto.

Excluir imagens órfãs automaticamente.

Gerar slug automaticamente.

Gerar SKU automaticamente quando não informado.

Ordenação padrão:

Mais vendidos.

## O QUE NÃO FAZER

Não utilizar código duplicado.

Não criar componentes repetidos.

Não utilizar consultas desnecessárias.

Evitar múltiplos requests para os mesmos dados.

Não utilizar loops infinitos.

Não carregar imagens em resolução máxima quando houver versões otimizadas.

Não criar páginas desnecessárias.

Não utilizar dados mockados em produção.

Não criar lógica diretamente na interface quando puder ser centralizada.

Não deixar informações sensíveis expostas no frontend.

Não permitir acesso ao painel administrativo sem autenticação.

Não utilizar bibliotecas pesadas sem necessidade.

Não gerar telas incompletas.

Não remover responsividade.

Não ignorar acessibilidade (WCAG).

Não utilizar estilos inconsistentes.

## DIFERENCIAIS PREMIUM

Busca instantânea.

Banner rotativo.

Produtos recentemente visualizados.

Produtos recomendados por IA.

Wishlist sincronizada.

Comparador de produtos.

Notificação de estoque disponível.

Tabela inteligente de tamanhos.

Zoom em alta definição.

Galeria com vídeos.

Avaliações com fotos.

Programa de fidelidade.

Cashback.

Sistema de cupons avançado.

Área exclusiva para academias e compras em atacado.

Blog integrado com dicas de Jiu-Jitsu, equipamentos e treinamentos para fortalecer o SEO.

Chat via WhatsApp com atendimento rápido.

Painel administrativo com gráficos de vendas, produtos mais vendidos, ticket médio, estoque crítico e desempenho por categoria.

Estrutura preparada para múltiplos idiomas (i18n) e múltiplas moedas, permitindo expansão internacional no futuro.

Código organizado, reutilizável, escalável e seguindo boas práticas de arquitetura, garantindo fácil manutenção e evolução do projeto.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://gi-grace-store.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0aeaf438-1a25-4572-b94e-218d43d88c80).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
