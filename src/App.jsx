import React, { useMemo, useState } from "react";
import {
  defaultInputs,
  defaultState,
  marketPresets,
  projectFuture,
  runCycle,
  summarizeFeedback
} from "./sim/engine.js";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);

const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;

const InputRow = ({ label, value, onChange, step = 50 }) => (
  <label className="input-row">
    <span>{label}</span>
    <input
      type="number"
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      step={step}
      min={0}
    />
  </label>
);

const SelectRow = ({ label, value, onChange, options }) => (
  <label className="input-row">
    <span>{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const SliderRow = ({ label, value, onChange, min, max, step }) => (
  <label className="input-row slider">
    <span>{label}</span>
    <div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <strong>{formatPercent(value)}</strong>
    </div>
  </label>
);

const Card = ({ title, value, footnote }) => (
  <div className="card">
    <p className="card-title">{title}</p>
    <h3>{value}</h3>
    {footnote && <span>{footnote}</span>}
  </div>
);

const LineChart = ({ points, height = 160 }) => {
  if (points.length === 0) return null;
  const values = points.map((point) => point.netWorth);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = Math.max(maxValue - minValue, 1);
  const width = 520;
  const stepX = width / (points.length - 1 || 1);
  const path = points
    .map((point, index) => {
      const x = index * stepX;
      const y = height - ((point.netWorth - minValue) / range) * height;
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

const BarChart = ({ valueA, valueB, labelA, labelB }) => {
  const maxValue = Math.max(valueA, valueB, 1);
  const heightA = (valueA / maxValue) * 100;
  const heightB = (valueB / maxValue) * 100;
  return (
    <div className="bar-chart">
      <div>
        <span style={{ height: `${heightA}%` }} />
        <p>{labelA}</p>
      </div>
      <div>
        <span style={{ height: `${heightB}%` }} />
        <p>{labelB}</p>
      </div>
    </div>
  );
};

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

export default function App() {
  const [inputs, setInputs] = usePersistentState("nexawealth-inputs", defaultInputs);
  const [state, setState] = usePersistentState("nexawealth-state", defaultState);
  const [scenario, setScenario] = useState("first_job");

  const latestSnapshot = state.history.at(-1);
  const projection = useMemo(() => projectFuture(inputs, state, 12), [inputs, state]);
  const feedback = latestSnapshot ? summarizeFeedback(latestSnapshot) : [];

  const applyScenario = (type) => {
    setScenario(type);
    if (type === "student") {
      setInputs({
        ...defaultInputs,
        monthlyIncome: 1400,
        fixedExpenses: 600,
        variableExpenses: 300,
        debtBalance: 6000,
        debtPayment: 120,
        investmentContribution: 80,
        savingsRate: 0.18
      });
      setState({ ...defaultState, cashOnHand: 300, savings: 500, investments: 200, debtBalance: 6000 });
      return;
    }
    if (type === "family") {
      setInputs({
        ...defaultInputs,
        monthlyIncome: 7800,
        fixedExpenses: 3200,
        variableExpenses: 1600,
        debtBalance: 24000,
        debtPayment: 650,
        investmentContribution: 700,
        savingsRate: 0.1
      });
      setState({ ...defaultState, cashOnHand: 2000, savings: 4500, investments: 4000, debtBalance: 24000 });
      return;
    }
    if (type === "retiree") {
      setInputs({
        ...defaultInputs,
        monthlyIncome: 3800,
        fixedExpenses: 1900,
        variableExpenses: 700,
        debtBalance: 2000,
        debtPayment: 150,
        investmentContribution: 250,
        savingsRate: 0.15
      });
      setState({ ...defaultState, cashOnHand: 3800, savings: 18000, investments: 32000, debtBalance: 2000 });
      return;
    }
    setInputs(defaultInputs);
    setState(defaultState);
  };

  const handleRunCycle = () => {
    setState((prev) => runCycle(inputs, prev));
  };

  const handleReset = () => {
    setInputs(defaultInputs);
    setState(defaultState);
  };

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="tag">Nexawealth · Financial Simulation</p>
          <h1>Live your money decisions before you make them.</h1>
          <p>
            Build your financial future by simulating monthly choices and watching
            the long-term consequences unfold.
          </p>
        </div>
        <div className="hero-card">
          <p>Scenario</p>
          <div className="scenario-buttons">
            <button className={scenario === "first_job" ? "active" : ""} onClick={() => applyScenario("first_job")}>
              First Job
            </button>
            <button className={scenario === "student" ? "active" : ""} onClick={() => applyScenario("student")}>
              Student
            </button>
            <button className={scenario === "family" ? "active" : ""} onClick={() => applyScenario("family")}>
              Family
            </button>
            <button className={scenario === "retiree" ? "active" : ""} onClick={() => applyScenario("retiree")}>
              Retiree
            </button>
          </div>
          <button className="ghost" onClick={handleReset}>
            Reset to default
          </button>
        </div>
      </header>

      <section className="grid">
        <div className="panel">
          <h2>Monthly Inputs</h2>
          <InputRow
            label="Income"
            value={inputs.monthlyIncome}
            onChange={(value) => setInputs({ ...inputs, monthlyIncome: value })}
          />
          <InputRow
            label="Fixed expenses"
            value={inputs.fixedExpenses}
            onChange={(value) => setInputs({ ...inputs, fixedExpenses: value })}
          />
          <InputRow
            label="Variable expenses"
            value={inputs.variableExpenses}
            onChange={(value) => setInputs({ ...inputs, variableExpenses: value })}
          />
          <InputRow
            label="Debt balance"
            value={inputs.debtBalance}
            onChange={(value) => setInputs({ ...inputs, debtBalance: value })}
          />
          <InputRow
            label="Debt payment"
            value={inputs.debtPayment}
            onChange={(value) => setInputs({ ...inputs, debtPayment: value })}
          />
          <InputRow
            label="Investment contribution"
            value={inputs.investmentContribution}
            onChange={(value) => setInputs({ ...inputs, investmentContribution: value })}
          />
          <SliderRow
            label="Savings rate"
            value={inputs.savingsRate}
            onChange={(value) => setInputs({ ...inputs, savingsRate: value })}
            min={0}
            max={0.5}
            step={0.01}
          />
          <SelectRow
            label="Market climate"
            value={inputs.marketMode}
            onChange={(value) => setInputs({ ...inputs, marketMode: value })}
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
            <Card title="Net worth" value={formatCurrency(latestSnapshot?.netWorth ?? 0)} />
            <Card title="Cash on hand" value={formatCurrency(latestSnapshot?.cashOnHand ?? state.cashOnHand)} />
            <Card title="Savings" value={formatCurrency(latestSnapshot?.savings ?? state.savings)} />
            <Card title="Investments" value={formatCurrency(latestSnapshot?.investments ?? state.investments)} />
            <Card title="Debt" value={formatCurrency(latestSnapshot?.debtBalance ?? state.debtBalance)} />
            <Card title="Credit score" value={latestSnapshot?.creditScore ?? state.creditScore} />
            <Card title="Stress level" value={`${latestSnapshot?.stressLevel ?? state.stressLevel}%`} />
            <Card
              title="Market return"
              value={latestSnapshot ? formatPercent(latestSnapshot.marketReturn) : "–"}
              footnote="Monthly"
            />
          </div>
          <div className="chart-block">
            <h3>Net worth trajectory</h3>
            <LineChart points={state.history} />
          </div>
        </div>
      </section>

      <section className="grid">
        <div className="panel">
          <h2>Expense vs Income</h2>
          <BarChart
            valueA={inputs.fixedExpenses + inputs.variableExpenses}
            valueB={inputs.monthlyIncome}
            labelA="Expenses"
            labelB="Income"
          />
          <p className="muted">
            Keep expenses below income to unlock stability and lower stress.
          </p>
        </div>
        <div className="panel">
          <h2>12-Month Projection</h2>
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

      <section className="grid">
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
        </div>
        <div className="panel">
          <h2>What changed this month?</h2>
          {latestSnapshot ? (
            <div className="summary">
              <p>
                You earned <strong>{formatCurrency(latestSnapshot.income)}</strong> and spent
                <strong> {formatCurrency(latestSnapshot.expenses)}</strong> on essentials and lifestyle.
              </p>
              <p>
                Debt is now <strong>{formatCurrency(latestSnapshot.debtBalance)}</strong>, while
                investments grew to <strong>{formatCurrency(latestSnapshot.investments)}</strong>.
              </p>
            </div>
          ) : (
            <p className="muted">Start your first cycle to see narrative feedback.</p>
          )}
        </div>
      </section>

      <footer>
        <p>
          Nexawealth MVP · Experiential financial literacy simulator · State saved in browser
        </p>
      </footer>
    </div>
  );
}
