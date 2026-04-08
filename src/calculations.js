import {
  ECO_WEIGHTS,
  ECO_TRANSITIONS,
  ECO_PHASE_DURATION,
  ECO_RATE_ADJ,
  EV,
  C,
  CREDIT_GRADES,
  DIFF_DEMAND_ELASTICITY,
} from './constants.js';
import { calcCreditGrade } from './utils.js';

const clamp = (min, v, max) => Math.max(min, Math.min(v, max));

function samplePhaseTurns(phase) {
  const base = ECO_PHASE_DURATION[phase] || ECO_PHASE_DURATION.stable;
  const jitter = Math.floor(Math.random() * 3) - 1;
  return Math.max(ECO_PHASE_DURATION.min, base + jitter);
}

export function getLoanRateByGrade(baseRate, grade, extraShock = 0) {
  const spread = CREDIT_GRADES[grade]?.spread ?? CREDIT_GRADES.D.spread;
  return Math.max(0.005, baseRate + spread + extraShock);
}

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
    const archetype = rv.archetype || 'efficient';
    let newPrice = rv.sellPrice;
    if (!newPrice || newPrice === 0) {
      const baseCost = vendor.unitCost * 1.8;
      newPrice = Math.round(
        archetype === 'lowcost'    ? baseCost * 0.82 :
        archetype === 'premium'    ? baseCost * 1.45 :
        archetype === 'innovation' ? baseCost * 1.10 :
                                     s.sellPrice > 0 ? s.sellPrice * 0.95 : baseCost
      );
    } else {
      newPrice = Math.round(
        archetype === 'lowcost'    ? newPrice * (0.97 + Math.random() * 0.02) :
        archetype === 'premium'    ? newPrice * (1.00 + Math.random() * 0.02) :
        archetype === 'innovation' ? s.sellPrice * (1.00 + Math.random() * 0.06) :
                                     s.sellPrice * (0.93 + Math.random() * 0.07)
      );
    }
    let quality = rv.qualityScore;
    if (archetype === 'innovation' && Math.random() < 0.35) {
      quality += Math.round(2 + Math.random() * 4);
    }
    if (archetype === 'lowcost') {
      quality = Math.min(quality, 95);
    }

    let attraction = calcAttractionWithAwareness(
      quality, rv.brandValue, newPrice,
      rv.priceResistance, s.itemCategory, s.economy.phase, 0
    );
    if (archetype === 'premium' && s.economy.phase === 'recession') attraction *= 1.2;
    if (rv.startSharePenalty) attraction *= rv.startSharePenalty;
    return { ...rv, sellPrice: newPrice, qualityScore: quality, attraction };
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
export function advanceEconomy(economyState, boomBonus = 0, bsStorm = false) {
  const currentPhase = economyState?.phase || 'stable';
  const turnsLeft = economyState?.turnsLeft || ECO_PHASE_DURATION.stable;

  if (bsStorm) {
    return {
      phase: 'recession',
      turnsLeft: Math.max(ECO_PHASE_DURATION.min, turnsLeft),
    };
  }

  if (turnsLeft > 1) {
    return { phase: currentPhase, turnsLeft: turnsLeft - 1 };
  }

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
    if (r < acc) return { phase, turnsLeft: samplePhaseTurns(phase) };
  }
  return { phase: 'stable', turnsLeft: samplePhaseTurns('stable') };
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
  const referencePrice = Math.max(1, (s.selectedVendor?.unitCost || 1) * C.DEMAND_REF_PRICE_MUL);
  const priceGapRatio  = (s.sellPrice - referencePrice) / referencePrice;
  const diffElasticity = DIFF_DEMAND_ELASTICITY[s.difficulty] ?? 1.0;
  const priceDemandMul = clamp(
    C.DEMAND_MIN_MUL,
    1 - (priceGapRatio * C.DEMAND_ELASTICITY * diffElasticity),
    C.DEMAND_MAX_MUL
  );
  const evDemandMul = 1 + getEff(EV.MARKET_MUL);
  const docMul      = 1 + (s._docDemandMul || 0);

  const demand = Math.round(
    C.BASE_DEMAND * ecoMul * bsMul
    * priceDemandMul
    * Math.max(0.1, evDemandMul) * Math.max(0.1, docMul)
    * (0.9 + Math.random() * 0.2)
  );

  const factoryActive = s.factory.built && s.factory.buildTurnsLeft <= 0;
  const openingInventory = s.inventoryUnits || 0;
  const planMul = Math.max(C.INVENTORY_PLAN_MIN_RATIO, Math.min(C.INVENTORY_PLAN_MAX_RATIO, s.orderPlanMul || C.INVENTORY_PLAN_RATIO));
  const plannedProduction = Math.max(0, Math.round(demand * planMul));
  const availableUnits = openingInventory + plannedProduction;
  const targetSold = s._shutdownLeft > 0 ? 0 : Math.round(demand * shareResult.myShare);
  const sold = Math.min(targetSold, availableUnits);

  const netCost = Math.round(s.selectedVendor.unitCost * (factoryActive ? C.FACTORY_DISCOUNT : 1.0));
  const revenue = sold * s.sellPrice;
  const cogs    = sold * netCost;
  let   gross   = revenue - cogs;

  const evCostMul  = 1 + getEff(EV.COST_MUL);
  const grade = s.creditGrade || calcCreditGrade((s.capital || 0) + (s.propertyValue || 0) - (s.debt || 0));
  const loanRate = getLoanRateByGrade(s.interestRate, grade, s._bsRateShock || 0);
  const monthlyInt = Math.round(s.debt * Math.max(0.005, loanRate + (ECO_RATE_ADJ[s.economy.phase] || 0) + getEff(EV.INTEREST)) / 12);
  const realtyRent  = s.realty === 'monthly' ? C.REALTY_MONTHLY_RENT : 0;
  const safetyCost  = factoryActive && s.factory.safetyOn ? C.FACTORY_SAFETY_COST : 0;
  const totalFixed  = Math.round(
    (monthlyInt + s.monthlyFixedCost + realtyRent + safetyCost)
    * (s.mna?.opCostMultiplier || 1.0) * Math.max(0.1, evCostMul)
  );

  const netProfit = gross - totalFixed;

  return {
    demand, sold, targetSold, openingInventory, plannedProduction, availableUnits,
    factoryActive, netCost, revenue, cogs,
    gross, monthlyInt, realtyRent, safetyCost, totalFixed,
    netProfit, ecoMul, priceDemandMul, evDemandMul, evCostMul,
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
