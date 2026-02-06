const MARKET_PRESETS = {
  bull: { label: "Bull market", baseReturn: 0.012 },
  neutral: { label: "Stable market", baseReturn: 0.004 },
  bear: { label: "Bear market", baseReturn: -0.008 }
};

const RISK_PRESETS = {
  conservative: { label: "Conservative", riskMultiplier: 0.7 },
  moderate: { label: "Moderate", riskMultiplier: 1 },
  aggressive: { label: "Aggressive", riskMultiplier: 1.4 }
};

const LOCATION_COST = {
  low: { label: "Low-cost city", multiplier: 0.85 },
  mid: { label: "Mid-cost city", multiplier: 1 },
  high: { label: "High-cost city", multiplier: 1.25 }
};

const LIFE_EVENT_POOL = [
  {
    key: "bonus",
    label: "Unexpected bonus",
    impact: () => ({ cashDelta: 900, stressDelta: -4 })
  },
  {
    key: "medical",
    label: "Medical emergency",
    impact: () => ({ cashDelta: -1400, stressDelta: 10 })
  },
  {
    key: "salary_delay",
    label: "Salary delay",
    impact: () => ({ incomeMultiplier: 0.7, stressDelta: 8 })
  },
  {
    key: "market_crash",
    label: "Market dip",
    impact: () => ({ marketShock: -0.03, stressDelta: 6 })
  },
  {
    key: "rent_hike",
    label: "Rent hike",
    impact: () => ({ fixedCostDelta: 120, stressDelta: 4 })
  },
  {
    key: "family_need",
    label: "Family obligation",
    impact: () => ({ cashDelta: -500, stressDelta: 6 })
  }
];

export const marketPresets = MARKET_PRESETS;
export const riskPresets = RISK_PRESETS;

