import { AssetPurchase, AssetCategory } from '../storage/finance';

// Pure, UI-independent asset math. No AsyncStorage, no side effects, no state —
// every function here only reads the AssetPurchase list it's given and returns
// a value. Aggregates are never stored; always derived from purchases here.

// Rounds to 2 decimals, safe against floating-point drift (e.g. 0.1 + 0.2).
// Mirrors src/utils/debt.ts's roundMoney — kept as a separate copy since that
// file is not to be modified/imported into for this feature.
function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function getAssetPurchaseCost(purchase: AssetPurchase): number {
  const q = Number.isFinite(purchase?.quantity) ? purchase.quantity : 0;
  const p = Number.isFinite(purchase?.unitPrice) ? purchase.unitPrice : 0;
  return roundMoney(q * p);
}

export function getAssetTotalQuantity(purchases: AssetPurchase[]): number {
  return (purchases ?? []).reduce((a, p) => a + (Number.isFinite(p?.quantity) ? p.quantity : 0), 0);
}

export function getAssetTotalCost(purchases: AssetPurchase[]): number {
  return roundMoney((purchases ?? []).reduce((a, p) => a + getAssetPurchaseCost(p), 0));
}

// Weighted average: totalCost / totalQuantity — never a plain average of unit
// prices (1gr@4000 + 9gr@4500 must yield 4450, not 4250).
export function getAssetAveragePrice(purchases: AssetPurchase[]): number {
  const totalQty = getAssetTotalQuantity(purchases);
  if (totalQty <= 0) return 0;
  return roundMoney(getAssetTotalCost(purchases) / totalQty);
}

export interface AssetGroup {
  category: AssetCategory;
  subType: string;
  purchases: AssetPurchase[];
  totalQuantity: number;
  totalCost: number;
  averagePrice: number;
}

// Groups purchases by category+subType. Groups are ordered by their most
// recent purchaseDate, newest first. Purchases within a group are returned
// as-is (unsorted) — display-time ordering is the caller's concern.
export function groupAssetPurchases(purchases: AssetPurchase[]): AssetGroup[] {
  const map = new Map<string, AssetPurchase[]>();
  for (const p of purchases ?? []) {
    if (!p) continue;
    const key = `${p.category}::${p.subType}`;
    const list = map.get(key);
    if (list) list.push(p); else map.set(key, [p]);
  }
  const groups: AssetGroup[] = [];
  map.forEach((list) => {
    groups.push({
      category: list[0].category,
      subType: list[0].subType,
      purchases: list,
      totalQuantity: getAssetTotalQuantity(list),
      totalCost: getAssetTotalCost(list),
      averagePrice: getAssetAveragePrice(list),
    });
  });
  groups.sort((a, b) => {
    const latest = (g: AssetGroup) => Math.max(...g.purchases.map(p => new Date(p.purchaseDate).getTime() || 0));
    return latest(b) - latest(a);
  });
  return groups;
}
