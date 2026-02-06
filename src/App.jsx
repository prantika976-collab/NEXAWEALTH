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

const decisionLabTemplates = [
  {
    key: "daily_habit",
    title: "Daily habit check",
    prompt: "A small daily habit is adding up.",
    scales: ["small"],
    choices: [
      { label: "Keep it daily", cashDelta: -12, stressDelta: -2, insight: "Comfort rises, flexibility slips." },
      { label: "Switch to weekly", cashDelta: -4, stressDelta: 1, insight: "Cash improves, habit stays." },
      { label: "Pause for now", cashDelta: 0, stressDelta: 2, insight: "Short-term discipline, long-term freedom." }
    ]
  },
  {
    key: "subscription",
    title: "Subscription choice",
    prompt: "A low-cost app renewal hits today.",
    scales: ["small", "medium"],
    choices: [
      { label: "Keep it", cashDelta: -18, stressDelta: -1, insight: "Convenience stays, buffer shrinks." },
      { label: "Cancel", cashDelta: 0, stressDelta: 1, insight: "Cash freed up, minor friction added." }
    ]
  },
  {
    key: "bonus",
    title: "Bonus allocation",
    prompt: "You receive a surprise bonus.",
    scales: ["large"],
    choices: [
      { label: "Invest it", cashDelta: 0, stressDelta: -1, opportunity: "Growth potential increases." },
      { label: "Pay debt", cashDelta: 0, stressDelta: -3, opportunity: "Interest burden drops now." },
      { label: "Hold cash", cashDelta: 1, stressDelta: -2, opportunity: "Liquidity improves immediately." }
    ]
  },
  {
    key: "loan",
    title: "Loan vs cash purchase",
    prompt: "You need a high-ticket item today.",
    scales: ["medium", "large"],
    choices: [
      { label: "Pay cash", cashDelta: -1, stressDelta: 2, opportunity: "No interest, but cash dips." },
      { label: "Use installments", cashDelta: -0.2, stressDelta: -1, opportunity: "Cash stays higher, total cost rises." }
    ]
  },
  {
    key: "market",
    title: "Market mood swing",
    prompt: "Markets swing sharply this week.",
    scales: ["medium", "large"],
    choices: [
      { label: "Hold steady", cashDelta: 0, stressDelta: -1, opportunity: "You avoid panic moves." },
      { label: "Buy more", cashDelta: -0.6, stressDelta: 1, opportunity: "Higher upside, higher anxiety." },
      { label: "Sell some", cashDelta: 0.4, stressDelta: -1, opportunity: "Risk drops, growth slows." }
    ]
  }
];

const decisionLabAmounts = {
  small: { min: 5, max: 180, horizon: "daily" },
  medium: { min: 200, max: 3000, horizon: "monthly" },
  large: { min: 5000, max: 500000, horizon: "one-time" }
};

const generateDecisionLabScenario = (difficulty = "mixed") => {
  const scaleOptions =
    difficulty == "small" ? ["small"] : difficulty == "large" ? ["large"] : ["small", "medium", "large"];
  const scale = scaleOptions[Math.floor(Math.random() * scaleOptions.length)];
  const templatePool = decisionLabTemplates.filter((template) => template.scales.includes(scale));
  const template = templatePool[Math.floor(Math.random() * templatePool.length)];
  const amountRange = decisionLabAmounts[scale];
  const amount = Math.round(amountRange.min + Math.random() * (amountRange.max - amountRange.min));
  const prompt = `${template.prompt} Amount: ${formatCurrency(amount)} (${amountRange.horizon}).`;

  const choices = template.choices.map((choice) => {
    const cashImpact = choice.cashDelta * amount;
    const stressImpact = choice.stressDelta ?? 0;
    const opportunity = choice.opportunity ?? "Opportunity cost shifts subtly.";
    const effects = [
      cashImpact == 0
        ? "Cash stays steady."
        : cashImpact > 0
        ? `Cash +${formatCurrency(cashImpact)}`
        : `Cash ${formatCurrency(cashImpact)}`,
      stressImpact > 0
        ? `Stress +${stressImpact}`
        : stressImpact < 0
        ? `Stress ${stressImpact}`
        : "Stress unchanged.",
      opportunity
    ];

    return {
      label: choice.label,
      outcome: choice.insight ?? "Immediate impact registered.",
      effects
    };
  });

  return {
    id: `${template.key}-${Date.now()}`,
    title: template.title,
    prompt,
    scale,
    choices
  };
};

