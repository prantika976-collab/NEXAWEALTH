const MARKET_PRESETS = {
  bull: { label: "Bull market", baseReturn: 0.012 },
  neutral: { label: "Stable market", baseReturn: 0.004 },
  bear: { label: "Bear market", baseReturn: -0.008 }
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const defaultInputs = {
  monthlyIncome: 5200,
  fixedExpenses: 2100,
  variableExpenses: 900,
  debtBalance: 12000,
  debtRate: 0.12,
  debtPayment: 350,
  savingsRate: 0.12,
  investmentContribution: 500,
  marketMode: "neutral"
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

export const marketPresets = MARKET_PRESETS;

const computeStress = ({ cashOnHand, debtBalance, expenses }) => {
  const safetyBuffer = cashOnHand / Math.max(expenses, 1);
  const debtLoad = debtBalance / 25000;
  const raw = 60 - safetyBuffer * 20 + debtLoad * 25;
  return clamp(Math.round(raw), 5, 95);
};

const updateCredit = ({ debtPayment, debtBalance, missed }) => {
  if (missed) return -18;
  if (debtPayment > 0 && debtBalance > 0) return 6;
  return 2;
};

export function runCycle(inputs, state) {
  const market = MARKET_PRESETS[inputs.marketMode];
  const baseReturn = market?.baseReturn ?? 0.004;
  const volatility = (Math.random() - 0.5) * 0.008;
  const marketReturn = baseReturn + volatility;

  const expenses = inputs.fixedExpenses + inputs.variableExpenses;
  const debtInterest = state.debtBalance * (inputs.debtRate / 12);
  const debtPayment = Math.min(inputs.debtPayment, state.debtBalance + debtInterest);
  const savingsContribution = inputs.monthlyIncome * inputs.savingsRate;
  const investmentContribution = inputs.investmentContribution;

  const outflow = expenses + debtPayment + savingsContribution + investmentContribution;
  const inflow = inputs.monthlyIncome;
  const cashDelta = inflow - outflow;
  const missedPayment = cashDelta < -200;

  const nextCash = state.cashOnHand + cashDelta;
  const nextSavings = state.savings + savingsContribution;
  const nextInvestments = (state.investments + investmentContribution) * (1 + marketReturn);
  const nextDebt = clamp(state.debtBalance + debtInterest - debtPayment, 0, 1e9);

  const netWorth = nextCash + nextSavings + nextInvestments - nextDebt;
  const stressLevel = computeStress({ cashOnHand: nextCash, debtBalance: nextDebt, expenses });
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
    income: Math.round(inflow),
    marketReturn
  };

  const history = [...state.history, snapshot].slice(-48);

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

export function projectFuture(inputs, state, months = 12) {
  let projectionState = { ...state };
  const points = [];
  for (let i = 0; i < months; i += 1) {
    projectionState = runCycle(inputs, projectionState);
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
  return messages.slice(0, 3);
}

