/**
 * XIRR Calculation using Newton-Raphson Method.
 * 
 * Cash flows:
 * - Negative: Money out of pocket (TOPUP)
 * - Positive: Money into pocket (WITHDRAWAL, DIVIDEND, CURRENT EQUITY)
 */

interface CashFlow {
  date: Date;
  amount: number;
}

export function xirr(cashFlows: CashFlow[]): number {
  if (cashFlows.length < 2) return 0;

  // Function to calculate Net Present Value (NPV)
  const npv = (rate: number, flows: CashFlow[]) => {
    const t0 = flows[0].date.getTime();
    return flows.reduce((acc, flow) => {
      const t = (flow.date.getTime() - t0) / (1000 * 60 * 60 * 24 * 365.25);
      return acc + flow.amount / Math.pow(1 + rate, t);
    }, 0);
  };

  // Derivative of NPV with respect to rate
  const npvDeriv = (rate: number, flows: CashFlow[]) => {
    const t0 = flows[0].date.getTime();
    return flows.reduce((acc, flow) => {
      const t = (flow.date.getTime() - t0) / (1000 * 60 * 60 * 24 * 365.25);
      if (t === 0) return acc;
      return acc - t * flow.amount / Math.pow(1 + rate, t + 1);
    }, 0);
  };

  let rate = 0.1; // Initial guess: 10%
  const maxIterations = 100;
  const precision = 1e-7;

  for (let i = 0; i < maxIterations; i++) {
    const value = npv(rate, cashFlows);
    const deriv = npvDeriv(rate, cashFlows);

    if (Math.abs(deriv) < 1e-12) break; // Avoid division by zero

    const newRate = rate - value / deriv;

    if (Math.abs(newRate - rate) < precision) {
      return newRate;
    }

    rate = newRate;
  }

  // Fallback to 0 if it doesn't converge or results in extreme values
  if (isNaN(rate) || !isFinite(rate)) return 0;

  return rate;
}
