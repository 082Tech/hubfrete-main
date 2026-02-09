

## Configuracao de Ambientes: Producao + Teste (Supabase Branching + GitHub)

### Visao geral

Criar dois ambientes isolados:
- **Producao** (branch `main`) -- o que ja esta rodando hoje
- **Teste** (branch `develop`) -- para desenvolvimento e validacao

Usando Supabase Branching (plano Pro) integrado ao GitHub.

---

### Passo a passo

#### Etapa 1: Habilitar Supabase Branching (no Dashboard do Supabase)

1. Acesse **Supabase Dashboard > Project Settings > Branching**
2. Clique em **Enable Branching**
3. O Supabase vai pedir para conectar ao repositorio GitHub do projeto (se ainda nao estiver conectado)
4. Autorize a integracao -- o Supabase precisa de acesso ao repo para detectar branches e PRs

> **Importante**: Ao habilitar, o Supabase passa a criar automaticamente uma instancia preview (banco isolado) para cada branch/PR no GitHub

#### Etapa 2: Criar a branch `develop` no GitHub

1. No GitHub, crie a branch `develop` a partir da `main`
2. Assim que a branch existir e o Branching estiver habilitado, o Supabase cria automaticamente um **Preview Branch** com:
   - Banco de dados isolado (copia do schema, sem dados de producao)
   - Segredos herdados da producao
   - URL propria para testes

#### Etapa 3: Configurar o Lovable para trabalhar com a branch `develop`

1. No Lovable, va em **Account Settings > Labs** e ative o **GitHub Branch Switching**
2. Depois, no projeto, troque para a branch `develop`
3. A partir dai, todas as alteracoes feitas no Lovable vao para a branch `develop` no GitHub
4. O Supabase Preview Branch sera usado automaticamente (as migrations rodam contra o banco de teste)

#### Etapa 4: Fluxo de trabalho

```text
Desenvolvimento (branch develop)
        |
        | -- push / alteracoes no Lovable
        |
        v
  Supabase Preview Branch (banco de teste)
        |
        | -- quando pronto: abrir PR develop -> main
        |
        v
  Merge na main --> Producao (banco principal)
```

- **Develop**: toda experimentacao e desenvolvimento acontece aqui
- **Main**: so recebe codigo validado via merge/PR
- Os dados de producao nunca sao afetados pelo ambiente de teste

---

### O que eu NAO posso fazer por voce (precisa ser feito manualmente)

| Acao | Onde fazer |
|------|-----------|
| Habilitar Branching | Supabase Dashboard > Settings > Branching |
| Conectar repo ao Supabase Branching | Supabase Dashboard (autorizacao GitHub) |
| Criar branch `develop` | GitHub |
| Ativar Branch Switching no Lovable | Account Settings > Labs |

### O que eu POSSO fazer depois

- Ajustar variaveis de ambiente se necessario
- Criar migrations que rodem nos dois ambientes
- Adaptar codigo para detectar ambiente (teste vs producao) se precisar de comportamento diferente

---

### Observacoes importantes

- **Dados NAO sao sincronizados** entre ambientes -- o banco de teste comeca vazio (apenas schema)
- **Migrations sao compartilhadas** -- ao fazer merge da `develop` na `main`, as migrations rodam na producao
- Se precisar de dados de teste, sera necessario criar seeds ou inserir manualmente no banco preview
- O Supabase Branching cobra pelo tempo de uso das instancias preview (incluso no Pro com limites)

