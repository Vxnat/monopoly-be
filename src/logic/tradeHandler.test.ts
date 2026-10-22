import { describe, it, expect } from 'vitest';
import {
  canTradeProperty,
  validateTrade,
  executeTrade,
  evaluateAiTradeDecision,
  TradeOffer,
} from './tradeHandler';
import { PlayerState, TileData } from '../types/game';

describe('🤝 Trade Handler Tests', () => {
  const p1: PlayerState = {
    id: 'p1',
    name: 'Player 1',
    avatar: 'char_male_a',
    color: 'red',
    hexColor: '#EF4444',
    position: 0,
    money: 1000,
    inJail: false,
    jailTurns: 0,
    getOutOfJailFreeCards: 1,
    isBankrupt: false,
  };

  const p2: PlayerState = {
    id: 'p2',
    name: 'AI Bot 2',
    avatar: 'char_female_a',
    color: 'blue',
    hexColor: '#3B82F6',
    position: 0,
    money: 1000,
    inJail: false,
    jailTurns: 0,
    getOutOfJailFreeCards: 0,
    isBankrupt: false,
    isAI: true,
  };

  const mockBoard: TileData[] = [
    { id: 0, name: 'GO', type: 'GO' },
    // Brown Group (id: 1, 3)
    { id: 1, name: 'Phố Cổ', type: 'PROPERTY', colorGroup: 'brown', price: 60, ownerId: 'p1', houses: 0 },
    { id: 2, name: 'Khí Vận', type: 'COMMUNITY_CHEST' },
    { id: 3, name: 'Quan Chưởng', type: 'PROPERTY', colorGroup: 'brown', price: 60, ownerId: 'p2', houses: 0 },
    // Light Blue Group (id: 6, 8, 9)
    { id: 6, name: 'Cầu Rồng', type: 'PROPERTY', colorGroup: 'light_blue', price: 100, ownerId: 'p1', houses: 1 },
    { id: 8, name: 'Sơn Trà', type: 'PROPERTY', colorGroup: 'light_blue', price: 100, ownerId: 'p1', houses: 1 },
    { id: 9, name: 'Mỹ Khê', type: 'PROPERTY', colorGroup: 'light_blue', price: 120, ownerId: 'p1', houses: 0 },
  ];

  it('canTradeProperty correctly allows unimproved property and blocks property with buildings in color group', () => {
    const brownTile = mockBoard.find((t) => t.id === 1)!;
    const lightBlueTile = mockBoard.find((t) => t.id === 9)!;

    // Brown 1 has 0 houses and Brown 3 has 0 houses -> can trade
    const checkBrown = canTradeProperty(brownTile, mockBoard);
    expect(checkBrown.canTrade).toBe(true);

    // Light Blue 9 has 0 houses, BUT Light Blue 6 & 8 have houses! -> cannot trade
    const checkLightBlue = canTradeProperty(lightBlueTile, mockBoard);
    expect(checkLightBlue.canTrade).toBe(false);
    expect(checkLightBlue.reason).toContain('công trình xây dựng');
  });

  it('validateTrade validates ownership, money, jail cards, and building restrictions', () => {
    const validOffer: TradeOffer = {
      senderId: 'p1',
      receiverId: 'p2',
      offeredTileIds: [1],
      requestedTileIds: [3],
      offeredMoney: 100,
      requestedMoney: 0,
      offeredJailCards: 1,
      requestedJailCards: 0,
    };

    const validResult = validateTrade(validOffer, [p1, p2], mockBoard);
    expect(validResult.isValid).toBe(true);

    // Invalid: sender offers more money than they have
    const brokeOffer: TradeOffer = { ...validOffer, offeredMoney: 5000 };
    expect(validateTrade(brokeOffer, [p1, p2], mockBoard).isValid).toBe(false);

    // Invalid: sender tries to trade property with houses in group (id: 9)
    const buildingOffer: TradeOffer = { ...validOffer, offeredTileIds: [9] };
    const buildingRes = validateTrade(buildingOffer, [p1, p2], mockBoard);
    expect(buildingRes.isValid).toBe(false);
    expect(buildingRes.reason).toContain('công trình');
  });

  it('executeTrade correctly transfers properties, money, and jail cards', () => {
    const offer: TradeOffer = {
      senderId: 'p1',
      receiverId: 'p2',
      offeredTileIds: [1],
      requestedTileIds: [3],
      offeredMoney: 200,
      requestedMoney: 50,
      offeredJailCards: 1,
      requestedJailCards: 0,
    };

    const { updatedPlayers, updatedBoard } = executeTrade(offer, [p1, p2], mockBoard);

    // Ownership swapped
    expect(updatedBoard[1].ownerId).toBe('p2');
    expect(updatedBoard[3].ownerId).toBe('p1');

    // Money transferred (p1: 1000 - 200 + 50 = 850, p2: 1000 - 50 + 200 = 1150)
    const updatedP1 = updatedPlayers.find((p) => p.id === 'p1')!;
    const updatedP2 = updatedPlayers.find((p) => p.id === 'p2')!;
    expect(updatedP1.money).toBe(850);
    expect(updatedP2.money).toBe(1150);

    // Jail cards transferred
    expect(updatedP1.getOutOfJailFreeCards).toBe(0);
    expect(updatedP2.getOutOfJailFreeCards).toBe(1);
  });

  it('evaluateAiTradeDecision strategically values Monopoly Sets and blockers', () => {
    // Case 1: AI (p2) is offered Brown 1, which completes Brown Monopoly Set for AI (since p2 already has Brown 3)!
    const offerCompletesSetForAi: TradeOffer = {
      senderId: 'p1',
      receiverId: 'p2',
      offeredTileIds: [1], // Gives Brown 1 to AI
      requestedTileIds: [],
      offeredMoney: 50,
      requestedMoney: 0,
      offeredJailCards: 0,
      requestedJailCards: 0,
    };

    const aiDecision1 = evaluateAiTradeDecision(offerCompletesSetForAi, [p1, p2], mockBoard);
    expect(aiDecision1.accept).toBe(true);
    expect(aiDecision1.score).toBeGreaterThan(0);

    // Case 2: P1 asks AI to give up Brown 3 (which would give P1 a Monopoly Set), but P1 offers almost nothing
    const badOfferForAi: TradeOffer = {
      senderId: 'p1',
      receiverId: 'p2',
      offeredTileIds: [],
      requestedTileIds: [3], // Requests Brown 3 from AI
      offeredMoney: 20,
      requestedMoney: 0,
      offeredJailCards: 0,
      requestedJailCards: 0,
    };

    const aiDecision2 = evaluateAiTradeDecision(badOfferForAi, [p1, p2], mockBoard);
    expect(aiDecision2.accept).toBe(false);
    expect(aiDecision2.score).toBeLessThan(0);
  });
});
