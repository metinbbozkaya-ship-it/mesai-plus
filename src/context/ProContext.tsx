import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';

// ─── Pro Membership Context (react-native-iap v15 powered) ───
//
// SKU: `mesai_pro_lifetime` — must be created and ACTIVE in:
//   - Google Play Console > Monetize > Products > In-app products
//   - App Store Connect > Your App > In-App Purchases (Non-Consumable)

export const PRO_SKU = 'mesai_pro_lifetime';
const PRO_KEY = 'mesai.isPro.v1';
const SKUS = [PRO_SKU];

// Detect if we're in an environment that supports native modules.
const isExpoGo = Constants.appOwnership === 'expo';
const isWeb = Platform.OS === 'web';
const nativeIapSupported = !isWeb && !isExpoGo;

// Lazy-load the library so web/Expo Go bundles don't crash on import.
let IAP: any = null;
function loadIap(): any | null {
  if (!nativeIapSupported) return null;
  if (IAP) return IAP;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    IAP = require('react-native-iap');
    return IAP;
  } catch (e) {
    console.warn('[IAP] react-native-iap not available, falling back to local mode', e);
    return null;
  }
}

interface ProductInfo {
  productId: string;
  price: string;
  localizedPrice: string;
  currency: string;
  title: string;
  description: string;
}

interface ProContextValue {
  isPro: boolean;
  ready: boolean;
  product: ProductInfo | null;
  purchasing: boolean;
  purchasePro: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
}

const ProContext = createContext<ProContextValue | null>(null);