const marketDefinitions = [
  {
    key: "stocks",
    label: "Stock Exchange",
    category: "Financial Markets",
    description: "Established companies with steady demand.",
    items: [
      { key: "atlas_tech", label: "Atlas Tech", base: 120, volatility: 0.06, risk: "Medium", type: "asset" },
      { key: "harbor_health", label: "Harbor Health", base: 84, volatility: 0.04, risk: "Low", type: "asset" },
      { key: "nova_energy", label: "Nova Energy", base: 96, volatility: 0.08, risk: "Medium", type: "asset" }
    ]
  },
  {
    key: "funds",
    label: "Mutual Funds & ETFs",
    category: "Financial Markets",
    description: "Diversified baskets with smoother swings.",
    items: [
      { key: "city_index", label: "City Index ETF", base: 60, volatility: 0.03, risk: "Low", type: "asset" },
      { key: "growth_fund", label: "Growth Mutual Fund", base: 75, volatility: 0.05, risk: "Medium", type: "asset" },
      { key: "green_future", label: "Green Future ETF", base: 68, volatility: 0.04, risk: "Low", type: "asset" }
    ]
  },
  {
    key: "bonds",
    label: "Bonds & Fixed Income",
    category: "Financial Markets",
    description: "Lower risk, slower movement.",
    items: [
      { key: "city_bond", label: "City Bond", base: 40, volatility: 0.02, risk: "Low", type: "asset" },
      { key: "infrastructure_note", label: "Infrastructure Note", base: 52, volatility: 0.02, risk: "Low", type: "asset" }
    ]
  },
  {
    key: "crypto",
    label: "Crypto Market",
    category: "Financial Markets",
    description: "High volatility, sentiment-driven.",
    items: [
      { key: "pulse_coin", label: "Pulse Coin", base: 28, volatility: 0.15, risk: "High", type: "asset" },
      { key: "zen_chain", label: "Zen Chain", base: 42, volatility: 0.2, risk: "High", type: "asset" }
    ]
  },
  {
    key: "wholesale",
    label: "Wholesale Market",
    category: "Business & Trade",
    description: "Buy bulk goods at lower unit prices.",
    items: [
      { key: "rice_bulk", label: "Rice sack", base: 22, volatility: 0.06, risk: "Low", type: "goods" },
      { key: "spice_crate", label: "Spice crate", base: 34, volatility: 0.07, risk: "Medium", type: "goods" },
      { key: "fabric_roll", label: "Fabric roll", base: 48, volatility: 0.08, risk: "Medium", type: "goods" }
    ]
  },
  {
    key: "retail",
    label: "Retail Bazaar",
    category: "Business & Trade",
    description: "Higher prices, higher margins.",
    items: [
      { key: "rice_bulk", label: "Rice sack", base: 32, volatility: 0.05, risk: "Low", type: "goods" },
      { key: "spice_crate", label: "Spice crate", base: 44, volatility: 0.06, risk: "Medium", type: "goods" },
      { key: "handmade_items", label: "Handmade crafts", base: 55, volatility: 0.1, risk: "Medium", type: "goods" }
    ]
  },
  {
    key: "home_business",
    label: "Home Business Hub",
    category: "Business & Trade",
    description: "Price your own services and small goods.",
    items: [
      { key: "meal_boxes", label: "Meal boxes", base: 18, volatility: 0.08, risk: "Medium", type: "goods" },
      { key: "custom_cakes", label: "Custom cakes", base: 26, volatility: 0.12, risk: "High", type: "goods" },
      { key: "design_hours", label: "Design hours", base: 40, volatility: 0.1, risk: "Medium", type: "service" }
    ]
  },
  {
    key: "freelance",
    label: "Freelance Marketplace",
    category: "Business & Trade",
    description: "Service demand swings by season.",
    items: [
      { key: "writing", label: "Writing gigs", base: 30, volatility: 0.1, risk: "Medium", type: "service" },
      { key: "video_edit", label: "Video editing", base: 46, volatility: 0.12, risk: "High", type: "service" },
      { key: "consulting", label: "Consulting calls", base: 58, volatility: 0.09, risk: "Medium", type: "service" }
    ]
  },
  {
    key: "farmers",
    label: "Farmer's Market",
    category: "Commodities & Daily Life",
    description: "Oversupply means lower prices.",
    items: [
      { key: "tomatoes", label: "Tomatoes (crate)", base: 12, volatility: 0.08, risk: "Low", type: "goods" },
      { key: "leafy_greens", label: "Leafy greens", base: 10, volatility: 0.07, risk: "Low", type: "goods" },
      { key: "seasonal_fruit", label: "Seasonal fruit", base: 15, volatility: 0.12, risk: "Medium", type: "goods" }
    ]
  },
  {
    key: "supermarket",
    label: "Supermarket",
    category: "Commodities & Daily Life",
    description: "Convenience markup on essentials.",
    items: [
      { key: "tomatoes", label: "Tomatoes (crate)", base: 18, volatility: 0.05, risk: "Low", type: "goods" },
      { key: "packaged_food", label: "Packaged food", base: 22, volatility: 0.06, risk: "Low", type: "goods" },
      { key: "dairy", label: "Dairy bundle", base: 16, volatility: 0.05, risk: "Low", type: "goods" }
    ]
  },
  {
    key: "fuel",
    label: "Fuel & Utilities",
    category: "Commodities & Daily Life",
    description: "Sensitive to global supply shifts.",
    items: [
      { key: "fuel", label: "Fuel barrel", base: 64, volatility: 0.1, risk: "High", type: "goods" },
      { key: "electricity", label: "Electricity credits", base: 40, volatility: 0.08, risk: "Medium", type: "service" }
    ]
  },
  {
    key: "real_estate",
    label: "Real Estate",
    category: "Asset & Lifestyle",
    description: "Big ticket, slow-moving prices.",
    items: [
      { key: "studio_rent", label: "Studio rent (month)", base: 320, volatility: 0.04, risk: "Medium", type: "asset" },
      { key: "city_plot", label: "City plot share", base: 520, volatility: 0.06, risk: "Medium", type: "asset" }
    ]
  },
  {
    key: "luxury",
    label: "Gold & Luxury",
    category: "Asset & Lifestyle",
    description: "Status-driven demand.",
    items: [
      { key: "gold_bar", label: "Gold bar", base: 180, volatility: 0.05, risk: "Medium", type: "asset" },
      { key: "luxury_watch", label: "Luxury watch", base: 260, volatility: 0.09, risk: "High", type: "goods" }
    ]
  },
  {
    key: "gadgets",
    label: "Gadgets & Electronics",
    category: "Asset & Lifestyle",
    description: "Rapid depreciation, hype cycles.",
    items: [
      { key: "smartphone", label: "Smartphone", base: 140, volatility: 0.12, risk: "High", type: "goods" },
      { key: "laptop", label: "Laptop", base: 220, volatility: 0.1, risk: "Medium", type: "goods" }
    ]
  },
  {
    key: "vehicles",
    label: "Vehicle Market",
    category: "Asset & Lifestyle",
    description: "Prices swing with fuel and demand.",
    items: [
      { key: "scooter", label: "Scooter", base: 120, volatility: 0.08, risk: "Medium", type: "goods" },
      { key: "compact_car", label: "Compact car", base: 260, volatility: 0.09, risk: "Medium", type: "goods" }
    ]
  }
];

