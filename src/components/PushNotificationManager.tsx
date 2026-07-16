import React, { useState, useEffect, useRef } from "react";
import { DB } from "../db";
import { PushNotification } from "../types";
import { Bell, BellOff, X, Volume2, VolumeX, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Synthesize a high-fidelity retro notification ring/beep using Web Audio API
export function playNotificationSound() {
  try {
    const isMuted = localStorage.getItem("elx_push_muted") === "true";
    if (isMuted) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // First high note (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.12);

    // Second elegant tone (A5) for double chime
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, ctx.currentTime);
      gain2.gain.setValueAtTime(0.12, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.22);
    }, 70);
  } catch (e) {
    // browser auto-play policy may block audio until first user click
  }
}

// Global utility to broadcast new notifications
export async function sendPushNotification(
  title: string,
  body: string,
  options?: Omit<PushNotification, "id" | "title" | "body" | "timestamp">
) {
  const newNotif: PushNotification = {
    id: "PUSH-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    title,
    body,
    timestamp: new Date().toISOString(),
    readBy: [],
    ...options
  };

  const list: PushNotification[] = await DB.get("elx_push_notifications") || [];
  const updated = [newNotif, ...list].slice(0, 100); // keep last 100
  await DB.set("elx_push_notifications", updated);
  
  // Local broadcast
  window.dispatchEvent(
    new CustomEvent("elx_db_sync", { detail: { key: "elx_push_notifications", value: updated } })
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface PushNotificationManagerProps {
  user: any;
  setPage?: (p: string) => void;
  setTab?: (t: string) => void;
  isAdminPanel?: boolean;
}

export function PushNotificationManager({
  user,
  setPage,
  setTab,
  isAdminPanel = false
}: PushNotificationManagerProps) {
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [activeToast, setActiveToast] = useState<PushNotification | null>(null);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>("default");
  const [isMuted, setIsMuted] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const processedIdsRef = useRef<Set<string>>(new Set());
  const toastTimeoutRef = useRef<any>(null);

  // Load preferences and notifications on mount
  useEffect(() => {
    // 1. Mute state
    const mutedPref = localStorage.getItem("elx_push_muted") === "true";
    setIsMuted(mutedPref);

    // 2. Browser permission state
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPermission(Notification.permission);
    }

    // 3. Load initial notifications
    const loadInitial = async () => {
      const stored: PushNotification[] = await DB.get("elx_push_notifications") || [];
      setNotifications(stored);
      // Pre-fill processed IDs to avoid triggering spam alerts for past notifications
      stored.forEach(n => processedIdsRef.current.add(n.id));
    };
    loadInitial();

    // 4. Listen to real-time database synchronizations
    const handleSync = (e: any) => {
      const { key, value } = e.detail || {};
      if (key === "elx_push_notifications" && Array.isArray(value)) {
        setNotifications(value);
        processNewNotifications(value);
      }
    };

    window.addEventListener("elx_db_sync" as any, handleSync);
    return () => {
      window.removeEventListener("elx_db_sync" as any, handleSync);
    };
  }, [user?.id, user?.role]);

  // Subscribe browser to native push notifications via Service Worker PushManager
  const subscribeToPushNotifications = async (currentUser: any) => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) {
      return;
    }
    if (Notification.permission !== "granted") {
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.pushManager) {
        console.warn("PushManager is not supported by this browser.");
        return;
      }

      // Check if already subscribed to avoid spamming the subscription endpoint
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) {
        // Refresh subscription with current user context
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: existingSub, user: currentUser })
        });
        console.log("[Push Registration] Re-synced existing background push subscription.");
        return;
      }

      // Fetch public VAPID key
      const keyRes = await fetch("/api/push/vapid-public-key");
      if (!keyRes.ok) throw new Error("Failed to fetch VAPID public key");
      const { publicKey } = await keyRes.json();

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Register subscription on backend
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription, user: currentUser })
      });

      console.log("[Push Registration] Successfully registered browser background push subscription.");
    } catch (e) {
      console.warn("Error registering browser push subscription:", e);
    }
  };

  // Sync background push subscription when permission is granted or active user changes
  useEffect(() => {
    if (browserPermission === "granted") {
      subscribeToPushNotifications(user);
    }
  }, [user?.id, browserPermission]);

  // Request native HTML5 browser notification permission
  const requestBrowserPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("This browser does not support desktop notifications.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      if (permission === "granted") {
        new Notification("🔔 Push Notifications Active", {
          body: "You will now receive instant background alerts on this device!",
          icon: "https://i.postimg.cc/HJM5QXdv/IMG-20251006-160156-858-2.jpg"
        });
        playNotificationSound();
        // Trigger subscription immediately
        await subscribeToPushNotifications(user);
      }
    } catch (e) {
      console.error("Error requesting notification permission", e);
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    localStorage.setItem("elx_push_muted", nextMute ? "true" : "false");
  };

  // Inspect fresh changes to identify qualified recipient notifications
  const processNewNotifications = (newList: PushNotification[]) => {
    if (newList.length === 0) return;
    
    // Check first/newest notification
    const newest = newList[0];
    if (!newest || processedIdsRef.current.has(newest.id)) return;

    // Record it as processed so it is never checked again
    processedIdsRef.current.add(newest.id);

    // Verify if current user is intended target
    let isRecipient = false;

    // If targetRole is supplied
    if (newest.targetRole && newest.targetRole.length > 0) {
      if (user?.role && newest.targetRole.includes(user.role)) {
        isRecipient = true;
      }
    } 
    // If targetUserId is supplied
    else if (newest.targetUserId) {
      if (String(user?.id) === String(newest.targetUserId)) {
        isRecipient = true;
      }
    }
    // If targetUserEmail is supplied
    else if (newest.targetUserEmail) {
      if (user?.email && String(user.email).toLowerCase() === String(newest.targetUserEmail).toLowerCase()) {
        isRecipient = true;
      }
    }
    // If targetUserPhone is supplied
    else if (newest.targetUserPhone) {
      if (user?.phone && user.phone.includes(newest.targetUserPhone)) {
        isRecipient = true;
      }
    }
    // If no targeting options, this is public (sent to clients)
    else if (!newest.targetRole && !newest.targetUserId && !newest.targetUserEmail && !newest.targetUserPhone) {
      // If we are on Client app (no admin panel) or if user is non-staff
      if (!isAdminPanel && (!user?.role || user?.role === "client")) {
        isRecipient = true;
      }
    }

    if (isRecipient) {
      // Trigger ring sound
      playNotificationSound();

      // Trigger HTML5 web push notification if permitted
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(newest.title, {
            body: newest.body,
            icon: "https://i.postimg.cc/HJM5QXdv/IMG-20251006-160156-858-2.jpg",
            tag: newest.id
          });
        } catch (e) {
          // Fallback if browser fails
        }
      }

      // Display floating overlay toast
      setActiveToast(newest);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setActiveToast(null);
      }, 7000); // dismiss after 7 seconds
    }
  };

  // Perform immediate navigation action on toast click
  const handleToastClick = (notif: PushNotification) => {
    setActiveToast(null);
    if (!notif.link) return;

    const { page, tab, orderId, jobId, proposalId } = notif.link;

    if (isAdminPanel) {
      // Admin dashboard routing
      if (page) {
        if (setTab) setTab(page); // In admin panel, page is tab
      }
    } else {
      // Main client app routing
      if (page && setPage) {
        setPage(page);
        if (tab && setTab) setTab(tab);
        
        // Save order selection for tracking
        if (orderId) {
          localStorage.setItem("elx_active_track_order_id", orderId);
        }
      }
    }
  };

  // Mark all notifications as read
  const clearNotifications = async () => {
    const cleared = notifications.map(n => {
      const readSet = new Set(n.readBy || []);
      if (user?.id) readSet.add(String(user.id));
      return { ...n, readBy: Array.from(readSet) };
    });
    setNotifications(cleared);
    await DB.set("elx_push_notifications", cleared);
    window.dispatchEvent(
      new CustomEvent("elx_db_sync", { detail: { key: "elx_push_notifications", value: cleared } })
    );
  };

  // Delete an individual notification by adding the user ID to its deletedBy list
  const deleteNotification = async (notifId: string) => {
    const updated = notifications.map(n => {
      if (n.id === notifId) {
        const deletedSet = new Set(n.deletedBy || []);
        if (user?.id) deletedSet.add(String(user.id));
        return { ...n, deletedBy: Array.from(deletedSet) };
      }
      return n;
    });
    setNotifications(updated);
    await DB.set("elx_push_notifications", updated);
    window.dispatchEvent(
      new CustomEvent("elx_db_sync", { detail: { key: "elx_push_notifications", value: updated } })
    );
  };

  // Delete all read notifications for this user by adding the user ID to their deletedBy list
  const deleteReadNotifications = async () => {
    const updated = notifications.map(n => {
      const isRead = user?.id ? n.readBy?.includes(String(user.id)) : false;
      const isForMe = n.targetRole?.includes(user?.role) ||
                      (n.targetUserId && String(user?.id) === String(n.targetUserId)) ||
                      (n.targetUserEmail && user?.email && String(user.email).toLowerCase() === String(n.targetUserEmail).toLowerCase()) ||
                      (n.targetUserPhone && user?.phone && user.phone.includes(n.targetUserPhone)) ||
                      (!n.targetRole && !n.targetUserId && !n.targetUserEmail && !n.targetUserPhone && !isAdminPanel);
      
      if (isForMe && isRead) {
        const deletedSet = new Set(n.deletedBy || []);
        if (user?.id) deletedSet.add(String(user.id));
        return { ...n, deletedBy: Array.from(deletedSet) };
      }
      return n;
    });
    setNotifications(updated);
    await DB.set("elx_push_notifications", updated);
    window.dispatchEvent(
      new CustomEvent("elx_db_sync", { detail: { key: "elx_push_notifications", value: updated } })
    );
  };

  // Count unread notifications targeted for current user that are not deleted
  const unreadCount = notifications.filter(n => {
    // If already deleted by current user, do not count
    if (user?.id && n.deletedBy?.includes(String(user.id))) return false;

    // target checks
    let isForMe = false;
    if (n.targetRole && n.targetRole.includes(user?.role)) isForMe = true;
    else if (n.targetUserId && String(user?.id) === String(n.targetUserId)) isForMe = true;
    else if (n.targetUserEmail && user?.email && String(user.email).toLowerCase() === String(n.targetUserEmail).toLowerCase()) isForMe = true;
    else if (n.targetUserPhone && user?.phone && user.phone.includes(n.targetUserPhone)) isForMe = true;
    else if (!n.targetRole && !n.targetUserId && !n.targetUserEmail && !n.targetUserPhone && !isAdminPanel) isForMe = true;

    if (!isForMe) return false;
    
    const readUsers = n.readBy || [];
    return user?.id ? !readUsers.includes(String(user.id)) : true;
  }).length;

  return (
    <>
      {/* ────────────────── 🛎️ FLOATING TOAST PUSH OVERLAY ────────────────── */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              zIndex: 99999,
              width: "100%",
              maxWidth: "380px",
              background: "rgba(15, 23, 42, 0.95)",
              backdropFilter: "blur(12px)",
              border: "2px solid #21F1A8",
              boxShadow: "0 10px 30px rgba(33, 241, 168, 0.25)",
              borderRadius: "16px",
              padding: "16px",
              color: "white",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              cursor: "pointer"
            }}
            onClick={() => handleToastClick(activeToast)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  background: "rgba(33, 241, 168, 0.15)",
                  color: "#21F1A8",
                  padding: "6px",
                  borderRadius: "8px",
                  display: "flex"
                }}>
                  <Bell className="w-5 h-5 animate-bounce" />
                </span>
                <span style={{ fontSize: "11px", fontWeight: "black", letterSpacing: "1px", color: "#21F1A8" }}>
                  ELEXTRA INSTANT PUSH
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveToast(null);
                }}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X className="w-4 h-4 hover:text-white" />
              </button>
            </div>

            <div>
              <div style={{ fontSize: "14px", fontWeight: "900", color: "#ffffff" }}>{activeToast.title}</div>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", lineHeight: "1.4" }}>{activeToast.body}</p>
            </div>

            {activeToast.link && (
              <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: "bold", color: "#21F1A8", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  View Live Update <Sparkles className="w-3 h-3" />
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────────────────── 🎛️ IN-APP NOTIFICATION BELL / WIDGET ────────────────── */}
      <div style={{ position: "relative", display: "inline-block" }}>
        <button
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          style={{
            background: "none",
            border: "none",
            color: "white",
            cursor: "pointer",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px",
            borderRadius: "50%",
            backgroundColor: isHistoryOpen ? "rgba(255,255,255,0.1)" : "transparent"
          }}
          title="Notification Center & Push Settings"
        >
          <Bell className="w-5 h-5 hover:text-emerald-400 transition-colors" />
          {unreadCount > 0 && (
            <span style={{
              position: "absolute",
              top: "2px",
              right: "2px",
              backgroundColor: "#ef4444",
              color: "white",
              fontSize: "9px",
              fontWeight: "black",
              borderRadius: "50%",
              width: "16px",
              height: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 8px rgba(239, 68, 68, 0.8)",
              border: "1.5px solid #0f172a"
            }}>
              {unreadCount}
            </span>
          )}
        </button>

        {/* ────────────────── 📂 NOTIFICATION DROPDOWN / CONSOLE ────────────────── */}
        {isHistoryOpen && (
          <div style={{
            position: "absolute",
            right: "0",
            top: "40px",
            zIndex: 9999,
            width: "320px",
            background: "#0f172a",
            border: "1.5px solid #1e293b",
            borderRadius: "16px",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
            color: "white",
            padding: "16px",
            fontSize: "13px"
          }}>
            {/* Header / Config Toggles */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e293b", paddingBottom: "10px", marginBottom: "10px" }}>
              <span style={{ fontWeight: "black", color: "#38bdf8" }}>🔔 Push Console</span>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <button
                  onClick={toggleMute}
                  style={{ background: "none", border: "none", color: isMuted ? "#ef4444" : "#10b981", cursor: "pointer", display: "flex", alignItems: "center" }}
                  title={isMuted ? "Unmute sound effects" : "Mute sound effects"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <span style={{ color: "#334155" }}>|</span>
                <button
                  onClick={clearNotifications}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "10px", fontWeight: "bold" }}
                >
                  Mark Read
                </button>
                <span style={{ color: "#334155" }}>|</span>
                <button
                  onClick={deleteReadNotifications}
                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "10px", fontWeight: "bold" }}
                  title="Delete all read notifications"
                >
                  Delete Read
                </button>
              </div>
            </div>

            {/* Browser Permission Prompt */}
            {browserPermission !== "granted" && (
              <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "8px", padding: "8px 10px", fontSize: "11px", color: "#fbbf24", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: "bold", marginBottom: "4px" }}>
                  <ShieldAlert className="w-3.5 h-3.5" /> Enable Browser Push
                </div>
                <p style={{ margin: "0 0 6px 0", fontSize: "10px" }}>Receive native alerts even with the tab minimized.</p>
                <button
                  onClick={requestBrowserPermission}
                  style={{ background: "#fbbf24", color: "#0f172a", border: "none", borderRadius: "4px", padding: "3px 8px", fontSize: "10px", fontWeight: "black", cursor: "pointer" }}
                >
                  Authorize Now ⚡
                </button>
              </div>
            )}

            {/* Notification Lists */}
            <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }} className="custom-scrollbar">
              {(() => {
                const filtered = notifications.filter(n => {
                  if (user?.id && n.deletedBy?.includes(String(user.id))) return false;

                  let isForMe = false;
                  if (n.targetRole && n.targetRole.includes(user?.role)) isForMe = true;
                  else if (n.targetUserId && String(user?.id) === String(n.targetUserId)) isForMe = true;
                  else if (n.targetUserEmail && user?.email && String(user.email).toLowerCase() === String(n.targetUserEmail).toLowerCase()) isForMe = true;
                  else if (n.targetUserPhone && user?.phone && user.phone.includes(n.targetUserPhone)) isForMe = true;
                  else if (!n.targetRole && !n.targetUserId && !n.targetUserEmail && !n.targetUserPhone && !isAdminPanel) isForMe = true;
                  return isForMe;
                });

                if (filtered.length === 0) {
                  return (
                    <div style={{ textAlign: "center", color: "#64748b", padding: "20px 0", fontSize: "11px" }}>
                      No notifications recorded.
                    </div>
                  );
                }

                return filtered.map(notif => {
                  const isRead = user?.id ? notif.readBy?.includes(String(user.id)) : false;
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleToastClick(notif)}
                      style={{
                        padding: "8px 10px",
                        background: isRead ? "rgba(255,255,255,0.02)" : "rgba(33, 241, 168, 0.05)",
                        borderLeft: `3px solid ${isRead ? "#475569" : "#21F1A8"}`,
                        borderRadius: "4px",
                        cursor: "pointer",
                        transition: "background 0.2s"
                      }}
                      className="hover:bg-white/5 relative group"
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: "11.5px", fontWeight: "bold" }}>
                        <span style={{ color: isRead ? "#94a3b8" : "white", paddingRight: "16px" }}>{notif.title}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "8.5px", color: "#64748b", whiteSpace: "nowrap" }}>
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notif.id);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#64748b",
                              cursor: "pointer",
                              padding: "2px",
                              borderRadius: "4px",
                              display: "inline-flex"
                            }}
                            className="hover:text-red-400 hover:bg-slate-800 transition-colors"
                            title="Delete this notification"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p style={{ margin: "2px 0 0 0", fontSize: "10.5px", color: "#64748b", lineClamp: 2, paddingRight: "16px" }}>{notif.body}</p>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Test Trigger Button */}
            <div style={{ borderTop: "1px solid #1e293b", paddingTop: "8px", marginTop: "10px", display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={async () => {
                  await sendPushNotification("🧪 Push Test Complete", "Your instant notifications pipeline is fully operational! 🚀", {
                    targetUserId: user?.id,
                    targetRole: user?.role ? [user.role] : null
                  });
                }}
                style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", fontSize: "10px", fontWeight: "bold" }}
              >
                Send Test Notification 🚀
              </button>
              <button
                onClick={() => setIsHistoryOpen(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "10px" }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
