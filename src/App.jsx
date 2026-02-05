import React, { useMemo, useState } from "react";
import {
  allocationPresets,
  analyzeBehavior,
  defaultDecision,
  hydrateScenario,
  lifestylePresets,
  marketPresets,
  projectFuture,
  riskPresets,
  runDecisionCycle,
  scenarioPresets,
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
  { key: "scenarios", label: "Life Scenarios" },
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

const DecisionButtonGroup = ({ label, options, value, onChange }) => (
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

const ScenarioCard = ({ scenarioKey, scenario, onSelect }) => (
  <button className="scenario-card" onClick={() => onSelect(scenarioKey)}>
    <h3>{scenario.label}</h3>
    <p>{scenario.goal}</p>
    <span>{scenario.riskNote}</span>
  </button>
);

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
  const [scenarioKey, setScenarioKey] = usePersistentState("nexawealth-scenario", "first_job");
  const [decision, setDecision] = usePersistentState("nexawealth-decision", defaultDecision);
  const [simulation, setSimulation] = usePersistentState("nexawealth-sim", hydrateScenario(scenarioKey));
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
  const [timelineDecision, setTimelineDecision] = useState({ ...defaultDecision, allocation: "growth" });

  const scenario = scenarioPresets[scenarioKey] ?? scenarioPresets.first_job;
  const simulationState = simulation.state;
  const latestSnapshot = simulationState.history.at(-1);

  const projection = useMemo(
    () =>
      projectFuture({ scenario, decision, state: simulationState }, 12),
    [scenario, decision, simulationState]
  );
  const feedback = latestSnapshot ? summarizeFeedback(latestSnapshot) : [];
  const behavior = analyzeBehavior(simulationState.history);

  const applyScenario = (key) => {
    setScenarioKey(key);
    setSimulation(hydrateScenario(key));
  };

  const handleRunCycle = () => {
    setSimulation((prev) => ({
      ...prev,
      state: runDecisionCycle({ scenario, decision, state: prev.state })
    }));
  };

  const handleReset = () => {
    setSimulation(hydrateScenario(scenarioKey));
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
    () => projectFuture({ scenario, decision, state: simulationState }, 60),
    [scenario, decision, simulationState]
  );
  const timelineAlt = useMemo(
    () => projectFuture({ scenario, decision: timelineDecision, state: simulationState }, 60),
    [scenario, timelineDecision, simulationState]
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
          <p className="tag">Nexawealth · Version 2</p>
          <h1>Financial literacy through lived decisions.</h1>
          <p>
            Every mode is interactive. Choose actions, see consequences, and shape a financial future
            without lectures or theory dumps.
          </p>
        </div>
        <div className="hero-card">
          <p>Active scenario</p>
          <h3>{scenario.label}</h3>
          <p className="muted">{scenario.goal}</p>
          <button className="ghost" onClick={handleReset}>
            Reset scenario
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
            <h2>Simulation Decisions</h2>
            <DecisionButtonGroup
              label="Lifestyle choice"
              value={decision.lifestyle}
              onChange={(value) => setDecision({ ...decision, lifestyle: value })}
              options={Object.entries(lifestylePresets).map(([value, preset]) => ({
                value,
                label: preset.label
              }))}
            />
            <DecisionButtonGroup
              label="Income allocation"
              value={decision.allocation}
              onChange={(value) => setDecision({ ...decision, allocation: value })}
              options={Object.entries(allocationPresets).map(([value, preset]) => ({
                value,
                label: preset.label
              }))}
            />
            <DecisionButtonGroup
              label="Debt strategy"
              value={decision.debtStrategy}
              onChange={(value) => setDecision({ ...decision, debtStrategy: value })}
              options={[
                { value: "minimum", label: "Minimum" },
                { value: "aggressive", label: "Aggressive" }
              ]}
            />
            <DecisionButtonGroup
              label="Investment risk"
              value={decision.riskProfile}
              onChange={(value) => setDecision({ ...decision, riskProfile: value })}
              options={Object.entries(riskPresets).map(([value, preset]) => ({
                value,
                label: preset.label
              }))}
            />
            <DecisionButtonGroup
              label="Market climate"
              value={decision.marketMode}
              onChange={(value) => setDecision({ ...decision, marketMode: value })}
              options={Object.entries(marketPresets).map(([value, preset]) => ({
                value,
                label: preset.label
              }))}
            />
            <button className="primary" onClick={handleRunCycle}>
              Run monthly cycle
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
              <Card
                title="Market return"
                value={latestSnapshot ? formatPercent(latestSnapshot.marketReturn) : "–"}
                footnote="Monthly"
              />
            </div>
            <div className="chart-block">
              <h3>Net worth trajectory</h3>
              <LineChart points={simulationState.history} />
            </div>
          </div>

          <div className="panel">
            <h2>Decision Feedback</h2>
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
        </section>
      )}

      {activeMode === "scenarios" && (
        <section className="grid">
          <div className="panel">
            <h2>Life Scenario Mode</h2>
            <p className="muted">Each scenario changes income stability, risk, and success definition.</p>
            <div className="scenario-grid">
              {Object.entries(scenarioPresets).map(([key, preset]) => (
                <ScenarioCard key={key} scenarioKey={key} scenario={preset} onSelect={applyScenario} />
              ))}
            </div>
          </div>
          <div className="panel">
            <h2>Scenario details</h2>
            <p>{scenario.goal}</p>
            <p className="muted">{scenario.riskNote}</p>
            <div className="metrics">
              <div>
                <p>Monthly income</p>
                <strong>{formatCurrency(scenario.income)}</strong>
              </div>
              <div>
                <p>Fixed expenses</p>
                <strong>{formatCurrency(scenario.fixedExpenses)}</strong>
              </div>
              <div>
                <p>Starting debt</p>
                <strong>{formatCurrency(scenario.debtBalance)}</strong>
              </div>
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
            <DecisionButtonGroup
              label="Alternate allocation"
              value={timelineDecision.allocation}
              onChange={(value) => setTimelineDecision({ ...timelineDecision, allocation: value })}
              options={Object.entries(allocationPresets).map(([value, preset]) => ({
                value,
                label: preset.label
              }))}
            />
            <DecisionButtonGroup
              label="Alternate lifestyle"
              value={timelineDecision.lifestyle}
              onChange={(value) => setTimelineDecision({ ...timelineDecision, lifestyle: value })}
              options={Object.entries(lifestylePresets).map(([value, preset]) => ({
                value,
                label: preset.label
              }))}
            />
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
                <strong>-18 pts</strong>
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
                <p>Risk appetite</p>
                <strong>{behavior.risk}</strong>
              </div>
              <div>
                <p>Mindset</p>
                <strong>{behavior.mindset}</strong>
              </div>
              <div>
                <p>Tendency</p>
                <strong>{behavior.tendency}</strong>
              </div>
            </div>
            <p className="muted">{behavior.suggestion}</p>
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
        <p>Nexawealth V2 · Experiential finance through decisions · State saved in browser</p>
      </footer>
    </div>
  );
}
