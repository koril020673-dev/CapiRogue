import { ECO_WEIGHTS, ECO_TRANSITIONS, ECO_RATE_ADJ, EV, C } from './constants.js';

// ── Attraction score ──────────────────────────────────────────────────────────
export function calcAttractionWithAwareness(qualityScore, brandValue, sellPrice, resistance, category, ecoPhase, awarenessBonus) {
  if (!sellPrice || sellPrice <= 0) return 0;
  const E_base = ECO_WEIGHTS[category]?.[ecoPhase] ?? 1.0;
  const E      = E_base * (1 + (awarenessBonus || 0));
  const denom  = sellPrice * (1 - Math.min(resistance, 0.99));
  if (denom <= 0) return 0;
  return ((qualityScore + brandValue) * E) / denom;
}

// ── Market share distribution ─────────────────────────────────────────────────
export function calcMarketShares(players) {
  const sqList = players.map(p => Math.max(0, p.attraction) ** 2);
  const total  = sqList.reduce((a, v) => a + v, 0);
  if (total <= 0) return players.map(() => 0);
  return sqList.map(sq => sq / total);
}

// ── Full market share calculation for one turn ────────────────────────────────
export function calculateMarketShare(s, getEffectMod) {
  const vendor = s.selectedVendor;
  if (!vendor) return null;

  const evBrand   = getEffectMod(EV.BRAND);
  const evResist  = getEffectMod(EV.RESIST);
  const evQuality = getEffectMod(EV.QUALITY);

  const factoryActive = s.factory.built && s.factory.buildTurnsLeft <= 0;
  const upgradeBonus  = factoryActive ? s.factory.upgradeLevel * 20 : 0;
  const myQuality     = vendor.qualityScore + upgradeBonus + evQuality;
  const effectiveBrand  = Math.max(0, s.brandValue   + evBrand);
  const effectiveResist = Math.max(0, s.priceResistance + evResist);
  const awarenessBonus  = s.marketing?.awarenessBonus || 0;

  const myAttraction = calcAttractionWithAwareness(
    myQuality, effectiveBrand, s.sellPrice,
    effectiveResist, s.itemCategory, s.economy.phase, awarenessBonus
  );

  const activeRivals = s.rivals.filter(r => !r.bankrupt);
  const updatedRivals = activeRivals.map(rv => {
    let newPrice = rv.sellPrice;
    if (!newPrice || newPrice === 0) {
      const baseCost = vendor.unitCost * 1.8;
      newPrice = Math.round(
        rv.pattern === 'aggressive' ? baseCost * 0.85 :
        rv.pattern === 'premium'    ? baseCost * 1.35 :
        s.sellPrice > 0             ? s.sellPrice * 0.95 : baseCost
      );
    } else {
      newPrice = Math.round(
        rv.pattern === 'aggressive' ? newPrice * (0.97 + Math.random() * 0.03) :
        rv.pattern === 'premium'    ? newPrice * (1.00 + Math.random() * 0.02) :
        s.sellPrice * (0.93 + Math.random() * 0.07)
      );
    }
    const attraction = calcAttractionWithAwareness(
      rv.qualityScore, rv.brandValue, newPrice,
      rv.priceResistance, s.itemCategory, s.economy.phase, 0
    );
    return { ...rv, sellPrice: newPrice, attraction };
  });

  const allPlayers = [
    { attraction: myAttraction, isMe: true },
    ...updatedRivals.map(rv => ({ attraction: rv.attraction, isMe: false })),
  ];
  const shares = calcMarketShares(allPlayers);

  return {
    myShare: shares[0],
    updatedRivals: updatedRivals.map((rv, i) => ({ ...rv, marketShare: shares[i + 1] })),
    rivalsInfo: updatedRivals.map((rv, i) => ({
      name: rv.name,
      sellPrice: rv.sellPrice,
      share: shares[i + 1],
    })),
  };
}

// ── Economy advance ────────────────────────────────────────────────────────────
export function advanceEconomy(currentPhase, boomBonus = 0, bsStorm = false) {
  if (bsStorm) return 'recession';
  const T = ECO_TRANSITIONS[currentPhase] || ECO_TRANSITIONS.stable;
  const adjusted = {
    boom:      T.boom      + boomBonus,
    stable:    Math.max(0.3, T.stable - boomBonus),
    recession: Math.max(0.05, T.recession - boomBonus),
  };
  const r = Math.random();
  let acc = 0;
  for (const [phase, prob] of Object.entries(adjusted)) {
    acc += prob;
    if (r < acc) return phase;
  }
  return 'stable';
}

