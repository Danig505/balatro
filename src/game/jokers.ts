export interface Joker {
  id: string;
  name: string;
  description: string;
  cost: number;
  applyEffect: (currentFiches: number, currentMultiplier: number) => { fiches: number, multiplier: number };
}

export interface Voucher {
  id: string;
  name: string;
  description: string;
  cost: number;
}

export interface Pack {
  id: string;
  name: string;
  type: 'Joker' | 'Arcana' | 'Celestial' | 'Standard';
  cost: number;
}

export const AVAILABLE_JOKERS: Joker[] = [
  {
    id: 'jolly-base',
    name: 'Jolly Base',
    description: '+15 Fiches',
    cost: 3,
    applyEffect: (fiches, mult) => ({
      fiches: fiches + 15,
      multiplier: mult
    })
  },
  {
    id: 'jolly-matematico',
    name: 'Jolly Matematico',
    description: '+3 Moltiplicatore',
    cost: 5,
    applyEffect: (fiches, mult) => ({
      fiches: fiches,
      multiplier: mult + 3
    })
  },
  {
    id: 'jolly-supremo',
    name: 'Jolly Supremo',
    description: '+30 Fiches e +1 Moltiplicatore',
    cost: 8,
    applyEffect: (fiches, mult) => ({
      fiches: fiches + 30,
      multiplier: mult + 1
    })
  },
  {
    id: 'jolly-astuto',
    name: 'Jolly Astuto',
    description: '+10 Fiches e +2 Moltiplicatore',
    cost: 6,
    applyEffect: (fiches, mult) => ({
      fiches: fiches + 10,
      multiplier: mult + 2
    })
  },
  {
    id: 'jolly-pazzo',
    name: 'Jolly Pazzo',
    description: '+5 Moltiplicatore',
    cost: 7,
    applyEffect: (fiches, mult) => ({
      fiches: fiches,
      multiplier: mult + 5
    })
  },
  {
    id: 'jolly-pigro',
    name: 'Jolly Pigro',
    description: '+50 Fiches',
    cost: 6,
    applyEffect: (fiches, mult) => ({
      fiches: fiches + 50,
      multiplier: mult
    })
  },
  {
    id: 'jolly-grezzo',
    name: 'Jolly Grezzo',
    description: '+20 Fiches e +2 Moltiplicatore',
    cost: 7,
    applyEffect: (fiches, mult) => ({
      fiches: fiches + 20,
      multiplier: mult + 2
    })
  },
  {
    id: 'jolly-cosmico',
    name: 'Jolly Cosmico',
    description: '+10 Moltiplicatore, ma -10 Fiches',
    cost: 9,
    applyEffect: (fiches, mult) => ({
      fiches: Math.max(0, fiches - 10),
      multiplier: mult + 10
    })
  }
];