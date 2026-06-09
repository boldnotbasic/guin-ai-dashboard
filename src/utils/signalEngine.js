// signalEngine.js
// Unified signal engine: fuses technical indicators + analyst views + earnings
// + momentum + (optional) AI score into ONE verdict per ticker:
//   KOOP / HOUD / VERKOOP  with a confidence score and concrete reasons.
//
// Pure functions only — no network calls, no React. Easy to unit test.
// The UI feeds it whatever data is already loaded in the page state.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);

// Normalise a surprise value that may be a fraction (0.07) or percent (7).
const normSurprise = (s) => {
  if (typeof s !== 'number' || !isFinite(s)) return null;
  return Math.abs(s) <= 1 ? s * 100 : s;
};

// ── Core scoring ──────────────────────────────────────────────────────────────
// bundle = {
//   ticker, name,
//   price:      { current, changePercent, currency },
//   technicals: { rsi, sma50, sma200, near52wHigh, near52wLow, emaTrendUp, signal },
//   analyst:    { mean (1=strong buy .. 5=sell), targetPrice, analysts },
//   earnings:   { nextEarningsDate (Date|ms), history: [{ surprise }] },
//   growth:     { growth1mo, growth6mo, growth1yr, dailyChange },
//   aiScore:    number 0..100 (optional)
// }
export function computeSignal(bundle = {}) {
  const { ticker, name, price = {}, technicals = {}, analyst = null, earnings = null, growth = {}, aiScore = null } = bundle;

  let score = 0; // -100 (sterk verkoop) .. +100 (sterk koop)
  let signalsUsed = 0;
  const reasons = []; // { dir: 'bull'|'bear'|'info', label, weight }

  // ── Technical: RSI ──
  const rsi = num(technicals.rsi);
  if (rsi != null) {
    signalsUsed++;
    if (rsi <= 30) { score += 18; reasons.push({ dir: 'bull', label: `RSI oververkocht (${rsi.toFixed(0)})`, weight: 18 }); }
    else if (rsi <= 40) { score += 8; reasons.push({ dir: 'bull', label: `RSI laag (${rsi.toFixed(0)})`, weight: 8 }); }
    else if (rsi >= 70) { score -= 18; reasons.push({ dir: 'bear', label: `RSI overkocht (${rsi.toFixed(0)})`, weight: 18 }); }
    else if (rsi >= 60) { score -= 6; reasons.push({ dir: 'bear', label: `RSI hoog (${rsi.toFixed(0)})`, weight: 6 }); }
  }

  // ── Technical: trend (SMA50 vs SMA200, fallback emaTrendUp) ──
  const sma50 = num(technicals.sma50);
  const sma200 = num(technicals.sma200);
  if (sma50 != null && sma200 != null && sma200 > 0) {
    signalsUsed++;
    if (sma50 > sma200) { score += 14; reasons.push({ dir: 'bull', label: 'Opwaartse trend (SMA50 > SMA200)', weight: 14 }); }
    else { score -= 14; reasons.push({ dir: 'bear', label: 'Neerwaartse trend (SMA50 < SMA200)', weight: 14 }); }
  } else if (typeof technicals.emaTrendUp === 'boolean') {
    signalsUsed++;
    if (technicals.emaTrendUp) { score += 10; reasons.push({ dir: 'bull', label: 'EMA-trend omhoog', weight: 10 }); }
    else { score -= 10; reasons.push({ dir: 'bear', label: 'EMA-trend omlaag', weight: 10 }); }
  }

  // ── Technical: 52-week positie ──
  if (technicals.near52wHigh) { score += 8; reasons.push({ dir: 'bull', label: 'Dicht bij 52-wk top (breakout-zone)', weight: 8 }); }
  if (technicals.near52wLow) { score -= 6; reasons.push({ dir: 'bear', label: 'Dicht bij 52-wk bodem', weight: 6 }); }

  // ── Technical: overall signal van de API ──
  const sigRaw = technicals.signal;
  const sigStr = (typeof sigRaw === 'string' ? sigRaw : sigRaw?.overall || '').toString().toLowerCase();
  if (sigStr) {
    signalsUsed++;
    if (sigStr.includes('buy') || sigStr.includes('koop')) { score += 10; reasons.push({ dir: 'bull', label: 'Technisch koopsignaal', weight: 10 }); }
    else if (sigStr.includes('sell') || sigStr.includes('verkoop')) { score -= 10; reasons.push({ dir: 'bear', label: 'Technisch verkoopsignaal', weight: 10 }); }
  }

  // ── Analist: aanbeveling (mean 1=strong buy .. 5=sell) ──
  const mean = num(analyst?.mean);
  if (mean != null && mean > 0) {
    signalsUsed++;
    if (mean <= 2.0) { score += 16; reasons.push({ dir: 'bull', label: `Analisten: koop (${mean.toFixed(1)})`, weight: 16 }); }
    else if (mean <= 2.7) { score += 8; reasons.push({ dir: 'bull', label: `Analisten: licht positief (${mean.toFixed(1)})`, weight: 8 }); }
    else if (mean >= 3.5) { score -= 14; reasons.push({ dir: 'bear', label: `Analisten: negatief (${mean.toFixed(1)})`, weight: 14 }); }
  }

  // ── Analist: koersdoel upside ──
  const target = num(analyst?.targetPrice);
  const cur = num(price.current);
  if (target != null && cur != null && cur > 0) {
    const upside = ((target - cur) / cur) * 100;
    if (upside >= 15) { signalsUsed++; score += 12; reasons.push({ dir: 'bull', label: `Koersdoel +${upside.toFixed(0)}% boven koers`, weight: 12 }); }
    else if (upside <= -10) { signalsUsed++; score -= 12; reasons.push({ dir: 'bear', label: `Koersdoel ${upside.toFixed(0)}% onder koers`, weight: 12 }); }
  }

  // ── Earnings: nabijheid (waarschuwing, geen koop/verkoop op zich) ──
  let earningsSoon = false;
  let daysToEarnings = null;
  const eTs = earnings?.nextEarningsDate instanceof Date
    ? earnings.nextEarningsDate.getTime()
    : (typeof earnings?.nextEarningsDate === 'number' ? earnings.nextEarningsDate : (earnings?.nextEarningsDate ? new Date(earnings.nextEarningsDate).getTime() : null));
  if (eTs) {
    const days = (eTs - Date.now()) / 86400000;
    if (days >= -1 && days <= 7) {
      earningsSoon = true;
      daysToEarnings = Math.max(0, Math.round(days));
      reasons.push({ dir: 'info', label: `Earnings over ${daysToEarnings} dag(en)`, weight: 0 });
    }
  }

  // ── Earnings: laatste surprise ──
  if (Array.isArray(earnings?.history) && earnings.history.length) {
    const last = earnings.history.find((h) => normSurprise(h?.surprise) != null);
    const sp = normSurprise(last?.surprise);
    if (sp != null) {
      signalsUsed++;
      if (sp >= 5) { score += 10; reasons.push({ dir: 'bull', label: `Laatste earnings verraste +${sp.toFixed(0)}%`, weight: 10 }); }
      else if (sp <= -5) { score -= 10; reasons.push({ dir: 'bear', label: `Laatste earnings teleurstellend (${sp.toFixed(0)}%)`, weight: 10 }); }
    }
  }

  // ── Momentum / groei (laatste maand) ──
  const g1m = num(growth?.growth1mo);
  if (g1m != null && g1m !== 0) {
    signalsUsed++;
    if (g1m >= 8) { score += 8; reasons.push({ dir: 'bull', label: `+${g1m.toFixed(0)}% laatste maand`, weight: 8 }); }
    else if (g1m <= -8) { score -= 8; reasons.push({ dir: 'bear', label: `${g1m.toFixed(0)}% laatste maand`, weight: 8 }); }
  }

  // ── AI buy-score (optionele versterking) ──
  const ai = num(aiScore);
  if (ai != null) {
    signalsUsed++;
    const delta = (ai - 50) * 0.4; // -20 .. +20
    score += delta;
    if (ai >= 65) reasons.push({ dir: 'bull', label: `AI-score ${ai.toFixed(0)}/100`, weight: Math.round(delta) });
    else if (ai <= 35) reasons.push({ dir: 'bear', label: `AI-score ${ai.toFixed(0)}/100`, weight: Math.abs(Math.round(delta)) });
  }

  score = clamp(Math.round(score), -100, 100);

  // ── Verdict ──
  let verdict;
  if (score >= 25) verdict = 'KOOP';
  else if (score <= -25) verdict = 'VERKOOP';
  else verdict = 'HOUD';

  // Vlak voor earnings: liever afwachten dan handelen → degradeer KOOP/VERKOOP naar HOUD
  // tenzij het signaal heel sterk is (|score| >= 45).
  if (earningsSoon && verdict !== 'HOUD' && Math.abs(score) < 45) {
    verdict = 'HOUD';
    reasons.push({ dir: 'info', label: 'Afwachten tot na earnings', weight: 0 });
  }

  // Confidence: combinatie van signaalsterkte en hoeveelheid bronnen.
  const confidence = clamp(
    Math.round((Math.abs(score) / 100) * 60 + (Math.min(signalsUsed, 6) / 6) * 40),
    0,
    100
  );

  // Sorteer redenen: zwaarste eerst, info-regels achteraan.
  const sortedReasons = reasons
    .filter((r) => r.label)
    .sort((a, b) => {
      if ((a.dir === 'info') !== (b.dir === 'info')) return a.dir === 'info' ? 1 : -1;
      return (b.weight || 0) - (a.weight || 0);
    });

  return {
    ticker,
    name,
    verdict,
    score,
    confidence,
    earningsSoon,
    daysToEarnings,
    signalsUsed,
    reasons: sortedReasons,
  };
}