// ── Active effects modifier ────────────────────────────────────────────────────
export function getActiveEffectModifier(activeEffects, type) {
  return (activeEffects || [])
    .filter(e => e.type === type)
    .reduce((sum, e) => sum + e.value, 0);
}

// ── Turn result calculation ───────────────────────────────────────────────────
export function calcTurnResult(s, shareResult) {
  const getEff = type => getActiveEffectModifier(s.activeEffects, type);

  const ecoMul      = ECO_WEIGHTS[s.itemCategory]?.[s.economy.phase] ?? 1.0;
  const bsMul       = s._bsDemandMul ?? 1.0;
  const evDemandMul = 1 + getEff(EV.MARKET_MUL);
  const docMul      = 1 + (s._docDemandMul || 0);

  const demand = Math.round(
    C.BASE_DEMAND * ecoMul * bsMul
    * Math.max(0.1, evDemandMul) * Math.max(0.1, docMul)
    * (0.9 + Math.random() * 0.2)
  );

  const factoryActive = s.factory.built && s.factory.buildTurnsLeft <= 0;
  const sold          = s._shutdownLeft > 0 ? 0 : Math.round(demand * shareResult.myShare);

  const netCost = Math.round(s.selectedVendor.unitCost * (factoryActive ? C.FACTORY_DISCOUNT : 1.0));
  const revenue = sold * s.sellPrice;
  const cogs    = sold * netCost;
  let   gross   = revenue - cogs;

  const evCostMul  = 1 + getEff(EV.COST_MUL);
  const monthlyInt = Math.round(
    s.debt * Math.max(0.005, s.interestRate + (ECO_RATE_ADJ[s.economy.phase] || 0) + getEff(EV.INTEREST)) / 12
  );
  const realtyRent  = s.realty === 'monthly' ? C.REALTY_MONTHLY_RENT : 0;
  const safetyCost  = factoryActive && s.factory.safetyOn ? C.FACTORY_SAFETY_COST : 0;
  const totalFixed  = Math.round(
    (monthlyInt + s.monthlyFixedCost + realtyRent + safetyCost)
    * (s.mna?.opCostMultiplier || 1.0) * Math.max(0.1, evCostMul)
  );

  const netProfit = gross - totalFixed;

  return {
    demand, sold, factoryActive, netCost, revenue, cogs,
    gross, monthlyInt, realtyRent, safetyCost, totalFixed,
    netProfit, ecoMul, evDemandMul, evCostMul,
  };
}

// ── BEP helper ────────────────────────────────────────────────────────────────
export function calcBEP(s) {
  const sp = s.sellPrice;
  const uc = s.selectedVendor?.unitCost || 0;
  const factoryActive = s.factory.built && s.factory.buildTurnsLeft <= 0;
  const netCost  = Math.round(uc * (factoryActive ? C.FACTORY_DISCOUNT : 1.0));
  const margin   = sp - netCost;
  const intRate  = Math.max(0.005, s.interestRate + (ECO_RATE_ADJ[s.economy.phase] || 0));
  const monthInt = Math.round(s.debt * intRate / 12);
  const realtyRent = s.realty === 'monthly' ? C.REALTY_MONTHLY_RENT : 0;
  const safetyC  = s.factory.built && s.factory.safetyOn ? C.FACTORY_SAFETY_COST : 0;
  const totalFixed = Math.round((monthInt + s.monthlyFixedCost + realtyRent + safetyC) * (s.mna?.opCostMultiplier || 1.0));
  const bep  = margin > 0 ? Math.ceil(totalFixed / margin) : Infinity;
  const rate = sp > 0 && netCost > 0 ? Math.round((1 - netCost / sp) * 100) : 0;
  return { netCost, margin, totalFixed, bep, rate, monthInt, realtyRent, safetyC };
}

// ── Marketing gain formulas ────────────────────────────────────────────────────
export const calcMktBrandGain     = b => b <= 0 ? 0 : Math.round(30  * Math.log10(b / 10_000_000 + 1) * 10) / 10;
export const calcMktAwarenessGain = b => b <= 0 ? 0 : Math.min(0.30, 0.05 * Math.log10(b / 10_000_000 + 1));
