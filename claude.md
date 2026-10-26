# [NOME DEL GIOCO]
## Stack
React 18 + Vite 5 (TypeScript). Nessun meta-framework. Pubblicazione su Vercel.
## Architettura
Gioco di carte a turni ispirato a Balatro. Logica di gioco isolata in `src/game/`, separata dai componenti React. Regole in `docs/regole.md`.
## Accessibilità
Tutto giocabile da tastiera con focus sempre visibile. Pattern ARIA secondo le WAI-ARIA Authoring Practices.
## Regole AI
Nessuna nuova dipendenza senza chiedere. Sviluppa una funzionalità alla volta.