/**
 * XIRR Calculation using Newton-Raphson Method.
 * 
 * Cash flows:
 * - Negative: Money out of pocket (TOPUP, STARTING BALANCE)
 * - Positive: Money into pocket (WITHDRAWAL, DIVIDEND, CURRENT EQUITY)
 *
 * EDGE CASE FIXES (Step 42):
 * - Multiple initial guesses to improve convergence
 * - Handles short timeframes where annualization produces extreme values
 * - Robust NaN/Infinity handling
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

  const maxIterations = 200;
  const precision = 1e-7;

  // Try multiple initial guesses for better convergence
  const initialGuesses = [0.1, 0.0, -0.1, 0.5, -0.5, 1.0, -0.9, 5.0, -0.99];

  for (const guess of initialGuesses) {
    let rate = guess;
    let converged = false;

    for (let i = 0; i < maxIterations; i++) {
      const value = npv(rate, cashFlows);
      const deriv = npvDeriv(rate, cashFlows);

      if (Math.abs(deriv) < 1e-12) break;

      const newRate = rate - value / deriv;

      // Guard: rate can't go below -1 (that means -100% which is total loss)
      if (newRate <= -1) {
        rate = -0.99;
        continue;
      }

      if (Math.abs(newRate - rate) < precision) {
        rate = newRate;
        converged = true;
        break;
      }

      rate = newRate;
    }

    if (converged && isFinite(rate) && !isNaN(rate)) {
      return rate;
    }
  }

  // If none of the guesses converged, return 0
  return 0;
}