export function ProProvider({ children }: { children: React.ReactNode }) {
  const [isPro, setIsPro] = useState(false);
  const [ready, setReady] = useState(false);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const purchaseUpdateSub = useRef<any>(null);
  const purchaseErrorSub = useRef<any>(null);

  const persistPro = useCallback(async (val: boolean) => {
    setIsPro(val);
    try {
      await AsyncStorage.setItem(PRO_KEY, val ? 'true' : 'false');
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cached = await AsyncStorage.getItem(PRO_KEY);
        if (!cancelled && cached === 'true') setIsPro(true);
      } catch {}

      const Iap = loadIap();
      if (!Iap) {
        if (!cancelled) setReady(true);
        return;
      }

      try {
        await Iap.initConnection();

        // ─── Fetch product metadata (v15 API: fetchProducts) ───
        try {
          const fetchFn = Iap.fetchProducts || Iap.getProducts;
          const fetched = await fetchFn({ skus: SKUS, type: 'in-app' });
          // v15 returns Product[] directly. v13/v14 wraps in {productItems, ...}.
          const list = Array.isArray(fetched)
            ? fetched
            : fetched?.productItems ?? [];
          if (!cancelled && list && list.length > 0) {
            const p = list[0];
            setProduct({
              productId: p.id ?? p.productId ?? PRO_SKU,
              price: p.displayPrice ?? p.price ?? '',
              localizedPrice: p.displayPrice ?? p.localizedPrice ?? p.price ?? '',
              currency: p.currency ?? '',
              title: p.title ?? 'Mesai+ Pro',
              description: p.description ?? '',
            });
          } else if (!cancelled) {
            console.warn('[IAP] fetchProducts returned no items for SKU:', PRO_SKU);
          }
        } catch (e) {
          console.warn('[IAP] fetchProducts failed', e);
        }

        // ─── Restore prior entitlements ───
        try {
          const purchases = await Iap.getAvailablePurchases();
          const owned = (purchases ?? []).find(
            (p: any) => (p.productId ?? p.id) === PRO_SKU
          );
          if (!cancelled && owned) {
            await persistPro(true);
            if (Platform.OS === 'android' && !owned.isAcknowledgedAndroid) {
              try { await Iap.finishTransaction({ purchase: owned, isConsumable: false }); } catch {}
            }
          }
        } catch (e) {
          console.warn('[IAP] getAvailablePurchases failed', e);
        }

        // ─── Listen for purchase updates ───
        purchaseUpdateSub.current = Iap.purchaseUpdatedListener(async (purchase: any) => {
          const productId = purchase?.productId ?? purchase?.id;
          if (productId !== PRO_SKU) return;
          if (purchase?.purchaseState === 'pending') {
            // Awaiting external approval (e.g. Ask to Buy) — don't grant entitlement yet.
            setPurchasing(false);
            return;
          }
          try {
            await Iap.finishTransaction({ purchase, isConsumable: false });
            await persistPro(true);
          } catch (e) {
            console.warn('[IAP] finishTransaction failed', e);
          } finally {
            setPurchasing(false);
          }
        });

        purchaseErrorSub.current = Iap.purchaseErrorListener((err: any) => {
          setPurchasing(false);
          if (err?.code && err.code !== 'E_USER_CANCELLED') {
            console.warn('[IAP] purchase error', err);
          }
        });
      } catch (e) {
        console.warn('[IAP] initConnection failed', e);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      try { purchaseUpdateSub.current?.remove?.(); } catch {}
      try { purchaseErrorSub.current?.remove?.(); } catch {}
      const Iap = loadIap();
      if (Iap) {
        try { Iap.endConnection(); } catch {}
      }
    };
  }, [persistPro]);

  // ─── Trigger a purchase (v15 API) ───
  const purchasePro = useCallback(async (): Promise<boolean> => {
    const Iap = loadIap();

    // Web / Expo Go fallback — no native store to purchase from, don't grant Pro.
    if (!Iap) {
      if (__DEV__) console.warn('[IAP] purchasePro: native IAP not available on this platform/runtime');
      return false;
    }

    setPurchasing(true);
    try {
      // v15 API: wrap with { request: { apple|google }, type }
      // Falls back to legacy v13 API if v15 wrapper isn't recognized.
      await Iap.requestPurchase({
        request: {
          ios: { sku: PRO_SKU },
          apple: { sku: PRO_SKU },
          android: { skus: [PRO_SKU] },
          google: { skus: [PRO_SKU] },
        },
        type: 'in-app',
        // Legacy fields for v13/v14 back-compat:
        sku: PRO_SKU,
        skus: [PRO_SKU],
      });
      return true;
    } catch (err: any) {
      setPurchasing(false);
      const code = err?.code;
      if (code === 'E_USER_CANCELLED') return false;
      const msg = err?.message || 'Could not complete the purchase. Please try again.';
      Alert.alert('Purchase Error', msg);
      return false;
    }
  }, [persistPro]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    const Iap = loadIap();

    if (!Iap) {
      const v = await AsyncStorage.getItem(PRO_KEY);
      const has = v === 'true';
      setIsPro(has);
      return has;
    }

    try {
      const purchases = await Iap.getAvailablePurchases();
      const owned = (purchases ?? []).find(
        (p: any) => (p.productId ?? p.id) === PRO_SKU
      );
      if (owned) {
        await persistPro(true);
        if (Platform.OS === 'android' && !owned.isAcknowledgedAndroid) {
          try { await Iap.finishTransaction({ purchase: owned, isConsumable: false }); } catch {}
        }
        return true;
      }
      // Store confirmed no active PRO_SKU purchase — stale local cache shouldn't be trusted.
      await persistPro(false);
      return false;
    } catch (e) {
      console.warn('[IAP] restore failed', e);
      return false;
    }
  }, [persistPro]);

  return (
    <ProContext.Provider
      value={{ isPro, ready, product, purchasing, purchasePro, restorePurchases }}
    >
      {children}
    </ProContext.Provider>
  );
}

export function usePro() {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error('usePro must be used inside ProProvider');
  return ctx;
}

export const PRO_FEATURES = ['salary', 'payroll', 'leave', 'receivables', 'advances', 'allowances', 'wallet'] as const;
export type ProFeature = typeof PRO_FEATURES[number];
export function isProFeature(id: string): boolean {
  return (PRO_FEATURES as readonly string[]).includes(id);
}
