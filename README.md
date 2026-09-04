# EscalaMed

Plataforma que conecta **médicos** e **escalistas** (gestores de escala/plantões) de hospitais e unidades de saúde.

- Médicos se cadastram, informam especialidade e localização, e podem ser encontrados por escalistas.
- Escalistas se cadastram, informam de onde são, buscam médicos por especialidade/região e podem avaliá-los.
- Hospitais e unidades de saúde também podem ser cadastrados na rede.

**Live app**: https://health-finder-network.lovable.app

## Stack

- [TanStack Start](https://tanstack.com/start) (React 19 + SSR)
- [Supabase](https://supabase.com) (banco de dados, autenticação)
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [TanStack Router](https://tanstack.com/router) + [TanStack Query](https://tanstack.com/query)

## Desenvolvimento local

Pré-requisitos: Node.js e npm (recomenda-se instalar via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).

```sh
git clone https://github.com/Marlonlucas77/health-finder-network.git
cd health-finder-network
npm install
```

Copie `.env.example` para `.env` e preencha com as credenciais do seu projeto Supabase (veja [Variáveis de ambiente](#variáveis-de-ambiente) abaixo):

```sh
cp .env.example .env
```

Rode o servidor de desenvolvimento:

```sh
npm run dev
```

## Scripts disponíveis

| Comando           | Descrição                                  |
| ------------------ | ------------------------------------------- |
| `npm run dev`       | Sobe o servidor de desenvolvimento (Vite)   |
| `npm run build`     | Gera o build de produção                    |
| `npm run build:dev` | Gera o build em modo desenvolvimento        |
| `npm run preview`   | Serve o build de produção localmente        |
| `npm run lint`      | Roda o ESLint                               |
| `npm run format`    | Formata o código com Prettier               |

## Variáveis de ambiente

| Variável                        | Onde é usada         | Descrição                                                          |
| -------------------------------- | --------------------- | -------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`              | Client-side            | URL do projeto Supabase                                              |
| `VITE_SUPABASE_PUBLISHABLE_KEY`  | Client-side            | Chave pública (anon) do Supabase, protegida por Row Level Security   |
| `SUPABASE_URL`                   | Server-side (SSR)      | URL do projeto Supabase                                              |
| `SUPABASE_PUBLISHABLE_KEY`       | Server-side (SSR)      | Chave pública (anon) do Supabase                                     |
| `SUPABASE_SERVICE_ROLE_KEY`      | Server-side (admin)    | Chave com privilégios de administrador — **nunca** exponha ao client |

> ⚠️ **Nunca faça commit do arquivo `.env`.** Ele já está no `.gitignore`. Se precisar compartilhar variáveis de exemplo, use `.env.example`.

## Estrutura do projeto

```
src/
├── components/       # Componentes React (UI e específicos do domínio)
├── hooks/            # Hooks customizados (ex.: useAuth)
├── integrations/      # Clientes de integração (Supabase)
├── lib/               # Utilitários
├── routes/            # Rotas (file-based routing do TanStack Router)
supabase/
└── migrations/        # Migrations do banco de dados
```

Veja `src/routes/README.md` para as convenções de roteamento.

## Build com Lovable

Este projeto foi criado com [Lovable](https://lovable.dev) e pode continuar sendo editado por lá.

- **Ship faster**: descreva o que você quer construir e o Lovable gera o código.
- **Stay in sync**: toda alteração feita no Lovable é commitada diretamente neste repositório.
- **Full ownership**: o código é seu. Faça push para `main` no GitHub e as mudanças sincronizam de volta com o Lovable.

Continue desenvolvendo em: https://lovable.dev/projects/0797cd8d-e04a-41b7-90b0-ced70e905e97
