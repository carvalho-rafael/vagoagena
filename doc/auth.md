# Autenticação — Guia para o Frontend

Base URL: `http://localhost:3333`

Todas as rotas protegidas exigem o header:

```
Authorization: Bearer <accessToken>
```

---

## Visão geral dos tokens

| Token          | Onde armazenar                            | Validade   | Uso                                                       |
| -------------- | ----------------------------------------- | ---------- | --------------------------------------------------------- |
| `accessToken`  | memória (variável JS / estado React)      | 15 minutos | Enviado em cada request como `Bearer`                     |
| `refreshToken` | cookie `HttpOnly` gerenciado pelo browser | 7 dias     | O browser envia automaticamente; você nunca lê esse valor |

O `refreshToken` é entregue pelo backend via `Set-Cookie` e nunca fica exposto ao JavaScript. O frontend só precisa armazenar o `accessToken` em memória.

---

## Configuração base do cliente HTTP

Todas as requests que envolvem cookie (refresh, logout e rotas autenticadas cross-origin) precisam de `credentials: 'include'`. Configure isso uma vez no cliente:

```ts
// Exemplo com fetch nativo
const api = (url: string, options: RequestInit = {}) =>
  fetch(`http://localhost:3333${url}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

// Exemplo com Axios
const api = axios.create({
  baseURL: 'http://localhost:3333',
  withCredentials: true,
});
```

> `credentials: 'include'` não é necessário no login e no cadastro, pois nessas rotas você não está _enviando_ cookie, apenas recebendo o `Set-Cookie` da response — o browser salva automaticamente.

---

## Email e senha

### Cadastro

```http
POST /auth/register
Content-Type: application/json

{
  "email": "usuario@email.com",
  "password": "minimo8chars",
  "name": "Nome Opcional"
}
```

**Resposta 201**

```json
{ "message": "Account created. Please verify your email." }
```

**Erros possíveis**

| Status | Motivo                                                  |
| ------ | ------------------------------------------------------- |
| `400`  | Campos inválidos (email mal formatado, senha < 8 chars) |
| `409`  | Email já cadastrado                                     |

Após o cadastro o usuário receberá um email de verificação. Redirecione para uma tela pedindo que ele confirme o email antes de fazer login.

---

### Login

Não precisa de `credentials: 'include'` — você está recebendo o cookie, não enviando.

```http
POST /auth/login
Content-Type: application/json

{
  "email": "usuario@email.com",
  "password": "minimo8chars"
}
```

**Resposta 200**

```json
{ "accessToken": "eyJhbGci..." }
```

O backend seta automaticamente o cookie `refresh_token` (`HttpOnly; SameSite=Lax`).

```ts
const res = await fetch('http://localhost:3333/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

const { accessToken } = await res.json();
// salvar apenas o accessToken em memória
```

**Erros possíveis**

| Status | Motivo                    |
| ------ | ------------------------- |
| `400`  | Campos inválidos          |
| `401`  | Email ou senha incorretos |

---

### Logout

```http
POST /auth/logout
```

O browser envia o cookie automaticamente. O backend invalida a sessão no banco e limpa o cookie.

```ts
await api('/auth/logout', { method: 'POST' });
// descartar o accessToken da memória / estado
```

**Resposta 200**

```json
{ "message": "Logged out" }
```

---

## Renovação do access token

O `accessToken` expira em **15 minutos**. Quando uma request retornar `401`, chame `/auth/refresh` — o browser envia o cookie automaticamente:

```http
POST /auth/refresh
```

**Resposta 200**

```json
{ "accessToken": "eyJhbGci..." }
```

O backend rotaciona o `refreshToken` e seta o novo cookie. O `accessToken` novo chega no body.

**Erros possíveis**

| Status | Motivo                                                        |
| ------ | ------------------------------------------------------------- |
| `401`  | Cookie ausente, inválido ou expirado → redirecione para login |

### Interceptor de renovação automática (Axios)

```ts
let accessToken: string | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const { data } = await api.post('/auth/refresh');
        accessToken = data.accessToken;

        original.headers['Authorization'] = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        accessToken = null;
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);
```

---

## Recuperação de senha

### 1 — Solicitar reset

```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "usuario@email.com"
}
```

**Resposta 200** (sempre a mesma mensagem, independente do email existir)

```json
{ "message": "If that email is registered, a reset link has been sent." }
```

O usuário receberá um email com um link do tipo:

```
https://seuapp.com/reset-password?token=<uuid>
```

---

### 2 — Redefinir a senha

```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "uuid-do-link-do-email",
  "password": "novaSenhaMinimo8"
}
```

**Resposta 200**

```json
{ "message": "Password reset successfully" }
```

**Erros possíveis**

| Status | Motivo                                           |
| ------ | ------------------------------------------------ |
| `400`  | Token inválido, expirado (1h) ou senha < 8 chars |

Após sucesso, redirecione para a tela de login. Todas as sessões anteriores do usuário são invalidadas automaticamente.

---

## Verificação de email

O link enviado por email aponta para o backend:

```
GET /auth/verify-email?token=<uuid>
```

**Resposta 200**

```json
{ "message": "Email verified successfully" }
```

**Erros possíveis**

| Status | Motivo                           |
| ------ | -------------------------------- |
| `400`  | Token inválido ou expirado (24h) |

### Reenviar email de verificação

```http
POST /auth/resend-verification
Content-Type: application/json

