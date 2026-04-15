import {
  ECO_WEIGHTS,
  ECO_TRANSITIONS,
  ECO_PHASE_DURATION,
  ECO_RATE_ADJ,
  EV,
  C,
  CREDIT_GRADES,
  DIFF_DEMAND_ELASTICITY,
  ENDLESS_MODE,
} from './constants.js';
import {
  getQualityMeta,
  getTierDemandModifier,
} from './designData.js';
import { calcCreditGrade, getRunCycle } from './utils.js';

const clamp = (min, value, max) => Math.max(min, Math.min(value, max));

function samplePhaseTurns(phase) {
  const base = ECO_PHASE_DURATION[phase] || ECO_PHASE_DURATION.stable;
  const jitter = Math.floor(Math.random() * 3) - 1;
  return Math.max(ECO_PHASE_DURATION.min, base + jitter);
}

export function getLoanRateByGrade(baseRate, grade, extraShock = 0) {
  const spread = CREDIT_GRADES[grade]?.spread ?? CREDIT_GRADES.D.spread;
  return Math.max(0.005, baseRate + spread + extraShock);
}

export function calcAttractionWithAwareness(qualityScore, brandValue, sellPrice, resistance, category, ecoPhase, awarenessBonus, industryTier = 1) {
  if (!sellPrice || sellPrice <= 0) return 0;
  const ecoBase = ECO_WEIGHTS[category]?.[ecoPhase] ?? 1;
  const tierMul = getTierDemandModifier(industryTier, ecoPhase);
  const E = ecoBase * tierMul * (1 + (awarenessBonus || 0));
  const denom = sellPrice * (1 - Math.min(resistance, 0.99));
  if (denom <= 0) return 0;
  return ((qualityScore + brandValue) * E) / denom;
}

export function calcMarketShares(players) {
  const scores = players.map((player) => Math.max(0, player.attraction) ** 2);
  const total = scores.reduce((sum, score) => sum + score, 0);
  if (total <= 0) return players.map(() => 0);
  return scores.map((score) => score / total);
}

function nextRivalState(rival, state, playerNetCost) {
  const archetype = rival.archetype || 'aggressive';
  const playerPrice = state.sellPrice || Math.round(playerNetCost * 2);
  const cycle = getRunCycle(state.turn, state.maxTurns, state.challenge?.infiniteMode);
  const cycleDepth = Math.max(0, cycle - 1);
  let sellPrice = rival.sellPrice || 0;
  let qualityScore = rival.qualityScore || 80;
  let brandValue = rival.brandValue || 0;

  if (archetype === 'aggressive') {
    const recessionCut = state.economy.phase === 'recession' ? 0.92 : 0.98;
    sellPrice = sellPrice > 0
      ? Math.round(sellPrice * recessionCut)
      : Math.round(Math.max(playerNetCost * 1.05, playerPrice * 0.88));
    qualityScore = Math.min(96, qualityScore + (Math.random() < 0.25 ? 2 : 0));
  } else if (archetype === 'premium') {
    sellPrice = sellPrice > 0
      ? Math.round(playerPrice * (1.15 + Math.random() * 0.08))
      : Math.round(playerNetCost * 2.4);
    qualityScore = Math.min(190, qualityScore + (state.economy.phase === 'boom' ? 4 : 1));
    brandValue += state.economy.phase === 'boom' ? 1.5 : -0.5;
  } else if (archetype === 'volatile') {
    const swing = 0.75 + Math.random() * 0.7;
    sellPrice = Math.round(playerPrice * swing);
    qualityScore = Math.max(65, Math.min(165, qualityScore + Math.round(-8 + Math.random() * 20)));
    brandValue += Math.random() < 0.4 ? 2 : -1;
  } else if (archetype === 'techmonopoly') {
    sellPrice = sellPrice > 0
      ? Math.round(playerPrice * (1.22 + Math.random() * 0.06))
      : Math.round(playerNetCost * 2.8);
    qualityScore = Math.min(220, qualityScore + 5);
    brandValue += 2;
  } else {
    sellPrice = sellPrice > 0 ? sellPrice : playerPrice;
  }

  const attraction = calcAttractionWithAwareness(
    qualityScore,
    Math.max(0, brandValue),
    sellPrice,
    rival.priceResistance || 0.02,
    state.itemCategory,
    state.economy.phase,
    0,
    state.itemTier || state.industryTier || 1
  );

  return {
    ...rival,
    brandValue: Math.max(0, Math.round(brandValue)),
    qualityScore,
    sellPrice,
    attraction: archetype === 'premium' && state.economy.phase === 'boom'
      ? attraction * 1.1 * (1 + (cycleDepth * ENDLESS_MODE.rivalAttractionPerCycle))
      : archetype === 'aggressive' && state.economy.phase === 'recession'
        ? attraction * 1.08 * (1 + (cycleDepth * ENDLESS_MODE.rivalAttractionPerCycle))
        : attraction * (1 + (cycleDepth * ENDLESS_MODE.rivalAttractionPerCycle)),
  };
}

