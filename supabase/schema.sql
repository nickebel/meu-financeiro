-- Meu Financeiro — cole no SQL Editor do Supabase e execute.
-- Todas as tabelas têm RLS e os dados pertencem exclusivamente ao usuário autenticado.
create extension if not exists pgcrypto;

create table if not exists public.transactions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 type text not null check (type in ('income','expense')),
 description text not null check (length(trim(description)) between 1 and 180),
 amount numeric(12,2) not null check (amount > 0),
 category text not null default 'Outros',
 date date not null default current_date,
 payment_method text,
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.cards (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 100),
 bank text,
 last_four text check (last_four is null or last_four ~ '^[0-9]{4}$'),
 limit_amount numeric(12,2) check (limit_amount is null or limit_amount >= 0),
 closing_day integer check (closing_day is null or closing_day between 1 and 31),
 due_day integer check (due_day is null or due_day between 1 and 31),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.installments (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 card_id uuid not null references public.cards(id) on delete cascade,
 description text not null check (length(trim(description)) between 1 and 180),
 total_amount numeric(12,2) not null check (total_amount > 0),
 installments_count integer not null check (installments_count >= 1 and installments_count <= 120),
 paid_installments integer not null default 0 check (paid_installments >= 0 and paid_installments <= installments_count),
 purchase_date date not null default current_date,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.bills (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 180),
 amount numeric(12,2) not null check (amount > 0),
 due_date date not null,
 category text not null default 'Outros',
 paid boolean not null default false,
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.goals (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 180),
 target_amount numeric(12,2) not null check (target_amount > 0),
 saved_amount numeric(12,2) not null default 0 check (saved_amount >= 0),
 target_date date,
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

-- Helper prevents users from attaching another person's card to an installment.
create or replace function public.owns_card(card_uuid uuid)
returns boolean language sql stable security definer
set search_path = public
as $$ select exists(select 1 from public.cards c where c.id=card_uuid and c.user_id=auth.uid()) $$;
revoke all on function public.owns_card(uuid) from public;
grant execute on function public.owns_card(uuid) to authenticated;

alter table public.transactions enable row level security;
alter table public.cards enable row level security;
alter table public.installments enable row level security;
alter table public.bills enable row level security;
alter table public.goals enable row level security;

drop policy if exists "transactions own rows" on public.transactions;
create policy "transactions own rows" on public.transactions for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "cards own rows" on public.cards;
create policy "cards own rows" on public.cards for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "installments own rows" on public.installments;
create policy "installments own rows" on public.installments for all to authenticated using (user_id=auth.uid() and public.owns_card(card_id)) with check (user_id=auth.uid() and public.owns_card(card_id));
drop policy if exists "bills own rows" on public.bills;
create policy "bills own rows" on public.bills for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "goals own rows" on public.goals;
create policy "goals own rows" on public.goals for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

grant select, insert, update, delete on public.transactions, public.cards, public.installments, public.bills, public.goals to authenticated;

create index if not exists transactions_user_date_idx on public.transactions(user_id,date desc);
create index if not exists cards_user_idx on public.cards(user_id);
create index if not exists installments_user_idx on public.installments(user_id);
create index if not exists bills_user_due_idx on public.bills(user_id,due_date);
create index if not exists goals_user_idx on public.goals(user_id);

-- No service_role key is needed in the frontend. Do not disable RLS.
