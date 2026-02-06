import React, { useMemo, useState } from "react";
import {
  buildExpensePlan,
  calculateExpenses,
  defaultDecision,
  defaultState,
  expenseCatalog,
  generateLifeStage,
  marketPresets,
  projectFuture,
  riskPresets,
  runDecisionCycle,
  summarizeFeedback
} from "./sim/engine.js";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value ?? 0);

const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;

const modes = [
  { key: "simulation", label: "Simulation Mode" },
  { key: "decision_lab", label: "Decision Lab" },
  { key: "market", label: "Market Explorer" },
  { key: "toolkit", label: "Finance Toolkit" },
  { key: "timeline", label: "Future Self" },
  { key: "exploration", label: "How Money Works" },
  { key: "banking", label: "Banking Mode" },
  { key: "reflection", label: "Reflection" }
];

const Card = ({ title, value, footnote }) => (
  <div className="card">
    <p className="card-title">{title}</p>
    <h3>{value}</h3>
    {footnote && <span>{footnote}</span>}
  </div>
);

const LineChart = ({ points, height = 160, valueKey = "netWorth" }) => {
  if (points.length === 0) return null;
  const values = points.map((point) => point[valueKey]);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = Math.max(maxValue - minValue, 1);
  const width = 520;
  const stepX = width / (points.length - 1 || 1);
  const path = points
    .map((point, index) => {
      const x = index * stepX;
      const y = height - ((point[valueKey] - minValue) / range) * height;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img">
      <path d={path} fill="none" stroke="url(#lineGradient)" strokeWidth="3" />
      <defs>
        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c8bff" />
          <stop offset="100%" stopColor="#46f0ff" />
        </linearGradient>
      </defs>
    </svg>
  );
};

const ChoiceButtons = ({ label, options, value, onChange }) => (
  <div className="choice-group">
    <p>{label}</p>
    <div className="choice-buttons">
      {options.map((option) => (
        <button
          key={option.value}
          className={value === option.value ? "active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);

const usePersistentState = (key, initialValue) => {
  const [state, setState] = useState(() => {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  const setPersisted = (value) => {
    setState((prev) => {
      const nextValue = typeof value === "function" ? value(prev) : value;
      window.localStorage.setItem(key, JSON.stringify(nextValue));
      return nextValue;
    });
  };

  return [state, setPersisted];
};

const decisionLabItems = [
  {
    key: "bonus",
    title: "Bonus allocation",
    prompt: "You receive a $1,200 bonus. Where do you send it?",
    choices: [
      {
        label: "Invest it",
        outcome: "You boosted long-term growth, but your cash buffer stayed the same.",
        effect: "+12% long-term projection"
      },
      {
        label: "Pay debt",
        outcome: "Debt drops immediately, lowering stress and interest.",
        effect: "-1.5 yrs to debt freedom"
      },
      {
        label: "Emergency fund",
        outcome: "Short-term safety rises, reducing stress volatility.",
        effect: "+2 months runway"
      }
    ]
  },
  {
    key: "crash",
    title: "Market crash",
    prompt: "Markets drop 15% in a month. What do you do?",
    choices: [
      {
        label: "Hold",
        outcome: "You avoid locking in losses and stay on track for recovery.",
        effect: "Stability preserved"
      },
      {
        label: "Buy more",
        outcome: "You lower your average cost, boosting future gains.",
        effect: "+8% growth potential"
      },
      {
        label: "Sell",
        outcome: "You reduce risk now, but give up the rebound.",
        effect: "Stress -4, growth -6%"
      }
    ]
  },
  {
    key: "lifestyle",
    title: "Lifestyle upgrade",
    prompt: "You consider upgrading your lifestyle by $400/mo.",
    choices: [
      {
        label: "Upgrade",
        outcome: "Comfort rises, but savings slow down.",
        effect: "Runway -1 month"
      },
      {
        label: "Delay",
        outcome: "You keep momentum toward your goals.",
        effect: "+4 months to target"
      }
    ]
  },
  {
    key: "loan",
    title: "Loan vs cash purchase",
    prompt: "You need a $2,000 laptop. What is the move?",
    choices: [
      {
        label: "Cash purchase",
        outcome: "Cash dips now, but no interest accrues.",
        effect: "Stress +2, interest saved"
      },
      {
        label: "Installments",
        outcome: "Cash stays higher, but interest adds up.",
        effect: "+$140 total cost"
      }
    ]
  }
];

const bankAllocationDefaults = {
  savings: 0.3,
  emergency: 0.25,
  fixedDeposit: 0.2,
  investments: 0.25
};

export default function App() {
  const [activeMode, setActiveMode] = useState("simulation");
  const [lifeStage, setLifeStage] = usePersistentState("nexawealth-life", generateLifeStage());
  const [expensePlan, setExpensePlan] = usePersistentState("nexawealth-expenses", buildExpensePlan(lifeStage));
  const [decision, setDecision] = usePersistentState("nexawealth-decision", defaultDecision);
  const [simulationState, setSimulationState] = usePersistentState("nexawealth-sim", {
    ...defaultState,
    cashOnHand: lifeStage.assets,
    debtBalance: lifeStage.debts.reduce((sum, debt) => sum + debt.balance, 0),
    debts: lifeStage.debts
  });
  const [decisionLabState, setDecisionLabState] = useState({});
  const [marketExplorer, setMarketExplorer] = useState({ horizon: 10, contribution: 300, risk: 0.6 });
  const [toolkit, setToolkit] = useState({
    budgetIncome: 5200,
    budgetNeeds: 0.5,
    budgetWants: 0.3,
    budgetSavings: 0.2,
    goalAmount: 20000,
    goalMonthly: 600,
    debtAmount: 12000,
    debtPayment: 350,
    savingsMonthly: 400,
    savingsRate: 0.04
  });
  const [banking, setBanking] = useState(bankAllocationDefaults);
  const [timelineDecision, setTimelineDecision] = useState({ ...defaultDecision, investment: 500 });

  const expenses = useMemo(
    () => calculateExpenses({ lifeStage, quantities: expensePlan.quantities, priceTiers: expensePlan.priceTiers }),
    [lifeStage, expensePlan]
  );

  const latestSnapshot = simulationState.history.at(-1);

  const projection = useMemo(
    () => projectFuture({ lifeStage, decision, expenses, state: simulationState }, 12),
    [lifeStage, decision, expenses, simulationState]
  );

  const feedback = latestSnapshot ? summarizeFeedback(latestSnapshot, decision) : [];

  const recommendedSpend = Math.round(lifeStage.income * 0.55);
  const spendRisk = expenses.total > lifeStage.income * 0.8 ? "risky" : expenses.total > lifeStage.income * 0.65 ? "tight" : "safe";

  const handleGenerateLifeStage = () => {
    const nextStage = generateLifeStage();
    setLifeStage(nextStage);
    setExpensePlan(buildExpensePlan(nextStage));
    setSimulationState({
      ...defaultState,
      cashOnHand: nextStage.assets,
      debtBalance: nextStage.debts.reduce((sum, debt) => sum + debt.balance, 0),
      debts: nextStage.debts
    });
  };

  const handleRunCycle = () => {
    setSimulationState((prev) =>
      runDecisionCycle({
        lifeStage,
        decision,
        expenses,
        state: prev
      })
    );
  };

  const handleReset = () => {
    setExpensePlan(buildExpensePlan(lifeStage));
    setDecision(defaultDecision);
    setSimulationState({
      ...defaultState,
      cashOnHand: lifeStage.assets,
      debtBalance: lifeStage.debts.reduce((sum, debt) => sum + debt.balance, 0),
      debts: lifeStage.debts
    });
  };

  const totalBankAllocation = Object.values(banking).reduce((sum, value) => sum + value, 0);
  const normalizedBanking = Object.fromEntries(
    Object.entries(banking).map(([key, value]) => [key, value / totalBankAllocation])
  );

  const budgetBreakdown = {
    needs: toolkit.budgetIncome * toolkit.budgetNeeds,
    wants: toolkit.budgetIncome * toolkit.budgetWants,
    savings: toolkit.budgetIncome * toolkit.budgetSavings
  };

  const goalMonths = Math.ceil(toolkit.goalAmount / Math.max(toolkit.goalMonthly, 1));
  const debtMonths = Math.ceil(toolkit.debtAmount / Math.max(toolkit.debtPayment, 1));
  const savingsProjection = toolkit.savingsMonthly * 12 * (1 + toolkit.savingsRate);

  const timelineNow = useMemo(
    () => projectFuture({ lifeStage, decision, expenses, state: simulationState }, 60),
    [lifeStage, decision, expenses, simulationState]
  );
  const timelineAlt = useMemo(
    () => projectFuture({ lifeStage, decision: timelineDecision, expenses, state: simulationState }, 60),
    [lifeStage, timelineDecision, expenses, simulationState]
  );

  const marketPoints = useMemo(() => {
    const points = [];
    let balance = 0;
    for (let year = 1; year <= marketExplorer.horizon; year += 1) {
      const baseReturn = 0.04 + marketExplorer.risk * 0.08;
      balance = (balance + marketExplorer.contribution * 12) * (1 + baseReturn);
      points.push({ year, value: Math.round(balance) });
    }
    return points;
  }, [marketExplorer]);

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="tag">Nexawealth · Simulation v3</p>
          <h1>Live a financial life, not a spreadsheet.</h1>
          <p>
            Make real choices, see the impact, and feel how small decisions compound over time.
          </p>
        </div>
        <div className="hero-card">
          <p>Current life stage</p>
          <h3>{lifeStage.label}</h3>
          <p className="muted">Age {lifeStage.age} · {lifeStage.dependents} dependents · {lifeStage.stability} stability</p>
          <button className="ghost" onClick={handleGenerateLifeStage}>
            Generate new life stage
          </button>
        </div>
      </header>

      <nav className="mode-nav">
        {modes.map((mode) => (
          <button key={mode.key} className={activeMode === mode.key ? "active" : ""} onClick={() => setActiveMode(mode.key)}>
            {mode.label}
          </button>
        ))}
      </nav>

      {activeMode === "simulation" && (
        <section className="grid">
          <div className="panel">
            <h2>Life stage snapshot</h2>
            <div className="metrics">
              <div>
                <p>Monthly income</p>
                <strong>{formatCurrency(lifeStage.income)}</strong>
              </div>
              <div>
                <p>Location cost</p>
                <strong>{lifeStage.location}</strong>
              </div>
              <div>
                <p>Starting cash</p>
                <strong>{formatCurrency(lifeStage.assets)}</strong>
              </div>
              <div>
                <p>Total debt</p>
                <strong>{formatCurrency(simulationState.debts.reduce((sum, debt) => sum + debt.balance, 0))}</strong>
              </div>
            </div>
            <div className="debt-list">
              {simulationState.debts.length === 0 ? (
                <p className="muted">No active debt. Keep building a buffer.</p>
              ) : (
                simulationState.debts.map((debt) => (
                  <div key={debt.type}>
                    <p>{debt.type}</p>
                    <strong>{formatCurrency(debt.balance)}</strong>
                    <span>Min due {formatCurrency(debt.minimumDue)} · {Math.round(debt.rate * 100)}% APR</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel">
            <h2>Monthly spending choices</h2>
            <p className="muted">Most people in this stage spend around {formatCurrency(recommendedSpend)} on living costs.</p>
            <p className={`spend-${spendRisk}`}>
              Your current plan is {spendRisk === "safe" ? "affordable" : spendRisk === "tight" ? "tight" : "risky"}.
            </p>
            <div className="expense-grid">
              {Object.entries(expenseCatalog).map(([category, items]) => (
                <div key={category} className="expense-category">
                  <h3>{category}</h3>
                  {items.map((item) => {
                    const qty = expensePlan.quantities[item.key] ?? 0;
                    const tier = expensePlan.priceTiers[item.key] ?? "typical";
                    const cost = expenses.items.find((entry) => entry.key === item.key)?.cost ?? 0;
                    return (
                      <div key={item.key} className="expense-item">
                        <div>
                          <p>{item.label}</p>
                          <span>
                            {item.unit} · ${item.priceRange[0].toFixed(2)} - ${item.priceRange[1].toFixed(2)}
                          </span>
                        </div>
                        <div className="expense-controls">
                          <button
                            onClick={() =>
                              setExpensePlan((prev) => ({
                                ...prev,
                                quantities: {
                                  ...prev.quantities,
                                  [item.key]: Math.max(0, qty - 1)
                                }
                              }))
                            }
                          >
                            -
                          </button>
                          <strong>{qty}</strong>
                          <button
                            onClick={() =>
                              setExpensePlan((prev) => ({
                                ...prev,
                                quantities: {
                                  ...prev.quantities,
                                  [item.key]: qty + 1
                                }
                              }))
                            }
                          >
                            +
                          </button>
                          <select
                            value={tier}
                            onChange={(event) =>
                              setExpensePlan((prev) => ({
                                ...prev,
                                priceTiers: { ...prev.priceTiers, [item.key]: event.target.value }
                              }))
                            }
                          >
                            <option value="low">Low</option>
                            <option value="typical">Typical</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                        <div className="expense-cost">{formatCurrency(cost)}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2>Money allocation</h2>
            <label className="input-row">
              <span>Debt repayment</span>
              <input
                type="number"
                value={decision.debtPayment}
                onChange={(event) => setDecision({ ...decision, debtPayment: Number(event.target.value) })}
              />
            </label>
            <label className="input-row">
              <span>Investments</span>
              <input
                type="number"
                value={decision.investment}
                onChange={(event) => setDecision({ ...decision, investment: Number(event.target.value) })}
              />
            </label>
            <label className="input-row">
              <span>Emergency cash</span>
              <input
                type="number"
                value={decision.emergencyCash}
                onChange={(event) => setDecision({ ...decision, emergencyCash: Number(event.target.value) })}
              />
            </label>
            <ChoiceButtons
              label="Market climate"
              value={decision.marketMode}
              onChange={(value) => setDecision({ ...decision, marketMode: value })}
              options={Object.entries(marketPresets).map(([value, preset]) => ({
                value,
                label: preset.label
              }))}
            />
            <ChoiceButtons
              label="Investment risk"
              value={decision.riskProfile}
              onChange={(value) => setDecision({ ...decision, riskProfile: value })}
              options={Object.entries(riskPresets).map(([value, preset]) => ({
                value,
                label: preset.label
              }))}
            />
            <button className="primary" onClick={handleRunCycle}>
              Run monthly cycle
            </button>
            <button className="ghost" onClick={handleReset}>
              Reset this simulation
            </button>
          </div>

          <div className="panel">
            <h2>Live Dashboard</h2>
            <div className="cards">
              <Card title="Net worth" value={formatCurrency(latestSnapshot?.netWorth)} />
              <Card title="Cash on hand" value={formatCurrency(latestSnapshot?.cashOnHand ?? simulationState.cashOnHand)} />
              <Card title="Savings" value={formatCurrency(latestSnapshot?.savings ?? simulationState.savings)} />
              <Card title="Investments" value={formatCurrency(latestSnapshot?.investments ?? simulationState.investments)} />
              <Card title="Debt" value={formatCurrency(latestSnapshot?.debtBalance ?? simulationState.debtBalance)} />
              <Card title="Credit score" value={latestSnapshot?.creditScore ?? simulationState.creditScore} />
              <Card title="Stress" value={`${latestSnapshot?.stressLevel ?? simulationState.stressLevel}%`} />
              <Card title="Market return" value={latestSnapshot ? formatPercent(latestSnapshot.marketReturn) : "–"} footnote="Monthly" />
            </div>
            <div className="chart-block">
              <h3>Net worth trajectory</h3>
              <LineChart points={simulationState.history} />
            </div>
          </div>

          <div className="panel">
            <h2>Cycle feedback</h2>
            {feedback.length === 0 ? (
              <p className="muted">Run a cycle to receive feedback and consequences.</p>
            ) : (
              <ul className="feedback">
                {feedback.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            <div className="event-tile">
              <p>Latest life event</p>
              <strong>{latestSnapshot?.event ?? "No events yet"}</strong>
            </div>
          </div>

          <div className="panel">
            <h2>12-month projection</h2>
            <LineChart points={projection.map((point) => ({ netWorth: point.netWorth }))} height={120} />
            <div className="projection-grid">
              {projection.slice(-3).map((point) => (
                <div key={point.month}>
                  <p>Month {point.month}</p>
                  <strong>{formatCurrency(point.netWorth)}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeMode === "decision_lab" && (
        <section className="grid">
          {decisionLabItems.map((item) => (
            <div key={item.key} className="panel">
              <h2>{item.title}</h2>
              <p>{item.prompt}</p>
              <div className="choice-buttons">
                {item.choices.map((choice) => (
                  <button
                    key={choice.label}
                    onClick={() =>
                      setDecisionLabState((prev) => ({
                        ...prev,
                        [item.key]: choice
                      }))
                    }
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
              {decisionLabState[item.key] && (
                <div className="insight">
                  <p>{decisionLabState[item.key].outcome}</p>
                  <strong>{decisionLabState[item.key].effect}</strong>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {activeMode === "market" && (
        <section className="grid">
          <div className="panel">
            <h2>Market Explorer</h2>
            <p className="muted">Experiment with contribution, horizon, and risk to see compounding.</p>
            <label className="input-row">
              <span>Monthly contribution</span>
              <input
                type="number"
                value={marketExplorer.contribution}
                onChange={(event) => setMarketExplorer({ ...marketExplorer, contribution: Number(event.target.value) })}
              />
            </label>
            <label className="input-row">
              <span>Time horizon (years)</span>
              <input
                type="number"
                value={marketExplorer.horizon}
                onChange={(event) => setMarketExplorer({ ...marketExplorer, horizon: Number(event.target.value) })}
              />
            </label>
            <label className="input-row slider">
              <span>Risk level</span>
              <div>
                <input
                  type="range"
                  min="0.2"
                  max="1"
                  step="0.1"
                  value={marketExplorer.risk}
                  onChange={(event) => setMarketExplorer({ ...marketExplorer, risk: Number(event.target.value) })}
                />
                <strong>{Math.round(marketExplorer.risk * 100)}%</strong>
              </div>
            </label>
          </div>
          <div className="panel">
            <h2>Compounding timeline</h2>
            <LineChart points={marketPoints.map((point) => ({ netWorth: point.value }))} height={140} />
            <div className="projection-grid">
              {marketPoints.slice(-3).map((point) => (
                <div key={point.year}>
                  <p>Year {point.year}</p>
                  <strong>{formatCurrency(point.value)}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeMode === "toolkit" && (
        <section className="grid">
          <div className="panel">
            <h2>Budget Planner</h2>
            <label className="input-row">
              <span>Monthly income</span>
              <input
                type="number"
                value={toolkit.budgetIncome}
                onChange={(event) => setToolkit({ ...toolkit, budgetIncome: Number(event.target.value) })}
              />
            </label>
            <div className="metrics">
              <div>
                <p>Needs</p>
                <strong>{formatCurrency(budgetBreakdown.needs)}</strong>
              </div>
              <div>
                <p>Wants</p>
                <strong>{formatCurrency(budgetBreakdown.wants)}</strong>
              </div>
              <div>
                <p>Savings</p>
                <strong>{formatCurrency(budgetBreakdown.savings)}</strong>
              </div>
            </div>
          </div>
          <div className="panel">
            <h2>Goal Planner</h2>
            <label className="input-row">
              <span>Goal amount</span>
              <input
                type="number"
                value={toolkit.goalAmount}
                onChange={(event) => setToolkit({ ...toolkit, goalAmount: Number(event.target.value) })}
              />
            </label>
            <label className="input-row">
              <span>Monthly contribution</span>
              <input
                type="number"
                value={toolkit.goalMonthly}
                onChange={(event) => setToolkit({ ...toolkit, goalMonthly: Number(event.target.value) })}
              />
            </label>
            <p className="muted">Goal achieved in ~{goalMonths} months.</p>
          </div>
          <div className="panel">
            <h2>Debt Payoff Planner</h2>
            <label className="input-row">
              <span>Debt balance</span>
              <input
                type="number"
                value={toolkit.debtAmount}
                onChange={(event) => setToolkit({ ...toolkit, debtAmount: Number(event.target.value) })}
              />
            </label>
            <label className="input-row">
              <span>Monthly payment</span>
              <input
                type="number"
                value={toolkit.debtPayment}
                onChange={(event) => setToolkit({ ...toolkit, debtPayment: Number(event.target.value) })}
              />
            </label>
            <p className="muted">Debt cleared in ~{debtMonths} months.</p>
          </div>
          <div className="panel">
            <h2>Savings Growth Planner</h2>
            <label className="input-row">
              <span>Monthly savings</span>
              <input
                type="number"
                value={toolkit.savingsMonthly}
                onChange={(event) => setToolkit({ ...toolkit, savingsMonthly: Number(event.target.value) })}
              />
            </label>
            <label className="input-row">
              <span>Annual yield</span>
              <input
                type="number"
                value={toolkit.savingsRate}
                onChange={(event) => setToolkit({ ...toolkit, savingsRate: Number(event.target.value) })}
              />
            </label>
            <p className="muted">Projected 12-month growth: {formatCurrency(savingsProjection)}.</p>
          </div>
        </section>
      )}

      {activeMode === "timeline" && (
        <section className="grid">
          <div className="panel">
            <h2>Future Self Timeline</h2>
            <p className="muted">Compare your current decisions with an alternate choice.</p>
            <label className="input-row">
              <span>Alternate investment</span>
              <input
                type="number"
                value={timelineDecision.investment}
                onChange={(event) => setTimelineDecision({ ...timelineDecision, investment: Number(event.target.value) })}
              />
            </label>
            <label className="input-row">
              <span>Alternate debt payment</span>
              <input
                type="number"
                value={timelineDecision.debtPayment}
                onChange={(event) => setTimelineDecision({ ...timelineDecision, debtPayment: Number(event.target.value) })}
              />
            </label>
          </div>
          <div className="panel">
            <h2>60-month projection</h2>
            <LineChart points={timelineNow} height={140} />
            <LineChart points={timelineAlt} height={140} valueKey="netWorth" />
            <p className="muted">Top line is current path. Bottom line is your alternate choice.</p>
          </div>
        </section>
      )}

      {activeMode === "exploration" && (
        <section className="grid">
          <div className="panel">
            <h2>Why banks make money</h2>
            <p className="muted">Tap each lever to see how bank profits shift.</p>
            <div className="metrics">
              <div>
                <p>Deposit rate</p>
                <strong>3%</strong>
              </div>
              <div>
                <p>Lending rate</p>
                <strong>9%</strong>
              </div>
              <div>
                <p>Spread</p>
                <strong>6%</strong>
              </div>
            </div>
            <p className="muted">The spread funds operations and profit, which is why loan rates feel higher.</p>
          </div>
          <div className="panel">
            <h2>Inflation in action</h2>
            <p>
              A $100 basket today costs ${Math.round(100 * 1.08)} next year at 8% inflation. Your cash loses buying power
              unless it grows faster.
            </p>
          </div>
          <div className="panel">
            <h2>Credit score dynamics</h2>
            <p className="muted">On-time payments lift scores, missed payments drop them fast.</p>
            <div className="metrics">
              <div>
                <p>On-time</p>
                <strong>+6 pts</strong>
              </div>
              <div>
                <p>Missed</p>
                <strong>-20 pts</strong>
              </div>
            </div>
          </div>
          <div className="panel">
            <h2>Why investing early matters</h2>
            <p>
              Invest $300/mo for 10 years at 8% and you reach {formatCurrency(52000)}. Wait 5 years and it falls near
              {formatCurrency(32000)}.
            </p>
          </div>
        </section>
      )}

      {activeMode === "banking" && (
        <section className="grid">
          <div className="panel">
            <h2>Practical Banking Mode</h2>
            <p className="muted">Allocate $2,000 across accounts and see outcomes.</p>
            {Object.entries(normalizedBanking).map(([key, value]) => (
              <label key={key} className="input-row slider">
                <span>{key}</span>
                <div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={banking[key]}
                    onChange={(event) => setBanking({ ...banking, [key]: Number(event.target.value) })}
                  />
                  <strong>{Math.round(value * 100)}%</strong>
                </div>
              </label>
            ))}
          </div>
          <div className="panel">
            <h2>Outcomes</h2>
            <div className="metrics">
              <div>
                <p>Savings</p>
                <strong>{formatCurrency(2000 * normalizedBanking.savings)}</strong>
              </div>
              <div>
                <p>Emergency fund</p>
                <strong>{formatCurrency(2000 * normalizedBanking.emergency)}</strong>
              </div>
              <div>
                <p>Fixed deposit</p>
                <strong>{formatCurrency(2000 * normalizedBanking.fixedDeposit)}</strong>
              </div>
              <div>
                <p>Investments</p>
                <strong>{formatCurrency(2000 * normalizedBanking.investments)}</strong>
              </div>
            </div>
            <p className="muted">
              Higher emergency allocation reduces stress volatility. More investment allocation amplifies long-term growth.
            </p>
          </div>
        </section>
      )}

      {activeMode === "reflection" && (
        <section className="grid">
          <div className="panel">
            <h2>Reflection & Insights</h2>
            <div className="metrics">
              <div>
                <p>Net worth trend</p>
                <strong>{latestSnapshot ? formatCurrency(latestSnapshot.netWorth) : "Run a cycle"}</strong>
              </div>
              <div>
                <p>Stress trend</p>
                <strong>{latestSnapshot ? `${latestSnapshot.stressLevel}%` : "Run a cycle"}</strong>
              </div>
              <div>
                <p>Credit trend</p>
                <strong>{latestSnapshot ? latestSnapshot.creditScore : "Run a cycle"}</strong>
              </div>
            </div>
            <p className="muted">Try adjusting spending habits to see how stability shifts.</p>
          </div>
          <div className="panel">
            <h2>Recent behavior</h2>
            {simulationState.history.length === 0 ? (
              <p className="muted">Run a few cycles to generate behavior insights.</p>
            ) : (
              <ul className="feedback">
                {simulationState.history.slice(-5).map((item) => (
                  <li key={item.month}>
                    Month {item.month}: {item.event} · Net worth {formatCurrency(item.netWorth)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <footer>
        <p>Nexawealth Simulation v3 · Experiential finance through decisions · State saved in browser</p>
      </footer>
    </div>
  );
}