export function calculateMarketShare(state, getEffectMod) {
  const vendor = state.selectedVendor;
  if (!vendor) return null;
  const marketTier = state.itemTier || state.industryTier || 1;

  const evBrand = getEffectMod(EV.BRAND);
  const evResist = getEffectMod(EV.RESIST);
  const evQuality = getEffectMod(EV.QUALITY);
  const factoryActive = state.factory.built && state.factory.buildTurnsLeft <= 0;
  const qualityMeta = getQualityMeta(factoryActive ? state.qualityMode : 'standard');
  const baseQuality = vendor.qualityScore + (factoryActive ? state.factory.upgradeLevel * 20 : 0) + evQuality;
  const myQuality = Math.round(baseQuality * qualityMeta.qualityMul);
  const myBrand = Math.max(0, state.brandValue + evBrand);
  const myResist = Math.max(0, state.priceResistance + evResist);
  const awarenessBonus = state.marketing?.awarenessBonus || 0;

  const myAttraction = calcAttractionWithAwareness(
    myQuality,
    myBrand,
    state.sellPrice,
    myResist,
    state.itemCategory,
    state.economy.phase,
    awarenessBonus,
    marketTier
  );

  const playerNetCost = Math.round(vendor.unitCost * qualityMeta.costMul * (factoryActive ? C.FACTORY_DISCOUNT : 1));
  const activeRivals = state.rivals.filter((rival) => !rival.bankrupt);
  const updatedRivals = activeRivals.map((rival) => nextRivalState(rival, state, playerNetCost));

  const shares = calcMarketShares([
    { attraction: myAttraction },
    ...updatedRivals.map((rival) => ({ attraction: rival.attraction })),
  ]);

  return {
    myShare: shares[0],
    updatedRivals: updatedRivals.map((rival, index) => ({ ...rival, marketShare: shares[index + 1] })),
    rivalsInfo: updatedRivals.map((rival, index) => ({
      name: rival.name,
      sellPrice: rival.sellPrice,
      share: shares[index + 1],
    })),
  };
}

export function advanceEconomy(economyState, boomBonus = 0, bsStorm = false) {
  const currentPhase = economyState?.phase || 'stable';
  const turnsLeft = economyState?.turnsLeft || ECO_PHASE_DURATION.stable;

  if (bsStorm) {
    return { phase: 'recession', turnsLeft: Math.max(ECO_PHASE_DURATION.min, turnsLeft) };
  }

  if (turnsLeft > 1) {
    return { phase: currentPhase, turnsLeft: turnsLeft - 1 };
  }

  const transition = ECO_TRANSITIONS[currentPhase] || ECO_TRANSITIONS.stable;
  const adjusted = {
    boom: transition.boom + boomBonus,
    stable: Math.max(0.3, transition.stable - boomBonus),
    recession: Math.max(0.05, transition.recession - boomBonus),
  };

  const roll = Math.random();
  let cursor = 0;
  for (const [phase, probability] of Object.entries(adjusted)) {
    cursor += probability;
    if (roll < cursor) return { phase, turnsLeft: samplePhaseTurns(phase) };
  }

  return { phase: 'stable', turnsLeft: samplePhaseTurns('stable') };
}

export function getActiveEffectModifier(activeEffects, type) {
  return (activeEffects || [])
    .filter((effectItem) => effectItem.type === type)
    .reduce((sum, effectItem) => sum + effectItem.value, 0);
}

export function estimateBaseDemand(state, includeRandom = true) {
  const cycle = getRunCycle(state.turn, state.maxTurns, state.challenge?.infiniteMode);
  const cycleDepth = Math.max(0, cycle - 1);
  const ecoMul = ECO_WEIGHTS[state.itemCategory]?.[state.economy.phase] ?? 1;
  const tierMul = getTierDemandModifier(state.itemTier || state.industryTier || 1, state.economy.phase);
  const bsMul = state._bsDemandMul ?? 1;
  const referenceCost = Math.max(1, (state.selectedVendor?.unitCost || 1) * C.DEMAND_REF_PRICE_MUL);
  const priceGapRatio = ((state.sellPrice || referenceCost) - referenceCost) / referenceCost;
  const diffElasticity = state.challenge?.demandElasticity ?? DIFF_DEMAND_ELASTICITY[state.difficulty] ?? 1;
  const priceDemandMul = clamp(
    C.DEMAND_MIN_MUL,
    1 - (priceGapRatio * C.DEMAND_ELASTICITY * diffElasticity),
    C.DEMAND_MAX_MUL
  );
  const evDemandMul = 1 + getActiveEffectModifier(state.activeEffects, EV.MARKET_MUL);
  const docMul = 1 + (state._docDemandMul || 0);
  const endlessDemandMul = state.challenge?.infiniteMode
    ? 1 + (cycleDepth * ENDLESS_MODE.demandMulPerCycle)
    : 1;

  const randomMul = includeRandom ? (0.9 + Math.random() * 0.2) : 1;
  return {
    ecoMul,
    tierMul,
    bsMul,
    priceDemandMul,
    evDemandMul,
    docMul,
    endlessDemandMul,
    demand: Math.round(
      C.BASE_DEMAND
      * ecoMul
      * tierMul
      * bsMul
      * priceDemandMul
      * Math.max(0.1, evDemandMul)
      * Math.max(0.1, docMul)
      * endlessDemandMul
      * randomMul
    ),
  };
}

