import { useState, useMemo, useEffect, useRef } from 'react';
import { createDeck, shuffleDeck } from './game/deck';
import { startRound, discardCards, playCards } from './game/gameState';
import { evaluateHand } from './game/scoring';
import { AVAILABLE_JOKERS } from './game/jokers';
import type { GameState } from './game/gameState';
import type { Joker } from './game/jokers';

type ScreenState = 'blind_select' | 'playing' | 'shop';

// Ordine per il sorting del mazzo nel visore
const RANK_ORDER: Record<string, number> = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
const SUIT_ORDER: Record<string, number> = { 'Picche': 1, 'Cuori': 2, 'Fiori': 3, 'Quadri': 4 };

function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('blind_select');
  const [ante, setAnte] = useState(1);
  const [round, setRound] = useState(1);
  const [blindStep, setBlindStep] = useState<0 | 1 | 2>(0);
  const [currentBlindName, setCurrentBlindName] = useState('Piccolo Buio');
  
  const [playingCardIds, setPlayingCardIds] = useState<string[]>([]);
  const [isRunInfoOpen, setIsRunInfoOpen] = useState(false);
  
  // Nuovo stato per la schermata del Mazzo (sostituisce l'alert)
  const [isDeckViewOpen, setIsDeckViewOpen] = useState(false);
  
  const [shopJokers, setShopJokers] = useState<Joker[]>([]);
  const [shopVoucher, setShopVoucher] = useState({ id: 'v1', name: 'Telescopio', cost: 10, bought: false });
  const [shopPacks, setShopPacks] = useState([
    { id: 'p1', name: 'Pacchetto Buffone', cost: 4, bought: false, type: 'Joker' },
    { id: 'p2', name: 'Pacchetto Celestiale', cost: 6, bought: false, type: 'Arcana' }
  ]);

  const [gameState, setGameState] = useState<GameState>(() => {
    return startRound(shuffleDeck(createDeck()), 10, 300, []);
  });
  
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameState.status !== 'playing' && currentScreen === 'playing' && modalRef.current) {
      modalRef.current.focus();
    }
  }, [gameState.status, currentScreen]);

  const currentHandPreview = useMemo(() => {
    const selectedCards = gameState.hand.filter(c => selectedCardIds.includes(c.id));
    return evaluateHand(selectedCards, gameState.ownedJokers);
  }, [gameState.hand, selectedCardIds, gameState.ownedJokers]);

  const toggleCardSelection = (id: string) => {
    if (gameState.status !== 'playing' || playingCardIds.length > 0) return;
    if (selectedCardIds.includes(id)) {
      setSelectedCardIds(selectedCardIds.filter(cardId => cardId !== id));
    } else if (selectedCardIds.length < 5) {
      setSelectedCardIds([...selectedCardIds, id]);
    }
  };

  const handleDiscard = () => {
    if (selectedCardIds.length > 0 && gameState.discardsRemaining > 0 && playingCardIds.length === 0) {
      setGameState(discardCards(gameState, selectedCardIds));
      setSelectedCardIds([]);
    }
  };

  const handlePlay = () => {
    if (selectedCardIds.length > 0 && gameState.handsRemaining > 0 && playingCardIds.length === 0) {
      setPlayingCardIds(selectedCardIds);
      setTimeout(() => {
        setGameState(playCards(gameState, selectedCardIds, currentHandPreview.totalScore));
        setSelectedCardIds([]);
        setPlayingCardIds([]);
      }, 400);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, cardId: string) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggleCardSelection(cardId);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      (e.currentTarget.nextElementSibling as HTMLElement)?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      (e.currentTarget.previousElementSibling as HTMLElement)?.focus();
    }
  };

  const getBlindTarget = (step: number) => {
    const base = 300 * Math.pow(2, ante - 1);
    if (step === 0) return base;
    if (step === 1) return base * 1.5;
    return base * 2;
  };

  const selectBlind = (step: number, name: string) => {
    setCurrentBlindName(name);
    setGameState(startRound(shuffleDeck(createDeck()), gameState.money, getBlindTarget(step), gameState.ownedJokers));
    setCurrentScreen('playing');
  };

  const skipBlind = () => {
    setGameState({ ...gameState, money: gameState.money + 5 });
    setBlindStep((prev) => (prev + 1) as 0 | 1 | 2);
    setRound(r => r + 1);
  };

  const rollShopJokers = () => {
    const shuffled = [...AVAILABLE_JOKERS].sort(() => 0.5 - Math.random());
    setShopJokers(shuffled.slice(0, 2));
  };

  const handleWin = () => {
    setGameState({ ...gameState, money: gameState.money + 4 + gameState.handsRemaining });
    if (blindStep === 2) {
      setAnte(a => a + 1);
      setBlindStep(0);
    } else {
      setBlindStep((prev) => (prev + 1) as 0 | 1 | 2);
    }
    setRound(r => r + 1);
    rollShopJokers();
    setCurrentScreen('shop');
  };

  const handleReroll = () => {
    if (gameState.money >= 5) {
      setGameState({ ...gameState, money: gameState.money - 5 });
      rollShopJokers();
    }
  };

  const buyJoker = (joker: Joker) => {
    if (gameState.money >= joker.cost && gameState.ownedJokers.length < 5) {
      setGameState({ ...gameState, money: gameState.money - joker.cost, ownedJokers: [...gameState.ownedJokers, joker] });
      setShopJokers(shopJokers.filter(j => j.id !== joker.id));
    }
  };

  const buyVoucher = () => {
    if (gameState.money >= shopVoucher.cost && !shopVoucher.bought) {
      setGameState({ ...gameState, money: gameState.money - shopVoucher.cost });
      setShopVoucher({ ...shopVoucher, bought: true });
    }
  };

  const buyPack = (id: string, cost: number) => {
    if (gameState.money >= cost) {
      setGameState({ ...gameState, money: gameState.money - cost });
      setShopPacks(shopPacks.map(p => p.id === id ? { ...p, bought: true } : p));
    }
  };

  const getSuitSymbol = (suit: string) => {
    switch (suit) { case 'Cuori': return '♥'; case 'Picche': return '♠'; case 'Quadri': return '♦'; case 'Fiori': return '♣'; default: return ''; }
  };
  const getSuitColor = (suit: string) => {
    switch (suit) { case 'Cuori': return '#ff4d4d'; case 'Picche': return '#222222'; case 'Quadri': return '#ffcc00'; case 'Fiori': return '#4da6ff'; default: return '#222'; }
  };

  const renderCardFace = (rank: string, suit: string) => {
    const symbol = getSuitSymbol(suit);
    if (rank === 'A') return <div style={{ fontSize: '4.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>{symbol}</div>;
    if (['J', 'Q', 'K'].includes(rank)) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <div style={{ fontSize: '3rem', fontFamily: 'serif', border: '2px solid currentColor', borderRadius: '8px', padding: '1rem', width: '80%', height: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>{rank}</div>
        </div>
      );
    const num = parseInt(rank, 10);
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-evenly', alignContent: 'space-around', height: '100%', padding: '0.2rem' }}>
        {Array.from({length: num}).map((_, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.5rem', width: num < 4 ? '100%' : '40%', textAlign: 'center', transform: (i >= num/2 && num !== 5 && num !== 3) ? 'rotate(180deg)' : 'none' }}>{symbol}</div>
        ))}
      </div>
    );
  };

  // ----- MODALE MAZZO (Deck View) -----
  // Questo sostituisce il popup alert()[cite: 23, 24]
  const renderDeckModal = () => {
    const sortedDeck = [...gameState.deck].sort((a, b) => {
      if (SUIT_ORDER[a.suit] !== SUIT_ORDER[b.suit]) return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
      return RANK_ORDER[b.rank] - RANK_ORDER[a.rank];
    });

    const suitCounts = { 'Picche': 0, 'Cuori': 0, 'Fiori': 0, 'Quadri': 0 };
    const rankCounts: Record<string, number> = { 'A': 0, 'K': 0, 'Q': 0, 'J': 0, '10': 0, '9': 0, '8': 0, '7': 0, '6': 0, '5': 0, '4': 0, '3': 0, '2': 0 };
    
    gameState.deck.forEach(c => {
      suitCounts[c.suit as keyof typeof suitCounts]++;
      if (rankCounts[c.rank] !== undefined) rankCounts[c.rank]++;
    });

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#3b6a50', zIndex: 300, display: 'flex', padding: '2rem', gap: '2rem' }}>
        
        {/* Pannello Statistiche a Sinistra[cite: 24] */}
        <div style={{ flex: '0 0 250px', backgroundColor: '#34454e', borderRadius: '12px', padding: '1.5rem', border: '4px solid #222', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: '0 0 1rem 0', textAlign: 'center', color: '#fff', fontSize: '1.5rem' }}>Mazzo Base</h2>
          <div style={{ backgroundColor: '#fff', padding: '0.5rem', borderRadius: '8px', color: '#000', fontWeight: 'bold', textAlign: 'center', marginBottom: '1.5rem' }}>
            {gameState.deck.length} Carte Rimanenti
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '2rem' }}>
            <div style={{ textAlign: 'center', backgroundColor: '#222', padding: '0.5rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '1.5rem', color: '#4da6ff' }}>♠ {suitCounts['Picche']}</div>
            </div>
            <div style={{ textAlign: 'center', backgroundColor: '#222', padding: '0.5rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '1.5rem', color: '#ff4d4d' }}>♥ {suitCounts['Cuori']}</div>
            </div>
            <div style={{ textAlign: 'center', backgroundColor: '#222', padding: '0.5rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '1.5rem', color: '#222222', WebkitTextStroke: '1px #fff' }}>♣ {suitCounts['Fiori']}</div>
            </div>
            <div style={{ textAlign: 'center', backgroundColor: '#222', padding: '0.5rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '1.5rem', color: '#ffcc00' }}>♦ {suitCounts['Quadri']}</div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#222', borderRadius: '8px', padding: '1rem' }}>
             {Object.entries(rankCounts).map(([r, count]) => (
               <div key={r} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  <span style={{ color: '#aaa' }}>{r}</span>
                  <span style={{ color: count === 0 ? '#555' : '#fff' }}>{count}</span>
               </div>
             ))}
          </div>

          <button onClick={() => setIsDeckViewOpen(false)} style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#ff4d4d', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem' }}>Indietro</button>
        </div>

        {/* Griglia Carte a Destra[cite: 24] */}
        <div style={{ flex: 1, backgroundColor: '#2b5e40', borderRadius: '12px', padding: '2rem', display: 'flex', flexWrap: 'wrap', gap: '10px', overflowY: 'auto', alignContent: 'flex-start', border: '4px solid #1a3a28', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
          {sortedDeck.map(card => (
            <div key={card.id} style={{ 
              width: '75px', height: '105px', backgroundColor: '#fff', borderRadius: '8px', 
              color: getSuitColor(card.suit), display: 'flex', flexDirection: 'column', 
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)', userSelect: 'none' 
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', padding: '4px 6px' }}>{card.rank}{getSuitSymbol(card.suit)}</div>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '2.5rem' }}>
                {getSuitSymbol(card.suit)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRunInfoModal = () => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
      <div ref={modalRef} tabIndex={-1} style={{ backgroundColor: '#1a1a1a', padding: '2rem', borderRadius: '16px', border: '4px solid #ff4d4d', width: '500px', maxWidth: '90%', outline: 'none' }}>
        <h2 style={{ color: '#fff', textAlign: 'center', marginTop: 0 }}>Livelli Mani di Poker</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '1rem' }}>
          {[
            { name: 'Scala colore', base: '100 x 8' }, { name: 'Poker', base: '60 x 7' }, { name: 'Full', base: '40 x 4' },
            { name: 'Colore', base: '35 x 4' }, { name: 'Scala', base: '30 x 4' }, { name: 'Tris', base: '30 x 3' },
            { name: 'Doppia coppia', base: '20 x 2' }, { name: 'Coppia', base: '10 x 2' }, { name: 'Carta alta', base: '5 x 1' },
          ].map(hand => (
            <div key={hand.name} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#333', padding: '1rem', borderRadius: '8px' }}>
              <span style={{ fontWeight: 'bold' }}>{hand.name} <span style={{ color: '#aaa', fontSize: '0.8rem' }}>lvl.1</span></span>
              <span style={{ color: '#4da6ff', fontWeight: 'bold' }}>{hand.base}</span>
            </div>
          ))}
        </div>
        <button onClick={() => setIsRunInfoOpen(false)} style={{ width: '100%', padding: '1rem', marginTop: '1rem', backgroundColor: '#ff4d4d', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Chiudi</button>
      </div>
    </div>
  );

  // ----- SCHERMATA SELEZIONE BUI -----
  if (currentScreen === 'blind_select') {
    return (
      <div style={{ display: 'flex', width: '100vw', minHeight: '100vh', backgroundColor: '#2b5e40', color: 'white', fontFamily: 'sans-serif' }}>
        <div style={{ flex: '0 0 320px', backgroundColor: '#1a1a1a', padding: '2rem', display: 'flex', flexDirection: 'column', borderRight: '4px solid #000' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Scegli il<br/>prossimo Buio</h1>
          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
            <div style={{ flex: 1, backgroundColor: '#333', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}><div style={{ color: '#aaa' }}>Ante</div><div style={{ fontSize: '1.5rem', color: '#ffdd55', fontWeight: 'bold' }}>{ante}/8</div></div>
            <div style={{ flex: 1, backgroundColor: '#333', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}><div style={{ color: '#aaa' }}>Round</div><div style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 'bold' }}>{round}</div></div>
          </div>
          <div style={{ marginTop: '1rem', backgroundColor: '#333', borderRadius: '8px', padding: '1rem', textAlign: 'center', fontWeight: 'bold', fontSize: '2rem', color: '#ffdd55' }}>${gameState.money}</div>
        </div>

        <div style={{ flex: 1, padding: '3rem', display: 'flex', gap: '2rem', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ width: '280px', backgroundColor: '#111', borderRadius: '16px', border: blindStep === 0 ? '4px solid #4da6ff' : '4px solid #333', opacity: blindStep > 0 ? 0.5 : 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#222', padding: '1.5rem', textAlign: 'center', borderBottom: '2px solid #333' }}>
              <div style={{ color: '#4da6ff', fontWeight: 'bold', fontSize: '1.5rem', marginBottom: '1rem' }}>Piccolo Buio</div>
              <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Punteggio Obiettivo</div><div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff' }}>{getBlindTarget(0)}</div>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button onClick={() => selectBlind(0, 'Piccolo Buio')} disabled={blindStep !== 0} style={{ padding: '1rem', backgroundColor: '#4da6ff', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.2rem', cursor: blindStep === 0 ? 'pointer' : 'default' }}>Seleziona</button>
              <button onClick={skipBlind} disabled={blindStep !== 0} style={{ padding: '1rem', backgroundColor: '#555', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: blindStep === 0 ? 'pointer' : 'default' }}>Skippa (+ $5)</button>
            </div>
          </div>
          <div style={{ width: '280px', backgroundColor: '#111', borderRadius: '16px', border: blindStep === 1 ? '4px solid #ffdd55' : '4px solid #333', opacity: blindStep > 1 || blindStep < 1 ? 0.5 : 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#222', padding: '1.5rem', textAlign: 'center', borderBottom: '2px solid #333' }}>
              <div style={{ color: '#ffdd55', fontWeight: 'bold', fontSize: '1.5rem', marginBottom: '1rem' }}>Grande Buio</div>
              <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Punteggio Obiettivo</div><div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff' }}>{getBlindTarget(1)}</div>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button onClick={() => selectBlind(1, 'Grande Buio')} disabled={blindStep !== 1} style={{ padding: '1rem', backgroundColor: '#ffdd55', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.2rem', cursor: blindStep === 1 ? 'pointer' : 'default' }}>Seleziona</button>
              <button onClick={skipBlind} disabled={blindStep !== 1} style={{ padding: '1rem', backgroundColor: '#555', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: blindStep === 1 ? 'pointer' : 'default' }}>Skippa (+ $5)</button>
            </div>
          </div>
          <div style={{ width: '280px', backgroundColor: '#111', borderRadius: '16px', border: blindStep === 2 ? '4px solid #ff4d4d' : '4px solid #333', opacity: blindStep < 2 ? 0.5 : 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#222', padding: '1.5rem', textAlign: 'center', borderBottom: '2px solid #333' }}>
              <div style={{ color: '#ff4d4d', fontWeight: 'bold', fontSize: '1.5rem', marginBottom: '1rem' }}>Buio Boss</div>
              <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Punteggio Obiettivo</div><div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff' }}>{getBlindTarget(2)}</div>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button onClick={() => selectBlind(2, 'Buio Boss')} disabled={blindStep !== 2} style={{ padding: '1rem', backgroundColor: '#ff4d4d', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.2rem', cursor: blindStep === 2 ? 'pointer' : 'default' }}>Seleziona</button>
              <button disabled style={{ padding: '1rem', backgroundColor: '#222', color: '#555', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>Non Skippabile</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----- SCHERMATA NEGOZIO -----
  if (currentScreen === 'shop') {
    return (
      <div style={{ display: 'flex', width: '100vw', minHeight: '100vh', backgroundColor: '#2b5e40', color: 'white', fontFamily: 'sans-serif' }}>
        <div style={{ flex: '0 0 320px', backgroundColor: '#1a1a1a', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderRight: '4px solid #ff4d4d' }}>
          <div style={{ textAlign: 'center', backgroundColor: '#222', padding: '1.5rem', borderRadius: '12px', border: '2px solid #ff4d4d', boxShadow: 'inset 0 0 10px rgba(255,0,0,0.2)' }}>
            <h1 style={{ color: '#ffdd55', fontSize: '3rem', margin: '0 0 0.5rem 0', fontFamily: 'serif', textTransform: 'uppercase' }}>Shop</h1>
            <p style={{ margin: 0, color: '#ffaa00', fontWeight: 'bold' }}>Migliora la tua run!</p>
          </div>
          <div style={{ marginTop: 'auto', backgroundColor: '#333', borderRadius: '8px', padding: '1.5rem', textAlign: 'center', fontSize: '2rem', fontWeight: 'bold', color: '#ffdd55', border: '2px solid #555' }}>${gameState.money}</div>
        </div>

        <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ backgroundColor: '#2a2a35', border: '3px solid #ff4d4d', borderRadius: '16px', padding: '2rem', display: 'flex', gap: '2rem', flex: 1 }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '180px' }}>
              <button onClick={() => setCurrentScreen('blind_select')} style={{ padding: '1.5rem', backgroundColor: '#ff4d4d', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 6px 0 #b52828' }}>Prossimo<br/>Round</button>
              <button onClick={handleReroll} disabled={gameState.money < 5} style={{ padding: '1.5rem', backgroundColor: '#2b9348', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1.5rem', fontWeight: 'bold', cursor: gameState.money >= 5 ? 'pointer' : 'not-allowed', boxShadow: '0 6px 0 #1e6b34', opacity: gameState.money >= 5 ? 1 : 0.5 }}>Reroll<br/>$5</button>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                {shopJokers.map(joker => (
                  <div key={joker.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ backgroundColor: '#111', padding: '0.2rem 1rem', borderRadius: '4px', marginBottom: '0.5rem', fontWeight: 'bold', color: '#ffdd55' }}>${joker.cost}</div>
                    <div onClick={() => buyJoker(joker)} style={{ backgroundColor: '#333', border: '3px solid #fff', borderRadius: '12px', width: '140px', height: '200px', cursor: gameState.money >= joker.cost ? 'pointer' : 'not-allowed', padding: '1rem', textAlign: 'center', opacity: gameState.money >= joker.cost ? 1 : 0.5 }}>
                      <div style={{ color: '#ffdd55', fontWeight: 'bold', marginBottom: '1rem' }}>{joker.name}</div><div style={{ fontSize: '0.8rem' }}>{joker.description}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '2rem', marginTop: 'auto', borderTop: '2px solid #444', paddingTop: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '2px solid #444', paddingRight: '2rem' }}>
                  <div style={{ backgroundColor: '#111', padding: '0.2rem 1rem', borderRadius: '4px', marginBottom: '0.5rem', fontWeight: 'bold', color: '#ffdd55' }}>${shopVoucher.cost}</div>
                  <div onClick={buyVoucher} style={{ backgroundColor: shopVoucher.bought ? '#111' : '#4d4dff', border: '3px dashed #fff', borderRadius: '8px', width: '120px', height: '180px', cursor: (gameState.money >= shopVoucher.cost && !shopVoucher.bought) ? 'pointer' : 'not-allowed', padding: '1rem', textAlign: 'center', opacity: shopVoucher.bought ? 0.3 : 1 }}>
                    <div style={{ color: '#fff', fontWeight: 'bold', marginTop: '30%' }}>{shopVoucher.bought ? 'VENDUTO' : `VOUCHER\n${shopVoucher.name}`}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  {shopPacks.map(pack => (
                    <div key={pack.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ backgroundColor: '#111', padding: '0.2rem 1rem', borderRadius: '4px', marginBottom: '0.5rem', fontWeight: 'bold', color: '#ffdd55' }}>${pack.cost}</div>
                      <div onClick={() => buyPack(pack.id, pack.cost)} style={{ background: 'linear-gradient(to bottom, #ff7e5f, #feb47b)', border: 'none', borderRadius: '4px', width: '130px', height: '180px', cursor: (gameState.money >= pack.cost && !pack.bought) ? 'pointer' : 'not-allowed', padding: '1rem', textAlign: 'center', opacity: pack.bought ? 0.3 : 1, boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
                        <div style={{ color: '#fff', fontWeight: 'bold', textShadow: '1px 1px 2px #000', marginTop: '40%' }}>{pack.bought ? 'APERTO' : pack.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----- SCHERMATA TAVOLO -----
  return (
    <div style={{ display: 'flex', width: '100vw', minHeight: '100vh', backgroundColor: '#2b5e40', color: 'white', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {isRunInfoOpen && renderRunInfoModal()}
      {isDeckViewOpen && renderDeckModal()}

      {gameState.status !== 'playing' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div ref={modalRef} tabIndex={-1} role="dialog" style={{ backgroundColor: '#1a1a1a', padding: '3rem', borderRadius: '16px', textAlign: 'center', border: `4px solid ${gameState.status === 'won' ? '#ffdd55' : '#ff4d4d'}` }}>
            <h2 style={{ fontSize: '3rem', margin: '0 0 1rem 0', color: gameState.status === 'won' ? '#ffdd55' : '#ff4d4d' }}>{gameState.status === 'won' ? 'Obiettivo Raggiunto!' : 'Game Over'}</h2>
            <button onClick={() => {
                if (gameState.status === 'won') {
                  handleWin();
                } else {
                  setGameState(startRound(shuffleDeck(createDeck()), 0, 300, []));
                  setAnte(1); setRound(1); setBlindStep(0);
                  setCurrentScreen('blind_select');
                }
              }} style={{ padding: '1rem 2rem', fontSize: '1.5rem', fontWeight: 'bold', backgroundColor: gameState.status === 'won' ? '#ffdd55' : '#ff4d4d', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              {gameState.status === 'won' ? 'Continua' : 'Riprova'}
            </button>
          </div>
        </div>
      )}

      {/* Colonna Laterale Tavolo */}
      <div style={{ flex: '0 0 320px', backgroundColor: '#1a1a1a', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', borderRight: '4px solid #000', zIndex: 10 }}>
        <div style={{ backgroundColor: '#2a2a2a', border: '2px solid #ffdd55', borderRadius: '8px', padding: '0.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ffdd55' }}>{currentBlindName}</div>
          <div style={{ fontSize: '0.8rem', color: '#ccc' }}>Obiettivo: {gameState.targetScore}</div>
        </div>

        <div style={{ backgroundColor: '#333', padding: '0.8rem', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#aaa' }}>Punteggio Round</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>{gameState.score}</div>
        </div>

        <div style={{ backgroundColor: '#222', padding: '1rem', borderRadius: '12px', border: '2px solid #444', textAlign: 'center' }}>
          <div style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#fff', fontWeight: 'bold', minHeight: '1.2rem' }}>{currentHandPreview.combinationName !== 'Nessuna' ? `${currentHandPreview.combinationName} lvl.1` : ''}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
            <span style={{ backgroundColor: '#4da6ff', color: '#fff', padding: '0.3rem 1rem', borderRadius: '6px' }}>{currentHandPreview.fiches + currentHandPreview.cardScore}</span>
            <span style={{ color: '#ff4d4d' }}>X</span>
            <span style={{ backgroundColor: '#ff4d4d', color: '#fff', padding: '0.3rem 1rem', borderRadius: '6px' }}>{currentHandPreview.multiplier}</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#333', padding: '0.8rem', borderRadius: '8px' }}>
          <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid #555' }}><div style={{ color: '#4da6ff', fontWeight: 'bold', fontSize: '1.2rem' }}>{gameState.handsRemaining}</div><div style={{ fontSize: '0.8rem', color: '#aaa' }}>Mani</div></div>
          <div style={{ textAlign: 'center', flex: 1 }}><div style={{ color: '#ff4d4d', fontWeight: 'bold', fontSize: '1.2rem' }}>{gameState.discardsRemaining}</div><div style={{ fontSize: '0.8rem', color: '#aaa' }}>Scarti</div></div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setIsRunInfoOpen(true)} style={{ flex: 1, backgroundColor: '#ff4d4d', border: 'none', borderRadius: '8px', padding: '1rem', color: '#fff', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 0 #b52828' }}>Run Info</button>
          <button style={{ flex: 1, backgroundColor: '#ffaa00', border: 'none', borderRadius: '8px', padding: '1rem', color: '#fff', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 0 #cc8800' }}>Opzioni</button>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1, backgroundColor: '#333', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Ante</div><div style={{ fontSize: '1.2rem', color: '#ffdd55', fontWeight: 'bold' }}>{ante}/8</div>
          </div>
          <div style={{ flex: 1, backgroundColor: '#333', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Round</div><div style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 'bold' }}>{round}</div>
          </div>
        </div>

        <div style={{ marginTop: 'auto', backgroundColor: '#333', borderRadius: '8px', padding: '1rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1.5rem', color: '#ffdd55' }}>
          ${gameState.money}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2rem', position: 'relative' }}>
        
        <div style={{ display: 'flex', gap: '15px', width: '100%', marginBottom: 'auto' }}>
            {[0, 1, 2, 3, 4].map(i => {
              const hasJoker = i < gameState.ownedJokers.length;
              return (
                <div key={`joker-slot-${i}`} style={{ width: '100px', height: '140px', border: hasJoker ? '2px solid #ffdd55' : '3px dashed rgba(0,0,0,0.2)', backgroundColor: hasJoker ? '#333' : 'transparent', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: hasJoker ? '#fff' : 'rgba(0,0,0,0.3)', fontWeight: 'bold', textAlign: 'center', padding: '0.5rem' }}>
                  {hasJoker ? gameState.ownedJokers[i].name : 'Slot Jolly'}
                </div>
              );
            })}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'nowrap', justifyContent: 'center', width: '100%', paddingBottom: '2rem' }}>
          {gameState.hand.map((card) => {
            const isSelected = selectedCardIds.includes(card.id);
            const isPlaying = playingCardIds.includes(card.id);
            
            return (
              <div 
                key={card.id} 
                className={isPlaying ? 'card-playing' : ''}
                tabIndex={0}
                role="checkbox"
                aria-checked={isSelected}
                aria-label={`${card.rank} di ${card.suit}`}
                onClick={() => toggleCardSelection(card.id)} 
                onKeyDown={(e) => handleKeyDown(e, card.id)} 
                onFocus={() => setFocusedCardId(card.id)} 
                onBlur={() => setFocusedCardId(null)}
                style={{ 
                  backgroundColor: '#fff', color: getSuitColor(card.suit),
                  border: isSelected ? '4px solid #ffdd55' : '4px solid #fff', 
                  outline: focusedCardId === card.id ? '4px solid #d946ef' : 'none', outlineOffset: '4px',
                  borderRadius: '10px', width: '110px', height: '154px', flexShrink: 0, cursor: 'pointer',
                  transform: isSelected && !isPlaying ? 'translateY(-20px)' : 'none', 
                  transition: 'transform 0.15s, border 0.15s, outline 0.15s',
                  boxShadow: isSelected ? '0 15px 25px rgba(0,0,0,0.5)' : '0 10px 15px rgba(0,0,0,0.3)',
                  display: 'flex', flexDirection: 'column', userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0.5rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  <span>{card.rank}</span><span>{getSuitSymbol(card.suit)}</span>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>{renderCardFace(card.rank, card.suit)}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0.5rem', fontWeight: 'bold', fontSize: '1.1rem', transform: 'rotate(180deg)' }}>
                  <span>{card.rank}</span><span>{getSuitSymbol(card.suit)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
          <button onClick={handlePlay} disabled={selectedCardIds.length === 0 || gameState.handsRemaining === 0 || playingCardIds.length > 0} style={{ padding: '1rem 3rem', backgroundColor: '#ffdd55', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: selectedCardIds.length > 0 && playingCardIds.length === 0 ? 'pointer' : 'not-allowed', fontSize: '1.2rem', opacity: selectedCardIds.length > 0 && playingCardIds.length === 0 ? 1 : 0.5 }}>
            Gioca Mano
          </button>
          <button onClick={handleDiscard} disabled={selectedCardIds.length === 0 || gameState.discardsRemaining === 0 || playingCardIds.length > 0} style={{ padding: '1rem 3rem', backgroundColor: '#ff4d4d', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: selectedCardIds.length > 0 && playingCardIds.length === 0 ? 'pointer' : 'not-allowed', fontSize: '1.2rem', opacity: selectedCardIds.length > 0 && playingCardIds.length === 0 ? 1 : 0.5 }}>
            Scarta (Max 5)
          </button>
        </div>

        <div 
          onClick={() => setIsDeckViewOpen(true)}
          style={{ position: 'absolute', bottom: '2rem', right: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', zIndex: 50 }}
        >
          <div style={{ width: '80px', height: '112px', borderRadius: '6px', border: '3px solid #fff', backgroundColor: '#4a69bd', backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)', boxShadow: '0 8px 15px rgba(0,0,0,0.4), inset 0 0 10px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: '#fff', opacity: 0.5, fontWeight: 'bold', border: '2px solid rgba(255,255,255,0.5)', padding: '0.5rem', borderRadius: '50%' }}>B</div>
          </div>
          <div style={{ marginTop: '0.5rem', backgroundColor: '#111', padding: '0.2rem 0.8rem', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>
            {gameState.deck.length} / 52
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;