const marketDefinitionMap = Object.fromEntries(marketDefinitions.map((market) => [market.key, market]));

const buildInitialMarketState = () => {
  const prices = {};
  const trends = {};
  marketDefinitions.forEach((market) => {
    prices[market.key] = {};
    trends[market.key] = {};
    market.items.forEach((item) => {
      const trend = (Math.random() - 0.5) * 0.06;
      const price = item.base * (1 + trend);
      prices[market.key][item.key] = Number(price.toFixed(2));
      trends[market.key][item.key] = trend;
    });
  });
  return {
    day: 1,
    cash: 8000,
    marketKey: marketDefinitions[0].key,
    prices,
    trends,
    inventory: {},
    holdings: {},
    quantities: {},
    lastInsight: "Markets are open. Pick a stall to explore.",
    log: []
  };
};

const updateMarketState = (state) => {
  const prices = { ...state.prices };
  const trends = { ...state.trends };
  marketDefinitions.forEach((market) => {
    prices[market.key] = { ...prices[market.key] };
    trends[market.key] = { ...trends[market.key] };
    market.items.forEach((item) => {
      const prevPrice = prices[market.key][item.key];
      const drift = (Math.random() - 0.5) * item.volatility;
      const trend = Math.max(-0.12, Math.min(0.12, (trends[market.key][item.key] || 0) + (Math.random() - 0.5) * 0.02));
      const nextPrice = Math.max(item.base * 0.6, Math.min(item.base * 1.6, prevPrice * (1 + drift + trend)));
      prices[market.key][item.key] = Number(nextPrice.toFixed(2));
      trends[market.key][item.key] = trend;
    });
  });
  return {
    ...state,
    day: state.day + 1,
    prices,
    trends,
    lastInsight: "New day, new prices. Supply and demand shifted overnight."
  };
};

