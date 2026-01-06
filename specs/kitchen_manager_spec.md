# Especificação do Módulo: Gerente de Cozinha (Kitchen Manager)

## 1. Visão Geral
Este módulo permite a criação de um perfil de usuário secundário ("Gerente de Cozinha") vinculado à conta do proprietário ("Admin"). O objetivo é delegar o cadastro e manutenção de Fichas Técnicas, Insumos e Bases, sem expor a saúde financeira do negócio (Margens, Lucros, Saldo de Caixa).

## 2. Arquitetura de Dados & Vinculação

### 2.1. Tabela de Perfis e Vínculos
Para evitar complexidade excessiva com chaves estrangeiras em todas as tabelas existentes, adotaremos uma estratégia de **Contexto de Usuário**.

*   Nova Tabela: `user_roles` (ou `team_members`)
    *   `id`: UUID
    *   `member_user_id`: UUID (O ID do usuário da Gerente no Supabase Auth)
    *   `owner_user_id`: UUID (O ID do dono do restaurante)
    *   `role`: 'kitchen_manager' | 'admin'
    *   `permissions`: JSONB (Ex: `{'can_delete': false, 'can_edit_stock': true}`)

### 2.2. Lógica de Acesso (RLS - Row Level Security Lógica)
*   **Login:** Quando o usuário loga, o sistema verifica na tabela `user_roles`.
*   **Contexto:** Se for um `kitchen_manager`, o `App.tsx` define o `session.user.id` lógico como sendo o `owner_user_id` para fins de *leitura/escrita* nas tabelas de receitas e ingredientes.
*   **Restrição de Visualização:** A camada de UI (Frontend) bloqueia a renderização de componentes financeiros baseada na *role* real do usuário logado.

## 3. Regras de Interface (UI) e Experiência (UX)

### 3.1. O que é Ocultado para a Gerente
*   **Sidebar:**
    *   Remover "Dashboard" (Contém lucros e faturamento).
    *   Remover "Relatórios" (Contém ranking de lucratividade).
    *   Remover "Despesas Fixas" (Dados sensíveis do negócio).
*   **Cards de Receita (Listagem):**
    *   Ocultar "Preço de Venda", "Lucro" e "Margem".
    *   Exibir apenas "Custo de Produção" (necessário para consciência de desperdício) ou Ocultar totalmente (configurável).
*   **Editor de Receita (Ficha Técnica):**
    *   **Painel Direito (Precificação):** Removido completamente.
    *   **Inputs Financeiros:** Ocultar campos de "Impostos", "Taxas de Cartão", "Meta de Lucro", "Preço Final".
    *   **Custos Extras:** Manter visível apenas "Embalagem" e "Gelo/Guarnição". Ocultar "Rateio Custo Fixo" (dado estratégico do dono).

### 3.2. Otimizações para Cozinha (UX - "O que você não pensou")

A gerente de cozinha geralmente opera em pé, usando um tablet ou laptop em bancada, com as mãos ocupadas.

1.  **Calculadora de Rendimento Assistida (Wizard):**
    *   Ao cadastrar um insumo (ex: Batata), em vez de pedir apenas o %, adicionar um botão "Calcular Perda".
    *   *Modal:* "Peso Bruto (Suja)" -> "Peso Líquido (Descascada)" -> Sistema preenche o Fator de Rendimento automaticamente.

2.  **Fluxo de "Cadastramento em Lote":**
    *   Permitir que ela cadastre 10 insumos na sequência sem fechar a tela, usando o botão "Salvar e Adicionar Outro".

3.  **Visualização de Impressão Rápida:**
    *   Botão flutuante sempre visível para imprimir a ficha de produção (sem preços) para os cozinheiros de praça.

4.  **Bloqueio de Edição Crítica:**
    *   A gerente pode *criar* e *editar* quantidades.
    *   Mas talvez não deva poder *deletar* um ingrediente que já está em uso em 50 receitas sem um aviso gigante ou senha de confirmação (Segurança Operacional).

## 4. Fluxo de Convite (Onboarding)

1.  **Dono:** Vai em "Configurações" (novo menu).
2.  **Dono:** Clica em "Equipe" -> "Convidar Gerente".
3.  **Dono:** Digita o e-mail da gerente.
4.  **Sistema:** Cria um registro em `user_roles` pendente.
5.  **Gerente:** Faz Sign Up no sistema com aquele e-mail.
6.  **Sistema:** Reconhece o e-mail, vincula ao Dono e carrega os dados dele.

## 5. Plano de Implementação

### Passo 1: Estrutura de Equipe
*   Criar tabela `team_members` no Supabase.
*   Criar tela de Configurações/Equipe para o Dono.

### Passo 2: Contexto Global
*   Alterar o `App.tsx` para carregar não só a `session`, mas o `userRole` e o `effectiveUserId` (ID do dono).

### Passo 3: Adaptação das Views
*   Criar componente `<Restricted info="financial">...</Restricted>` que só renderiza se for Admin.
*   Envolver todos os blocos de preço/lucro com esse componente.

### Passo 4: Ferramentas de Cozinha
*   Implementar a "Calculadora de Rendimento" no modal de Insumos.

---
**Aprovação:** Aguardando confirmação do usuário para iniciar codificação.
