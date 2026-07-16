import React, { useState, useMemo, useEffect } from "react";
import { supabase, supabaseReady } from "./lib/supabase.js";
import { fetchChambres, createChambre, updateChambre, removeChambre } from "./lib/chambres.js";
import { uploadMedia } from "./lib/storage.js";
import { createReservation, fetchReservations, updateReservationStatut } from "./lib/reservations.js";
import { logEvent, fetchStats } from "./lib/stats.js";
import { fetchAvis, fetchAllAvis, createAvis, approveAvis, removeAvis } from "./lib/avis.js";
import { fetchOccupations, addBlock, removeBlock, blockOccupations } from "./lib/occupations.js";

// ============================================================
//  HKA · COURTAGE — Maquette (v1)
//  App de réservation façon Airbnb, adaptée Dakar.
//  Deux modes : SÉJOUR (nuitées) et PASSAGE (créneaux jour / soirée).
//  Devise : FCFA. Données en mémoire (prototype).
// ============================================================

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Instrument+Sans:wght@400;500;600&display=swap');

.hka * { box-sizing: border-box; margin: 0; padding: 0; }
.hka {
  --ink: #17140F;
  --paper: #FAF7F1;
  --card: #FFFFFF;
  --line: #E7DFD1;
  --muted: #8A8272;
  --pine: #123B33;
  --sejour: #C9873A;
  --passage: #0F8B8D;
  --accent: var(--sejour);
  font-family: 'Instrument Sans', system-ui, sans-serif;
  color: var(--ink);
  background: var(--paper);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
.hka.mode-passage { --accent: var(--passage); }

.disp { font-family: 'Bricolage Grotesque', system-ui, sans-serif; letter-spacing: -0.02em; }

/* ---- HEADER ---- */
.head {
  position: sticky; top: 0; z-index: 40;
  background: rgba(250,247,241,0.88);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}
.head-in { max-width: 1080px; margin: 0 auto; padding: 14px 18px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.brand { display: flex; align-items: center; gap: 11px; }
.brand-logo { width: 42px; height: 42px; border-radius: 11px; display: block; box-shadow: 0 2px 10px rgba(23,20,15,.18); }
.brand-txt { display: flex; flex-direction: column; line-height: 1.08; }
.brand-mark { font-family: 'Bricolage Grotesque'; font-weight: 800; font-size: 18px; color: var(--pine); letter-spacing: -0.03em; }
.brand-sub { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); margin-top: 1px; }

/* ---- MODE TOGGLE (signature) ---- */
.toggle { margin-left: auto; display: inline-flex; padding: 4px; background: #F0EADF; border: 1px solid var(--line); border-radius: 999px; position: relative; }
.toggle button {
  position: relative; z-index: 2; border: 0; background: transparent; cursor: pointer;
  font-family: 'Bricolage Grotesque'; font-weight: 600; font-size: 14px;
  padding: 8px 18px; border-radius: 999px; color: var(--muted); transition: color .25s;
  display: flex; align-items: center; gap: 7px;
}
.toggle button.on { color: #fff; }
.toggle .thumb {
  position: absolute; top: 4px; bottom: 4px; z-index: 1; border-radius: 999px;
  background: var(--accent); transition: transform .32s cubic-bezier(.4,1.2,.4,1), background .3s, width .32s;
  box-shadow: 0 4px 14px rgba(0,0,0,.18);
}
.dot { width: 7px; height: 7px; border-radius: 999px; background: currentColor; opacity: .8; }

/* ---- SEARCH BAR ---- */
.wrap { max-width: 1080px; margin: 0 auto; padding: 0 18px; }
.hero { padding: 30px 0 18px; }
.hero h1 { font-family: 'Bricolage Grotesque'; font-weight: 800; font-size: clamp(26px, 5vw, 40px); line-height: 1.05; max-width: 640px; }
.hero h1 em { font-style: normal; color: var(--accent); transition: color .3s; }
.hero p { color: var(--muted); margin-top: 10px; max-width: 520px; font-size: 15px; }

.search {
  background: var(--card); border: 1px solid var(--line); border-radius: 20px;
  padding: 8px; display: flex; gap: 6px; flex-wrap: wrap; align-items: stretch;
  box-shadow: 0 10px 30px -18px rgba(18,59,51,.4); margin-top: 22px;
}
.field { flex: 1 1 130px; padding: 10px 14px; border-radius: 14px; min-width: 0; }
.field:hover { background: #FBF8F2; }
.field label { display: block; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); font-weight: 600; margin-bottom: 3px; }
.field input, .field select {
  border: 0; background: transparent; font-family: inherit; font-size: 15px; color: var(--ink);
  width: 100%; outline: none; font-weight: 500;
}
.field + .field { border-left: 1px solid var(--line); }
.slotset { display: flex; gap: 6px; flex-wrap: wrap; }
.chip {
  border: 1px solid var(--line); background: #fff; border-radius: 10px; padding: 7px 11px;
  font-size: 13px; font-weight: 600; cursor: pointer; color: var(--ink); transition: all .18s;
  display: flex; align-items: center; gap: 6px; white-space: nowrap;
}
.chip.sel { background: var(--accent); border-color: var(--accent); color: #fff; }
.searchbtn {
  flex: 0 0 auto; align-self: center; border: 0; cursor: pointer; margin: 4px;
  background: var(--accent); color: #fff; font-family: 'Bricolage Grotesque'; font-weight: 700;
  padding: 0 22px; height: 48px; border-radius: 14px; font-size: 15px; transition: transform .15s, background .3s;
}
.searchbtn:hover { transform: translateY(-1px); }

/* ---- FILTERS ---- */
.filters { margin-top: 28px; }
.filtline { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.selbox { display: flex; flex-direction: column; }
.selbox label { font-size: 11px; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); font-weight: 600; margin-bottom: 4px; }
.selbox select { border: 1px solid var(--line); background: #fff; border-radius: 12px; padding: 9px 12px; font-family: inherit; font-size: 14px; font-weight: 600; color: var(--ink); cursor: pointer; }
.qchips { display: flex; gap: 8px; flex-wrap: wrap; }

/* ---- GRID ---- */
.rowlabel { display: flex; align-items: baseline; justify-content: space-between; margin: 34px 0 14px; }
.rowlabel h2 { font-family: 'Bricolage Grotesque'; font-weight: 700; font-size: 20px; }
.rowlabel span { font-size: 13px; color: var(--muted); }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding-bottom: 50px; }
@media (max-width: 820px){ .grid { grid-template-columns: repeat(2,1fr); } .field + .field { border-left: 0; } }
@media (max-width: 540px){ .grid { grid-template-columns: 1fr; } .head-in { gap: 10px; } .toggle { margin-left: 0; width: 100%; } .toggle button { flex: 1; justify-content: center; } }

.card { background: var(--card); border: 1px solid var(--line); border-radius: 18px; overflow: hidden; cursor: pointer; transition: transform .2s, box-shadow .2s; }
.card:hover { transform: translateY(-3px); box-shadow: 0 18px 40px -24px rgba(18,59,51,.5); }
.ph { height: 172px; position: relative; }
.badge {
  position: absolute; top: 12px; left: 12px; background: rgba(255,255,255,.94);
  border-radius: 999px; padding: 5px 11px; font-size: 12px; font-weight: 600; color: var(--pine);
  display: flex; align-items: center; gap: 6px;
}
.cbody { padding: 14px 16px 16px; }
.cbody .top { display: flex; justify-content: space-between; align-items: start; gap: 8px; }
.cbody h3 { font-family: 'Bricolage Grotesque'; font-weight: 600; font-size: 16px; }
.cbody .q { color: var(--muted); font-size: 13px; margin-top: 2px; }
.note { font-size: 13px; font-weight: 600; white-space: nowrap; }
.price { margin-top: 12px; font-size: 14px; color: var(--ink); }
.price b { font-family: 'Bricolage Grotesque'; font-size: 17px; }
.price .u { color: var(--muted); font-weight: 400; }

/* ---- MODAL ---- */
.scrim { position: fixed; inset: 0; background: rgba(23,20,15,.55); z-index: 60; display: flex; align-items: flex-end; justify-content: center; padding: 0; animation: fade .2s; }
@media (min-width: 720px){ .scrim { align-items: center; padding: 24px; } }
@keyframes fade { from { opacity: 0 } }
.sheet {
  background: var(--paper); width: 100%; max-width: 620px; border-radius: 22px 22px 0 0;
  max-height: 92vh; overflow-y: auto; animation: rise .3s cubic-bezier(.3,1,.4,1);
}
@media (min-width: 720px){ .sheet { border-radius: 22px; } }
@keyframes rise { from { transform: translateY(24px); opacity: .5 } }
.shead { height: 190px; position: relative; }
.close { position: absolute; top: 14px; right: 14px; background: rgba(255,255,255,.94); border: 0; width: 36px; height: 36px; border-radius: 999px; font-size: 18px; cursor: pointer; line-height: 1; }
.sbody { padding: 20px 22px 26px; }
.sbody h2 { font-family: 'Bricolage Grotesque'; font-weight: 800; font-size: 22px; }
.sbody .q { color: var(--muted); margin: 4px 0 14px; font-size: 14px; }
.feats { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.feat { background: #F1EBE0; border-radius: 10px; padding: 6px 11px; font-size: 13px; font-weight: 500; }
.calc { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 16px; }
.calc h4 { font-family: 'Bricolage Grotesque'; font-size: 13px; text-transform: uppercase; letter-spacing: .1em; color: var(--accent); margin-bottom: 12px; }
.calc-field { margin-bottom: 12px; }
.calc-field label { display:block; font-size: 12px; color: var(--muted); font-weight: 600; margin-bottom: 5px; }
.calc-field input, .calc-field select { width: 100%; border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; font-family: inherit; font-size: 15px; background: #fff; }
.line { display: flex; justify-content: space-between; font-size: 14px; padding: 7px 0; color: #4a463d; }
.line.tot { border-top: 1px solid var(--line); margin-top: 6px; padding-top: 12px; font-family: 'Bricolage Grotesque'; font-weight: 800; font-size: 19px; color: var(--ink); }
.cta { width: 100%; border: 0; cursor: pointer; margin-top: 14px; background: var(--pine); color: #fff; font-family: 'Bricolage Grotesque'; font-weight: 700; font-size: 16px; padding: 15px; border-radius: 14px; transition: transform .15s; }
.cta:hover { transform: translateY(-1px); }
.wa { width: 100%; margin-top: 9px; background: transparent; border: 1px solid var(--line); color: var(--pine); font-weight: 600; font-family:'Instrument Sans'; font-size: 14px; padding: 12px; border-radius: 14px; cursor: pointer; }


/* ---- ADMIN ---- */
.adminbtn { border: 1px solid var(--line); background: #fff; color: var(--pine); font-family: 'Bricolage Grotesque', sans-serif; font-weight: 600; font-size: 13px; padding: 9px 14px; border-radius: 999px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: background .18s; }
.adminbtn:hover { background: #F0EADF; }
.admin { max-width: 1080px; margin: 0 auto; padding: 0 18px 60px; }
.admin-top { display: flex; align-items: center; gap: 12px; padding: 18px 0 4px; flex-wrap: wrap; }
.admin-top h1 { font-size: 24px; }
.acols { display: grid; grid-template-columns: 380px 1fr; gap: 22px; align-items: start; margin-top: 18px; }
.acard { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 18px; }
.acard h3 { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 16px; margin-bottom: 14px; }
.afield { margin-bottom: 12px; }
.afield label { display: block; font-size: 12px; font-weight: 600; color: var(--muted); margin-bottom: 5px; }
.ainput { width: 100%; border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; font-family: inherit; font-size: 15px; background: #fff; color: var(--ink); }
.ainput:focus { outline: none; border-color: var(--accent); }
.arow { display: flex; gap: 10px; }
.arow .afield { flex: 1; }
.abtn { border: 0; cursor: pointer; background: var(--pine); color: #fff; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 15px; padding: 12px 16px; border-radius: 12px; transition: transform .15s; }
.abtn:hover { transform: translateY(-1px); }
.abtn.ghost { background: transparent; border: 1px solid var(--line); color: var(--ink); }
.abtn.danger { background: transparent; border: 1px solid #C1544E; color: #C1544E; padding: 8px 12px; font-size: 13px; }
.abtn.small { padding: 8px 12px; font-size: 13px; }
.abtns { display: flex; gap: 10px; margin-top: 4px; }
.alist { display: flex; flex-direction: column; gap: 10px; }
.aitem { display: flex; align-items: center; gap: 12px; border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; background: #fff; flex-wrap: wrap; }
.aitem .sw { width: 44px; height: 44px; border-radius: 10px; flex: 0 0 auto; }
.aitem .info { flex: 1 1 150px; min-width: 0; }
.aitem .info b { font-family: 'Bricolage Grotesque', sans-serif; font-size: 15px; display: block; }
.aitem .info span { font-size: 13px; color: var(--muted); }
.aitem .acts { display: flex; gap: 8px; flex: 0 0 auto; margin-left: auto; }
.pill { display: inline-block; background: #F1EBE0; border-radius: 999px; padding: 2px 9px; font-size: 12px; font-weight: 600; color: var(--pine); margin-right: 7px; }
.gate { max-width: 380px; margin: 56px auto; text-align: center; }
.gate .g-logo { width: 64px; height: 64px; border-radius: 16px; margin: 0 auto 16px; display: block; box-shadow: 0 6px 18px rgba(23,20,15,.2); }
.gate h2 { font-size: 22px; }
.gate p { color: var(--muted); font-size: 14px; margin: 6px 0 18px; }
.gate .hint { font-size: 12px; color: var(--muted); margin-top: 14px; }

/* ---- ADMIN MODULES ---- */
.admin-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0 20px; }
.admin-tab { border: 1px solid var(--line); background: #fff; color: var(--ink); font-family: 'Bricolage Grotesque', sans-serif; font-weight: 600; font-size: 14px; padding: 9px 16px; border-radius: 999px; cursor: pointer; transition: all .15s; }
.admin-tab.on { background: var(--pine); border-color: var(--pine); color: #fff; }
.tab-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 6px; margin-left: 8px; border-radius: 999px; background: #C1544E; color: #fff; font-size: 12px; font-weight: 800; vertical-align: middle; }
.avis-item { border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; background: #fff; }
.avis-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.avis-top b { font-family: 'Bricolage Grotesque', sans-serif; font-size: 14px; }
.avis-note { color: var(--sejour); font-size: 13px; letter-spacing: 1px; white-space: nowrap; }
.avis-item p { font-size: 14px; color: #4a463d; margin: 6px 0 4px; }
.avis-date { font-size: 12px; color: var(--muted); }
.avis-form { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.avis-stars { display: flex; gap: 4px; }
.avis-star { border: 0; background: none; cursor: pointer; font-size: 26px; line-height: 1; color: var(--line); padding: 0; }
.avis-star.on { color: var(--sejour); }
.admin-sub { color: var(--muted); font-size: 14px; margin-bottom: 14px; }
.dash-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; }
.dash-card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 3px; }
.dc-num { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 30px; color: var(--pine); line-height: 1; }
.dc-t { font-weight: 700; font-size: 14px; margin-top: 6px; }
.dc-s { color: var(--muted); font-size: 12.5px; }
.achk { display: flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 500; color: var(--ink); cursor: pointer; }
.achk input { width: 18px; height: 18px; accent-color: var(--pine); }
.stbadge { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 999px; }
.stbadge.on { color: #0B7A55; background: #DCF3E9; }
.stbadge.off { color: #9A6A1E; background: #F1E4D0; }
.stbadge.warn { color: #9A6A1E; background: #F6E7CC; }

/* ---- CONTACT / À PROPOS ---- */
.contact-card { text-align: left; background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px; margin-top: 26px; }
.contact-card h3 { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 17px; color: var(--pine); }
.cc-desc { color: #4a463d; font-size: 13.5px; margin: 6px 0 12px; line-height: 1.5; }
.cc-list { display: flex; flex-direction: column; }
.cc-row { display: flex; justify-content: space-between; gap: 12px; padding: 9px 0; border-top: 1px solid var(--line); font-size: 13.5px; color: var(--ink); text-decoration: none; }
.cc-row span { color: var(--muted); }
.cc-row b { font-weight: 600; text-align: right; }
.site-foot { max-width: 640px; margin: 20px auto 0; padding: 22px; text-align: center; border-top: 1px solid var(--line); display: flex; flex-direction: column; align-items: center; gap: 4px; }
.site-foot b { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 16px; color: var(--pine); }
.site-foot span { color: var(--muted); font-size: 13px; }
.site-foot .wa { width: auto; margin-top: 12px; padding: 10px 20px; }


@media (max-width: 820px){ .acols { grid-template-columns: 1fr; } }


/* ---- NAV BAS ---- */
.page-pad { padding-bottom: 96px; }
.nav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 50; background: rgba(255,255,255,.97); backdrop-filter: blur(10px); border-top: 1px solid var(--line); }
.nav-in { max-width: 1080px; margin: 0 auto; display: flex; }
.nav button { flex: 1; background: transparent; border: 0; cursor: pointer; padding: 10px 4px 12px; display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--muted); font-family: 'Bricolage Grotesque', sans-serif; font-weight: 600; font-size: 11px; transition: color .18s; }
.nav button.on { color: var(--accent); }
.nav svg { width: 24px; height: 24px; display: block; }
.placeholder { max-width: 1080px; margin: 0 auto; padding: 90px 24px; text-align: center; }
.placeholder .ph-ic { color: var(--accent); opacity: .85; display: inline-flex; margin-bottom: 14px; }
.placeholder .ph-ic svg { width: 40px; height: 40px; }
.placeholder h2 { font-size: 20px; margin-bottom: 6px; }
.placeholder p { color: var(--muted); font-size: 14px; }

/* ---- FICHE CHAMBRE (plein écran) ---- */
.detail { position: fixed; inset: 0; z-index: 60; background: var(--paper); overflow-y: auto; animation: fade .2s; }
.detail-inner { max-width: 640px; margin: 0 auto; min-height: 100%; display: flex; flex-direction: column; }
.detail-photo { position: relative; height: 300px; flex: 0 0 auto; }
.d-round { position: absolute; top: 16px; width: 40px; height: 40px; border-radius: 999px; border: 0; background: rgba(255,255,255,.95); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(23,20,15,.2); }
.d-round svg { width: 20px; height: 20px; }
.d-back { left: 16px; color: var(--ink); }
.d-fav { right: 16px; color: var(--pine); }
.d-share { right: 64px; color: var(--pine); }
.d-count { position: absolute; bottom: 16px; right: 16px; background: rgba(23,20,15,.6); color: #fff; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; }
.detail-body { flex: 1 1 auto; padding: 20px 22px; }
.d-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.d-head h2 { font-size: 23px; line-height: 1.1; }
.d-sub { color: var(--muted); font-size: 14px; margin-top: 4px; }
.d-note { text-align: right; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 15px; white-space: nowrap; }
.d-note span { display: block; font-weight: 400; font-size: 12px; color: var(--muted); }
.d-desc { color: #4a463d; font-size: 14px; line-height: 1.55; margin: 16px 0 4px; }
.d-h3 { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 16px; margin: 22px 0 12px; }
.d-feats { display: grid; grid-template-columns: 1fr 1fr; gap: 11px 16px; }
.d-feat { display: flex; align-items: center; gap: 9px; font-size: 14px; color: var(--ink); }
.d-dot { width: 7px; height: 7px; border-radius: 999px; background: var(--accent); flex: 0 0 auto; }
.d-bar { position: sticky; bottom: 0; background: rgba(250,247,241,.97); backdrop-filter: blur(10px); border-top: 1px solid var(--line); padding: 12px 22px; display: flex; align-items: center; gap: 14px; }
.d-bar-price { flex: 0 0 auto; }
.d-bar-price b { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 18px; display: block; line-height: 1.1; }
.d-bar-price span { font-size: 12px; color: var(--muted); }
.d-bar-actions { flex: 1 1 auto; display: flex; gap: 10px; }
.d-bar .cta { flex: 1; width: auto; margin: 0; padding: 13px; }
.d-bar .wa { flex: 0 0 auto; width: auto; margin: 0; padding: 13px 18px; }

/* ---- MÉDIA / VIDÉO ---- */
.vidbadge { position: absolute; bottom: 12px; left: 12px; background: rgba(23,20,15,.7); color: #fff; border-radius: 999px; padding: 4px 10px 4px 8px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 5px; }
.vidbadge svg { width: 12px; height: 12px; }
.media-view { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.media-tag { position: absolute; top: 16px; left: 16px; background: rgba(23,20,15,.6); color: #fff; font-size: 12px; font-weight: 600; padding: 5px 11px 5px 9px; border-radius: 999px; display: flex; align-items: center; gap: 6px; }
.media-tag svg { width: 12px; height: 12px; }
.media-play { width: 66px; height: 66px; border-radius: 999px; border: 0; background: rgba(255,255,255,.92); color: var(--pine); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 20px rgba(23,20,15,.3); }
.media-play svg { width: 28px; height: 28px; margin-left: 3px; }
.media-playing { position: absolute; inset: 0; background: rgba(23,20,15,.82); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: #fff; }
.media-playing span { font-size: 13px; opacity: .85; }
.media-pause { width: 60px; height: 60px; border-radius: 999px; border: 2px solid rgba(255,255,255,.7); background: transparent; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.media-pause svg { width: 22px; height: 22px; }
.media-dots { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; gap: 7px; }
.media-dots .dot { width: 7px; height: 7px; border-radius: 999px; border: 0; background: rgba(255,255,255,.5); cursor: pointer; padding: 0; transition: width .2s; }
.media-dots .dot.on { background: #fff; width: 20px; }
.media-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 38px; height: 38px; border-radius: 999px; border: 0; background: rgba(23,20,15,.42); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 3; transition: background .15s, transform .12s; }
.media-nav:hover { background: rgba(23,20,15,.62); }
.media-nav:active { transform: translateY(-50%) scale(.9); }
.media-nav svg { width: 20px; height: 20px; }
.media-nav.prev { left: 12px; }
.media-nav.next { right: 12px; }

/* ---- CALENDRIER DISPONIBILITÉS ---- */
.cal-head { display: flex; align-items: center; justify-content: center; gap: 16px; margin: 16px 0 12px; }
.cal-head b { font-size: 17px; min-width: 170px; text-align: center; }
.cal-legend { display: flex; gap: 16px; font-size: 12.5px; color: var(--muted); margin-bottom: 10px; }
.cal-legend i { display: inline-block; width: 11px; height: 11px; border-radius: 4px; margin-right: 5px; vertical-align: -1px; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; max-width: 560px; }
.cal-dow { text-align: center; font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; padding-bottom: 2px; }
.cal-cell { border: 1px solid var(--line); border-radius: 10px; background: #fff; padding: 6px 4px 7px; display: flex; flex-direction: column; align-items: center; gap: 5px; min-height: 62px; }
.cal-cell.empty { border: 0; background: transparent; }
.cal-cell.past { opacity: .38; }
.cal-num { font-size: 13px; font-weight: 700; color: var(--ink); }
.cal-slots { display: flex; gap: 4px; }
.cal-slot { width: 22px; height: 22px; border-radius: 7px; border: 0; cursor: pointer; font-size: 11px; font-weight: 800; font-family: 'Bricolage Grotesque', sans-serif; transition: transform .1s; }
.cal-slot:active { transform: scale(.88); }
.cal-slot.free { background: #DCF3E9; color: #0B7A55; }
.cal-slot.busy { background: #F6D9D6; color: #C1544E; }
.cal-slot:disabled { cursor: not-allowed; opacity: .7; }
@media (max-width: 560px){ .cal-cell { min-height: 56px; } .cal-slot { width: 20px; height: 20px; } }
.avail { border-radius: 12px; padding: 11px 14px; font-size: 13.5px; font-weight: 600; margin-top: 14px; }
.avail.ok { color: #0B7A55; background: #DCF3E9; }
.avail.no { color: #C1544E; background: #F6D9D6; }
.cta:disabled, .wa:disabled { opacity: .5; cursor: not-allowed; transform: none; }
.clim-opt { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font-size: 14px; cursor: pointer; color: var(--ink); }
.clim-opt input { width: 18px; height: 18px; accent-color: var(--accent); flex: 0 0 auto; }
.feat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; margin: 2px 0 4px; }
/* ---- RÉCAP / RÉSERVATIONS ---- */
.recap-head { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--line); }
.recap-head h2 { font-size: 20px; }
.resa-ok { text-align: center; padding: 26px 6px; }
.resa-ok .ok-ic { width: 60px; height: 60px; border-radius: 999px; background: #10B981; color: #fff; font-size: 30px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
.resa-ok h3 { font-size: 20px; margin-bottom: 8px; }
.resa-ok p { color: var(--muted); font-size: 14px; margin-bottom: 14px; }
.wa-msg { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 14px; font-size: 13px; color: var(--ink); white-space: pre-wrap; text-align: left; font-family: 'Instrument Sans', sans-serif; line-height: 1.55; margin-bottom: 18px; }
.resa-list { max-width: 1080px; margin: 0 auto; }
.resa-item { display: flex; align-items: center; gap: 12px; padding: 16px 22px; border-bottom: 1px solid var(--line); }
.resa-main { flex: 1; min-width: 0; }
.resa-main b { font-family: 'Bricolage Grotesque', sans-serif; font-size: 15px; display: block; }
.resa-main span { font-size: 13px; color: var(--muted); }
.resa-right { text-align: right; white-space: nowrap; }
.resa-right b { font-family: 'Bricolage Grotesque', sans-serif; font-size: 15px; display: block; }
.resa-statut { font-size: 11px; font-weight: 700; color: var(--sejour); background: #F4EBDD; padding: 2px 9px; border-radius: 999px; display: inline-block; margin-bottom: 4px; }

/* ---- PAIEMENT ---- */
.pay-opts { display: flex; flex-direction: column; gap: 10px; }
.pay-opt { display: flex; align-items: center; gap: 12px; text-align: left; border: 1px solid var(--line); background: #fff; border-radius: 14px; padding: 14px; cursor: pointer; transition: border-color .15s, background .15s; }
.pay-opt.sel { border-color: var(--accent); background: #FBF6EE; }
.pay-radio { width: 20px; height: 20px; border-radius: 999px; border: 2px solid var(--line); flex: 0 0 auto; position: relative; }
.pay-opt.sel .pay-radio { border-color: var(--accent); }
.pay-opt.sel .pay-radio::after { content: ""; position: absolute; inset: 3px; border-radius: 999px; background: var(--accent); }
.pay-txt b { font-family: 'Bricolage Grotesque', sans-serif; font-size: 15px; display: block; }
.pay-txt small { color: var(--muted); font-size: 12.5px; }
.pay-box { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px; margin-bottom: 16px; text-align: center; }
.pay-box h4 { font-family: 'Bricolage Grotesque', sans-serif; font-size: 15px; margin-bottom: 10px; }
.pay-box p { color: #4a463d; font-size: 14px; }
.pay-num { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 22px; color: var(--pine); margin: 12px 0; }
.pay-note { font-size: 13px; color: var(--muted); }
.resa-ok .ok-ic.warn { background: #E0A94A; }
.resa-item { flex-direction: column; align-items: stretch; gap: 10px; }
.resa-row { display: flex; align-items: center; gap: 12px; }
.resa-statut.ok { color: #0B7A55; background: #DCF3E9; }
.resa-statut.warn { color: #9A6A1E; background: #F6E7CC; }

/* ---- SKELETONS + MICRO-INTERACTIONS ---- */
.skel { pointer-events: none; }
.skel .ph { background: none; }
.skel-box { background: #E9E2D4; }
.skel-box, .skel-line { position: relative; overflow: hidden; }
.skel-box::after, .skel-line::after { content: ""; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 20%, rgba(255,255,255,.65) 50%, transparent 80%); transform: translateX(-100%); animation: shimmer 1.3s infinite; }
.skel-line { height: 12px; border-radius: 6px; background: #E9E2D4; }
@keyframes shimmer { to { transform: translateX(100%); } }
.card:active { transform: translateY(-1px) scale(.985); }
.card-fav.on svg, .d-fav.on svg { animation: pop .32s ease; }
@keyframes pop { 0% { transform: scale(1); } 40% { transform: scale(1.4); } 100% { transform: scale(1); } }
.searchbtn:active, .cta:active, .abtn:active, .wa:active, .pay-opt:active { transform: translateY(1px) scale(.985); }
.chip:active { transform: scale(.95); }
.nav button { transition: color .18s, transform .12s ease; }
.nav button:active { transform: scale(.9); }
@media (prefers-reduced-motion: reduce) { .skel-box::after, .skel-line::after, .card-fav.on svg, .d-fav.on svg { animation: none; } }
.resa-warn { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; justify-content: space-between; background: #FBF3E4; border: 1px solid #EBD9B8; border-radius: 12px; padding: 10px 12px; font-size: 12.5px; color: #7A5A1E; }
.resa-prevenir { border: 0; background: var(--pine); color: #fff; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 12.5px; padding: 8px 12px; border-radius: 10px; cursor: pointer; }

/* ---- FAVORIS ---- */
.card-fav { position: absolute; top: 12px; right: 12px; width: 34px; height: 34px; border-radius: 999px; border: 0; background: rgba(255,255,255,.92); color: #6B6456; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(23,20,15,.15); transition: transform .15s, color .15s; }
.card-fav svg { width: 18px; height: 18px; }
.card-fav:hover { transform: scale(1.08); }
.card-fav.on { color: #E0555A; }
.d-fav.on { color: #E0555A; }

/* ---- COMPTE ---- */
.compte { max-width: 460px; margin: 0 auto; padding: 40px 22px 60px; text-align: center; }
.compte-logo img { width: 72px; height: 72px; border-radius: 20px; margin: 0 auto 16px; display: block; object-fit: cover; box-shadow: 0 6px 18px rgba(23,20,15,.2); }
.compte-av { width: 72px; height: 72px; border-radius: 999px; margin: 0 auto 16px; background: var(--pine); color: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 26px; }
.compte h2 { font-size: 24px; }
.compte > p { color: var(--muted); font-size: 14px; margin: 6px 0 20px; }
.compte .calc-field { text-align: left; }
.compte-note { font-size: 12px; color: var(--muted); margin-top: 14px; }
.compte-menu { margin-top: 22px; display: flex; flex-direction: column; gap: 10px; }
.compte-menu button { display: flex; align-items: center; justify-content: space-between; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 15px 16px; font-family: 'Instrument Sans', sans-serif; font-size: 15px; font-weight: 600; color: var(--ink); cursor: pointer; }
.compte-menu button b { font-family: 'Bricolage Grotesque', sans-serif; color: var(--accent); }
.compte-menu .deco { justify-content: center; color: #C1544E; border-color: #EAD4D2; }






:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce){ * { animation: none !important; transition: none !important; } }
`;

const fmt = (n) => n.toLocaleString("fr-FR").replace(/\u202f|,/g, " ") + " FCFA";

const GRADS = [
  "linear-gradient(135deg,#1f5b4f,#0f8b8d)",
  "linear-gradient(135deg,#c9873a,#8a4f1e)",
  "linear-gradient(135deg,#123b33,#2f7d5c)",
  "linear-gradient(135deg,#e0a94a,#c9873a)",
  "linear-gradient(135deg,#0f8b8d,#123b33)",
  "linear-gradient(135deg,#a45a2a,#c9873a)",
];

const LOGEMENTS = [
  { id: 1, nom: "Chambre Ouakam Vue Mer", quartier: "Ouakam", type: "Chambre", cap: 2, note: 4.92, avis: 128, prixNuit: 25000, prixJour: 15000, prixSoiree: 20000, video: true, feats: ["Vue mer", "Clim", "Salle de bain privée", "Wifi"] },
  { id: 2, nom: "Chambre Ouakam Cosy", quartier: "Ouakam", type: "Chambre", cap: 2, note: 4.81, avis: 73, prixNuit: 20000, prixJour: 12000, prixSoiree: 18000, feats: ["Clim", "Lit double", "Wifi", "TV"] },
  { id: 3, nom: "Chambre Mamelles Standing", quartier: "Mamelles", type: "Chambre", cap: 2, note: 4.95, avis: 154, prixNuit: 30000, prixJour: 18000, prixSoiree: 25000, video: true, feats: ["Clim", "Salle de bain privée", "Petit-déj", "Wifi fibre"] },
  { id: 4, nom: "Chambre Mamelles Confort", quartier: "Mamelles", type: "Chambre", cap: 2, note: 4.88, avis: 97, prixNuit: 22000, prixJour: 14000, prixSoiree: 18000, feats: ["Clim", "Lit double", "Eau chaude", "Wifi"] },
  { id: 5, nom: "Chambre Mermoz Éco", quartier: "Mermoz", type: "Chambre", cap: 1, note: 4.64, avis: 61, prixNuit: 15000, prixJour: 10000, prixSoiree: 12000, feats: ["Ventilateur", "Wifi", "Lit simple", "Gardien"] },
  { id: 6, nom: "Chambre Mermoz Calme", quartier: "Mermoz", type: "Chambre", cap: 2, note: 4.78, avis: 86, prixNuit: 18000, prixJour: 12000, prixSoiree: 15000, feats: ["Clim", "Lit double", "Wifi", "Parking"] },
];

const WA_NUMBER = "221767402096"; // numéro WhatsApp HKA (format wa.me : indicatif + numéro, sans +)
const PAY_NUMBER = "+221 77 398 48 79"; // numéro Wave / Orange Money HKA

const VILLES = ["Dakar"];
const FEATS_COMMUNS = ["Wifi", "Parking", "Toilette interne", "Eau chaude", "TV", "Réfrigérateur", "Petit-déj", "Cuisine", "Gardien", "Balcon"];
const QUARTIERS = ["Tous", ...Array.from(new Set(LOGEMENTS.map(l => l.quartier)))];

const LOGO = "data:image/png;base64,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";

function LazyImg({ src, alt = "", extra }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img src={src} alt={alt} loading="lazy" decoding="async" onLoad={() => setLoaded(true)}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: loaded ? 1 : 0, transition: "opacity .5s ease", ...(extra || {}) }} />
  );
}

function SkeletonGrid({ n = 6 }) {
  return (
    <div className="grid">
      {Array.from({ length: n }).map((_, k) => (
        <div className="card skel" key={k}>
          <div className="ph skel-box" />
          <div className="cbody">
            <div className="skel-line" style={{ width: "70%" }} />
            <div className="skel-line" style={{ width: "45%", marginTop: 8 }} />
            <div className="skel-line" style={{ width: "35%", height: 18, marginTop: 14 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Toggle({ mode, setMode }) {
  return (
    <div className="toggle" role="tablist" aria-label="Mode de réservation">
      <span className="thumb" style={{ left: 4, width: "calc(50% - 4px)", transform: mode === "passage" ? "translateX(100%)" : "translateX(0)" }} />
      <button role="tab" aria-selected={mode === "sejour"} className={mode === "sejour" ? "on" : ""} onClick={() => setMode("sejour")}>
        <span className="dot" /> Séjour
      </button>
      <button role="tab" aria-selected={mode === "passage"} className={mode === "passage" ? "on" : ""} onClick={() => setMode("passage")}>
        <span className="dot" /> Passage
      </button>
    </div>
  );
}

function SearchBar({ mode, slots, setSlots, voyageurs, setVoyageurs, arrivee, setArrivee, depart, setDepart, datePassage, setDatePassage, onSearch }) {
  const setVoy = (v) => setVoyageurs(Math.max(1, +v || 1));
  return (
    <div className="search">
      {mode === "sejour" ? (
        <>
          <div className="field"><label>Arrivée</label><input type="date" value={arrivee} onChange={e => setArrivee(e.target.value)} /></div>
          <div className="field"><label>Départ</label><input type="date" value={depart} onChange={e => setDepart(e.target.value)} /></div>
          <div className="field"><label>{mode === "sejour" ? "Voyageurs" : "Personnes"}</label><input type="number" min="1" value={voyageurs} onChange={e => setVoy(e.target.value)} /></div>
        </>
      ) : (
        <>
          <div className="field"><label>Date</label><input type="date" value={datePassage} onChange={e => setDatePassage(e.target.value)} /></div>
          <div className="field" style={{ flex: "2 1 200px" }}>
            <label>Créneau</label>
            <div className="slotset" style={{ marginTop: 2 }}>
              {[["jour", "Jour · 12h–20h"], ["soiree", "Nuit · 20h–12h"]].map(([k, l]) => (
                <button key={k} className={"chip" + (slots.includes(k) ? " sel" : "")}
                  onClick={() => setSlots(s => s.includes(k) ? s.filter(x => x !== k) : [...s, k])}>{l}</button>
              ))}
            </div>
          </div>
          <div className="field"><label>{mode === "sejour" ? "Voyageurs" : "Personnes"}</label><input type="number" min="1" value={voyageurs} onChange={e => setVoy(e.target.value)} /></div>
        </>
      )}
      <button className="searchbtn" onClick={onSearch}>Rechercher</button>
    </div>
  );
}

function Card({ l, i, mode, onOpen, fav, onFav, slots }) {
  return (
    <div className="card" onClick={() => onOpen(l)} tabIndex={0} role="button"
      onKeyDown={(e) => e.key === "Enter" && onOpen(l)}>
      <div className="ph" style={{ background: GRADS[i % GRADS.length] }}>
        {l.photos && l.photos[0] && <LazyImg src={l.photos[0]} />}
        <span className="badge">📍 {l.quartier}</span>
        {(l.video || l.videoUrl) && <span className="vidbadge"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>Vidéo</span>}
        <button className={"card-fav" + (fav ? " on" : "")} onClick={(e) => { e.stopPropagation(); onFav(l.id); }} aria-label="Favori">
          <svg viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 20 C12 20 3 14 3 8.5 C3 5.5 5.4 4 7.5 4 C9.3 4 11 5.2 12 6.8 C13 5.2 14.7 4 16.5 4 C18.6 4 21 5.5 21 8.5 C21 14 12 20 12 20 Z" /></svg>
        </button>
      </div>
      <div className="cbody">
        <div className="top">
          <div>
            <h3>{l.nom}</h3>
            <div className="q">{l.type} · {l.cap} pers.</div>
          </div>
          <div className="note">★ {l.note.toFixed(2)}</div>
        </div>
        <div className="price">
          {mode === "sejour"
            ? <><b>{fmt(l.prixNuit)}</b> <span className="u">/ nuit</span></>
            : (() => {
                const both = slots && slots.includes("jour") && slots.includes("soiree");
                const onlyNuit = slots && slots.includes("soiree") && !slots.includes("jour");
                const v = both ? l.prixJour + l.prixSoiree : onlyNuit ? l.prixSoiree : l.prixJour;
                const u = both ? "/ journée (jour + nuit)" : onlyNuit ? "/ créneau nuit" : "/ créneau jour";
                return <><b>{fmt(v)}</b> <span className="u">{u}</span></>;
              })()}
        </div>
      </div>
    </div>
  );
}

function AvisSection({ chambreId }) {
  const [list, setList] = useState([]);
  const [nom, setNom] = useState("");
  const [note, setNote] = useState(5);
  const [txt, setTxt] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { let a = true; fetchAvis(chambreId).then(rows => { if (a) setList(rows.filter(x => x.approuve)); }); return () => { a = false; }; }, [chambreId]);
  const moy = list.length ? (list.reduce((sm, x) => sm + x.note, 0) / list.length) : null;
  const submit = async () => {
    if (!txt.trim() || busy) return;
    setBusy(true);
    try { await createAvis({ chambreId, nom: nom.trim() || "Client", note, commentaire: txt.trim() }); setSent(true); } catch (e) {}
    setBusy(false);
  };
  return (
    <>
      <h3 className="d-h3">Avis clients{moy ? " · ★ " + moy.toFixed(1) + " (" + list.length + ")" : ""}</h3>
      {list.length === 0 && <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 4 }}>Pas encore d'avis — soyez le premier.</p>}
      {list.map(a => (
        <div className="avis-item" key={a.id}>
          <div className="avis-top"><b>{a.nom}</b><span className="avis-note">{"★".repeat(a.note)}<span style={{ opacity: .3 }}>{"★".repeat(5 - a.note)}</span></span></div>
          <p>{a.commentaire}</p>
          {a.date ? <span className="avis-date">{a.date}</span> : null}
        </div>
      ))}
      {sent ? (
        <p style={{ color: "var(--pine)", fontWeight: 600, fontSize: 14, marginTop: 12 }}>Merci ! Votre avis sera publié après validation.</p>
      ) : (
        <div className="avis-form">
          <input className="ainput" placeholder="Votre nom" value={nom} onChange={e => setNom(e.target.value)} />
          <div className="avis-stars">
            {[1, 2, 3, 4, 5].map(n => <button type="button" key={n} className={"avis-star" + (n <= note ? " on" : "")} onClick={() => setNote(n)} aria-label={n + " étoiles"}>★</button>)}
          </div>
          <textarea className="ainput" rows={2} style={{ resize: "vertical", fontFamily: "inherit" }} placeholder="Votre commentaire..." value={txt} onChange={e => setTxt(e.target.value)} />
          <button className="abtn small" onClick={submit} disabled={busy || !txt.trim()}>{busy ? "Envoi…" : "Laisser un avis"}</button>
        </div>
      )}
    </>
  );
}

function BookingSheet({ l, i, mode, onClose, onReserve, fav, onFav, initNuits, initSlots, arrivee, datePassage }) {
  const [nuits, setNuits] = useState(initNuits || 3);
  const [slots, setSlots] = useState(initSlots && initSlots.length ? initSlots : ["jour"]);
  const [avecClim, setAvecClim] = useState(false);
  const photoList = (l.photos && l.photos.length) ? l.photos.map(u => ({ type: "photo", url: u })) : [0, 1, 2].map(p => ({ type: "photo", p }));
  const hasVideo = !!(l.videoUrl || l.video);
  const medias = (hasVideo ? [{ type: "video", url: l.videoUrl || null }] : []).concat(photoList);
  const posterUrl = (l.photos && l.photos[0]) || null;
  const [mi, setMi] = useState(0);
  const [playing, setPlaying] = useState(false);
  const touchX = React.useRef(null);
  const go = (dir) => { setPlaying(false); setMi(m => (m + dir + medias.length) % medias.length); };
  const [occ, setOcc] = useState([]);
  useEffect(() => {
    let alive = true;
    fetchOccupations(l.id).then(rows => { if (alive) setOcc(rows); });
    return () => { alive = false; };
  }, [l.id]);
  const addDays = (dstr, kk) => { const p = dstr.split("-").map(Number); const dt = new Date(p[0], p[1] - 1, p[2] + kk); return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0"); };
  const frd = (dstr) => { if (!dstr) return ""; const p = dstr.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }); };
  const blocked = useMemo(() => {
    const set = new Set(occ.map(o => o.date + "_" + o.creneau));
    const out = [];
    if (mode === "sejour" && arrivee) {
      for (let x = 0; x < nuits; x++) { const day = addDays(arrivee, x); if (set.has(day + "_jour") || set.has(day + "_nuit")) out.push(frd(day)); }
    } else if (mode !== "sejour" && datePassage) {
      for (const sk of slots) { const cr = sk === "soiree" ? "nuit" : "jour"; if (set.has(datePassage + "_" + cr)) out.push(frd(datePassage) + " · " + (cr === "nuit" ? "Nuit" : "Jour")); }
    }
    return out;
  }, [occ, mode, arrivee, nuits, slots, datePassage]);
  const unavailable = blocked.length > 0;
  const cur = medias[mi] || { type: "photo" };
  const curBg = GRADS[(i + mi) % GRADS.length];

  const calc = useMemo(() => {
    let base = 0, detail = "";
    const units = mode === "sejour" ? nuits : slots.length;
    if (mode === "sejour") {
      base = l.prixNuit * nuits;
      detail = `${fmt(l.prixNuit)} × ${nuits} nuit${nuits > 1 ? "s" : ""}`;
    } else {
      base = slots.reduce((s, k) => s + (k === "jour" ? l.prixJour : l.prixSoiree), 0);
      detail = slots.map(k => k === "jour" ? "Jour (12h–20h)" : "Nuit (20h–12h)").join(" + ") || "—";
    }
    const climSupp = (l.clim === "option" && avecClim) ? (l.supplementClim || 0) * units : 0;
    return { base, detail, climSupp, total: base + climSupp };
  }, [mode, nuits, slots, l, avecClim]);

  const resume = (mode === "sejour"
    ? `${nuits} nuit${nuits > 1 ? "s" : ""}`
    : (slots.map(k => k === "jour" ? "Jour" : "Nuit").join(" + ") || "—"))
    + (l.clim === "option" && avecClim ? " · avec climatisation" : "");

  return (
    <div className="detail">
      <div className="detail-inner">
        <div className="detail-photo">
          <div className="media-view" style={{ background: curBg }}
            onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => { if (touchX.current == null) return; const dx = e.changedTouches[0].clientX - touchX.current; if (medias.length > 1 && Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); touchX.current = null; }}>
            {cur.type === "photo" && cur.url && <LazyImg src={cur.url} />}
            {cur.type === "video" && cur.url && (
              <video src={cur.url} poster={posterUrl || undefined} controls playsInline preload="metadata" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: "#000" }} />
            )}
            {cur.type === "video" && cur.url && <span className="media-tag"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>Vidéo</span>}
          </div>
          <button className="d-round d-back" onClick={onClose} aria-label="Retour">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5 L8 12 L15 19" /></svg>
          </button>
          <button className={"d-round d-fav" + (fav ? " on" : "")} onClick={() => onFav(l.id)} aria-label="Favori">
            <svg viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 20 C12 20 3 14 3 8.5 C3 5.5 5.4 4 7.5 4 C9.3 4 11 5.2 12 6.8 C13 5.2 14.7 4 16.5 4 C18.6 4 21 5.5 21 8.5 C21 14 12 20 12 20 Z" /></svg>
          </button>
          <button className="d-round d-share" aria-label="Partager cette chambre" onClick={() => {
            const url = window.location.origin + window.location.pathname + "?chambre=" + l.id;
            const prix = mode === "sejour" ? (l.prixNuit ? fmt(l.prixNuit) + " / nuit" : "") : (l.prixJour ? fmt(l.prixJour) + " / créneau" : "");
            const texte = "🏠 " + l.nom + " — " + l.quartier + (prix ? "\n" + prix : "") + "\n👉 " + url;
            if (navigator.share) { navigator.share({ title: l.nom, text: texte, url }).catch(() => {}); }
            else { try { window.open("https://wa.me/?text=" + encodeURIComponent(texte), "_blank"); } catch (e) {} }
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5 L15.4 17.5 M15.4 6.5 L8.6 10.5"/></svg>
          </button>
          {medias.length > 1 && (
            <>
              <button className="media-nav prev" onClick={() => go(-1)} aria-label="Photo précédente">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5 L8 12 L15 19"/></svg>
              </button>
              <button className="media-nav next" onClick={() => go(1)} aria-label="Photo suivante">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5 L16 12 L9 19"/></svg>
              </button>
            </>
          )}
          <div className="media-dots">
            {medias.map((m, idx) => (
              <button key={idx} className={"dot" + (idx === mi ? " on" : "")} onClick={() => { setMi(idx); setPlaying(false); }} aria-label={"Média " + (idx + 1)} />
            ))}
          </div>
        </div>

        <div className="detail-body">
          <div className="d-head">
            <div>
              <h2 className="disp">{l.nom}</h2>
              <div className="d-sub">{l.type} · {l.cap} personne{l.cap > 1 ? "s" : ""} · {l.quartier}</div>
            </div>
            <div className="d-note">★ {l.note.toFixed(2)}<span>{l.avis} avis</span></div>
          </div>

          <p className="d-desc" style={{ whiteSpace: "pre-line" }}>
            {l.description
              ? l.description
              : mode === "sejour"
              ? `Chambre meublée à ${l.quartier}, disponible à la nuitée pour ${l.cap} personne${l.cap > 1 ? "s" : ""}. Réservation directe, confirmation par WhatsApp.`
              : `Chambre meublée à ${l.quartier}, disponible au créneau (Jour 12h–20h ou Nuit 20h–12h). Idéale pour une escale ou un repos express.`}
          </p>

          <h3 className="d-h3">Équipements</h3>
          <div className="d-feats">
            {l.clim === "incluse" && <div className="d-feat"><span className="d-dot" />Climatisation incluse</div>}
            {l.clim === "option" && <div className="d-feat"><span className="d-dot" />Ventilée · climatisation en option</div>}
            {l.clim === "non" && <div className="d-feat"><span className="d-dot" />Ventilée</div>}
            {l.feats.map(f => <div className="d-feat" key={f}><span className="d-dot" />{f}</div>)}
          </div>

          <AvisSection chambreId={l.id} />

          <h3 className="d-h3">{mode === "sejour" ? "Votre séjour" : "Votre passage"}</h3>
          <div className="calc">
            {mode === "sejour" ? (
              <div className="calc-field">
                <label>Nombre de nuits</label>
                <input type="number" min="1" value={nuits} onChange={(e) => setNuits(Math.max(1, +e.target.value || 1))} />
              </div>
            ) : (
              <div className="calc-field">
                <label>Créneaux</label>
                <div className="slotset">
                  {[["jour", `Jour · 12h–20h · ${fmt(l.prixJour)}`], ["soiree", `Nuit · 20h–12h · ${fmt(l.prixSoiree)}`]].map(([k, lb]) => (
                    <button key={k} className={"chip" + (slots.includes(k) ? " sel" : "")}
                      onClick={() => setSlots(s => s.includes(k) ? s.filter(x => x !== k) : [...s, k])}>{lb}</button>
                  ))}
                </div>
              </div>
            )}
            {l.clim === "option" && (
              <label className="clim-opt">
                <input type="checkbox" checked={avecClim} onChange={e => setAvecClim(e.target.checked)} />
                <span>Ajouter la climatisation <b>+{fmt(l.supplementClim || 0)}</b> {mode === "sejour" ? "/ nuit" : "/ créneau"}</span>
              </label>
            )}
            <div className="line"><span>{calc.detail}</span><span>{fmt(calc.base)}</span></div>
            {calc.climSupp > 0 && <div className="line"><span>Climatisation</span><span>+{fmt(calc.climSupp)}</span></div>}
            <div className="line tot"><span>Total</span><span>{fmt(calc.total)}</span></div>
          </div>
          {supabaseReady && (unavailable
            ? <div className="avail no">Indisponible : {blocked.join(", ")}. Choisissez d'autres dates ou un autre créneau.</div>
            : <div className="avail ok">Disponible à ces dates ✓</div>)}
        </div>

        <div className="d-bar">
          <div className="d-bar-price">
            <b>{fmt(calc.total)}</b>
            <span>{resume}</span>
          </div>
          <div className="d-bar-actions">
            <button className="cta" onClick={() => onReserve({ l, mode, nuits, slots: [...slots], calc, resume, arrivee, datePassage })} disabled={supabaseReady && unavailable}>Réserver</button>
            <button className="wa" onClick={() => onReserve({ l, mode, nuits, slots: [...slots], calc, resume, arrivee, datePassage })} disabled={supabaseReady && unavailable}>WhatsApp</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminGate({ onOk, onExit }) {
  const [email, setEmail] = useState(import.meta.env.VITE_ADMIN_EMAIL || "");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setErr(""); setBusy(true);
    if (!supabaseReady) {
      if (pwd.trim().toLowerCase() === "hka2026") onOk(); else setErr("Code incorrect.");
      setBusy(false); return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pwd });
    setBusy(false);
    if (error) { setErr("Connexion refusée : " + error.message); return; }
    onOk();
  };
  return (
    <div className="admin">
      <div className="gate">
        <img className="g-logo" src={LOGO} alt="" />
        <h2 className="disp">Accès administrateur</h2>
        <p>Réservé au gestionnaire HKA Logement.</p>
        <input className="ainput" type="email" placeholder="Email admin" value={email} autoComplete="username"
          onChange={e => { setEmail(e.target.value); setErr(""); }} style={{ marginBottom: 10 }} />
        <input className="ainput" type="password" placeholder="Mot de passe" value={pwd} autoComplete="current-password"
          onChange={e => { setPwd(e.target.value); setErr(""); }}
          onKeyDown={e => e.key === "Enter" && submit()} />
        {err && <p style={{ color: "#C1544E", fontSize: 13, marginTop: 8, fontWeight: 600 }}>{err}</p>}
        <div className="abtns" style={{ marginTop: 16, justifyContent: "center" }}>
          <button className="abtn" onClick={submit} disabled={busy}>{busy ? "Connexion…" : "Entrer"}</button>
          <button className="abtn ghost" onClick={onExit}>Retour</button>
        </div>
        <p className="hint">Accès sécurisé — compte administrateur HKA</p>
      </div>
    </div>
  );
}

function AdminPanel({ chambres, setChambres, quartiers, reservations, setReservations, params, setParams, onExit }) {
  const [section, setSection] = useState("dash");
  return (
    <div className="admin">
      <div className="admin-top">
        <img className="brand-logo" src={LOGO} alt="" />
        <h1 className="disp">Espace administrateur</h1>
        <button className="adminbtn" style={{ marginLeft: "auto" }} onClick={onExit}>← Retour au site</button>
      </div>
      <div className="admin-tabs">
        {[["dash", "Tableau de bord"], ["chambres", "Chambres"], ["resas", "Réservations"], ["dispos", "Disponibilités"], ["avis", "Avis"], ["params", "Paramètres"]].map(([k, l]) => {
          const nb = k === "resas" ? reservations.filter(r => r.statut === "À confirmer").length : 0;
          return (
            <button key={k} className={"admin-tab" + (section === k ? " on" : "")} onClick={() => setSection(k)}>{l}{nb > 0 ? <span className="tab-badge">{nb}</span> : null}</button>
          );
        })}
      </div>
      {section === "dash" && <AdminDash chambres={chambres} reservations={reservations} quartiers={quartiers} />}
      {section === "chambres" && <AdminChambres chambres={chambres} setChambres={setChambres} quartiers={quartiers} />}
      {section === "resas" && <AdminResas reservations={reservations} setReservations={setReservations} />}
      {section === "dispos" && <AdminDispos chambres={chambres} />}
      {section === "avis" && <AdminAvis chambres={chambres} />}
      {section === "params" && <AdminParams params={params} setParams={setParams} />}
    </div>
  );
}

function AdminDash({ chambres, reservations, quartiers }) {
  const [stats, setStats] = useState(null);
  useEffect(() => { fetchStats().then(setStats); }, []);
  const actives = chambres.filter(c => c.actif !== false).length;
  const inactives = chambres.length - actives;
  const aConf = reservations.filter(r => r.statut === "À confirmer").length;
  const conf = reservations.filter(r => r.statut === "Confirmée").length;
  const sansVid = chambres.filter(c => !c.video).length;
  const cards = [
    ["Chambres", chambres.length, actives + " active" + (actives > 1 ? "s" : "") + " · " + inactives + " inactive" + (inactives > 1 ? "s" : "")],
    ["Réservations", reservations.length, aConf + " à confirmer · " + conf + " confirmée" + (conf > 1 ? "s" : "")],
    ["Visites", stats ? stats.visites : "—", stats ? stats.visitesJour + " aujourd'hui" : "chargement…"],
    ["Clics WhatsApp", stats ? stats.whatsapp : "—", "demandes lancées"],
    ["Quartiers", quartiers.length - 1, "à Dakar"],
    ["Sans vidéo", sansVid, "chambre" + (sansVid > 1 ? "s" : "") + " sans clip"],
  ];
  return (
    <div className="dash-cards">
      {cards.map(([t, n, sub]) => (
        <div className="dash-card" key={t}>
          <span className="dc-num">{n}</span>
          <span className="dc-t">{t}</span>
          <span className="dc-s">{sub}</span>
        </div>
      ))}
    </div>
  );
}

function AdminChambres({ chambres, setChambres, quartiers }) {
  const empty = { nom: "", quartier: "", type: "Chambre", cap: 2, prixNuit: "", prixJour: "", prixSoiree: "", feats: "", featsCommuns: [], note: 4.8, actif: true, video: false, photos: [], videoUrl: "", clim: "non", supplementClim: "", description: "" };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [delId, setDelId] = useState(null);
  const [msg, setMsg] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [uploading, setUploading] = useState(false);
  const onPhotos = async (files) => {
    if (!files || !files.length) return;
    setUploading(true); setMsg("");
    try {
      const urls = [];
      for (const f of Array.from(files)) urls.push(await uploadMedia(f, "photos"));
      setForm(fm => ({ ...fm, photos: [...(fm.photos || []), ...urls] }));
    } catch (e) { setMsg("err:Upload photo échoué — " + (e.message || "")); }
    setUploading(false);
  };
  const onVideo = async (file) => {
    if (!file) return;
    setUploading(true); setMsg("");
    try { const url = await uploadMedia(file, "videos"); setForm(fm => ({ ...fm, videoUrl: url, video: true })); }
    catch (e) { setMsg("err:Upload vidéo échoué — " + (e.message || "")); }
    setUploading(false);
  };
  const removePhoto = (u) => setForm(fm => ({ ...fm, photos: (fm.photos || []).filter(x => x !== u) }));
  const actives = chambres.filter(c => c.actif !== false).length;

  const submit = async () => {
    if (!form.nom.trim() || !form.quartier.trim() || !String(form.prixNuit).trim()) { setMsg("err:Nom, quartier et prix/nuit sont obligatoires."); return; }
    const rec = {
      nom: form.nom.trim(), quartier: form.quartier.trim(), type: (form.type || "Chambre").trim(),
      cap: +form.cap || 1, note: +form.note || 4.8,
      avis: editId != null ? (chambres.find(c => c.id === editId) || {}).avis || 0 : 0,
      prixNuit: +form.prixNuit || 0, prixJour: +form.prixJour || 0, prixSoiree: +form.prixSoiree || 0,
      feats: [...(form.featsCommuns || []), ...String(form.feats).split(",").map(x => x.trim()).filter(Boolean)],
      actif: !!form.actif, video: !!form.videoUrl,
      photos: form.photos || [], videoUrl: form.videoUrl || "",
      clim: form.clim || "non", supplementClim: +form.supplementClim || 0,
      description: (form.description || "").trim(),
    };
    try {
      if (editId != null) {
        const saved = supabaseReady ? await updateChambre(editId, rec) : { ...rec, id: editId };
        setChambres(prev => prev.map(c => c.id === editId ? saved : c));
        setMsg("ok:Chambre modifiée.");
      } else {
        const saved = supabaseReady ? await createChambre(rec) : { ...rec, id: (chambres.reduce((m, c) => Math.max(m, typeof c.id === "number" ? c.id : 0), 0) + 1) };
        setChambres(prev => [...prev, saved]);
        setMsg("ok:Chambre ajoutée.");
      }
      setForm(empty); setEditId(null);
    } catch (e) {
      setMsg("err:Enregistrement refusé — " + (e.message || "connecte-toi en admin."));
    }
  };
  const edit = (c) => {
    setEditId(c.id);
    setForm({ nom: c.nom, quartier: c.quartier, type: c.type, cap: c.cap, prixNuit: c.prixNuit, prixJour: c.prixJour, prixSoiree: c.prixSoiree, feats: (c.feats || []).filter(f => !FEATS_COMMUNS.includes(f)).join(", "), featsCommuns: (c.feats || []).filter(f => FEATS_COMMUNS.includes(f)), note: c.note, actif: c.actif !== false, video: !!c.video, photos: c.photos || [], videoUrl: c.videoUrl || "", clim: c.clim || "non", supplementClim: c.supplementClim || "", description: c.description || "" });
    setMsg(""); setDelId(null);
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) {}
  };
  const cancel = () => { setForm(empty); setEditId(null); setMsg(""); };
  const remove = async (id) => { try { if (supabaseReady) await removeChambre(id); setChambres(prev => prev.filter(x => x.id !== id)); setDelId(null); if (editId === id) cancel(); } catch (e) { setMsg("err:Suppression refusée — " + (e.message || "")); } };
  const toggleActif = async (c) => { const next = !(c.actif !== false); try { const saved = supabaseReady ? await updateChambre(c.id, { ...c, actif: next }) : { ...c, actif: next }; setChambres(prev => prev.map(x => x.id === c.id ? saved : x)); } catch (e) { setMsg("err:Changement de statut refusé — " + (e.message || "")); } };

  return (
    <>
      <p className="admin-sub">{chambres.length} chambre{chambres.length > 1 ? "s" : ""} · {actives} active{actives > 1 ? "s" : ""}</p>
      <div className="acols">
        <div className="acard">
          <h3>{editId != null ? "Modifier la chambre" : "Ajouter une chambre"}</h3>
          <div className="afield"><label>Nom</label>
            <input className="ainput" value={form.nom} onChange={e => set("nom", e.target.value)} placeholder="Chambre Ouakam Vue Mer" /></div>
          <div className="afield"><label>Description (laisser vide = texte automatique)</label>
            <textarea className="ainput" rows={3} style={{ resize: "vertical", fontFamily: "inherit" }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Décrivez la chambre : ambiance, atouts, quartier, règles..." /></div>
          <div className="arow">
            <div className="afield"><label>Quartier</label>
              <input className="ainput" list="qlist" value={form.quartier} onChange={e => set("quartier", e.target.value)} placeholder="Ouakam" />
              <datalist id="qlist">{quartiers.filter(q => q !== "Tous").map(q => <option key={q} value={q} />)}</datalist>
            </div>
            <div className="afield" style={{ maxWidth: 120 }}><label>Capacité</label>
              <input className="ainput" type="number" min="1" value={form.cap} onChange={e => set("cap", e.target.value)} /></div>
          </div>
          <div className="afield"><label>Prix / nuit — séjour (FCFA)</label>
            <input className="ainput" type="number" value={form.prixNuit} onChange={e => set("prixNuit", e.target.value)} placeholder="20000" /></div>
          <div className="arow">
            <div className="afield"><label>Passage Jour · 12h–20h</label>
              <input className="ainput" type="number" value={form.prixJour} onChange={e => set("prixJour", e.target.value)} placeholder="12000" /></div>
            <div className="afield"><label>Passage Nuit · 20h–12h</label>
              <input className="ainput" type="number" value={form.prixSoiree} onChange={e => set("prixSoiree", e.target.value)} placeholder="18000" /></div>
          </div>
          <div className="afield"><label>Équipements</label>
            <div className="feat-grid">
              {FEATS_COMMUNS.map(f => (
                <label className="achk" key={f}>
                  <input type="checkbox" checked={(form.featsCommuns || []).includes(f)}
                    onChange={e => setForm(fm => ({ ...fm, featsCommuns: e.target.checked ? [...(fm.featsCommuns || []), f] : (fm.featsCommuns || []).filter(x => x !== f) }))} /> {f}
                </label>
              ))}
            </div>
          </div>
          <div className="afield"><label>Autres équipements (séparés par des virgules)</label>
            <input className="ainput" value={form.feats} onChange={e => set("feats", e.target.value)} placeholder="Lit double, Vue mer..." /></div>
          <div className="afield"><label>Climatisation</label>
            <select className="ainput" value={form.clim} onChange={e => set("clim", e.target.value)}>
              <option value="incluse">Climatisée (incluse)</option>
              <option value="option">Ventilée + option clim (payante)</option>
              <option value="non">Ventilée seule</option>
            </select></div>
          {form.clim === "option" && (
            <div className="afield"><label>Supplément clim — par nuit / par créneau (FCFA)</label>
              <input className="ainput" type="number" value={form.supplementClim} onChange={e => set("supplementClim", e.target.value)} placeholder="5000" /></div>
          )}
          <label className="achk"><input type="checkbox" checked={form.actif} onChange={e => set("actif", e.target.checked)} /> Chambre active (visible sur le site)</label>
          <div className="afield" style={{ marginTop: 12 }}>
            <label>Photos {uploading ? "· envoi en cours…" : ""}</label>
            <input className="ainput" type="file" accept="image/*" multiple onChange={e => onPhotos(e.target.files)} />
            {form.photos && form.photos.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {form.photos.map(u => (
                  <div key={u} style={{ position: "relative" }}>
                    <img src={u} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }} />
                    <button type="button" onClick={() => removePhoto(u)} aria-label="Retirer" style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 999, border: 0, background: "#C1544E", color: "#fff", cursor: "pointer", lineHeight: 1, fontSize: 12 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="afield">
            <label>Vidéo (optionnelle · 1 clip)</label>
            <input className="ainput" type="file" accept="video/*" onChange={e => onVideo(e.target.files && e.target.files[0])} />
            {form.videoUrl ? <p style={{ fontSize: 12, color: "var(--pine)", marginTop: 6 }}>Vidéo chargée ✓ <button type="button" onClick={() => set("videoUrl", "")} style={{ border: 0, background: "none", color: "#C1544E", cursor: "pointer", textDecoration: "underline" }}>retirer</button></p> : null}
          </div>
          <div className="abtns" style={{ marginTop: 14 }}>
            <button className="abtn" onClick={submit} disabled={uploading}>{uploading ? "Envoi du média…" : (editId != null ? "Enregistrer" : "Ajouter la chambre")}</button>
            {editId != null && <button className="abtn ghost" onClick={cancel}>Annuler</button>}
          </div>
          {msg && <p style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: msg.startsWith("err") ? "#C1544E" : "var(--pine)" }}>{msg.slice(msg.indexOf(":") + 1)}</p>}
        </div>

        <div className="acard">
          <h3>Chambres</h3>
          <div className="alist">
            {chambres.map((c, i) => (
              <div className="aitem" key={c.id}>
                <div className="sw" style={{ background: GRADS[i % GRADS.length], opacity: c.actif !== false ? 1 : 0.4, overflow: "hidden", position: "relative" }}>
                  {c.photos && c.photos[0]
                    ? <img src={c.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : (c.videoUrl ? <video src={c.videoUrl} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null)}
                </div>
                <div className="info">
                  <b>{c.nom}</b>
                  <span><span className="pill">{c.quartier}</span>{fmt(c.prixNuit)} / nuit · {c.cap} pers.</span>
                  <span style={{ display: "block", marginTop: 5 }}>
                    <span className={"stbadge " + (c.actif !== false ? "on" : "off")}>{c.actif !== false ? "Active" : "Inactive"}</span>
                    {(c.video || c.videoUrl) && <span className="stbadge on" style={{ marginLeft: 6 }}>Vidéo</span>}
                  </span>
                </div>
                <div className="acts">
                  {delId === c.id ? (
                    <>
                      <button className="abtn danger" onClick={() => remove(c.id)}>Confirmer</button>
                      <button className="abtn ghost small" onClick={() => setDelId(null)}>Annuler</button>
                    </>
                  ) : (
                    <>
                      <button className="abtn ghost small" onClick={() => toggleActif(c)}>{c.actif !== false ? "Masquer" : "Activer"}</button>
                      <button className="abtn ghost small" onClick={() => edit(c)}>Modifier</button>
                      <button className="abtn danger" onClick={() => setDelId(c.id)}>Suppr.</button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {chambres.length === 0 && <p style={{ color: "var(--muted)" }}>Aucune chambre. Ajoutez-en une avec le formulaire.</p>}
          </div>
        </div>
      </div>
    </>
  );
}

function AdminResas({ reservations, setReservations }) {
  const setStatut = async (id, statut, garanti) => {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, statut, garanti } : r));
    try { await updateReservationStatut(id, statut, garanti); } catch (e) {}
  };
  const buildOcc = (r) => {
    const rows = [];
    if (!r.chambreId || !r.dateDebut) return rows;
    const addD = (dstr, k) => { const p = (dstr || "").split("-").map(Number); if (!p[0]) return dstr; const d = new Date(p[0], p[1] - 1, p[2] + k); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
    if (r.mode === "sejour") {
      let d = r.dateDebut, guard = 0; const end = r.dateFin || addD(r.dateDebut, 1);
      while (d < end && guard < 366) { rows.push({ chambre_id: r.chambreId, date: d, creneau: "jour" }); rows.push({ chambre_id: r.chambreId, date: d, creneau: "nuit" }); d = addD(d, 1); guard++; }
      if (!rows.length) { rows.push({ chambre_id: r.chambreId, date: r.dateDebut, creneau: "jour" }); rows.push({ chambre_id: r.chambreId, date: r.dateDebut, creneau: "nuit" }); }
    } else {
      (r.creneaux && r.creneaux.length ? r.creneaux : ["jour"]).forEach(cr => rows.push({ chambre_id: r.chambreId, date: r.dateDebut, creneau: cr }));
    }
    return rows;
  };
  const confirmer = async (r) => {
    setStatut(r.id, "Confirmée", true);
    try { await blockOccupations(buildOcc(r)); } catch (e) {}
  };
  if (reservations.length === 0) return <p className="admin-sub">Aucune réservation pour l'instant. Les demandes des clients apparaîtront ici.</p>;
  return (
    <div className="acard">
      <h3>Demandes de réservation ({reservations.length})</h3>
      <div className="alist">
        {reservations.map(r => (
          <div className="aitem" key={r.id}>
            <div className="info">
              <b>{r.chambre}</b>
              <span>{r.quartier} · {r.mode === "sejour" ? "Séjour" : "Passage"} · {r.resume} · {fmt(r.total)}{r.date ? " · " + r.date : ""}</span>
              <span style={{ display: "block", marginTop: 5 }}>
                {(r.nom || "Client")}{r.tel ? " · " + r.tel : ""} · {r.pay || "—"}{"  "}
                <span className={"stbadge " + (r.statut === "Confirmée" ? "on" : r.statut === "Annulée" ? "off" : "warn")}>{r.statut}</span>
              </span>
            </div>
            <div className="acts">
              {r.statut !== "Confirmée" && <button className="abtn small" onClick={() => confirmer(r)}>Confirmer</button>}
              {r.statut !== "Annulée" && <button className="abtn ghost small" onClick={() => setStatut(r.id, "Annulée", false)}>Annuler</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminDispos({ chambres }) {
  const [cid, setCid] = useState(chambres[0] ? chambres[0].id : "");
  const [ref, setRef] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [occ, setOcc] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { if (!cid && chambres[0]) setCid(chambres[0].id); }, [chambres]);
  useEffect(() => {
    if (!cid) { setOcc([]); return; }
    let alive = true;
    fetchOccupations(cid).then(rows => { if (alive) setOcc(rows); });
    return () => { alive = false; };
  }, [cid]);

  const k = (date, cr) => date + "_" + cr;
  const map = {};
  occ.forEach(o => { map[k(o.date, o.creneau)] = o; });
  const iso = (y, m, d) => y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  const now = new Date();
  const todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate());

  const toggle = async (dateStr, cr) => {
    if (!cid || busy) return;
    setBusy(true); setMsg("");
    const ex = map[k(dateStr, cr)];
    try {
      if (ex) { await removeBlock(ex.id); setOcc(p => p.filter(o => o.id !== ex.id)); }
      else { const row = await addBlock(cid, dateStr, cr); setOcc(p => [...p, row]); }
    } catch (e) { setMsg("Action refusée — " + (e.message || "connecte-toi en admin.")); }
    setBusy(false);
  };

  const first = new Date(ref.y, ref.m, 1);
  const startDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(ref.y, ref.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const monthName = first.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const prevM = () => setRef(r => r.m === 0 ? { y: r.y - 1, m: 11 } : { y: r.y, m: r.m - 1 });
  const nextM = () => setRef(r => r.m === 11 ? { y: r.y + 1, m: 0 } : { y: r.y, m: r.m + 1 });

  return (
    <>
      <p className="admin-sub">Bloquez les créneaux indisponibles (entretien, location hors app, réservation déjà confirmée). Ces dates sont partagées avec tous les clients.</p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, maxWidth: 420 }}>
        {(() => {
          const sc = chambres.find(c => c.id === cid);
          return (
            <div style={{ width: 56, height: 56, borderRadius: 12, flex: "0 0 auto", overflow: "hidden", background: "#E9E2D4", marginBottom: 2 }}>
              {sc && sc.photos && sc.photos[0]
                ? <img src={sc.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : (sc && sc.videoUrl
                  ? <video src={sc.videoUrl} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : null)}
            </div>
          );
        })()}
        <div className="afield" style={{ flex: 1, margin: 0 }}>
          <label>Chambre</label>
          <select className="ainput" value={cid} onChange={e => setCid(e.target.value)}>
            {chambres.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
      </div>
      <div className="cal-legend">
        <span><i style={{ background: "#DCF3E9" }} />Libre — cliquez pour bloquer</span>
        <span><i style={{ background: "#F6D9D6" }} />Bloqué — cliquez pour libérer</span>
      </div>
      <div className="cal-head">
        <button className="abtn ghost small" onClick={prevM} aria-label="Mois précédent">‹</button>
        <b className="disp" style={{ textTransform: "capitalize" }}>{monthName}</b>
        <button className="abtn ghost small" onClick={nextM} aria-label="Mois suivant">›</button>
      </div>
      <div className="cal-grid">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((d, idx) => {
          if (!d) return <div key={"e" + idx} className="cal-cell empty" />;
          const dateStr = iso(ref.y, ref.m, d);
          const jour = !!map[k(dateStr, "jour")];
          const nuit = !!map[k(dateStr, "nuit")];
          const past = dateStr < todayIso;
          return (
            <div key={dateStr} className={"cal-cell" + (past ? " past" : "")}>
              <span className="cal-num">{d}</span>
              <div className="cal-slots">
                <button className={"cal-slot " + (jour ? "busy" : "free")} disabled={past || busy} onClick={() => toggle(dateStr, "jour")} title="Jour 12h-20h">J</button>
                <button className={"cal-slot " + (nuit ? "busy" : "free")} disabled={past || busy} onClick={() => toggle(dateStr, "nuit")} title="Nuit 20h-12h">N</button>
              </div>
            </div>
          );
        })}
      </div>
      {msg && <p style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: "#C1544E" }}>{msg}</p>}
      <p style={{ marginTop: 12, fontSize: 12.5, color: "var(--muted)" }}>Astuce : bloquez <b>J</b> et <b>N</b> le même jour pour rendre la chambre indisponible toute la journée (nuitée comprise).</p>
    </>
  );
}

function AdminAvis({ chambres }) {
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState("");
  useEffect(() => { fetchAllAvis().then(setList); }, []);
  const approve = async (id) => { try { await approveAvis(id); setList(prev => prev.map(a => a.id === id ? { ...a, approuve: true } : a)); } catch (e) { setMsg("Action refusée — connecte-toi en admin."); } };
  const del = async (id) => { try { await removeAvis(id); setList(prev => prev.filter(a => a.id !== id)); } catch (e) { setMsg("Suppression refusée."); } };
  const chNom = (id) => (chambres.find(c => c.id === id) || {}).nom || "—";
  return (
    <div className="acard">
      <h3>Avis clients ({list.length})</h3>
      {list.length === 0 && <p className="admin-sub">Aucun avis pour l'instant.</p>}
      <div className="alist">
        {list.map(a => (
          <div className="aitem" key={a.id}>
            <div className="info">
              <b>{a.nom} · {"★".repeat(a.note)}</b>
              <span>{a.commentaire}</span>
              <span style={{ display: "block", marginTop: 5 }}>
                <span className="pill">{chNom(a.chambreId)}</span>
                <span className={"stbadge " + (a.approuve ? "on" : "warn")}>{a.approuve ? "Publié" : "À valider"}</span> {a.date}
              </span>
            </div>
            <div className="acts">
              {!a.approuve && <button className="abtn small" onClick={() => approve(a.id)}>Publier</button>}
              <button className="abtn danger" onClick={() => del(a.id)}>Suppr.</button>
            </div>
          </div>
        ))}
      </div>
      {msg && <p style={{ color: "#C1544E", fontWeight: 600, marginTop: 10 }}>{msg}</p>}
    </div>
  );
}

function AdminParams({ params, setParams }) {
  const set = (k, v) => setParams(p => ({ ...p, [k]: v }));
  return (
    <div className="acols">
      <div className="acard">
        <h3>Informations affichées aux clients</h3>
        <div className="afield"><label>Nom de l'entreprise</label><input className="ainput" value={params.marque} onChange={e => set("marque", e.target.value)} /></div>
        <div className="arow">
          <div className="afield"><label>Téléphone / contact</label><input className="ainput" value={params.tel} onChange={e => set("tel", e.target.value)} placeholder="+221 ..." /></div>
          <div className="afield"><label>Email</label><input className="ainput" value={params.email} onChange={e => set("email", e.target.value)} placeholder="contact@..." /></div>
        </div>
        <div className="afield"><label>Adresse</label><input className="ainput" value={params.adresse} onChange={e => set("adresse", e.target.value)} placeholder="Quartier, Dakar" /></div>
        <div className="afield"><label>Ville</label><input className="ainput" value={params.ville} onChange={e => set("ville", e.target.value)} /></div>
        <div className="afield"><label>Présentation courte</label><input className="ainput" value={params.description} onChange={e => set("description", e.target.value)} placeholder="Chambres meublées à Dakar…" /></div>
        <p className="admin-sub" style={{ marginTop: 10 }}>Visible par les clients dans l'onglet Compte et en bas de l'accueil.</p>
      </div>
      <div className="acard">
        <h3>Paiement (numéros)</h3>
        <div className="afield"><label>Numéro WhatsApp HKA</label><input className="ainput" value={params.wa} onChange={e => set("wa", e.target.value)} /></div>
        <div className="afield"><label>Numéro Wave</label><input className="ainput" value={params.wave} onChange={e => set("wave", e.target.value)} /></div>
        <div className="afield"><label>Numéro Orange Money</label><input className="ainput" value={params.orange} onChange={e => set("orange", e.target.value)} placeholder="+221 ..." /></div>
        <p className="admin-sub" style={{ marginTop: 10 }}>Servent aux réservations et aux paiements au déploiement.</p>
      </div>
    </div>
  );
}

function NavIcon({ name }) {
  if (name === "home") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11 L12 3 L21 11" /><path d="M5 10 V20 H19 V10" /><path d="M10 20 V14 H14 V20" />
    </svg>
  );
  if (name === "search") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  );
  if (name === "ticket") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="15" rx="2.5" /><line x1="3" y1="9.5" x2="21" y2="9.5" /><line x1="7" y1="3" x2="7" y2="6" /><line x1="17" y1="3" x2="17" y2="6" />
    </svg>
  );
  if (name === "heart") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 20 C12 20 3 14 3 8.5 C3 5.5 5.4 4 7.5 4 C9.3 4 11 5.2 12 6.8 C13 5.2 14.7 4 16.5 4 C18.6 4 21 5.5 21 8.5 C21 14 12 20 12 20 Z" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="8" r="4" /><path d="M5 20 a7 7 0 0 1 14 0" />
    </svg>
  );
}

function Placeholder({ icon, titre, texte }) {
  return (
    <div className="placeholder">
      <div className="ph-ic"><NavIcon name={icon} /></div>
      <h2 className="disp">{titre}</h2>
      <p>{texte}</p>
    </div>
  );
}

function BottomNav({ tab, setTab }) {
  const items = [
    ["accueil", "home", "Accueil"],
    ["reservations", "ticket", "Réservations"],
    ["favoris", "heart", "Favoris"],
    ["compte", "user", "Compte"],
  ];
  return (
    <nav className="nav">
      <div className="nav-in">
        {items.map(([id, ic, label]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
            <NavIcon name={ic} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function RecapResa({ resa, onClose, onConfirm, onDone, client, params = {} }) {
  const { l, mode, calc, resume } = resa;
  const addD = (dstr, k) => { const p = (dstr || "").split("-").map(Number); if (!p[0]) return dstr || null; const d = new Date(p[0], p[1] - 1, p[2] + k); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const dateDebut = mode === "sejour" ? (resa.arrivee || null) : (resa.datePassage || null);
  const dateFin = mode === "sejour" ? (resa.arrivee ? addD(resa.arrivee, resa.nuits || 1) : null) : (resa.datePassage || null);
  const creneaux = mode === "sejour" ? [] : (resa.slots || []).map(x => x === "soiree" ? "nuit" : "jour");
  const [nom, setNom] = useState(client ? client.nom : "");
  const [tel, setTel] = useState(client ? client.tel : "");
  const [pay, setPay] = useState(null);
  const [step, setStep] = useState("form");
  const [garanti, setGaranti] = useState(false);

  const payLabel = { wave: "Wave", orange: "Orange Money", especes: "Espèces à l'arrivée" };

  const openWA = (texte) => {
    logEvent("whatsapp", "reservation");
    try { window.open("https://wa.me/" + (params.wa || WA_NUMBER) + "?text=" + encodeURIComponent(texte), "_blank"); } catch (e) {}
  };

  const messageResa = (g) =>
    "Bonjour " + (params.marque || "HKA Logement") + ", je souhaite réserver :\n" +
    "• " + l.nom + " (" + l.quartier + ")\n" +
    "• " + (mode === "sejour" ? "Séjour" : "Passage") + " — " + resume + "\n" +
    "• Total : " + fmt(calc.total) + "\n" +
    "• Paiement : " + payLabel[pay] + (g ? " (payé) — réservation garantie." : " — réservation à confirmer, je préviens avant de venir.") +
    (nom ? "\n• Nom : " + nom : "") +
    (tel ? "\n• Tél : " + tel : "");

  const finalize = async (g) => {
    const base = {
      id: Date.now(), nom, tel, chambre: l.nom, quartier: l.quartier, mode, resume,
      total: calc.total, pay: payLabel[pay], garanti: g,
      statut: g ? "Confirmée" : "À confirmer",
      date: new Date().toLocaleDateString("fr-FR"),
      chambreId: l.id, dateDebut, dateFin, creneaux,
    };
    const saved = await createReservation(base);
    onConfirm(saved);
    openWA(messageResa(g));
    setGaranti(g);
    setStep("done");
  };

  const cta = () => {
    if (!pay) return;
    if (pay === "especes") finalize(false);
    else setStep("paiement");
  };

  return (
    <div className="detail">
      <div className="detail-inner">
        <div className="recap-head">
          <button className="d-round d-back" style={{ position: "static" }} onClick={step === "paiement" ? () => setStep("form") : onClose} aria-label="Retour">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5 L8 12 L15 19" /></svg>
          </button>
          <h2 className="disp">{step === "paiement" ? "Paiement" : step === "done" ? "Réservation" : "Récapitulatif"}</h2>
        </div>

        <div className="detail-body">
          {step === "form" && (
            <>
              <div className="calc">
                <h4>Votre demande</h4>
                <div className="line"><span>Chambre</span><span>{l.nom}</span></div>
                <div className="line"><span>Quartier</span><span>{l.quartier}</span></div>
                <div className="line"><span>Formule</span><span>{mode === "sejour" ? "Séjour" : "Passage"} · {resume}</span></div>
                <div className="line tot"><span>Total</span><span>{fmt(calc.total)}</span></div>
              </div>

              <h3 className="d-h3">Comment souhaitez-vous payer ?</h3>
              <div className="pay-opts">
                {[["wave", "Wave", "Paiement mobile — réservation garantie"],
                  ["orange", "Orange Money", "Paiement mobile — réservation garantie"],
                  ["especes", "Espèces à l'arrivée", "À payer sur place — réservation non garantie"]].map(([k, t, d]) => (
                  <button key={k} className={"pay-opt" + (pay === k ? " sel" : "")} onClick={() => setPay(k)}>
                    <span className="pay-radio" />
                    <span className="pay-txt"><b>{t}</b><small>{d}</small></span>
                  </button>
                ))}
              </div>

              <h3 className="d-h3">Vos coordonnées (facultatif)</h3>
              <div className="calc-field"><label>Nom</label><input value={nom} onChange={e => setNom(e.target.value)} placeholder="Votre nom" /></div>
              <div className="calc-field"><label>Téléphone</label><input value={tel} onChange={e => setTel(e.target.value)} placeholder="+221 ..." /></div>

              <button className="cta" style={{ width: "100%", opacity: pay ? 1 : 0.5 }} disabled={!pay} onClick={cta}>
                {pay === "especes" ? "Confirmer la réservation" : "Continuer vers le paiement"}
              </button>
            </>
          )}

          {step === "paiement" && (
            <>
              <div className="pay-box">
                <h4>Payer par {payLabel[pay]}</h4>
                <p>Envoyez <b>{fmt(calc.total)}</b> par {payLabel[pay]} au numéro :</p>
                <div className="pay-num">{pay === "orange" ? (params.orange || PAY_NUMBER) : (params.wave || PAY_NUMBER)}</div>
                <p className="pay-note">Puis appuyez sur « J'ai payé ». Votre réservation sera <b>garantie</b> et la chambre bloquée à votre nom.</p>
              </div>
              <button className="cta" style={{ width: "100%" }} onClick={() => finalize(true)}>J'ai payé</button>
              <button className="wa" style={{ width: "100%", marginTop: 10 }} onClick={() => setStep("form")}>Changer de moyen</button>
            </>
          )}

          {step === "done" && (
            garanti ? (
              <div className="resa-ok">
                <div className="ok-ic">✓</div>
                <h3 className="disp">Réservation confirmée</h3>
                <p>La chambre est bloquée à votre nom. Le récapitulatif vous a été envoyé sur WhatsApp.</p>
                <button className="cta" style={{ width: "100%" }} onClick={onDone}>Voir mes réservations</button>
              </div>
            ) : (
              <div className="resa-ok">
                <div className="ok-ic warn">!</div>
                <h3 className="disp">Réservation non garantie</h3>
                <p>Votre demande est enregistrée, mais la chambre <b>n'est pas bloquée</b> tant qu'elle n'est pas payée. <b>Prévenez-nous avant de vous déplacer</b> pour vérifier qu'elle est toujours libre.</p>
                <button className="cta" style={{ width: "100%" }} onClick={() => openWA("Bonjour " + (params.marque || "HKA") + ", je compte venir pour ma réservation (" + l.nom + " — " + resume + "). Est-elle toujours disponible ?")}>Prévenir avant de venir</button>
                <button className="wa" style={{ width: "100%", marginTop: 10 }} onClick={onDone}>Voir mes réservations</button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function CompteScreen({ client, setClient, setTab, nbFav, nbResa, params }) {
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const initiales = (client && client.nom ? client.nom : "C").split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const contactWA = () => { try { window.open("https://wa.me/" + (params.wa || WA_NUMBER) + "?text=" + encodeURIComponent("Bonjour " + params.marque + ", j'ai une question."), "_blank"); } catch (e) {} };
  return (
    <div className="compte">
      {!client ? (
        <>
          <div className="compte-logo"><img src={LOGO} alt="" /></div>
          <h2 className="disp">Bienvenue</h2>
          <p>Connectez-vous pour suivre vos réservations et vos favoris.</p>
          <div className="calc-field"><label>Nom</label><input value={nom} onChange={e => setNom(e.target.value)} placeholder="Votre nom" /></div>
          <div className="calc-field"><label>Téléphone</label><input value={tel} onChange={e => setTel(e.target.value)} placeholder="+221 ..." /></div>
          <button className="cta" style={{ width: "100%", opacity: tel.trim() ? 1 : 0.5 }} disabled={!tel.trim()} onClick={() => setClient({ nom: nom.trim() || "Client", tel: tel.trim() })}>Se connecter</button>
        </>
      ) : (
        <>
          <div className="compte-av">{initiales}</div>
          <h2 className="disp">{client.nom}</h2>
          <p>{client.tel}</p>
          <div className="compte-menu">
            <button onClick={() => setTab("reservations")}><span>Mes réservations</span><b>{nbResa}</b></button>
            <button onClick={() => setTab("favoris")}><span>Mes favoris</span><b>{nbFav}</b></button>
            <button className="deco" onClick={() => setClient(null)}>Se déconnecter</button>
          </div>
        </>
      )}

      <div className="contact-card">
        <h3>{params.marque}</h3>
        {params.description ? <p className="cc-desc">{params.description}</p> : null}
        <div className="cc-list">
          {params.tel ? <a className="cc-row" href={"tel:" + params.tel}><span>Téléphone</span><b>{params.tel}</b></a> : null}
          {params.email ? <a className="cc-row" href={"mailto:" + params.email}><span>Email</span><b>{params.email}</b></a> : null}
          {params.adresse ? <div className="cc-row"><span>Adresse</span><b>{params.adresse}{params.ville ? ", " + params.ville : ""}</b></div> : null}
        </div>
        <button className="wa" style={{ width: "100%", marginTop: 12 }} onClick={contactWA}>Nous contacter sur WhatsApp</button>
      </div>
    </div>
  );
}

export default function HkaCourtage() {
  const [mode, setMode] = useState("sejour");
  const [slots, setSlots] = useState(["jour"]);
  const [open, setOpen] = useState(null);
  const [deepId] = useState(() => { try { return new URLSearchParams(window.location.search).get("chambre"); } catch (e) { return null; } });
  const [deepDone, setDeepDone] = useState(false);
  const [ville, setVille] = useState("Dakar");
  const [quartier, setQuartier] = useState("Tous");
  const [tri, setTri] = useState("reco");
  const [voyageurs, setVoyageurs] = useState(2);
  const [arrivee, setArrivee] = useState("2026-07-15");
  const [depart, setDepart] = useState("2026-07-18");
  const [datePassage, setDatePassage] = useState("2026-07-15");
  const [chambres, setChambres] = useState(supabaseReady ? [] : LOGEMENTS);
  const [loading, setLoading] = useState(supabaseReady);
  const [view, setView] = useState("site");
  const [adminOk, setAdminOk] = useState(false);
  const [tab, setTab] = useState("accueil");
  const [reservations, setReservations] = useState([]);
  const [resaEnCours, setResaEnCours] = useState(null);
  const [favoris, setFavoris] = useState([]);
  const toggleFav = (id) => setFavoris(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);
  const [client, setClient] = useState(null);
  const [params, setParams] = useState({ wa: WA_NUMBER, wave: PAY_NUMBER, orange: PAY_NUMBER, marque: "HKA Logement", ville: "Dakar", tel: "+221 76 740 20 96", email: "contact@hkalogement.sn", adresse: "Dakar, Sénégal", description: "Chambres meublées à Dakar — réservation directe." });

  useEffect(() => {
    let alive = true;
    (async () => {
      const rows = await fetchChambres();
      if (alive) {
        if (rows) setChambres(rows);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [adminOk]);

  useEffect(() => {
    if (!deepDone && deepId && chambres.length) {
      const m = chambres.find(c => String(c.id) === String(deepId));
      if (m) { setOpen(m); setDeepDone(true); }
    }
  }, [chambres, deepId, deepDone]);

  useEffect(() => {
    if (!supabaseReady) return;
    supabase.auth.getSession().then(({ data }) => {
      const email = data && data.session && data.session.user && data.session.user.email;
      const admin = (import.meta.env.VITE_ADMIN_EMAIL || "").toLowerCase();
      if (email && admin && email.toLowerCase() === admin) setAdminOk(true);
    });
  }, []);

  useEffect(() => {
    if (adminOk && supabaseReady) fetchReservations().then(rows => { if (rows && rows.length) setReservations(rows); });
  }, [adminOk]);

  useEffect(() => { logEvent("visite"); }, []);

  const quartiers = ["Tous", ...Array.from(new Set(chambres.map(c => c.quartier)))];
  const priceKey = mode === "sejour" ? "prixNuit" : "prixJour";
  const nuitsSejour = Math.max(1, Math.round((new Date(depart) - new Date(arrivee)) / 86400000) || 1);
  const onSearch = () => { const el = document.getElementById("resultats"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const goTab = (id) => { setTab(id); try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) {} };
  let liste = chambres.filter(l => (quartier === "Tous" || l.quartier === quartier) && l.cap >= voyageurs && l.actif !== false && (mode === "sejour" ? (l.prixNuit > 0) : (l.prixJour > 0 || l.prixSoiree > 0)));
  if (tri === "prixAsc") liste = [...liste].sort((a, b) => a[priceKey] - b[priceKey]);
  else if (tri === "prixDesc") liste = [...liste].sort((a, b) => b[priceKey] - a[priceKey]);
  else if (tri === "note") liste = [...liste].sort((a, b) => b.note - a.note);

  const tapRef = React.useRef({ n: 0, t: 0 });
  const secretTap = () => {
    const now = Date.now(), r = tapRef.current;
    r.n = now - r.t < 800 ? r.n + 1 : 1; r.t = now;
    if (r.n >= 3) { r.n = 0; setView("admin"); }
  };

  return (
    <div className={"hka mode-" + mode}>
      <style>{STYLE}</style>

      {view === "admin" ? (
        adminOk
          ? <AdminPanel chambres={chambres} setChambres={setChambres} quartiers={quartiers} reservations={reservations} setReservations={setReservations} params={params} setParams={setParams} onExit={() => setView("site")} />
          : <AdminGate onOk={() => setAdminOk(true)} onExit={() => setView("site")} />
      ) : (
        <>
          <header className="head">
            <div className="head-in">
              <div className="brand">
                <img className="brand-logo" src={LOGO} alt="HKA Logement" onClick={secretTap} onDoubleClick={() => setView("admin")} style={{ cursor: "default" }} />
                <div className="brand-txt">
                  <span className="brand-mark">HKA Logement</span>
                  <span className="brand-sub">Dakar</span>
                </div>
              </div>
              {tab === "accueil" && <Toggle mode={mode} setMode={setMode} />}
            </div>
          </header>

          <main className="page-pad">
            {tab === "accueil" && (
            <div className="wrap">
            <section className="hero">
              <h1 className="disp">
                {mode === "sejour"
                  ? <>Un logement pour <em>votre séjour</em> à Dakar.</>
                  : <>Un espace pour <em>quelques heures</em>, à la carte.</>}
              </h1>
              <p>
                {mode === "sejour"
                  ? "Chambres meublées à la nuitée, réservation directe avec HKA."
                  : "Réservez au créneau — journée (12h–20h) ou nuit (20h–12h). Idéal escale, réunion ou repos express."}
              </p>
              <SearchBar mode={mode} slots={slots} setSlots={setSlots} voyageurs={voyageurs} setVoyageurs={setVoyageurs} arrivee={arrivee} setArrivee={setArrivee} depart={depart} setDepart={setDepart} datePassage={datePassage} setDatePassage={setDatePassage} onSearch={onSearch} />
            </section>

            <div className="filters">
              <div className="filtline">
                <div className="selbox">
                  <label>Ville</label>
                  <select value={ville} onChange={(e) => setVille(e.target.value)}>
                    {VILLES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="selbox">
                  <label>Trier par</label>
                  <select value={tri} onChange={(e) => setTri(e.target.value)}>
                    <option value="reco">Recommandés</option>
                    <option value="prixAsc">Prix croissant</option>
                    <option value="prixDesc">Prix décroissant</option>
                    <option value="note">Mieux notés</option>
                  </select>
                </div>
              </div>
              <div className="qchips">
                {quartiers.map(q => (
                  <button key={q} className={"chip" + (quartier === q ? " sel" : "")} onClick={() => setQuartier(q)}>
                    {q === "Tous" ? "Tous les quartiers" : q}
                  </button>
                ))}
              </div>
            </div>

            <div className="rowlabel" id="resultats">
              <h2 className="disp">{mode === "sejour" ? "Disponibles à la nuitée" : "Disponibles au créneau"}</h2>
              <span>{liste.length} chambre{liste.length > 1 ? "s" : ""} · {voyageurs} voyageur{voyageurs > 1 ? "s" : ""}{quartier !== "Tous" ? ` · ${quartier}` : ""}</span>
            </div>

            {loading ? (
              <SkeletonGrid />
            ) : liste.length > 0 ? (
              <div className="grid">
                {liste.map((l) => <Card key={l.id} l={l} i={chambres.indexOf(l)} mode={mode} onOpen={setOpen} fav={favoris.includes(l.id)} onFav={toggleFav} slots={slots} />)}
              </div>
            ) : (
              <p style={{ color: "var(--muted)", padding: "20px 0 60px" }}>Aucune chambre ne correspond à votre recherche. Réduisez le nombre de voyageurs ou changez de quartier.</p>
            )}
            <footer className="site-foot">
              <b>{params.marque}</b>
              <span>{params.adresse}{params.ville ? " · " + params.ville : ""}</span>
              {(params.tel || params.email) ? <span>{params.tel}{params.tel && params.email ? " · " : ""}{params.email}</span> : null}
              <button className="wa" onClick={() => { try { window.open("https://wa.me/" + (params.wa || WA_NUMBER) + "?text=" + encodeURIComponent("Bonjour " + params.marque + ", j'ai une question."), "_blank"); } catch (e) {} }}>Nous contacter</button>
            </footer>
            </div>
            )}
            {tab === "reservations" && (
              reservations.length === 0
                ? <Placeholder icon="ticket" titre="Mes réservations" texte="Vous n'avez pas encore de réservation." />
                : <div className="resa-list">
                    <h2 className="disp" style={{ padding: "24px 22px 6px" }}>Mes réservations</h2>
                    {reservations.map(r => (
                      <div className="resa-item" key={r.id}>
                        <div className="resa-row">
                          <div className="resa-main">
                            <b>{r.chambre}</b>
                            <span>{r.quartier} · {r.mode === "sejour" ? "Séjour" : "Passage"} · {r.resume}{r.pay ? " · " + r.pay : ""}{r.date ? " · " + r.date : ""}</span>
                          </div>
                          <div className="resa-right">
                            <span className={"resa-statut" + (r.garanti ? " ok" : " warn")}>{r.statut}</span>
                            <b>{fmt(r.total)}</b>
                          </div>
                        </div>
                        {!r.garanti && (
                          <div className="resa-warn">
                            <span>Chambre non bloquée — prévenez avant de venir.</span>
                            <button className="resa-prevenir" onClick={() => { try { window.open("https://wa.me/" + (params.wa || WA_NUMBER) + "?text=" + encodeURIComponent("Bonjour " + params.marque + ", je compte venir pour ma réservation (" + r.chambre + " — " + r.resume + "). Est-elle toujours disponible ?"), "_blank"); } catch (e) {} }}>Prévenir avant de venir</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
            )}
            {tab === "favoris" && (
              favoris.length === 0
                ? <Placeholder icon="heart" titre="Favoris" texte="Aucune chambre en favori. Touchez le cœur d'une chambre pour la garder ici." />
                : <div className="wrap">
                    <div className="rowlabel"><h2 className="disp">Vos favoris</h2><span>{favoris.length} chambre{favoris.length > 1 ? "s" : ""}</span></div>
                    <div className="grid">
                      {chambres.filter(c => favoris.includes(c.id)).map(l => <Card key={l.id} l={l} i={chambres.indexOf(l)} mode={mode} onOpen={setOpen} fav={true} onFav={toggleFav} slots={slots} />)}
                    </div>
                  </div>
            )}
            {tab === "compte" && <CompteScreen client={client} setClient={setClient} setTab={goTab} nbFav={favoris.length} nbResa={reservations.length} params={params} />}
          </main>

          <BottomNav tab={tab} setTab={goTab} />

          {open && <BookingSheet key={open.id} l={open} i={chambres.indexOf(open)} mode={mode} onClose={() => setOpen(null)} onReserve={(p) => setResaEnCours(p)} fav={favoris.includes(open.id)} onFav={toggleFav} initNuits={nuitsSejour} initSlots={slots} arrivee={arrivee} datePassage={datePassage} />}

          {resaEnCours && <RecapResa resa={resaEnCours} client={client} params={params} onClose={() => setResaEnCours(null)} onConfirm={(r) => setReservations(prev => [r, ...prev])} onDone={() => { setResaEnCours(null); setOpen(null); setTab("reservations"); }} />}
        </>
      )}
    </div>
  );
}