export function calcTurnResult(state, shareResult) {
  const demandInfo = estimateBaseDemand(state);
  const factoryActive = state.factory.built && state.factory.buildTurnsLeft <= 0;
  const qualityMeta = getQualityMeta(factoryActive ? state.qualityMode : 'standard');
  const netCost = Math.round(state.selectedVendor.unitCost * qualityMeta.costMul * (factoryActive ? C.FACTORY_DISCOUNT : 1));
  const plannedProduction = Math.max(0, Math.round(state.plannedOrderUnits || 0));
  const targetSold = state._shutdownLeft > 0 ? 0 : Math.round(demandInfo.demand * shareResult.myShare);
  const sold = Math.min(targetSold, plannedProduction);
  const disposedUnits = Math.max(0, plannedProduction - sold);
  const procurementCost = plannedProduction * netCost;
  const disposalPenalty = Math.round(disposedUnits * netCost * C.INVENTORY_DISPOSE_PENALTY_RATE);
  const revenue = sold * state.sellPrice;
  const cogs = procurementCost;
  const gross = revenue - cogs;

  const evCostMul = 1 + getActiveEffectModifier(state.activeEffects, EV.COST_MUL);
  const grade = state.creditGrade || calcCreditGrade((state.capital || 0) + (state.propertyValue || 0) - (state.debt || 0));
  const loanRate = getLoanRateByGrade(state.interestRate, grade, state._bsRateShock || 0);
  const monthlyInt = Math.round(
    state.debt
    * Math.max(0.005, loanRate + (ECO_RATE_ADJ[state.economy.phase] || 0) + getActiveEffectModifier(state.activeEffects, EV.INTEREST))
    / 12
  );
  const realtyRent = state.realty === 'monthly' ? C.REALTY_MONTHLY_RENT : 0;
  const safetyCost = factoryActive && state.factory.safetyOn ? C.FACTORY_SAFETY_COST : 0;
  const totalFixed = Math.round(
    (monthlyInt + state.monthlyFixedCost + realtyRent + safetyCost)
    * (state.mna?.opCostMultiplier || 1)
    * Math.max(0.1, evCostMul)
  );
  const netProfit = gross - totalFixed;

  return {
    demand: demandInfo.demand,
    sold,
    targetSold,
    openingInventory: 0,
    plannedProduction,
    availableUnits: plannedProduction,
    disposedUnits,
    factoryActive,
    netCost,
    revenue,
    cogs,
    gross,
    monthlyInt,
    realtyRent,
    safetyCost,
    totalFixed,
    disposalPenalty,
    netProfit,
    ecoMul: demandInfo.ecoMul,
    tierMul: demandInfo.tierMul,
    priceDemandMul: demandInfo.priceDemandMul,
    evDemandMul: demandInfo.evDemandMul,
    endlessDemandMul: demandInfo.endlessDemandMul,
    evCostMul,
  };
}

export function calcBEP(state) {
  const factoryActive = state.factory.built && state.factory.buildTurnsLeft <= 0;
  const qualityMeta = getQualityMeta(factoryActive ? state.qualityMode : 'standard');
  const sellPrice = state.sellPrice;
  const unitCost = state.selectedVendor?.unitCost || 0;
  const netCost = Math.round(unitCost * qualityMeta.costMul * (factoryActive ? C.FACTORY_DISCOUNT : 1));
  const margin = sellPrice - netCost;
  const baseRate = state.effectiveInterestRate || state.interestRate;
  const interestRate = Math.max(0.005, baseRate + (ECO_RATE_ADJ[state.economy.phase] || 0));
  const monthInt = Math.round(state.debt * interestRate / 12);
  const realtyRent = state.realty === 'monthly' ? C.REALTY_MONTHLY_RENT : 0;
  const safetyCost = state.factory.built && state.factory.safetyOn ? C.FACTORY_SAFETY_COST : 0;
  const totalFixed = Math.round((monthInt + state.monthlyFixedCost + realtyRent + safetyCost) * (state.mna?.opCostMultiplier || 1));
  const bep = margin > 0 ? Math.ceil(totalFixed / margin) : Infinity;
  const rate = sellPrice > 0 && netCost > 0 ? Math.round((1 - netCost / sellPrice) * 100) : 0;
  return { netCost, margin, totalFixed, bep, rate, monthInt, realtyRent, safetyCost };
}

export const calcMktBrandGain = (budget) => budget <= 0 ? 0 : Math.round(30 * Math.log10(budget / 10_000_000 + 1) * 10) / 10;
export const calcMktAwarenessGain = (budget) => budget <= 0 ? 0 : Math.min(0.30, 0.05 * Math.log10(budget / 10_000_000 + 1));
