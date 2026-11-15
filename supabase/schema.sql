create table if not exists public.estudiantes (
  carne text primary key check (carne ~ '^[A-Z0-9]{8,40}$'),
  nombres text not null check (char_length(nombres) between 1 and 100),
  apellidos text not null check (char_length(apellidos) between 1 and 100),
  correo text not null check (char_length(correo) between 3 and 254),
  carrera text not null check (carrera in (
    'Ingeniería en Sistemas', 'Ingeniería Industrial', 'Administración de Empresas',
    'Contaduría Pública', 'Psicología', 'Ingeniería Civil'
  )),
  telefono text not null check (telefono ~ '^[0-9]{4}-[0-9]{4}$'),
  fecha_nacimiento date not null,
  genero text not null check (genero in ('Masculino', 'Femenino', 'Otro'))
);

alter table public.estudiantes enable row level security;
revoke all on table public.estudiantes from public, anon, authenticated;
grant select, insert on table public.estudiantes to service_role;
