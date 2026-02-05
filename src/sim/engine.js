const MARKET_PRESETS = {
  bull: { label: "Bull market", baseReturn: 0.012 },
  neutral: { label: "Stable market", baseReturn: 0.004 },
  bear: { label: "Bear market", baseReturn: -0.008 }
};

const LIFESTYLE_PRESETS = {
  frugal: { label: "Frugal", variableMultiplier: 0.7, stressRelief: 6 },
  balanced: { label: "Balanced", variableMultiplier: 1, stressRelief: 2 },
  comfort: { label: "Comfort", variableMultiplier: 1.25, stressRelief: -2 },
  luxury: { label: "Luxury", variableMultiplier: 1.55, stressRelief: -6 }
};

const ALLOCATION_PRESETS = {
  balanced: { label: "Balanced", saveRate: 0.15, investRate: 0.1, debtRate: 0.08 },
  debt_crush: { label: "Debt Crush", saveRate: 0.08, investRate: 0.06, debtRate: 0.18 },
  growth: { label: "Growth", saveRate: 0.1, investRate: 0.18, debtRate: 0.05 },
  safe: { label: "Safety First", saveRate: 0.2, investRate: 0.06, debtRate: 0.08 }
};

const RISK_PRESETS = {
  conservative: { label: "Conservative", riskMultiplier: 0.7 },
  moderate: { label: "Moderate", riskMultiplier: 1 },
  aggressive: { label: "Aggressive", riskMultiplier: 1.4 }
};

