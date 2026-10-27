import type { Card } from './deck';
import type { Joker } from './jokers';

export interface GameState {
  deck: Card[];
  hand: Card[];
  handsRemaining: number;
  discardsRemaining: number;
  score: number;
  targetScore: number;
  status: 'playing' | 'won' | 'lost';
  money: number;
  ownedJokers: Joker[];
}

export function startRound(deck: Card[], currentMoney: number = 0, target: number = 300, jokers: Joker[] = []): GameState {
  const hand = deck.slice(0, 8);
  const remainingDeck = deck.slice(8);

  return {
    deck: remainingDeck,
    hand,
    handsRemaining: 4,
    discardsRemaining: 3,
    score: 0,
    targetScore: target,
    status: 'playing',
    money: currentMoney,
    ownedJokers: jokers
  };
}

export function discardCards(state: GameState, cardsToDiscardIds: string[]): GameState {
  if (state.discardsRemaining <= 0 || state.status !== 'playing') return state;
  
  const newHand = state.hand.filter(card => !cardsToDiscardIds.includes(card.id));
  const cardsNeeded = 8 - newHand.length;
  const drawnCards = state.deck.slice(0, cardsNeeded);
  const newDeck = state.deck.slice(cardsNeeded);

  return {
    ...state,
    hand: [...newHand, ...drawnCards],
    deck: newDeck,
    discardsRemaining: state.discardsRemaining - 1
  };
}

export function playCards(state: GameState, playedCardsIds: string[], scoreGained: number): GameState {
  if (state.handsRemaining <= 0 || state.status !== 'playing') return state;

  const newHand = state.hand.filter(card => !playedCardsIds.includes(card.id));
  const cardsNeeded = 8 - newHand.length;
  const drawnCards = state.deck.slice(0, cardsNeeded);
  const newDeck = state.deck.slice(cardsNeeded);

  const newScore = state.score + scoreGained;
  let newStatus: 'playing' | 'won' | 'lost' = state.status;

  if (newScore >= state.targetScore) {
    newStatus = 'won';
  } else if (state.handsRemaining - 1 === 0) {
    newStatus = 'lost';
  }

  return {
    ...state,
    hand: [...newHand, ...drawnCards],
    deck: newDeck,
    handsRemaining: state.handsRemaining - 1,
    score: newScore,
    status: newStatus
  };
}