const getMarketItem = (marketKey, itemKey) =>
  marketDefinitionMap[marketKey].items.find((item) => item.key === itemKey);

const findMarketItemLabel = (itemKey) => {
  for (const market of marketDefinitions) {
    const item = market.items.find((entry) => entry.key === itemKey);
    if (item) return item.label;
  }
  return itemKey;
};

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
  const [decisionLabDifficulty, setDecisionLabDifficulty] = useState("mixed");
  const [decisionLabScenario, setDecisionLabScenario] = useState(() => generateDecisionLabScenario("mixed"));
  const [decisionLabResult, setDecisionLabResult] = useState(null);
  const [marketExplorer, setMarketExplorer] = useState(() => buildInitialMarketState());
  const [marketProjection, setMarketProjection] = useState({ horizon: 10, contribution: 300, risk: 0.6 });
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
    for (let year = 1; year <= marketProjection.horizon; year += 1) {
      const baseReturn = 0.04 + marketProjection.risk * 0.08;
      balance = (balance + marketProjection.contribution * 12) * (1 + baseReturn);
      points.push({ year, value: Math.round(balance) });
    }
    return points;
  }, [marketProjection]);

  const handleDecisionLabNext = (difficulty = decisionLabDifficulty) => {
    setDecisionLabScenario(generateDecisionLabScenario(difficulty));
    setDecisionLabResult(null);
  };

  const activeMarket = marketDefinitionMap[marketExplorer.marketKey];
  const activePrices = marketExplorer.prices[marketExplorer.marketKey] || {};
  const activeTrends = marketExplorer.trends[marketExplorer.marketKey] || {};

  const handleMarketSwitch = (marketKey) => {
    setMarketExplorer((prev) => ({
      ...prev,
      marketKey,
      lastInsight: `Switched to ${marketDefinitionMap[marketKey].label}. Price dynamics differ here.`
    }));
  };

  const handleMarketQuantity = (itemKey, delta) => {
    setMarketExplorer((prev) => {
      const current = prev.quantities[itemKey] || 0;
      return {
        ...prev,
        quantities: {
          ...prev.quantities,
          [itemKey]: Math.max(0, current + delta)
        }
      };
    });
  };

  const handleMarketBuy = (itemKey) => {
    setMarketExplorer((prev) => {
      const qty = prev.quantities[itemKey] || 1;
      const price = prev.prices[prev.marketKey][itemKey];
      const cost = qty * price;
      if (cost > prev.cash) {
        return {
          ...prev,
          lastInsight: "Not enough cash for this purchase. Try a smaller quantity.",
          log: [`Day ${prev.day}: Purchase blocked (insufficient cash).`, ...prev.log].slice(0, 5)
        };
      }
      const item = getMarketItem(prev.marketKey, itemKey);
      const inventory = { ...prev.inventory };
      const holdings = { ...prev.holdings };
      if (item.type === "asset") {
        holdings[itemKey] = (holdings[itemKey] || 0) + qty;
      } else {
        inventory[itemKey] = (inventory[itemKey] || 0) + qty;
      }
      return {
        ...prev,
        cash: Number((prev.cash - cost).toFixed(2)),
        inventory,
        holdings,
        lastInsight: `Bought ${qty} ${item.label} at ${formatCurrency(price)} each. ${item.risk} risk.`,
        log: [`Day ${prev.day}: Bought ${qty} ${item.label}.`, ...prev.log].slice(0, 5)
      };
    });
  };

  const handleMarketSell = (itemKey) => {
    setMarketExplorer((prev) => {
      const qty = prev.quantities[itemKey] || 1;
      const price = prev.prices[prev.marketKey][itemKey];
      const item = getMarketItem(prev.marketKey, itemKey);
      const inventory = { ...prev.inventory };
      const holdings = { ...prev.holdings };
      const available = item.type === "asset" ? holdings[itemKey] || 0 : inventory[itemKey] || 0;
      if (qty > available) {
        return {
          ...prev,
          lastInsight: `You only have ${available} available to sell.`,
          log: [`Day ${prev.day}: Sale blocked (insufficient stock).`, ...prev.log].slice(0, 5)
        };
      }
      if (item.type === "asset") {
        holdings[itemKey] = available - qty;
      } else {
        inventory[itemKey] = available - qty;
      }
      const revenue = qty * price;
      return {
        ...prev,
        cash: Number((prev.cash + revenue).toFixed(2)),
        inventory,
        holdings,
        lastInsight: `Sold ${qty} ${item.label} at ${formatCurrency(price)} each.`,
        log: [`Day ${prev.day}: Sold ${qty} ${item.label}.`, ...prev.log].slice(0, 5)
      };
    });
  };

  const handleMarketNextDay = () => {
    setMarketExplorer((prev) => updateMarketState(prev));
  };

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
          <div className="panel">
            <h2>{decisionLabScenario.title}</h2>
            <p>{decisionLabScenario.prompt}</p>
            <ChoiceButtons
              label="Decision intensity"
              value={decisionLabDifficulty}
              onChange={(value) => {
                setDecisionLabDifficulty(value);
                handleDecisionLabNext(value);
              }}
              options={[
                { value: "mixed", label: "Mixed" },
                { value: "small", label: "Daily" },
                { value: "large", label: "Big" }
              ]}
            />
            <div className="choice-buttons">
              {decisionLabScenario.choices.map((choice) => (
                <button
                  key={choice.label}
                  onClick={() => setDecisionLabResult(choice)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            <button className="ghost" onClick={() => handleDecisionLabNext()}>
              Next decision
            </button>
          </div>
          <div className="panel">
            <h2>Instant feedback</h2>
            {decisionLabResult ? (
              <div className="insight">
                <p>{decisionLabResult.outcome}</p>
                <ul className="feedback">
                  {decisionLabResult.effects.map((effect) => (
                    <li key={effect}>{effect}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="muted">Pick a choice to see the immediate impact.</p>
            )}
          </div>
        </section>
      )}

      {activeMode === "market" && (
        <section className="grid">
          <div className="panel">
            <h2>Market Explorer</h2>
            <p className="muted">Switch markets to feel price differences and demand shifts.</p>
            <label className="input-row">
              <span>Market</span>
              <select value={marketExplorer.marketKey} onChange={(event) => handleMarketSwitch(event.target.value)}>
                {marketDefinitions.map((market) => (
                  <option key={market.key} value={market.key}>
                    {market.label} · {market.category}
                  </option>
                ))}
              </select>
            </label>
            <div className="metrics">
              <div>
                <p>Day</p>
                <strong>{marketExplorer.day}</strong>
              </div>
              <div>
                <p>Cash</p>
                <strong>{formatCurrency(marketExplorer.cash)}</strong>
              </div>
            </div>
            <p className="muted">{activeMarket.description}</p>
            <button className="primary" onClick={handleMarketNextDay}>Next day</button>
          </div>

          <div className="panel">
            <h2>Market floor</h2>
            <div className="market-list">
              {activeMarket.items.map((item) => {
                const price = activePrices[item.key] ?? item.base;
                const trend = activeTrends[item.key] ?? 0;
                const trendClass = trend > 0.02 ? "trend-up" : trend < -0.02 ? "trend-down" : "trend-flat";
                const qty = marketExplorer.quantities[item.key] || 1;
                return (
                  <div key={item.key} className="market-item">
                    <div>
                      <h3>{item.label}</h3>
                      <p className="muted">{item.type} · Risk {item.risk}</p>
                      <p className={`trend ${trendClass}`}>{trend >= 0 ? "▲" : "▼"} {(trend * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <strong>{formatCurrency(price)}</strong>
                      <div className="market-actions">
                        <button onClick={() => handleMarketQuantity(item.key, -1)}>-</button>
                        <span>{qty}</span>
                        <button onClick={() => handleMarketQuantity(item.key, 1)}>+</button>
                        <button className="ghost" onClick={() => handleMarketBuy(item.key)}>Buy</button>
                        <button className="ghost" onClick={() => handleMarketSell(item.key)}>Sell</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel">
            <h2>Your ledger</h2>
            <p className="muted">Inventory carries across markets for resale.</p>
            <div className="ledger-list">
              {Object.keys(marketExplorer.inventory).length === 0 ? (
                <p className="muted">No goods in inventory yet.</p>
              ) : (
                Object.entries(marketExplorer.inventory).map(([key, value]) => (
                  <div key={key}>
                    <p>{findMarketItemLabel(key)}</p>
                    <strong>{value} units</strong>
                  </div>
                ))
              )}
            </div>
            <div className="ledger-list">
              {Object.keys(marketExplorer.holdings).length === 0 ? (
                <p className="muted">No investments yet.</p>
              ) : (
                Object.entries(marketExplorer.holdings).map(([key, value]) => (
                  <div key={key}>
                    <p>{findMarketItemLabel(key)}</p>
                    <strong>{value.toFixed(2)} units</strong>
                  </div>
                ))
              )}
            </div>
            <div className="insight">
              <p>{marketExplorer.lastInsight}</p>
              {marketExplorer.log.length > 0 && (
                <ul className="feedback">
                  {marketExplorer.log.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="panel">
            <h2>Market signals</h2>
            <p className="muted">Demand and supply clues guide your next move.</p>
            <ul className="feedback">
              <li>Demand {activeTrends && Object.values(activeTrends).reduce((sum, value) => sum + value, 0) > 0 ? "rising" : "cooling"} in this market.</li>
              <li>Compare markets: wholesale vs retail prices shift margins.</li>
              <li>{marketExplorer.lastInsight}</li>
            </ul>
          </div>

          <div className="panel">
            <h2>Long-term compounding</h2>
            <p className="muted">Use this to feel how steady investing stacks up.</p>
            <label className="input-row">
              <span>Monthly contribution</span>
              <input
                type="number"
                value={marketProjection.contribution}
                onChange={(event) => setMarketProjection({ ...marketProjection, contribution: Number(event.target.value) })}
              />
            </label>
            <label className="input-row">
              <span>Time horizon (years)</span>
              <input
                type="number"
                value={marketProjection.horizon}
                onChange={(event) => setMarketProjection({ ...marketProjection, horizon: Number(event.target.value) })}
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
                  value={marketProjection.risk}
                  onChange={(event) => setMarketProjection({ ...marketProjection, risk: Number(event.target.value) })}
                />
                <strong>{Math.round(marketProjection.risk * 100)}%</strong>
              </div>
            </label>
            <LineChart points={marketPoints.map((point) => ({ netWorth: point.value }))} height={140} />
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
