# G3 Connect - CLAUDE.md

## Sobre o projeto

O G3 Connect e uma plataforma operacional de gestao de homologacao e documentos para empresas terceirizadas.

O objetivo do sistema e centralizar:

* controle documental;
* vencimentos;
* pendencias;
* workflow operacional;
* acompanhamento interno;
* produtividade da equipe.

O sistema NAO tem como objetivo substituir plataformas corporativas ja existentes.

A proposta do G3 Connect e atuar como camada operacional entre empresas terceirizadas e processos de homologacao exigidos por grandes contratantes.

---

# Filosofia do sistema

O diferencial principal NAO e tecnologia complexa.

O diferencial e:

* simplicidade operacional;
* organizacao;
* acompanhamento;
* reducao de burocracia;
* facilidade para o cliente.

O cliente NAO deve precisar aprender uma plataforma complexa.

Fluxo principal:

* cliente envia documentos via WhatsApp;
* operadores organizam informacoes;
* especialistas realizam homologacoes;
* sistema centraliza status, vencimentos e pendencias.

---

# Objetivo do MVP

Priorizar:

* simplicidade;
* velocidade de desenvolvimento;
* baixo custo operacional;
* organizacao;
* produtividade interna;
* facilidade de manutencao.

Evitar:

* overengineering;
* automacoes complexas;
* IA;
* integracoes complexas;
* upload avancado;
* modulos desnecessarios.

---

# Stack principal

* React
* Vite
* TypeScript
* Supabase
* Cloudflare Pages

---

# Estrutura operacional

## Perfis iniciais

### Admin

Responsavel por:

* configuracoes;
* usuarios;
* permissoes;
* parametrizacoes gerais.

### Operador

Responsavel por:

* cadastrar empresas;
* cadastrar funcionarios;
* controlar documentos;
* registrar links de arquivos;
* controlar vencimentos;
* atualizar status;
* acompanhar pendencias;
* comunicacao via WhatsApp.

### Especialista

Responsavel por:

* acessar documentos;
* realizar homologacoes;
* alterar status;
* registrar observacoes;
* acompanhar aprovacoes/rejeicoes.

---

# Estrutura inicial esperada

O sistema devera possuir inicialmente:

* login;
* dashboard;
* empresas;
* funcionarios;
* documentos;
* vencimentos;
* checklist configuravel;
* workflow operacional;
* observacoes internas;
* templates WhatsApp;
* alertas operacionais.

---

# Banco de dados

Utilizar Supabase.

Priorizar:

* estrutura simples;
* tabelas organizadas;
* relacionamentos claros;
* facil manutencao;
* escalabilidade futura.

---

# Upload de arquivos

Inicialmente:

* NAO implementar upload interno complexo.
* Utilizar links externos (Dropbox/Google Drive).

O sistema deve armazenar:

* links;
* validade;
* observacoes;
* status;
* historico operacional.

---

# Regras IMPORTANTES

## NAO fixar no codigo:

* dominios;
* contratantes;
* regras operacionais;
* tipos de checklist;
* mensagens;
* fluxos especificos.

Tudo deve ser:

* configuravel;
* parametrizavel;
* expansivel.

---

# Variaveis de ambiente

Sempre utilizar variaveis de ambiente para:

* URLs;
* Supabase;
* nome da aplicacao;
* configuracoes futuras.

Exemplo:

```env
VITE_APP_NAME=G3 Connect
VITE_APP_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

# Diretrizes de desenvolvimento

## MUITO IMPORTANTE

Antes de alterar codigo:

* explicar rapidamente quais arquivos serao alterados;
* explicar o objetivo da alteracao.

---

# Regras obrigatorias

* NAO alterar mais do que o necessario.
* NAO quebrar funcionalidades existentes.
* NAO refatorar sem necessidade.
* NAO criar dependencias desnecessarias.
* NAO criar complexidade desnecessaria no MVP.
* Priorizar componentes reutilizaveis.
* Priorizar arquitetura modular.
* Priorizar legibilidade.

---

# Interface

Priorizar:

* visual limpo;
* responsividade;
* produtividade operacional;
* simplicidade;
* rapidez.

O sistema deve parecer:

* moderno;
* profissional;
* simples;
* intuitivo.

---

# Fluxo operacional principal

1. Cliente envia documentos via WhatsApp.
2. Operador organiza informacoes no sistema.
3. Operador registra links de arquivos.
4. Especialista acessa documentos.
5. Especialista realiza homologacao.
6. Sistema acompanha vencimentos e pendencias.

---

# Objetivo principal

Construir um MVP funcional, simples, organizado e escalavel para validar rapidamente o modelo operacional do G3 Connect.
