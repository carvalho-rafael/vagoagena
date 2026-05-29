# VagoAgenda Frontend

Frontend em Next.js com autenticacao integrada ao backend.

## Configuracao

Crie o arquivo `.env.local` com a URL da API:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3333
```

## Rodando o projeto

```bash
npm install
npm run dev
```

App: http://localhost:3000

## Fluxo de autenticacao implementado

- Login com email/senha em `POST /auth/login`
- Login com Google via redirecionamento para `/auth/google`
- Leitura do perfil autenticado em `GET /auth/me`
- Refresh automatico de token em `POST /auth/refresh` quando ocorre `401`
- Logout em `POST /auth/logout`

## Regras de sessao no frontend

- `accessToken` fica apenas em memoria
- `refreshToken` fica em cookie `HttpOnly` controlado pelo backend
- Requests usam `credentials: include`

## Rotas de interface

- `/`: landing com status de sessao
- `/login`: login email/senha + Google
- `/auth/callback`: callback do Google
- `/dashboard`: pagina protegida com dados de `/auth/me`
