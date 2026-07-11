create extension if not exists pgcrypto;

create table users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    display_name text not null,
    apple_subject text unique,
    created_at timestamptz not null default now()
);

create table businesses (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    created_at timestamptz not null default now()
);

create table branches (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id),
    name text not null,
    address text not null
);

create table roles (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id),
    name text not null
);

create table permissions (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,
    description text not null
);

create table role_permissions (
    role_id uuid not null references roles(id),
    permission_id uuid not null references permissions(id),
    primary key (role_id, permission_id)
);

create table employees (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id),
    branch_id uuid references branches(id),
    user_id uuid not null references users(id),
    role_id uuid not null references roles(id),
    is_active boolean not null default true
);

create table restaurant_tables (
    id uuid primary key default gen_random_uuid(),
    branch_id uuid not null references branches(id),
    number text not null,
    capacity integer not null,
    unique (branch_id, number)
);

create table table_sessions (
    id uuid primary key default gen_random_uuid(),
    table_id uuid not null references restaurant_tables(id),
    opened_by_employee_id uuid references employees(id),
    started_at timestamptz not null default now(),
    closed_at timestamptz,
    status text not null check (status in ('open', 'closed', 'transferred', 'merged'))
);

create table session_participants (
    id uuid primary key default gen_random_uuid(),
    table_session_id uuid not null references table_sessions(id),
    user_id uuid references users(id),
    display_name text not null,
    seat_label text,
    joined_at timestamptz not null default now()
);

create table qr_tokens (
    id uuid primary key default gen_random_uuid(),
    table_id uuid not null references restaurant_tables(id),
    token_hash text not null unique,
    expires_at timestamptz not null,
    consumed_at timestamptz,
    created_at timestamptz not null default now()
);

create table menu_categories (
    id uuid primary key default gen_random_uuid(),
    branch_id uuid not null references branches(id),
    name text not null,
    sort_order integer not null default 0
);

create table menu_items (
    id uuid primary key default gen_random_uuid(),
    category_id uuid not null references menu_categories(id),
    name text not null,
    description text not null,
    price_cents integer not null check (price_cents >= 0),
    tax_rate numeric(5, 4) not null,
    is_available boolean not null default true,
    preparation_minutes integer not null default 0
);

create table allergens (
    id uuid primary key default gen_random_uuid(),
    name text not null unique
);

create table menu_item_allergens (
    menu_item_id uuid not null references menu_items(id),
    allergen_id uuid not null references allergens(id),
    primary key (menu_item_id, allergen_id)
);

create table orders (
    id uuid primary key default gen_random_uuid(),
    table_session_id uuid not null references table_sessions(id),
    participant_id uuid not null references session_participants(id),
    approved_by_employee_id uuid references employees(id),
    status text not null,
    note text not null default '',
    created_at timestamptz not null default now()
);

create table order_items (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references orders(id),
    menu_item_id uuid not null references menu_items(id),
    quantity integer not null check (quantity > 0),
    unit_price_cents integer not null check (unit_price_cents >= 0),
    tax_rate numeric(5, 4) not null,
    status text not null,
    payment_status text not null default 'unpaid',
    locked_by_payment_id uuid,
    lock_expires_at timestamptz
);

create table order_item_owner_shares (
    id uuid primary key default gen_random_uuid(),
    order_item_id uuid not null references order_items(id),
    participant_id uuid not null references session_participants(id),
    amount_cents integer not null check (amount_cents >= 0),
    is_paid boolean not null default false
);

create table payments (
    id uuid primary key default gen_random_uuid(),
    table_session_id uuid not null references table_sessions(id),
    payer_participant_id uuid not null references session_participants(id),
    provider text not null,
    provider_reference text,
    amount_cents integer not null,
    tip_cents integer not null default 0,
    status text not null,
    idempotency_key text not null unique,
    created_at timestamptz not null default now()
);

alter table order_items add constraint order_items_locked_payment_fk foreign key (locked_by_payment_id) references payments(id);

create table payment_allocations (
    id uuid primary key default gen_random_uuid(),
    payment_id uuid not null references payments(id),
    order_item_id uuid not null references order_items(id),
    participant_id uuid references session_participants(id),
    amount_cents integer not null check (amount_cents > 0),
    unique (payment_id, order_item_id, participant_id)
);

create table refunds (
    id uuid primary key default gen_random_uuid(),
    payment_id uuid not null references payments(id),
    amount_cents integer not null check (amount_cents > 0),
    reason text not null,
    created_at timestamptz not null default now()
);

create table campaigns (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id),
    name text not null,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    rules jsonb not null
);

create table daily_reports (
    id uuid primary key default gen_random_uuid(),
    branch_id uuid not null references branches(id),
    report_date date not null,
    gross_sales_cents integer not null,
    tips_cents integer not null,
    payload jsonb not null,
    unique (branch_id, report_date)
);

create table audit_logs (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id),
    actor_user_id uuid references users(id),
    action text not null,
    entity_type text not null,
    entity_id uuid,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index order_items_payment_status_idx on order_items(payment_status);
create index table_sessions_table_status_idx on table_sessions(table_id, status);
create index payments_session_status_idx on payments(table_session_id, status);
create index audit_logs_business_created_idx on audit_logs(business_id, created_at desc);