export const expenseCatalog = {
  food: [
    { key: "home_meals", label: "Home-cooked meals", priceRange: [1.2, 3.2], unit: "meal" },
    { key: "eating_out", label: "Eating out", priceRange: [4.5, 12], unit: "meal" },
    { key: "snacks", label: "Snacks / instant food", priceRange: [0.8, 2.5], unit: "item" }
  ],
  housing: [
    { key: "rent", label: "Rent", priceRange: [220, 680], unit: "month" },
    { key: "maintenance", label: "Maintenance", priceRange: [20, 90], unit: "month" },
    { key: "utilities", label: "Utilities (electricity/water/internet)", priceRange: [45, 160], unit: "month" }
  ],
  health: [
    { key: "gym", label: "Gym membership", priceRange: [12, 45], unit: "month" },
    { key: "doctor", label: "Doctor visits", priceRange: [18, 60], unit: "visit" },
    { key: "medicines", label: "Medicines", priceRange: [8, 35], unit: "set" }
  ],
  subscriptions: [
    { key: "streaming", label: "Streaming apps", priceRange: [6, 18], unit: "month" },
    { key: "productivity", label: "Productivity apps", priceRange: [6, 20], unit: "month" },
    { key: "cloud", label: "Cloud storage", priceRange: [3, 12], unit: "month" }
  ],
  transport: [
    { key: "fuel", label: "Fuel", priceRange: [18, 120], unit: "month" },
    { key: "public_transport", label: "Public transport", priceRange: [18, 90], unit: "month" },
    { key: "ride_hailing", label: "Ride-hailing", priceRange: [6, 45], unit: "ride" }
  ],
  lifestyle: [
    { key: "shopping", label: "Shopping", priceRange: [20, 140], unit: "month" },
    { key: "entertainment", label: "Entertainment", priceRange: [12, 70], unit: "month" },
    { key: "travel", label: "Travel", priceRange: [0, 180], unit: "month" }
  ],
  education: [
    { key: "courses", label: "Courses", priceRange: [15, 160], unit: "month" },
    { key: "books", label: "Books", priceRange: [5, 40], unit: "month" },
    { key: "exam_fees", label: "Exam fees", priceRange: [0, 120], unit: "month" }
  ]
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const pick = (items) => items[Math.floor(Math.random() * items.length)];

const baseLifeStages = [
  { label: "School student", incomeRange: [200, 600], stability: "low" },
  { label: "College student", incomeRange: [600, 1800], stability: "low" },
  { label: "First job professional", incomeRange: [2800, 5200], stability: "medium" },
  { label: "Freelancer", incomeRange: [2000, 5200], stability: "low" },
  { label: "Family with dependents", incomeRange: [5200, 9000], stability: "medium" },
  { label: "Entrepreneur", incomeRange: [3500, 8200], stability: "medium" },
  { label: "Retired individual", incomeRange: [1800, 4200], stability: "high" }
];

const debtTypes = [
  { label: "Education loan", rate: 0.08 },
  { label: "Credit card", rate: 0.24 },
  { label: "Personal loan", rate: 0.14 },
  { label: "Vehicle loan", rate: 0.11 }
];

const makeDebt = (maxBalance) => {
  const debtType = pick(debtTypes);
  const balance = Math.round((Math.random() * 0.6 + 0.2) * maxBalance);
  return {
    type: debtType.label,
    balance,
    rate: debtType.rate,
    minimumDue: Math.max(20, Math.round(balance * 0.04))
  };
};

export function generateLifeStage() {
  const base = pick(baseLifeStages);
  const location = pick(Object.keys(LOCATION_COST));
  const age = Math.round(16 + Math.random() * 40);
  const dependents = base.label.includes("Family") ? 2 + Math.floor(Math.random() * 2) : Math.random() < 0.2 ? 1 : 0;
  const income = Math.round(
    (base.incomeRange[0] + Math.random() * (base.incomeRange[1] - base.incomeRange[0])) *
      LOCATION_COST[location].multiplier
  );
  const debtCount = Math.random() < 0.6 ? 1 : Math.random() < 0.8 ? 2 : 0;
  const debts = Array.from({ length: debtCount }, () => makeDebt(income * 6));

  return {
    id: `${Date.now()}-${Math.round(Math.random() * 10000)}`,
    label: base.label,
    age,
    stability: base.stability,
    location,
    dependents,
    income,
    fixedCosts: {
      housing: Math.round(LOCATION_COST[location].multiplier * (income * 0.28)),
      utilities: Math.round(LOCATION_COST[location].multiplier * 120)
    },
    debts,
    assets: Math.round(Math.max(0, income * (Math.random() * 0.6)))
  };
}

export const defaultDecision = {
  marketMode: "neutral",
  riskProfile: "moderate",
  debtPayment: 0,
  investment: 0,
  emergencyCash: 0
};

export const defaultState = {
  month: 1,
  cashOnHand: 1000,
  savings: 2000,
  investments: 2000,
  debtBalance: 0,
  debts: [],
  stressLevel: 40,
  creditScore: 680,
  history: []
};

export function buildExpensePlan(lifeStage) {
  const quantities = {};
  const priceTiers = {};
  Object.values(expenseCatalog).flat().forEach((item) => {
    const baseQty = item.key === "home_meals" ? 24 : item.key === "eating_out" ? 6 : item.unit === "month" ? 1 : 2;
    const multiplier = lifeStage.label.includes("Student") ? 0.8 : lifeStage.label.includes("Family") ? 1.2 : 1;
    quantities[item.key] = Math.round(baseQty * multiplier);
    priceTiers[item.key] = "typical";
  });
  return { quantities, priceTiers };
}

export function resolveItemPrice(item, tier, locationMultiplier) {
  const [min, max] = item.priceRange;
  const price = tier === "low" ? min : tier === "high" ? max : (min + max) / 2;
  return price * locationMultiplier;
}

export function calculateExpenses({ lifeStage, quantities, priceTiers }) {
  const locationMultiplier = LOCATION_COST[lifeStage.location].multiplier;
  const items = [];
  let variableTotal = 0;
  Object.entries(expenseCatalog).forEach(([category, entries]) => {
    entries.forEach((item) => {
      const qty = quantities[item.key] ?? 0;
      const tier = priceTiers[item.key] ?? "typical";
      const price = resolveItemPrice(item, tier, locationMultiplier);
      const cost = qty * price;
      if (cost > 0) {
        items.push({
          category,
          key: item.key,
          label: item.label,
          qty,
          unit: item.unit,
          price,
          cost
        });
        variableTotal += cost;
      }
    });
  });

  const fixedTotal = lifeStage.fixedCosts.housing + lifeStage.fixedCosts.utilities;
  return { items, variableTotal, fixedTotal, total: fixedTotal + variableTotal };
}

const computeStress = ({ cashOnHand, expenses, debtBalance }) => {
  const safetyBuffer = cashOnHand / Math.max(expenses, 1);
  const debtLoad = debtBalance / 25000;
  const raw = 62 - safetyBuffer * 18 + debtLoad * 28;
  return clamp(Math.round(raw), 5, 95);
};

const updateCredit = ({ missed, utilization }) => {
  if (missed) return -20;
  if (utilization > 0.6) return -6;
  if (utilization < 0.3) return 6;
  return 2;
};

const pickLifeEvent = (lastEventKey) => {
  const available = LIFE_EVENT_POOL.filter((event) => event.key !== lastEventKey);
  if (Math.random() < 0.22) {
    return pick(available);
  }
  return null;
};

const allocateDebtPayment = (debts, payment) => {
  const sorted = [...debts].sort((a, b) => b.rate - a.rate);
  let remaining = payment;
  const updated = sorted.map((debt) => {
    const interest = debt.balance * (debt.rate / 12);
    const minimum = Math.min(debt.minimumDue, debt.balance + interest);
    const paid = Math.min(remaining, minimum + Math.max(0, remaining - minimum));
    remaining -= paid;
    const nextBalance = clamp(debt.balance + interest - paid, 0, 1e9);
    return { ...debt, balance: nextBalance };
  });
  const missed = payment < debts.reduce((sum, debt) => sum + debt.minimumDue, 0) * 0.9;
  return { updated: updated.sort((a, b) => a.rate - b.rate), missed };
};

export function runDecisionCycle({ lifeStage, decision, expenses, state }) {
  const market = MARKET_PRESETS[decision.marketMode] ?? MARKET_PRESETS.neutral;
  const risk = RISK_PRESETS[decision.riskProfile] ?? RISK_PRESETS.moderate;
  const lastEventKey = state.history.at(-1)?.eventKey ?? null;
  const lifeEvent = pickLifeEvent(lastEventKey);
  const eventImpact = lifeEvent ? lifeEvent.impact() : {};

  const incomeMultiplier = eventImpact.incomeMultiplier ?? 1;
  const income = lifeStage.income * incomeMultiplier;
  const expenseTotal = expenses.total + (eventImpact.fixedCostDelta ?? 0);

  const debtPayment = decision.debtPayment;
  const savingsContribution = decision.emergencyCash;
  const investmentContribution = decision.investment;

  const outflow = expenseTotal + debtPayment + savingsContribution + investmentContribution;
  const cashDelta = income - outflow + (eventImpact.cashDelta ?? 0);
  const nextCash = state.cashOnHand + cashDelta;

  const debtState = allocateDebtPayment(state.debts, debtPayment);
  const nextSavings = state.savings + savingsContribution;

  const marketReturn = market.baseReturn * risk.riskMultiplier + (Math.random() - 0.5) * 0.012 + (eventImpact.marketShock ?? 0);
  const nextInvestments = (state.investments + investmentContribution) * (1 + marketReturn);
  const totalDebt = debtState.updated.reduce((sum, debt) => sum + debt.balance, 0);
  const netWorth = nextCash + nextSavings + nextInvestments - totalDebt;
  const creditLimit = Math.max(totalDebt * 1.4, 1);
  const utilization = totalDebt / creditLimit;
  const creditScore = clamp(state.creditScore + updateCredit({ missed: debtState.missed, utilization }), 420, 850);

  const stressLevel = computeStress({ cashOnHand: nextCash, expenses: expenseTotal, debtBalance: totalDebt });

  const snapshot = {
    month: state.month,
    netWorth: Math.round(netWorth),
    cashOnHand: Math.round(nextCash),
    savings: Math.round(nextSavings),
    investments: Math.round(nextInvestments),
    debtBalance: Math.round(totalDebt),
    stressLevel,
    creditScore,
    expenses: Math.round(expenseTotal),
    income: Math.round(income),
    marketReturn,
    event: lifeEvent?.label ?? "Quiet month",
    eventKey: lifeEvent?.key ?? "none"
  };

  const history = [...state.history, snapshot].slice(-72);

  return {
    month: state.month + 1,
    cashOnHand: nextCash,
    savings: nextSavings,
    investments: nextInvestments,
    debtBalance: totalDebt,
    debts: debtState.updated,
    stressLevel,
    creditScore,
    history
  };
}

export function projectFuture({ lifeStage, decision, expenses, state }, months = 12) {
  let projectionState = { ...state };
  const points = [];
  for (let i = 0; i < months; i += 1) {
    projectionState = runDecisionCycle({ lifeStage, decision, expenses, state: projectionState });
    const latest = projectionState.history.at(-1);
    points.push({
      month: state.month + i,
      netWorth: latest.netWorth,
      debtBalance: latest.debtBalance,
      investments: latest.investments
    });
  }
  return points;
}

export function summarizeFeedback(snapshot, allocations) {
  const messages = [];
  messages.push(`You earned ${snapshot.income} and spent ${snapshot.expenses} this month.`);
  if (allocations.debtPayment > 0) {
    messages.push(`You put ${allocations.debtPayment} toward debt. Small extra payments compound.`);
  }
  if (snapshot.marketReturn < 0) {
    messages.push("Markets dipped this month. Staying consistent builds resilience.");
  }
  if (snapshot.stressLevel > 70) {
    messages.push("Stress is high. Tighten variable spending or hold more cash.");
  }
  return messages.slice(0, 3);
}


