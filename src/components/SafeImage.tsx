import React, { useState, useEffect } from "react";
import { DB } from "../db";

// Check if a string is a single or double emoji character
export function isEmoji(str: string): boolean {
  if (!str) return false;
  const isUrl = str.startsWith("http://") || str.startsWith("https://") || str.startsWith("data:image");
  if (isUrl) return false;
  // Emojis typically don't have letters/numbers and are short
  return str.length <= 8 && !/[a-zA-Z0-9_\-\.\/]+/.test(str);
}

// Helper to check if an image URL is active and loading successfully
export async function verifyImageURL(url: string): Promise<boolean> {
  if (!url || typeof window === "undefined") return false;
  if (url.startsWith("data:") || isEmoji(url)) return true;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    
    // Safety timeout of 5 seconds to prevent hanging
    setTimeout(() => {
      img.src = "";
      resolve(false);
    }, 5000);
  });
}

// Service Worker or Browser Cache Strategy: Cache validated product images locally using the Cache Storage API
export async function cacheProductImageLocally(url: string): Promise<string> {
  if (!url || typeof window === "undefined" || !("caches" in window)) {
    return url;
  }
  if (url.startsWith("data:") || isEmoji(url)) {
    return url;
  }

  try {
    const cache = await caches.open("elextra-product-images-v1");
    const cachedResponse = await cache.match(url);
    if (cachedResponse) {
      const blob = await cachedResponse.blob();
      return URL.createObjectURL(blob);
    }

    // Try pre-fetching and caching. Using no-cors lets us safely retrieve and store any image, including CDN ones.
    const fetchResponse = await fetch(url, { mode: "no-cors" }).catch(() => null);
    if (fetchResponse) {
      await cache.put(url, fetchResponse);
    }
  } catch (err) {
    console.debug("[SafeImage Cache] Caching omitted/failed for:", url, err);
  }
  return url;
}

// Auto-heal broken global catalog entries to fallback placeholder
export async function updateCustomCatalogImage(productId: string, fallbackUrl: string) {
  try {
    const currentCatalog = await DB.get("elx_custom_catalog") || {};
    if (currentCatalog[productId]?.img === fallbackUrl) {
      return;
    }
    const updatedCatalog = {
      ...currentCatalog,
      [productId]: {
        ...currentCatalog[productId],
        img: fallbackUrl
      }
    };
    await DB.set("elx_custom_catalog", updatedCatalog);
  } catch (err) {
    console.error("[updateCustomCatalogImage] Failed to auto-heal catalog:", err);
  }
}

// Map categories or words to fallback beautiful images or emojis
export const CATEGORY_FALLBACKS: Record<string, string> = {
  "Staples": "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80", 
  "Proteins": "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=400&q=80", 
  "Vegetables": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80", 
  "Oils": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80", 
  "Seasonings": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=400&q=80", 
  "Beverages": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=80", 
  "Provisions": "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=400&q=80", 
  "Fans": "https://images.unsplash.com/photo-1618945997254-20b1686940be?auto=format&fit=crop&w=400&q=80", 
  "Refrigerators": "https://images.unsplash.com/photo-1571843439991-dd2b8e051966?auto=format&fit=crop&w=400&q=80", 
  "Washing Machines": "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=400&q=80", 
  "Cookers": "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=400&q=80", 
  "Generators": "https://images.unsplash.com/photo-1597733349483-e32649f48967?auto=format&fit=crop&w=400&q=80", 
  "Power": "https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?auto=format&fit=crop&w=400&q=80", 
  "Air Conditioning": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80", 
  "Phones": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80", 
  "Audio": "https://images.unsplash.com/photo-1484755560693-a4074577af3a?auto=format&fit=crop&w=400&q=80", 
  "Home Appliances": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80", 
  "Structural": "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=400&q=80", 
  "Roofing": "https://images.unsplash.com/photo-1632759162444-1168aac26e7e?auto=format&fit=crop&w=400&q=80", 
  "Finishes": "https://images.unsplash.com/photo-1502005229762-fc1b2381f0d5?auto=format&fit=crop&w=400&q=80", 
};

export const DEFAULT_FALLBACK = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80";

