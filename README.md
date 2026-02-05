# Nexawealth

## Product Vision
Nexawealth is a futuristic, experiential financial literacy app where users learn by *living through* money decisions in realistic life simulations. Instead of lectures, the app turns each month/year into a decision loop with immediate and long-term consequences. Users see how choices shape their net worth, stability, stress, and opportunities over time.

---

## UI/UX Philosophy (Futuristic + Practical)
- **Experiential over explanatory:** Show consequences visually rather than through long theory text.
- **Cinematic dashboards:** Time, money, and life events flow across a timeline with immersive cards and glowing data visualizations.
- **Human language:** Insights feel like a caring coach, not a textbook.
- **Inclusive by default:** Clear typography, high contrast modes, keyboard/voice support, and minimal jargon.
- **Causality-first design:** Every decision has visible short-term *and* long-term impacts.

---

## Core Feature Breakdown

### 1. Life-Based Financial Simulation (Mandatory)
- Monthly/Yearly cycles: income, fixed expenses, variable expenses, debt.
- Users allocate money across needs, wants, debt payoff, and investments.
- Decisions update metrics: **savings, stress level, net worth, credit score, opportunity unlocks**.

### 2. Dynamic Market & Economy Engine (Mandatory)
- Market states: bull, bear, inflation, recession, stagnation.
- Life events: promotions, job loss, medical emergencies, bonuses, tax changes.
- Investment outcomes respond realistically to market cycles.

### 3. Investment & Wealth-Building Sandbox (Mandatory)
- Assets: stocks, ETFs, mutual funds, bonds, fixed deposits, startups, real estate.
- Compounding visualized on a timeline.
- Risk-reward experienced through outcomes, not dense theory.

### 4. Visual Insights & Futuristic UI (Mandatory)
- Net worth growth graph, cashflow stream, expense heatmap.
- Investment performance cockpit.
- Debt vs asset trajectory.
- 1/5/10 year future projection lens.

### 5. Decision Feedback System (Mandatory)
- Human insights like: *“Comfort rose this month, but your long-term runway shrank.”*
- Outcomes: stability, freedom, stress, missed opportunities.

### 6. Scenario-Based Learning Modes (Mandatory)
- Pre-built scenarios: student, first-job, family, entrepreneur, retiree.
- Custom scenarios: income level, dependents, debt, savings goals.

### 7. Soft Gamification (Mandatory)
- Unlock new tools (e.g., real estate, tax optimization, business financing).
- Time progression = growth (years pass as decisions are made).
- Achievements based on outcomes (debt-free life, financial independence).

### 8. Ethical & Inclusive Design (Mandatory)
- Accessible language and UI.
- No assumption of prior financial knowledge.
- Designed for all ages, cultures, and risk appetites.

---

## Modern Tech Stack (Proposed)
**Frontend**
- **Next.js (React + TypeScript)** for scalable UI and SSR.
- **Tailwind CSS + Radix UI** for accessible, futuristic UI primitives.
- **D3.js / Recharts** for interactive financial visualizations.
- **Framer Motion** for timeline and simulation animations.

**Backend**
- **Node.js (NestJS)** for modular, scalable API.
- **PostgreSQL** for robust relational data (users, scenarios, events).
- **Redis** for caching and fast simulation state updates.
- **BullMQ** for background simulation events and time progression.

**AI/Simulation Services**
- **Python (FastAPI)** microservice for simulation modeling and analytics.
- **Event-driven architecture** using Kafka or NATS for life-event streams.

**Infra**
- **Docker + Kubernetes** for scalable deployments.
- **CI/CD with GitHub Actions**.
- **Observability**: OpenTelemetry + Grafana.

---

## System Architecture (High-Level)
```
[Client UI]
   |  (REST/GraphQL)
[API Gateway - NestJS]
   |  (events)
[Simulation Engine - FastAPI]
   |  (async jobs)
[Job Queue - BullMQ]
   |  (persistence)
[PostgreSQL] + [Redis]
```

**Key Modules**
- **Simulation Engine**: monthly/annual progression, compounding, life events.
- **Market Engine**: market states and asset return curves.
- **Scenario Engine**: scenario templates + custom builds.
- **Insights Engine**: human-like feedback and narrative consequences.

---

## Data Model (Simplified)

### User
- `id`, `name`, `age`, `locale`, `risk_profile`, `created_at`

### Scenario
- `id`, `user_id`, `type`, `income`, `fixed_expenses`, `variable_expenses`, `debt`, `dependents`

### SimulationState
- `id`, `scenario_id`, `cycle_index`, `net_worth`, `cash_on_hand`, `credit_score`, `stress_level`

### Portfolio
- `id`, `scenario_id`, `asset_type`, `amount`, `risk_level`, `expected_return`

### LifeEvent
- `id`, `scenario_id`, `event_type`, `impact`, `occurred_at`

### Decision
- `id`, `scenario_id`, `cycle_index`, `allocation_json`, `feedback_summary`

---

## Example User Flows

### Flow A: First-Job Professional
1. User selects **“First Job Salary”** scenario.
2. App shows baseline monthly inflow/outflow.
3. User allocates money to rent, loan payments, savings, and investments.
4. Market shifts to inflation → expenses rise.
5. User sees reduced savings growth and increased stress.
6. App suggests balancing comfort vs. long-term growth.
7. After 12 cycles, app shows 1/5/10 year projection.

### Flow B: Family with Children
1. User chooses **“Family with children”** scenario.
2. Adds childcare, mortgage, education savings goals.
3. A medical emergency occurs → savings dip.
4. The simulation shows delayed financial independence.
5. User reallocates to emergency fund.

---

## Example UI Screens (Descriptions)

1. **Simulation Dashboard**
   - Central timeline with monthly cycles.
   - Cards for income, expenses, debt, investments.
   - Net worth holographic graph with future projections.

2. **Decision Console**
   - Sliders and categories for allocation.
   - Instant feedback indicator (stability, stress, growth).

3. **Market Lens**
   - Current economy state with animated indicators.
   - Asset class performance heatmap.

4. **Life Event Feed**
   - Real-time narrative feed of events and consequences.

5. **Outcome Report**
   - “You in 10 years” projection with life outcomes.

---

## Sample Simulation Logic (Pseudocode)
```pseudo
for each cycle in simulation:
    income_total = salary + freelance + passive
    expenses_total = fixed + variable
    debt_payment = min(user_choice.debt_payment, debt_balance)

    cash_after_expenses = income_total - expenses_total - debt_payment

    apply_investments(user_choice.investments)

    market_state = economy_engine.get_state(cycle)
    portfolio_value *= market_state.return_multiplier

    if random_event_triggered():
        apply_life_event()

    net_worth = cash_after_expenses + portfolio_value - debt_balance

    stress_level = calculate_stress(expenses_total, debt_balance, cash_after_expenses)
    credit_score = update_credit(debt_payment, missed_payments)

    insights = generate_feedback(net_worth, stress_level, trend)

    store_cycle_state()
```

---

## Scalability & Modularity
- **Simulation engine decoupled** from UI and API.
- **Event-driven life events** allow rapid feature expansion.
- **Scenario templates** stored as JSON definitions for easy creation.
- **Future-ready** for multiplayer/cohort mode or educator dashboards.

---

## Final Note
Nexawealth turns financial literacy into lived experience. Users learn by making choices, feeling the consequences, and discovering how small decisions compound into long-term outcomes.