const LIFE_EVENTS = [
  {
    key: "bonus",
    label: "Surprise bonus",
    impact: (state) => ({ cashDelta: 800, stressDelta: -4 })
  },
  {
    key: "medical",
    label: "Medical emergency",
    impact: () => ({ cashDelta: -1200, stressDelta: 10 })
  },
  {
    key: "job_loss",
    label: "Temporary job loss",
    impact: (state) => ({ incomeMultiplier: 0.7, stressDelta: 12 })
  },
  {
    key: "promotion",
    label: "Promotion unlocked",
    impact: () => ({ incomeMultiplier: 1.08, stressDelta: -5 })
  },
  {
    key: "inflation",
    label: "Inflation spike",
    impact: () => ({ expenseMultiplier: 1.08, stressDelta: 6 })
  }
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const marketPresets = MARKET_PRESETS;
export const lifestylePresets = LIFESTYLE_PRESETS;
export const allocationPresets = ALLOCATION_PRESETS;
export const riskPresets = RISK_PRESETS;

export const scenarioPresets = {
  student: {
    label: "College student",
    income: 1400,
    fixedExpenses: 600,
    startingCash: 300,
    startingSavings: 500,
    startingInvestments: 200,
    debtBalance: 6000,
    debtRate: 0.08,
    goal: "Build a safety buffer while paying down student debt.",
    riskNote: "Income is limited, so stability matters most."
  },
  first_job: {
    label: "First job professional",
    income: 5200,
    fixedExpenses: 2100,
    startingCash: 1200,
    startingSavings: 3000,
    startingInvestments: 2500,
    debtBalance: 12000,
    debtRate: 0.12,
    goal: "Balance loan repayment with early investing.",
    riskNote: "Credit score and runway unlock better options."
  },
  freelancer: {
    label: "Freelancer",
    income: 4200,
    fixedExpenses: 1800,
    startingCash: 900,
    startingSavings: 2600,
    startingInvestments: 1400,
    debtBalance: 4000,
    debtRate: 0.1,
    goal: "Build cash resilience for income swings.",
    riskNote: "Income volatility can spike stress quickly."
  },
  family: {
    label: "Family with dependents",
    income: 7800,
    fixedExpenses: 3200,
    startingCash: 2000,
    startingSavings: 4500,
    startingInvestments: 4000,
    debtBalance: 24000,
    debtRate: 0.11,
    goal: "Protect the household and fund long-term goals.",
    riskNote: "Emergencies have larger impact on stability."
  },
  entrepreneur: {
    label: "Entrepreneur",
    income: 6200,
    fixedExpenses: 2500,
    startingCash: 1600,
    startingSavings: 2200,
    startingInvestments: 3600,
    debtBalance: 18000,
    debtRate: 0.14,
    goal: "Invest in growth while protecting cashflow.",
    riskNote: "Market swings amplify business outcomes."
  },
  retiree: {
    label: "Retired individual",
    income: 3800,
    fixedExpenses: 1900,
    startingCash: 3800,
    startingSavings: 18000,
    startingInvestments: 32000,
    debtBalance: 2000,
    debtRate: 0.05,
    goal: "Preserve capital and reduce stress.",
    riskNote: "Conservative allocations keep runway stable."
  }
};

export const defaultState = {
  month: 1,
  cashOnHand: 1200,
  savings: 3000,
  investments: 2500,
  debtBalance: 12000,
  stressLevel: 35,
  creditScore: 690,
  history: []
};

export const defaultDecision = {
  lifestyle: "balanced",
  allocation: "balanced",
  debtStrategy: "minimum",
  riskProfile: "moderate",
  marketMode: "neutral"
};

const computeStress = ({ cashOnHand, debtBalance, expenses, lifestyle }) => {
  const safetyBuffer = cashOnHand / Math.max(expenses, 1);
  const debtLoad = debtBalance / 25000;
  const lifestyleRelief = LIFESTYLE_PRESETS[lifestyle]?.stressRelief ?? 0;
  const raw = 60 - safetyBuffer * 18 + debtLoad * 26 - lifestyleRelief;
  return clamp(Math.round(raw), 5, 95);
};

const updateCredit = ({ debtPayment, debtBalance, missed }) => {
  if (missed) return -18;
  if (debtPayment > 0 && debtBalance > 0) return 6;
  return 2;
};

const getLifeEvent = () => {
  const roll = Math.random();
  if (roll < 0.18) {
    return LIFE_EVENTS[Math.floor(Math.random() * LIFE_EVENTS.length)];
  }
  return null;
};

export function hydrateScenario(key) {
  const scenario = scenarioPresets[key] ?? scenarioPresets.first_job;
  return {
    scenarioKey: key,
    profile: scenario,
    state: {
      month: 1,
      cashOnHand: scenario.startingCash,
      savings: scenario.startingSavings,
      investments: scenario.startingInvestments,
      debtBalance: scenario.debtBalance,
      stressLevel: 35,
      creditScore: 690,
      history: []
    }
  };
}

export function runDecisionCycle({ scenario, decision, state }) {
  const market = MARKET_PRESETS[decision.marketMode] ?? MARKET_PRESETS.neutral;
  const allocation = ALLOCATION_PRESETS[decision.allocation] ?? ALLOCATION_PRESETS.balanced;
  const lifestyle = LIFESTYLE_PRESETS[decision.lifestyle] ?? LIFESTYLE_PRESETS.balanced;
  const risk = RISK_PRESETS[decision.riskProfile] ?? RISK_PRESETS.moderate;

  const event = getLifeEvent();
  const eventImpact = event ? event.impact(state) : {};
  const incomeMultiplier = eventImpact.incomeMultiplier ?? 1;
  const expenseMultiplier = eventImpact.expenseMultiplier ?? 1;

  const income = scenario.income * incomeMultiplier;
  const fixedExpenses = scenario.fixedExpenses * expenseMultiplier;
  const variableExpenses = scenario.fixedExpenses * 0.55 * lifestyle.variableMultiplier;
  const expenses = fixedExpenses + variableExpenses;

  const baseDebtPayment = income * allocation.debtRate;
  const debtPayment = decision.debtStrategy === "aggressive" ? baseDebtPayment * 1.5 : baseDebtPayment * 0.8;
  const savingsContribution = income * allocation.saveRate;
  const investmentContribution = income * allocation.investRate;

  const marketReturn = market.baseReturn * risk.riskMultiplier + (Math.random() - 0.5) * 0.01;
  const debtInterest = state.debtBalance * (scenario.debtRate / 12);

  const outflow = expenses + debtPayment + savingsContribution + investmentContribution;
  const cashDelta = income - outflow + (eventImpact.cashDelta ?? 0);
  const missedPayment = cashDelta < -250;

  const nextCash = state.cashOnHand + cashDelta;
  const nextSavings = state.savings + savingsContribution;
  const nextInvestments = (state.investments + investmentContribution) * (1 + marketReturn);
  const nextDebt = clamp(state.debtBalance + debtInterest - debtPayment, 0, 1e9);

  const netWorth = nextCash + nextSavings + nextInvestments - nextDebt;
  const stressLevel = computeStress({
    cashOnHand: nextCash,
    debtBalance: nextDebt,
    expenses,
    lifestyle: decision.lifestyle
  });
  const creditScore = clamp(
    state.creditScore + updateCredit({ debtPayment, debtBalance: nextDebt, missed: missedPayment }),
    420,
    850
  );

  const snapshot = {
    month: state.month,
    netWorth: Math.round(netWorth),
    cashOnHand: Math.round(nextCash),
    savings: Math.round(nextSavings),
    investments: Math.round(nextInvestments),
    debtBalance: Math.round(nextDebt),
    stressLevel,
    creditScore,
    expenses: Math.round(expenses),
    income: Math.round(income),
    marketReturn,
    decision: { ...decision },
    event: event?.label ?? "Quiet month"
  };

  const history = [...state.history, snapshot].slice(-72);

  return {
    month: state.month + 1,
    cashOnHand: nextCash,
    savings: nextSavings,
    investments: nextInvestments,
    debtBalance: nextDebt,
    stressLevel,
    creditScore,
    history
  };
}

export function projectFuture({ scenario, decision, state }, months = 12) {
  let projectionState = { ...state };
  const points = [];
  for (let i = 0; i < months; i += 1) {
    projectionState = runDecisionCycle({ scenario, decision, state: projectionState });
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

export function summarizeFeedback(snapshot) {
  const messages = [];
  if (snapshot.netWorth > 0) {
    messages.push("Your net worth moved into positive territory this cycle.");
  }
  if (snapshot.debtBalance > 0 && snapshot.debtBalance < 5000) {
    messages.push("Debt is under control. You are close to a clean slate.");
  }
  if (snapshot.stressLevel > 70) {
    messages.push("Stress is high. Reduce variable expenses or build a larger buffer.");
  }
  if (snapshot.marketReturn < 0) {
    messages.push("The market dipped. Short-term pain, but long-term compounding still works.");
  }
  if (snapshot.savings > 8000) {
    messages.push("Emergency runway is growing, which improves stability.");
  }
  if (snapshot.event && snapshot.event !== "Quiet month") {
    messages.push(`Life event: ${snapshot.event}. Adapt quickly to stay on track.`);
  }
  return messages.slice(0, 3);
}

export function analyzeBehavior(history) {
  if (history.length === 0) {
    return {
      risk: "Balanced",
      mindset: "Exploring",
      tendency: "Undetermined",
      suggestion: "Run a few cycles to reveal your patterns."
    };
  }
  const avgStress = history.reduce((sum, item) => sum + item.stressLevel, 0) / history.length;
  const avgInvest = history.reduce((sum, item) => sum + item.investments, 0) / history.length;
  const avgDebt = history.reduce((sum, item) => sum + item.debtBalance, 0) / history.length;

  const risk = avgInvest > avgDebt ? "Growth leaning" : "Cautious";
  const mindset = avgStress > 60 ? "Short-term pressure" : "Long-term builder";
  const tendency = avgDebt > 15000 ? "Debt-focused" : "Savings-focused";

  return {
    risk,
    mindset,
    tendency,
    suggestion: "Try the Decision Lab for one focused trade-off or explore Market Explorer to test risk comfort."
  };
}


