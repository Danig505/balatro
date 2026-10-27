import type { Card, Rank } from './deck';
import type { Joker } from './jokers';

export interface HandResult {
  combinationName: string;
  fiches: number;
  multiplier: number;
  cardScore: number;
  totalScore: number;
}

const COMBINATIONS = {
  'Scala colore': { fiches: 100, multiplier: 8 },
  'Poker': { fiches: 60, multiplier: 7 },
  'Full': { fiches: 40, multiplier: 4 },
  'Colore': { fiches: 35, multiplier: 4 },
  'Scala': { fiches: 30, multiplier: 4 },
  'Tris': { fiches: 30, multiplier: 3 },
  'Doppia coppia': { fiches: 20, multiplier: 2 },
  'Coppia': { fiches: 10, multiplier: 2 },
  'Carta alta': { fiches: 5, multiplier: 1 }
};

const RANK_ORDER: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// Ora accetta anche l'array dei Jolly posseduti
export function evaluateHand(playedCards: Card[], ownedJokers: Joker[] = []): HandResult {
  if (playedCards.length === 0) {
    return { combinationName: 'Nessuna', fiches: 0, multiplier: 0, cardScore: 0, totalScore: 0 };
  }

  const rankCounts: Record<string, Card[]> = {};
  const suitCounts: Record<string, Card[]> = {};

  playedCards.forEach(card => {
    if (!rankCounts[card.rank]) rankCounts[card.rank] = [];
    rankCounts[card.rank].push(card);
    if (!suitCounts[card.suit]) suitCounts[card.suit] = [];
    suitCounts[card.suit].push(card);
  });

  const isFlush = playedCards.length === 5 && Object.keys(suitCounts).length === 1;

  let isStraight = false;
  if (playedCards.length === 5) {
    const sortedRanks = [...new Set(playedCards.map(c => RANK_ORDER[c.rank]))].sort((a, b) => a - b);
    if (sortedRanks.length === 5 && sortedRanks[4] - sortedRanks[0] === 4) {
      isStraight = true;
    }
    if (sortedRanks.join(',') === '2,3,4,5,14') {
      isStraight = true;
    }
  }

  const counts = Object.values(rankCounts).map(cards => cards.length).sort((a, b) => b - a);
  const isFourOfAKind = counts[0] === 4;
  const isFullHouse = counts[0] === 3 && counts[1] === 2;
  const isThreeOfAKind = counts[0] === 3;
  const isTwoPair = counts[0] === 2 && counts[1] === 2;
  const isPair = counts[0] === 2;

  let combinationName: string;
  let scoringCards: Card[];

  if (isStraight && isFlush) {
    combinationName = 'Scala colore';
    scoringCards = playedCards;
  } else if (isFourOfAKind) {
    combinationName = 'Poker';
    scoringCards = Object.values(rankCounts).find(cards => cards.length === 4)!;
  } else if (isFullHouse) {
    combinationName = 'Full';
    scoringCards = playedCards;
  } else if (isFlush) {
    combinationName = 'Colore';
    scoringCards = playedCards;
  } else if (isStraight) {
    combinationName = 'Scala';
    scoringCards = playedCards;
  } else if (isThreeOfAKind) {
    combinationName = 'Tris';
    scoringCards = Object.values(rankCounts).find(cards => cards.length === 3)!;
  } else if (isTwoPair) {
    combinationName = 'Doppia coppia';
    scoringCards = Object.values(rankCounts).filter(cards => cards.length === 2).flat();
  } else if (isPair) {
    combinationName = 'Coppia';
    scoringCards = Object.values(rankCounts).find(cards => cards.length === 2)!;
  } else {
    combinationName = 'Carta alta';
    scoringCards = [playedCards.reduce((highest, current) => 
      RANK_ORDER[current.rank] > RANK_ORDER[highest.rank] ? current : highest
    )];
  }

  const baseFiches = COMBINATIONS[combinationName as keyof typeof COMBINATIONS].fiches;
  const baseMultiplier = COMBINATIONS[combinationName as keyof typeof COMBINATIONS].multiplier;
  const cardScore = scoringCards.reduce((sum, card) => sum + card.value, 0);

  // Applica gli effetti dei Jolly posseduti[cite: 6]
  let finalFiches = baseFiches + cardScore;
  let finalMultiplier = baseMultiplier;

  ownedJokers.forEach(joker => {
    const result = joker.applyEffect(finalFiches, finalMultiplier);
    finalFiches = result.fiches;
    finalMultiplier = result.multiplier;
  });

  const totalScore = finalFiches * finalMultiplier;

  return {
    combinationName,
    fiches: finalFiches - cardScore, // Solo fiches base + jolly
    multiplier: finalMultiplier,
    cardScore,
    totalScore
  };
}