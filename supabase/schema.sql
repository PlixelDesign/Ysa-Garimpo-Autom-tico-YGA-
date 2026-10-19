-- YGA — schema da tabela "products"
-- Rode no Supabase: SQL Editor → cole tudo → Run. É idempotente (pode rodar mais de uma vez).

create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  ml_id text,
  title text not null,
  original_price numeric(10,2) not null,
  discount_price numeric(10,2) not null,
  discount_percentage int not null,
  copy_text text not null default '',
  affiliate_link text not null,
  original_link text,
  category text not null default 'Utilidades do Lar',
  image_url text not null default '',
  rating numeric(2,1),
  reviews_count int,
  status text not null default 'pending',
  created_at timestamptz default now(),
  published_at timestamptz
);

-- Colunas que versões anteriores do worker não criavam
alter table products add column if not exists ml_id text;
alter table products add column if not exists original_link text;
alter table products add column if not exists rating numeric(2,1);
alter table products add column if not exists reviews_count int;
alter table products add column if not exists published_at timestamptz;
alter table products alter column copy_text set default '';
alter table products alter column category set default 'Utilidades do Lar';
alter table products alter column image_url set default '';

-- Links antigos sem original_link: o link salvo era o link cru do ML
update products set original_link = affiliate_link where original_link is null;

create unique index if not exists products_ml_id_key on products (ml_id);

-- Acesso: o painel (chave anon) lê e atualiza status/copy/link de afiliado;
-- o worker insere e atualiza preços. Se o worker usar a service_role key, ele ignora RLS.
alter table products enable row level security;

drop policy if exists "yga_select" on products;
drop policy if exists "yga_insert" on products;
drop policy if exists "yga_update" on products;
create policy "yga_select" on products for select using (true);
create policy "yga_insert" on products for insert with check (true);
create policy "yga_update" on products for update using (true) with check (true);
