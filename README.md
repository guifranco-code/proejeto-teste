# Estoque Pro

Sistema de gestão de estoque moderno e eficiente.

## 🚀 Configuração para Vercel / GitHub

Ao fazer o deploy no Vercel, adicione as seguintes variáveis de ambiente (Environment Variables):

- `VITE_SUPABASE_URL`: A URL do seu projeto Supabase.
- `VITE_SUPABASE_ANON_KEY`: A chave anônima (anon key) do seu projeto Supabase.

## 🗄️ Estrutura do Banco de Dados (Supabase SQL)

Execute o código abaixo no **SQL Editor** do seu Supabase para criar as tabelas necessárias:

```sql
-- Criar tabela de produtos
create table products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  price decimal(10,2) not null default 0,
  stock int not null default 0,
  category text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Criar tabela de vendas
create table sales (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id) on delete cascade,
  quantity int not null,
  total_price decimal(10,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- (Opcional) Habilitar Realtime
alter publication supabase_realtime add table products;
alter publication supabase_realtime add table sales;
```

## 🛠️ Tecnologias
- React + Vite
- Tailwind CSS
- Lucide React
- Supabase
- Shadcn UI
