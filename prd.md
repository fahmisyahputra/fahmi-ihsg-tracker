# Product Requirements Document (PRD): Mobile-First IHSG Portfolio Tracker

## 1. Project Overview
You are a Senior Fullstack Financial Software Engineer. Your task is to build a mobile-first web application to track Indonesian Stock Exchange (IHSG) portfolio performance. The app serves as a personal analytical dashboard (execution happens on a third-party broker). It handles the complexities of cash flows (top-ups/withdrawals), IPO lock-ups, dividends, and calculates pure trading performance using the Time-Weighted Return (TWR) method.

## 2. Tech Stack
* **Frontend:** Next.js (App Router), React, TailwindCSS, Lucide Icons.
* **Backend & Database:** Supabase (PostgreSQL, Supabase Auth).
* **State Management:** React Context or Zustand.
* **Charting:** Recharts or Chart.js.
* **Design Constraint:** Strictly Mobile-First (max-width container for desktop viewing, native-app feel, sticky bottom navigation).

## 3. Authentication & Security
* Implement Supabase Authentication (Email/Password or Google OAuth).
* **CRITICAL:** Enforce Row Level Security (RLS) on ALL database tables. A user must only be able to read, insert, update, or delete their own data (`user_id`). Unauthenticated access must be strictly blocked.

## 4. Core Algorithmic Logic: Time-Weighted Return (TWR)
The app must accurately calculate Year-to-Date (YTD) and all-time performance without being distorted by deposits or withdrawals.
* Any cash inflow (Top-up, IPO Refund) or outflow (Withdrawal, IPO Order lock-up) marks the end of a sub-period.
* Dividends are counted as Profit (Yield), NOT as cash inflows.
* Calculate the return for each sub-period, then geometrically link them to find the true portfolio performance.

## 5. UI/UX & Navigation Structure
The app will feature a fixed Bottom Navigation Bar with 5 primary tabs:

### A. Home (Dashboard)
The main overview of the user's financial standing.
* **Top Cards:** Total Equity, Active Portfolio Value, Cash Balance (RDN).
* **Metrics:** Win Rate (based on closed trades in the Journal), Daily PnL (Nominal & %), YTD Performance vs IHSG YTD Performance.
* **Top Positions:** A ranked list of the current portfolio's top holdings (toggleable view: ranked by Nominal Value vs ranked by Portfolio Percentage).

### B. Stocks (Active Holdings)
Detailed view of currently held stocks.
* **List Items:** Ticker, Average Price, Current Price (EOD/Delayed), Total Lots, Floating PnL (Nominal & %).
* **Risk Management Indicators:** For each stock, display its % Allocation of total equity. Calculate and display a strict 5% Cutloss metric: "If cutloss at -5%, price is X, nominal loss is Y."
* **Actions:** Quick action buttons on each stock card to `Sell`, `Edit`, or `Add (Average Up/Down)`.

### C. IPO (Tracker)
Specialized tab for managing Initial Public Offerings.
* **Status Tracking:** Differentiate between `ORDERED` (cash locked), `ALLOTTED` (converted to stocks), and `REFUNDED` (cash returned).
* **Logic Rule:** Refunds must be treated as a return of locked cash, not as a new Top-up that dilutes TWR.

### D. Watchlist & Journal
Tab for planning and reviewing trades.
* **Watchlist Section:** Add tickers to monitor, including a text field for "Reasoning/Setup" (e.g., breakout, MA20 bounce) and Target Buy price.
* **Journal Section:** Historical record of closed trades. Includes Ticker, Buy Date, Sell Date, Initial Reasoning, Target Price, Stop Loss, and a "Reflection" text area for post-trade evaluation.

### E. Performance (Analytics)
Visual charts representing portfolio growth over time.
* **Chart Types:** Line chart for equity growth, bar charts for monthly PnL.
* **Filters/Toggles:** Ability to isolate performance data by: `Dividend Only`, `IPO Only`, `Stocks Only`, and `Combined All-in (IPO + Stocks + Dividend)`.

## 6. Database Schema (Draft Guidelines for AI)
Design a relational schema in Supabase that supports the above features. Key tables should include:
* `users`: Managed by Supabase Auth.
* `cash_flows`: Logs deposits, withdrawals, and dividends (requires precise timestamps for TWR).
* `transactions`: Logs BUY/SELL actions (ticker, price, lots, fees).
* `ipo_orders`: Tracks IPO lifecycle and fund lockups.
* `watchlist`: Stores planned trades and reasoning.
* `journals`: Stores completed trades and post-trade reflections.
* `portfolio_snapshots`: Daily EOD recording of total equity to ensure fast rendering of charts without recalculating the entire ledger on every page load.

## 7. Execution Steps for Claude
1.  Initialize the Next.js project and configure Tailwind CSS for a mobile-first layout.
2.  Set up Supabase project, initialize Auth, and create the SQL schema with strict RLS policies.
3.  Build the Core Layout (Sticky Header, Content Area, Bottom Navigation).
4.  Implement the TWR calculation utility functions.
5.  Develop the CRUD operations for Transactions, Cash Flows, and IPOs.
6.  Build out the 5 main tabs (Home, Stocks, IPO, Watchlist/Journal, Performance) integrating real/mock data.
7.  Refine UI/UX (loading states, toast notifications for actions, empty states).