/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

export const S = {
  app: {
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    background: "var(--elextra-bg, #f8fafc)",
    minHeight: "100vh",
    color: "var(--elextra-text, #0f172a)",
    transition: "background 0.2s ease, color 0.2s ease",
    paddingBottom: "calc(82px + env(safe-area-inset-bottom, 0px))",
  } as React.CSSProperties,

  notif: {
    position: "fixed" as const,
    top: "16px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 9999,
    padding: "10px 22px",
    borderRadius: "30px",
    color: "white",
    fontWeight: 700,
    fontSize: "13px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
    whiteSpace: "nowrap" as const,
    maxWidth: "90vw",
  } as React.CSSProperties,

  header: {
    background: "linear-gradient(135deg, var(--elextra-dark-grey, #171717), #2d2d2d)",
    color: "white",
    position: "sticky" as const,
    top: 0,
    zIndex: 1000,
    boxShadow: "0 4px 15px rgba(0,0,0,0.12)",
    paddingTop: "env(safe-area-inset-top, 0px)",
  } as React.CSSProperties,

  hTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    gap: "10px",
  } as React.CSSProperties,

  logoW: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
  } as React.CSSProperties,

  logoImg: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    border: "2px solid var(--elextra-primary, #FF5A1F)",
    objectFit: "cover" as const,
  } as React.CSSProperties,

  logoTxt: {
    fontSize: "18px",
    fontWeight: 900,
    letterSpacing: "2px",
    color: "var(--elextra-primary, #FF5A1F)",
  } as React.CSSProperties,

  logoSub: {
    fontSize: "10px",
    opacity: 0.7,
    letterSpacing: "0.5px",
  } as React.CSSProperties,

  searchW: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    background: "rgba(255, 255, 255, 0.12)",
    borderRadius: "24px",
    padding: "6px 14px",
    gap: "8px",
    maxWidth: "380px",
  } as React.CSSProperties,

  sInput: {
    background: "none",
    border: "none",
    color: "white",
    outline: "none",
    fontSize: "13px",
    width: "100%",
  } as React.CSSProperties,

  hRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  } as React.CSSProperties,

  iBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "20px",
    position: "relative" as const,
    padding: "4px",
  } as React.CSSProperties,

  badge: {
    position: "absolute" as const,
    top: "-6px",
    right: "-6px",
    background: "var(--elextra-primary, #FF5A1F)",
    color: "var(--elextra-primary-text, #FFFFFF)",
    borderRadius: "50%",
    width: "18px",
    height: "18px",
    fontSize: "9px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as React.CSSProperties,

  avBtn: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "var(--elextra-primary, #FF5A1F)",
    color: "var(--elextra-primary-text, #FFFFFF)",
    border: "none",
    fontWeight: 800,
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  } as React.CSSProperties,

  loginBtn: {
    background: "var(--elextra-primary, #FF5A1F)",
    color: "var(--elextra-primary-text, #FFFFFF)",
    border: "none",
    padding: "6px 14px",
    borderRadius: "20px",
    fontWeight: 700,
    fontSize: "12px",
    cursor: "pointer",
  } as React.CSSProperties,

  nav: {
    display: "flex",
    overflowX: "auto" as const,
    padding: "8px 12px",
    gap: "8px",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  } as React.CSSProperties,

  nBtn: {
    background: "none",
    border: "none",
    color: "var(--elextra-inactive-text, #94a3b8)",
    fontSize: "12px",
    fontWeight: 700,
    padding: "6px 12px",
    borderRadius: "14px",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,

  nActive: {
    color: "var(--elextra-primary-text, #FFFFFF)",
    background: "var(--elextra-primary, #FF5A1F)",
  } as React.CSSProperties,

  main: {
    padding: "16px",
    maxWidth: "800px",
    margin: "0 auto",
  } as React.CSSProperties,

  hero: {
    background: "linear-gradient(135deg, var(--elextra-dark-grey, #171717), #2d2d2d)",
    borderRadius: "16px",
    overflow: "hidden" as const,
    marginBottom: "16px",
    border: "1.5px solid var(--elextra-primary, #FF5A1F)",
  } as React.CSSProperties,

  heroOv: {
    padding: "36px 20px",
    textAlign: "center" as const,
    color: "white",
    background: "rgba(0,0,0,0.3)",
  } as React.CSSProperties,

  heroBadge: {
    display: "inline-block",
    background: "var(--elextra-primary, #FF5A1F)",
    color: "var(--elextra-primary-text, #FFFFFF)",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "10px",
    fontWeight: 700,
    marginBottom: "10px",
  } as React.CSSProperties,

  heroTitle: {
    fontSize: "28px",
    fontWeight: 900,
  } as React.CSSProperties,

  heroSub: {
    fontSize: "12px",
    opacity: 0.8,
    marginTop: "6px",
  } as React.CSSProperties,

  priceNotice: {
    background: "var(--elextra-soft-bg, #fef9c3)",
    border: "1.5px solid var(--elextra-border, #cbd5e1)",
    borderRadius: "12px",
    padding: "12px 16px",
    display: "flex",
    gap: "10px",
    alignItems: "center",
    color: "var(--elextra-text, #0f172a)",
    fontSize: "12px",
    marginBottom: "16px",
    lineHeight: 1.5,
  } as React.CSSProperties,

  qGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "10px",
    marginBottom: "16px",
  } as React.CSSProperties,

  qCard: {
    background: "var(--elextra-card-bg, white)",
    border: "1px solid var(--elextra-card-border, #e2e8f0)",
    color: "var(--elextra-text, #0f172a)",
    borderRadius: "12px",
    padding: "12px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "var(--elextra-item-shadow, 0 2px 4px rgba(0,0,0,0.03))",
    transition: "all 0.2s ease",
  } as React.CSSProperties,

  sec: {
    background: "var(--elextra-card-bg, white)",
    border: "1.5px solid var(--elextra-card-border, #cbd5e1)",
    color: "var(--elextra-text, #0f172a)",
    borderRadius: "16px",
    padding: "16px",
    marginBottom: "16px",
    boxShadow: "var(--elextra-item-shadow, 0 4px 10px rgba(0,0,0,0.04))",
    transition: "all 0.2s ease",
  } as React.CSSProperties,

  pRow: {
    display: "flex",
    overflowX: "auto" as const,
    gap: "12px",
    paddingBottom: "10px",
  } as React.CSSProperties,

  howGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  } as React.CSSProperties,

  howCard: {
    background: "var(--elextra-input-bg, #f8fafc)",
    borderRadius: "12px",
    padding: "14px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    textAlign: "center" as const,
    color: "var(--elextra-text, #0f172a)",
    border: "1px solid var(--elextra-card-border, #e2e8f0)",
    transition: "all 0.2s ease",
  } as React.CSSProperties,

  inp: {
    width: "100%",
    background: "var(--elextra-input-bg, #f8fafc)",
    border: "1.5px solid var(--elextra-border, #cbd5e1)",
    borderRadius: "12px",
    padding: "10px 14px",
    fontSize: "13px",
    color: "var(--elextra-text, #0f172a)",
    outline: "none",
    transition: "background 0.2s ease, border-color 0.2s ease",
  } as React.CSSProperties,

  pGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "12px",
    marginTop: "10px",
  } as React.CSSProperties,

  pTag: {
    position: "absolute" as const,
    top: "8px",
    left: "8px",
    color: "white",
    fontSize: "9px",
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: "8px",
    zIndex: 10,
  } as React.CSSProperties,

  wBtn: {
    position: "absolute" as const,
    top: "8px",
    right: "8px",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "18px",
    zIndex: 10,
  } as React.CSSProperties,

  addBtn: {
    width: "100%",
    border: "none",
    padding: "8px 12px",
    borderRadius: "10px",
    fontWeight: 700,
    fontSize: "12px",
    cursor: "pointer",
    color: "white",
    background: "linear-gradient(135deg, var(--elextra-secondary, #10B981), #059669)",
    textAlign: "center" as const,
  } as React.CSSProperties,

  dCard: {
    background: "var(--elextra-input-bg, #f8fafc)",
    border: "1px solid var(--elextra-card-border, #e2e8f0)",
    color: "var(--elextra-text, #0f172a)",
    borderRadius: "12px",
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginTop: "10px",
    transition: "all 0.2s ease",
  } as React.CSSProperties,

  dAv: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "var(--elextra-primary, #FF5A1F)",
    color: "var(--elextra-primary-text, #FFFFFF)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
  } as React.CSSProperties,

  fCard: {
    background: "var(--elextra-card-bg, white)",
    borderRadius: "16px",
    padding: "16px",
    boxShadow: "var(--elextra-item-shadow, 0 4px 10px rgba(0,0,0,0.04))",
    border: "1.5px solid var(--elextra-card-border, #cbd5e1)",
    color: "var(--elextra-text, #0f172a)",
    transition: "all 0.2s ease",
  } as React.CSSProperties,

  sTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--elextra-subtext, #475569)",
    marginBottom: "12px",
  } as React.CSSProperties,

  oGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    marginBottom: "12px",
  } as React.CSSProperties,

  optBtn: {
    padding: "10px 14px",
    borderRadius: "10px",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "var(--elextra-card-border, #e2e8f0)",
    background: "var(--elextra-card-bg, white)",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--elextra-subtext, #475569)",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center" as const,
    transition: "all 0.2s ease",
  } as React.CSSProperties,

  optBtnA: {
    borderColor: "var(--elextra-primary, #FF5A1F)",
    background: "var(--elextra-soft-bg, rgba(255, 90, 31, 0.08))",
    color: "var(--elextra-text, #1E1B18)",
  } as React.CSSProperties,

  bNav: {
    position: "fixed" as const,
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: "800px",
    background: "var(--elextra-bottom-nav-bg, white)",
    borderTop: "1.5px solid var(--elextra-border, #cbd5e1)",
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    padding: "8px 0 calc(16px + env(safe-area-inset-bottom, 0px))",
    zIndex: 900,
    boxShadow: "0 -4px 12px rgba(0,0,0,0.05)",
    transition: "all 0.2s ease",
  } as React.CSSProperties,

  bBtn: {
    background: "none",
    border: "none",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    cursor: "pointer",
    color: "var(--elextra-inactive-text, #94a3b8)",
  } as React.CSSProperties,

  bAct: {
    color: "var(--elextra-primary, #FF5A1F)",
  } as React.CSSProperties,

  pCard: {
    background: "var(--elextra-card-bg, white)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--elextra-card-border, #e2e8f0)",
    borderRadius: "14px",
    padding: "14px",
    position: "relative" as const,
    minWidth: "160px",
    boxShadow: "var(--elextra-item-shadow, 0 2px 5px rgba(0,0,0,0.02))",
    color: "var(--elextra-text, #0f172a)",
    transition: "all 0.2s ease",
  } as React.CSSProperties,

  pCardD: {
    background: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.15)",
    boxShadow: "none",
  } as React.CSSProperties,

  mBg: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(15, 23, 42, 0.45)",
    backdropFilter: "blur(4px)",
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    overflowY: "auto" as const,
  } as React.CSSProperties,

  mBox: {
    background: "var(--elextra-card-bg, white)",
    color: "var(--elextra-text, #0f172a)",
    border: "1px solid var(--elextra-card-border, #e2e8f0)",
    borderRadius: "18px",
    padding: "20px",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
    position: "relative" as const,
    transition: "all 0.2s ease",
    margin: "auto",
    maxHeight: "calc(100vh - 40px)",
    display: "flex",
    flexDirection: "column" as const,
  } as React.CSSProperties,

  closeBtn: {
    position: "absolute" as const,
    top: "14px",
    right: "14px",
    background: "none",
    border: "none",
    fontSize: "16px",
    color: "var(--elextra-subtext, #94a3b8)",
    cursor: "pointer",
  } as React.CSSProperties,

  backBtn: {
    background: "var(--elextra-input-bg, #f1f5f9)",
    border: "1px solid var(--elextra-card-border, #e2e8f0)",
    color: "var(--elextra-subtext, #475569)",
    padding: "10px 16px",
    borderRadius: "10px",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
  } as React.CSSProperties,

  cta: {
    background: "linear-gradient(135deg, var(--elextra-primary, #FF5A1F), #e04e15)",
    color: "white",
    border: "none",
    padding: "10px 18px",
    borderRadius: "10px",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
  } as React.CSSProperties,

  tabRow: {
    display: "flex",
    overflowX: "auto" as const,
    gap: "6px",
    paddingBottom: "8px",
    marginBottom: "12px",
  } as React.CSSProperties,

  tab: {
    background: "var(--elextra-tab-bg, white)",
    borderWidth: "1.5px",
    borderStyle: "solid",
    borderColor: "var(--elextra-tab-border, #cbd5e1)",
    color: "var(--elextra-subtext, #475569)",
    padding: "6px 14px",
    borderRadius: "16px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    transition: "all 0.2s ease",
  } as React.CSSProperties,

  tabA: {
    color: "var(--elextra-primary-text, #FFFFFF)",
    background: "var(--elextra-primary, #FF5A1F)",
    borderColor: "var(--elextra-primary, #FF5A1F)",
  } as React.CSSProperties,
};