{
  "email": "usuario@email.com"
}
```

**Resposta 200**

```json
{ "message": "If that email is registered, a verification link has been sent." }
```

---

## Login com Google

### 1 — Iniciar o fluxo

Redirecione o **navegador** (não faça fetch) para o backend. O Passport cuida do redirect para o Google:

```ts
window.location.href = 'http://localhost:3333/auth/google';
```

---

### 2 — Receber o token no callback

Após o consentimento, o Google chama o backend em `/auth/google/callback`. O backend:

1. Seta o cookie `refresh_token` (`HttpOnly`)
2. Redireciona o navegador para `<FRONTEND_URL>/auth/callback?accessToken=eyJ...`

Crie a rota `/auth/callback` no frontend:

```ts
// Exemplo Next.js / React Router
const params = new URLSearchParams(window.location.search);
const accessToken = params.get('accessToken');

if (accessToken) {
  // salvar em memória / estado global
  setAccessToken(accessToken);
  // limpar a query string e ir para o dashboard
  router.replace('/dashboard');
}
```

O `refreshToken` **não aparece na URL** — já está salvo no cookie `HttpOnly` pelo backend.

---

## Perfil do usuário autenticado

```http
GET /auth/me
Authorization: Bearer <accessToken>
```

```ts
const { data } = await api.get('/auth/me', {
  headers: { Authorization: `Bearer ${accessToken}` },
});
```

**Resposta 200**

```json
{
  "id": "uuid",
  "email": "usuario@email.com",
  "name": "Nome",
  "avatarUrl": null,
  "emailVerified": true,
  "createdAt": "2026-05-25T00:00:00.000Z",
  "accounts": [{ "provider": "email" }, { "provider": "google" }]
}
```

Use o campo `accounts` para saber quais provedores o usuário já vinculou.

---

## Variáveis de ambiente do backend relevantes

```dotenv
NODE_ENV=production           # ativa o flag Secure no cookie
JWT_EXPIRES_IN=15m
GOOGLE_CALLBACK_URL=http://localhost:3333/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

Base URL: `http://localhost:3333`

Todas as rotas protegidas exigem o header:

```
Authorization: Bearer <accessToken>
```

---

## Visão geral dos tokens

| Token          | Onde armazenar                      | Validade   | Uso                                            |
| -------------- | ----------------------------------- | ---------- | ---------------------------------------------- |
| `accessToken`  | memória (variável JS)               | 15 minutos | Enviado em cada request como Bearer            |
| `refreshToken` | `localStorage` ou cookie `HttpOnly` | 7 dias     | Troca por novo `accessToken` quando ele expira |

> **Recomendação de segurança:** prefira cookie `HttpOnly; Secure; SameSite=Strict` para o `refreshToken` para evitar acesso via XSS.

---

## Email e senha

### Cadastro

```http
POST /auth/register
Content-Type: application/json

{
  "email": "usuario@email.com",
  "password": "minimo8chars",
  "name": "Nome Opcional"
}
```

**Resposta 201**

```json
{ "message": "Account created. Please verify your email." }
```

**Erros possíveis**

| Status | Motivo                                                  |
| ------ | ------------------------------------------------------- |
| `400`  | Campos inválidos (email mal formatado, senha < 8 chars) |
| `409`  | Email já cadastrado                                     |

Após o cadastro o usuário receberá um email de verificação. Redirecione para uma tela pedindo que ele confirme o email antes de fazer login.

---

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "usuario@email.com",
  "password": "minimo8chars"
}
```

**Resposta 200**

```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Erros possíveis**

| Status | Motivo                    |
| ------ | ------------------------- |
| `400`  | Campos inválidos          |
| `401`  | Email ou senha incorretos |

Armazene os dois tokens assim que recebê-los.

---

### Logout