export function getFallbackForProduct(name: string, category: string): string {
  const cat = category || "";
  if (CATEGORY_FALLBACKS[cat]) {
    return CATEGORY_FALLBACKS[cat];
  }
  const n = (name || "").toLowerCase();
  if (n.includes("cement")) return CATEGORY_FALLBACKS["Structural"];
  if (n.includes("iron") || n.includes("rod") || n.includes("steel")) return CATEGORY_FALLBACKS["Structural"];
  if (n.includes("fan")) return CATEGORY_FALLBACKS["Fans"];
  if (n.includes("rice") || n.includes("gari")) return CATEGORY_FALLBACKS["Staples"];
  if (n.includes("chicken") || n.includes("beef") || n.includes("fish")) return CATEGORY_FALLBACKS["Proteins"];
  if (n.includes("paint")) return CATEGORY_FALLBACKS["Finishes"];
  
  return DEFAULT_FALLBACK;
}

interface SafeImageProps {
  src?: string;
  alt: string;
  category?: string;
  style?: React.CSSProperties;
  className?: string;
  height?: string;
  productId?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  category = "",
  style = {},
  className = "",
  height = "110px",
  productId,
}) => {
  const [imgSrc, setImgSrc] = useState<string>("");
  const [errorCount, setErrorCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorCount(0);
    
    if (!src) {
      setImgSrc(getFallbackForProduct(alt, category));
      setLoading(false);
      return;
    }

    if (isEmoji(src)) {
      setImgSrc("");
      setLoading(false);
      return;
    }

    // High performance image verification with caching
    const processImage = async () => {
      const isValid = await verifyImageURL(src);
      if (!active) return;

      if (isValid) {
        // Fetch and save to Browser Cache
        const cachedUrl = await cacheProductImageLocally(src);
        if (active) {
          setImgSrc(cachedUrl);
          setLoading(false);
        }
      } else {
        // Image check failed! Auto-heal in global custom catalog and display fallback placeholder
        const fallbackUrl = getFallbackForProduct(alt, category);
        if (active) {
          setImgSrc(fallbackUrl);
          setLoading(false);
        }
        if (productId) {
          console.log(`[SafeImage] Auto-healing broken image for product ${productId} -> ${fallbackUrl}`);
          updateCustomCatalogImage(productId, fallbackUrl);
        }
      }
    };

    processImage();

    return () => {
      active = false;
    };
  }, [src, alt, category, productId]);

  const handleError = () => {
    if (errorCount === 0) {
      // First try category specific fallback
      setImgSrc(getFallbackForProduct(alt, category));
      setErrorCount(1);
    } else if (errorCount === 1) {
      // Then absolute generic fallback
      setImgSrc(DEFAULT_FALLBACK);
      setErrorCount(2);
    } else {
      setLoading(false);
    }
  };

  const handleLoad = () => {
    setLoading(false);
  };

  if (src && isEmoji(src)) {
    return (
      <div 
        style={{ 
          height, 
          width: "100%", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          background: "var(--elextra-input-bg, #f1f5f9)",
          borderRadius: "10px", 
          marginTop: "16px", 
          marginBottom: "8px",
          userSelect: "none",
          ...style 
        }}
        className={className}
      >
        <span style={{ fontSize: "38px" }} role="img" aria-label={alt}>{src}</span>
      </div>
    );
  }

  return (
    <div 
      style={{ 
        height, 
        width: "100%", 
        position: "relative", 
        overflow: "hidden", 
        borderRadius: "10px", 
        marginTop: "16px", 
        marginBottom: "8px", 
        background: "var(--elextra-input-bg, #f1f5f9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style 
      }}
      className={className}
    >
      {loading && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(90deg, var(--elextra-input-bg, #f1f5f9) 25%, var(--elextra-card-border, #e2e8f0) 50%, var(--elextra-input-bg, #f1f5f9) 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite linear",
        }} />
      )}
      {imgSrc && (
        <img
          src={imgSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          onLoad={handleLoad}
          onError={handleError}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: loading ? 0 : 1,
            transition: "opacity 0.2s ease-in-out",
          }}
        />
      )}
      
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};
