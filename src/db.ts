/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const SHARED_KEYS = [
  "elx_malls",
  "elx_food_places",
  "elx_drivers",
  "elx_registered_riders",
  "elx_momo_lines",
  "elx_rider_fees",
  "elx_addon_starting_price",
  "elx_min_order_amount",
  "elx_customizer_prices",
  "elx_admin_email",
  "elx_admin_code",
  "elx_seller_whatsapp_numbers",
  "elx_whatsapp_logs",
  "elx_coupons",
  "elx_users",
  "elx_orders",
  "elx_dispatch",
  "elx_reservations",
  "elx_catering_orders",
  "elx_qrm",
  "elx_rest_registration",
  "elx_move_aboboyaa_price",
  "elx_move_small_cargo_price",
  "elx_move_large_cargo_price",
  "elx_staff_accounts",
  "elx_logged_staff",
  "elx_pending_approvals",
  "elx_applications",
  "elx_handyman_bookings",
  "elx_catalog_proposals",
  "elx_rider_notifications",
  "elx_food_requests",
  "elx_messages",
  "elx_payout_requests",
  "elx_custom_catalog",
  "elx_settings",
  "elx_handyman_registry",
  "elx_management_memos",
  "elx_gemini_products_meta",
  "elx_push_notifications"
];

function getStaffAuthHeaders(): Record<string, string> {
  try {
    const loggedStaffStr = typeof localStorage !== "undefined" ? localStorage.getItem("elx_logged_staff") : null;
    if (loggedStaffStr) {
      const staff = JSON.parse(loggedStaffStr);
      const identifier = staff ? (staff.email || staff.phone) : null;
      if (staff && identifier && staff.password) {
        return {
          "x-staff-email": identifier,
          "x-staff-password": staff.password
        };
      }
    }
  } catch (e) {
    // Ignore
  }
  return {};
}

let ws: WebSocket | null = null;
let reconnectTimer: any = null;
let connectionFailedAttempts = 0;
let isPollingActive = false;
let pollingIntervalTimer: any = null;
let lastPolledData: Record<string, string> = {}; // Track stringified values to avoid redundant events

async function triggerHttpSync() {
  try {
    const headers = getStaffAuthHeaders();
    const res = await fetch("/api/db/sync", { headers });
    if (!res.ok) return;
    const data = await res.json();
    if (data && typeof data === "object") {
      Object.entries(data).forEach(([key, val]) => {
        if (SHARED_KEYS.includes(key)) {
          const stringified = JSON.stringify(val);
          if (lastPolledData[key] !== stringified) {
            lastPolledData[key] = stringified;
            localStorage.setItem(key, stringified);
            window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key, value: val } }));
          }
        }
      });
    }
  } catch (err) {
    // Silent catch to prevent console clutter
  }
}

function startPollingFallback() {
  if (isPollingActive) return;
  isPollingActive = true;
  console.log("[DB SYNC] Activating high-reliability HTTP sync standby engine...");
  triggerHttpSync();
  pollingIntervalTimer = setInterval(triggerHttpSync, 1500);
}

function stopPollingFallback() {
  isPollingActive = false;
  if (pollingIntervalTimer) {
    clearInterval(pollingIntervalTimer);
    pollingIntervalTimer = null;
  }
}