// Convenience: rank signals so the most actionable surface first.
// KOOP (sterkste eerst) → VERKOOP (sterkste eerst) → HOUD.
export function rankSignals(signals = []) {
  const order = { KOOP: 0, VERKOOP: 1, HOUD: 2 };
  return [...signals].sort((a, b) => {
    if (order[a.verdict] !== order[b.verdict]) return order[a.verdict] - order[b.verdict];
    return Math.abs(b.score) - Math.abs(a.score);
  });
}

// Derive proactive alerts from computed signals.
// Fires automatically (no manual config) for: aankomende earnings,
// sterk koopsignaal, sterk verkoopsignaal — voor portfolio + watchlist.
export function deriveProactiveAlerts(signals = []) {
  const alerts = [];
  for (const s of signals) {
    if (s.earningsSoon) {
      alerts.push({
        id: `earn-${s.ticker}`,
        ticker: s.ticker,
        name: s.name,
        kind: 'earnings',
        severity: (s.daysToEarnings != null && s.daysToEarnings <= 1) ? 'high' : 'medium',
        message: `${s.ticker}: earnings ${s.daysToEarnings === 0 ? 'vandaag' : `over ${s.daysToEarnings}d`}`,
      });
    }
    if (s.verdict === 'KOOP' && s.confidence >= 60) {
      const r = s.reasons.find((x) => x.dir === 'bull');
      alerts.push({
        id: `buy-${s.ticker}`,
        ticker: s.ticker,
        name: s.name,
        kind: 'buy',
        severity: s.confidence >= 75 ? 'high' : 'medium',
        message: `${s.ticker}: sterk koopsignaal (${s.confidence}%)${r ? ' — ' + r.label : ''}`,
      });
    } else if (s.verdict === 'VERKOOP' && s.confidence >= 60) {
      const r = s.reasons.find((x) => x.dir === 'bear');
      alerts.push({
        id: `sell-${s.ticker}`,
        ticker: s.ticker,
        name: s.name,
        kind: 'sell',
        severity: s.confidence >= 75 ? 'high' : 'medium',
        message: `${s.ticker}: verkoopsignaal (${s.confidence}%)${r ? ' — ' + r.label : ''}`,
      });
    }
  }
  const sev = { high: 0, medium: 1, low: 2 };
  return alerts.sort((a, b) => (sev[a.severity] ?? 9) - (sev[b.severity] ?? 9));
}

export const VERDICT_STYLE = {
  KOOP: {
    label: 'KOOP',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
    bar: 'bg-emerald-400',
  },
  VERKOOP: {
    label: 'VERKOOP',
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    dot: 'bg-red-400',
    bar: 'bg-red-400',
  },
  HOUD: {
    label: 'HOUD',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
    bar: 'bg-amber-400',
  },
};