```http
POST /auth/logout
Content-Type: application/json

{
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Resposta 200**

```json
{ "message": "Logged out" }
```

Após o logout, descarte o `accessToken` da memória e remova o `refreshToken` do armazenamento.

---

## Renovação do access token

O `accessToken` expira em **15 minutos**. Quando uma requisição retornar `401`, renove-o:

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Resposta 200**

```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "novo-uuid-rotacionado"
}
```

> O `refreshToken` é **rotacionado** a cada uso — sempre salve o novo valor retornado.

**Erros possíveis**

| Status | Motivo                                                      |
| ------ | ----------------------------------------------------------- |
| `401`  | Refresh token inválido ou expirado → redirecione para login |

### Fluxo recomendado com interceptor (exemplo Axios)

```ts
axios.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        // sem refresh token → redirecionar para login
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post('/auth/refresh', { refreshToken });

        // atualiza tokens
        accessTokenInMemory = data.accessToken;
        localStorage.setItem('refreshToken', data.refreshToken);

        // repete a request original com novo token
        original.headers['Authorization'] = `Bearer ${data.accessToken}`;
        return axios(original);
      } catch {
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);
```

---

## Recuperação de senha

### 1 — Solicitar reset

```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "usuario@email.com"
}
```

**Resposta 200** (sempre a mesma mensagem, independente do email existir)

```json
{ "message": "If that email is registered, a reset link has been sent." }
```

O usuário receberá um email com um link do tipo:

```
https://seuapp.com/reset-password?token=<uuid>
```

---

### 2 — Redefinir a senha

```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "uuid-do-link-do-email",
  "password": "novaSenhaMinimo8"
}
```

**Resposta 200**

```json
{ "message": "Password reset successfully" }
```

**Erros possíveis**

| Status | Motivo                                           |
| ------ | ------------------------------------------------ |
| `400`  | Token inválido, expirado (1h) ou senha < 8 chars |

Após sucesso, redirecione para a tela de login. Todas as sessões anteriores do usuário são invalidadas automaticamente.

---

## Verificação de email

O link enviado por email aponta para o backend:

```
GET /auth/verify-email?token=<uuid>
```

**Resposta 200**

```json
{ "message": "Email verified successfully" }
```

**Erros possíveis**

| Status | Motivo                           |
| ------ | -------------------------------- |
| `400`  | Token inválido ou expirado (24h) |

> Configure o backend (`FRONTEND_URL`) para redirecionar para uma rota do frontend após a verificação, se preferir essa abordagem.

### Reenviar email de verificação

```http
POST /auth/resend-verification
Content-Type: application/json

{
  "email": "usuario@email.com"
}
```

**Resposta 200**

```json
{ "message": "If that email is registered, a verification link has been sent." }
```

---

## Login com Google

### 1 — Iniciar o fluxo

Redirecione o navegador (não faça fetch) para:

```
GET /auth/google
```

O backend redireciona automaticamente para a tela de consentimento do Google.

```ts
// Exemplo
window.location.href = 'http://localhost:3333/auth/google';
```

---

### 2 — Receber os tokens no callback

Após a autenticação, o Google chama o backend em `/auth/google/callback`. O backend redireciona o navegador para:

```
<FRONTEND_URL>/auth/callback?accessToken=eyJ...&refreshToken=550e...
```

Crie uma rota `/auth/callback` no frontend que leia os parâmetros da URL e armazene os tokens:

```ts
// Exemplo Next.js / React Router
const params = new URLSearchParams(window.location.search);
const accessToken = params.get('accessToken');
const refreshToken = params.get('refreshToken');

if (accessToken && refreshToken) {
  accessTokenInMemory = accessToken;
  localStorage.setItem('refreshToken', refreshToken);
  // redirecionar para dashboard
  router.replace('/dashboard');
}
```

> **Nota:** os tokens chegam na query string por simplicidade. Em produção, prefira entregar o `refreshToken` via cookie `HttpOnly` configurado pelo backend para evitar exposição na URL e no histórico do navegador.

---

## Perfil do usuário autenticado

```http
GET /auth/me
Authorization: Bearer <accessToken>
```

**Resposta 200**

```json
{
  "id": "uuid",
  "email": "usuario@email.com",
  "name": "Nome",
  "avatarUrl": null,
  "emailVerified": true,
  "createdAt": "2026-05-25T00:00:00.000Z",
  "accounts": [{ "provider": "email" }, { "provider": "google" }]
}
```

Use o campo `accounts` para saber quais provedores o usuário já vinculou.

---

## Variáveis de ambiente do backend relevantes

```dotenv
JWT_EXPIRES_IN=15m
GOOGLE_CALLBACK_URL=http://localhost:3333/auth/google/callback
FRONTEND_URL=http://localhost:3000   # para onde o callback do Google redireciona
```