function connectWebSocket() {
  if (typeof window === "undefined") return;

  // After 2 failed attempts, enter high-reliability standby polling and slow down WS reconnection attempts to once a minute
  if (connectionFailedAttempts >= 2) {
    startPollingFallback();
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectWebSocket, 60000);
    return;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  
  const staffHeaders = getStaffAuthHeaders();
  let wsUrl = `${protocol}//${host}/ws`;
  if (staffHeaders["x-staff-email"] && staffHeaders["x-staff-password"]) {
    wsUrl += `?staff_email=${encodeURIComponent(staffHeaders["x-staff-email"])}&staff_password=${encodeURIComponent(staffHeaders["x-staff-password"])}`;
  }

  console.log(`[DB WEBSOCKET] Connecting to ${wsUrl}... (Attempt ${connectionFailedAttempts + 1})`);
  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[DB WEBSOCKET] Connection established successfully! Disabling background polling.");
      connectionFailedAttempts = 0;
      stopPollingFallback();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "init") {
          console.log("[DB WEBSOCKET] Initialized state sync from server");
          if (msg.data) {
            Object.entries(msg.data).forEach(([key, val]) => {
              if (SHARED_KEYS.includes(key)) {
                const str = JSON.stringify(val);
                lastPolledData[key] = str;
                localStorage.setItem(key, str);
                window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key, value: val } }));
              }
            });
          }
        } else if (msg.type === "sync") {
          const { key, value } = msg;
          if (SHARED_KEYS.includes(key)) {
            const str = JSON.stringify(value);
            lastPolledData[key] = str;
            localStorage.setItem(key, str);
            window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key, value } }));
          }
        } else if (msg.type === "gps_update") {
          window.dispatchEvent(new CustomEvent("elx_gps_update", { detail: msg }));
        } else if (msg.type === "chat_message") {
          window.dispatchEvent(new CustomEvent("elx_chat_message", { detail: msg }));
        }
      } catch (err) {
        console.error("[DB WEBSOCKET] Message parsing failed:", err);
      }
    };

    ws.onclose = () => {
      ws = null;
      connectionFailedAttempts++;
      if (connectionFailedAttempts >= 2) {
        console.warn("[DB WEBSOCKET] Socket closed/unreachable. Switching to HTTP Standby sync fallback.");
        startPollingFallback();
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectWebSocket, 60000);
      } else {
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectWebSocket, 4000);
      }
    };

    ws.onerror = () => {
      // Gracefully trigger close to route to standby engine
      ws?.close();
    };
  } catch (err) {
    connectionFailedAttempts++;
    startPollingFallback();
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectWebSocket, 60000);
  }
}

if (typeof window !== "undefined") {
  connectWebSocket();
}

export const DB = {
  async get(k: string) {
    try {
      if (typeof window !== "undefined" && SHARED_KEYS.includes(k)) {
        const headers = getStaffAuthHeaders();
        const res = await fetch(`/api/db/get/${k}`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.value !== undefined && data.value !== null) {
            return data.value;
          }
        }
      }
    } catch (err) {
      console.warn(`[DB.get] Failed to fetch shared key ${k} from server, falling back to local storage`, err);
    }

    try {
      if (typeof window !== "undefined" && (window as any).storage && typeof (window as any).storage.get === "function") {
        const r = await (window as any).storage.get(k);
        return r ? JSON.parse(r.value) : null;
      }
      if (typeof localStorage !== "undefined") {
        const r = localStorage.getItem(k);
        return r ? JSON.parse(r) : null;
      }
      return null;
    } catch {
      return null;
    }
  },

  async set(k: string, v: any) {
    try {
      if (typeof window !== "undefined" && SHARED_KEYS.includes(k)) {
        const headers = {
          "Content-Type": "application/json",
          ...getStaffAuthHeaders()
        };
        await fetch("/api/db/set", {
          method: "POST",
          headers,
          body: JSON.stringify({ key: k, value: v })
        });
      }
    } catch (err) {
      console.warn(`[DB.set] Failed to save shared key ${k} to server`, err);
    }

    try {
      let isSetFinished = false;
      if (typeof window !== "undefined" && (window as any).storage && typeof (window as any).storage.set === "function") {
        await (window as any).storage.set(k, JSON.stringify(v));
        isSetFinished = true;
      } else if (typeof localStorage !== "undefined") {
        localStorage.setItem(k, JSON.stringify(v));
        isSetFinished = true;
      }
      if (isSetFinished && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key: k, value: v } }));
      }
      return isSetFinished;
    } catch {
      return false;
    }
  },

  sendGpsUpdate(orderId: string, lat: number, lng: number, progress: number) {
    if (ws && ws.readyState === 1 /* WebSocket.OPEN */) {
      ws.send(JSON.stringify({ type: "gps_update", orderId, lat, lng, progress }));
    }
  },

  sendChatMessage(orderId: string, message: any) {
    if (ws && ws.readyState === 1 /* WebSocket.OPEN */) {
      ws.send(JSON.stringify({ type: "chat_message", orderId, message }));
    }
  }
};
