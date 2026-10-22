import { describe, it, expect } from 'vitest';
import {
  calculateRent,
  canBuyProperty,
  canUpgradeProperty,
  canSellHouse,
  hasMonopolySet,
  getColorGroupTiles,
} from './propertyHandler';
import { TileData, PlayerState } from '../types/game';

describe('🏠 Property Handler Tests - Step 1.1 Monopoly Rules', () => {
  const player1: PlayerState = {
    id: 'p1',
    name: 'Player 1',
    avatar: '🎩',
    color: 'red',
    hexColor: '#EF4444',
    position: 1,
    money: 1500,
    inJail: false,
    jailTurns: 0,
    getOutOfJailFreeCards: 0,
    isBankrupt: false,
  };

  const player2: PlayerState = {
    id: 'p2',
    name: 'Player 2',
    avatar: '🚗',
    color: 'blue',
    hexColor: '#3B82F6',
    position: 3,
    money: 1000,
    inJail: false,
    jailTurns: 0,
    getOutOfJailFreeCards: 0,
    isBankrupt: false,
  };

  const brownTile1: TileData = {
    id: 1,
    name: 'Phố Cổ Đồng Xuân',
    type: 'PROPERTY',
    colorGroup: 'brown',
    price: 60,
    rent: [2, 10, 30, 90, 160, 250],
    houseCost: 50,
    ownerId: null,
    houses: 0,
  };

  const brownTile2: TileData = {
    id: 3,
    name: 'Hàng Đào Phồn Hoa',
    type: 'PROPERTY',
    colorGroup: 'brown',
    price: 60,
    rent: [4, 20, 60, 180, 320, 450],
    houseCost: 50,
    ownerId: null,
    houses: 0,
  };

  describe('1. Monopoly Set Validation (hasMonopolySet)', () => {
    it('should return false when color group is partially owned', () => {
      const board = [
        { ...brownTile1, ownerId: 'p1' },
        { ...brownTile2, ownerId: 'p2' },
      ];
      expect(hasMonopolySet(player1, 'brown', board)).toBe(false);
    });

    it('should return false when an unowned tile exists in group', () => {
      const board = [
        { ...brownTile1, ownerId: 'p1' },
        { ...brownTile2, ownerId: null },
      ];
      expect(hasMonopolySet(player1, 'brown', board)).toBe(false);
    });

    it('should return true when player owns all tiles in color group', () => {
      const board = [
        { ...brownTile1, ownerId: 'p1' },
        { ...brownTile2, ownerId: 'p1' },
      ];
      expect(hasMonopolySet(player1, 'brown', board)).toBe(true);
    });
  });

  describe('2. Double Rent on Unimproved Monopoly Sets (calculateRent)', () => {
    it('should charge standard base rent when monopoly set is NOT completed', () => {
      const t1 = { ...brownTile1, ownerId: 'p1', houses: 0 };
      const t2 = { ...brownTile2, ownerId: 'p2', houses: 0 };
      const board = [t1, t2];

      expect(calculateRent(t1, board, player1)).toBe(2);
    });

    it('should double the base rent when landlord owns full color set (unimproved)', () => {
      const t1 = { ...brownTile1, ownerId: 'p1', houses: 0 };
      const t2 = { ...brownTile2, ownerId: 'p1', houses: 0 };
      const board = [t1, t2];

      // Base rent of brownTile1 is $2, doubled is $4
      expect(calculateRent(t1, board, player1)).toBe(4);
      // Base rent of brownTile2 is $4, doubled is $8
      expect(calculateRent(t2, board, player1)).toBe(8);
    });

    it('should NOT double rent when houses are built (use house rent tier instead)', () => {
      const t1 = { ...brownTile1, ownerId: 'p1', houses: 1 };
      const t2 = { ...brownTile2, ownerId: 'p1', houses: 1 };
      const board = [t1, t2];

      // 1 house on brownTile1 = $10 (not doubled)
      expect(calculateRent(t1, board, player1)).toBe(10);
    });

    it('should return 0 rent if property is mortgaged', () => {
      const t1 = { ...brownTile1, ownerId: 'p1', houses: 0, isMortgaged: true };
      const t2 = { ...brownTile2, ownerId: 'p1', houses: 0 };
      const board = [t1, t2];

      expect(calculateRent(t1, board, player1)).toBe(0);
    });
  });

  describe('3. Even Building Rule (canUpgradeProperty)', () => {
    it('should disallow building if player does not own the entire color group', () => {
      const t1 = { ...brownTile1, ownerId: 'p1', houses: 0 };
      const t2 = { ...brownTile2, ownerId: 'p2', houses: 0 };
      const board = [t1, t2];

      const result = canUpgradeProperty(t1, board, player1);
      expect(result.canUpgrade).toBe(false);
      expect(result.reason).toContain('gom đủ toàn bộ các ô trong nhóm màu');
    });

    it('should disallow building if any tile in the group is mortgaged', () => {
      const t1 = { ...brownTile1, ownerId: 'p1', houses: 0 };
      const t2 = { ...brownTile2, ownerId: 'p1', houses: 0, isMortgaged: true };
      const board = [t1, t2];

      const result = canUpgradeProperty(t1, board, player1);
      expect(result.canUpgrade).toBe(false);
      expect(result.reason).toContain('đang bị thế chấp');
    });

    it('should allow building first house when full set is owned and even', () => {
      const t1 = { ...brownTile1, ownerId: 'p1', houses: 0 };
      const t2 = { ...brownTile2, ownerId: 'p1', houses: 0 };
      const board = [t1, t2];

      expect(canUpgradeProperty(t1, board, player1).canUpgrade).toBe(true);
      expect(canUpgradeProperty(t2, board, player1).canUpgrade).toBe(true);
    });

    it('should enforce Even Building rule: cannot build 2nd house on t1 until t2 has 1 house', () => {
      const t1 = { ...brownTile1, ownerId: 'p1', houses: 1 };
      const t2 = { ...brownTile2, ownerId: 'p1', houses: 0 };
      const board = [t1, t2];

      // t1 already has 1 house, t2 has 0 -> Cannot upgrade t1
      const resultT1 = canUpgradeProperty(t1, board, player1);
      expect(resultT1.canUpgrade).toBe(false);
      expect(resultT1.reason).toContain('Quy tắc xây đều');

      // t2 has 0 houses -> CAN upgrade t2
      const resultT2 = canUpgradeProperty(t2, board, player1);
      expect(resultT2.canUpgrade).toBe(true);
    });

    it('should reject upgrade when maximum hotel capacity (5 houses) is reached', () => {
      const t1 = { ...brownTile1, ownerId: 'p1', houses: 5 };
      const t2 = { ...brownTile2, ownerId: 'p1', houses: 5 };
      const board = [t1, t2];

      const result = canUpgradeProperty(t1, board, player1);
      expect(result.canUpgrade).toBe(false);
      expect(result.reason).toContain('Đã đạt cấp tối đa');
    });

    it('should reject upgrade when player does not have enough money', () => {
      const brokePlayer = { ...player1, money: 30 };
      const t1 = { ...brownTile1, ownerId: 'p1', houses: 0 };
      const t2 = { ...brownTile2, ownerId: 'p1', houses: 0 };
      const board = [t1, t2];

      const result = canUpgradeProperty(t1, board, brokePlayer);
      expect(result.canUpgrade).toBe(false);
      expect(result.reason).toContain('Không đủ tiền xây nhà');
    });
  });

  describe('4. Even Selling Rule (canSellHouse)', () => {
    it('should disallow selling if property has 0 houses', () => {
      const t1 = { ...brownTile1, ownerId: 'p1', houses: 0 };
      const board = [t1];

      const result = canSellHouse(t1, board, player1);
      expect(result.canSell).toBe(false);
    });

    it('should disallow selling from a property that has fewer houses than others in group', () => {
      const t1 = { ...brownTile1, ownerId: 'p1', houses: 1 };
      const t2 = { ...brownTile2, ownerId: 'p1', houses: 2 };
      const board = [t1, t2];

      // Cannot sell from t1 (1 house) while t2 has 2 houses
      const resultT1 = canSellHouse(t1, board, player1);
      expect(resultT1.canSell).toBe(false);
      expect(resultT1.reason).toContain('Quy tắc bán đều');

      // Can sell from t2 (2 houses)
      const resultT2 = canSellHouse(t2, board, player1);
      expect(resultT2.canSell).toBe(true);
    });
  });

  describe('5. Station & Utility Rent Scaling', () => {
    it('calculateRent doubles stations rent according to number of owned stations', () => {
      const station1: TileData = { id: 5, name: 'Ga Hà Nội', type: 'STATION', price: 200, rent: [25], ownerId: 'p1' };
      const station2: TileData = { id: 15, name: 'Ga Sài Gòn', type: 'STATION', price: 200, rent: [25], ownerId: 'p1' };
      const station3: TileData = { id: 25, name: 'Ga Đà Nẵng', type: 'STATION', price: 200, rent: [25], ownerId: 'p1' };
      const board = [station1, station2, station3];

      // 1 station owned -> $25
      expect(calculateRent(station1, [station1], player1)).toBe(25);

      // 3 stations owned -> $25 * 2^2 = $100
      expect(calculateRent(station1, board, player1)).toBe(100);
    });

    it('calculateRent scales utility rent by dice roll (x4 for 1 utility, x10 for both utilities)', () => {
      const utilityElectric: TileData = { id: 12, name: 'Điện Lực', type: 'UTILITY', price: 150, ownerId: 'p1' };
      const utilityWater: TileData = { id: 28, name: 'Cấp Nước', type: 'UTILITY', price: 150, ownerId: 'p1' };

      // Case 1: Landlord owns only 1 utility (dice roll 7 -> 7 * 4 = 28, dice roll 10 -> 10 * 4 = 40)
      const boardOneUtility = [utilityElectric, { ...utilityWater, ownerId: null }];
      expect(calculateRent(utilityElectric, boardOneUtility, player1, 7)).toBe(28);
      expect(calculateRent(utilityElectric, boardOneUtility, player1, 10)).toBe(40);

      // Case 2: Landlord owns BOTH utilities (dice roll 7 -> 7 * 10 = 70, dice roll 12 -> 12 * 10 = 120)
      const boardBothUtilities = [utilityElectric, utilityWater];
      expect(calculateRent(utilityElectric, boardBothUtilities, player1, 7)).toBe(70);
      expect(calculateRent(utilityWater, boardBothUtilities, player1, 12)).toBe(120);

      // Case 3: Utility is mortgaged -> rent is 0
      const boardMortgaged = [{ ...utilityElectric, isMortgaged: true }, utilityWater];
      expect(calculateRent(boardMortgaged[0], boardMortgaged, player1, 7)).toBe(0);
    });
  });

  describe('6. Bank Housing Shortage Rule (canUpgradeProperty with finite supply)', () => {
    it('disallows building houses when bank has 0 houses left in supply', () => {
      const t1 = { ...brownTile1, ownerId: 'p1', houses: 0 };
      const t2 = { ...brownTile2, ownerId: 'p1', houses: 0 };
      const board = [t1, t2];

      // Bank has 0 houses left!
      const result = canUpgradeProperty(t1, board, player1, 0, 12);
      expect(result.canUpgrade).toBe(false);
      expect(result.reason).toContain('hết nhà trong kho');
    });

    it('disallows upgrading to hotel when bank has 0 hotels left in supply', () => {
      const t1 = { ...brownTile1, ownerId: 'p1', houses: 4 };
      const t2 = { ...brownTile2, ownerId: 'p1', houses: 4 };
      const board = [t1, t2];

      // Bank has 10 houses left, but 0 hotels!
      const result = canUpgradeProperty(t1, board, player1, 10, 0);
      expect(result.canUpgrade).toBe(false);
      expect(result.reason).toContain('hết khách sạn trong kho');
    });

    it('allows house and hotel construction when bank supply is available', () => {
      const t1 = { ...brownTile1, ownerId: 'p1', houses: 0 };
      const t2 = { ...brownTile2, ownerId: 'p1', houses: 0 };
      const board = [t1, t2];

      // Bank has plenty of houses and hotels
      expect(canUpgradeProperty(t1, board, player1, 32, 12).canUpgrade).toBe(true);

      // Upgrading from 4 houses to hotel with 1 hotel available
      const t1FourHouses = { ...brownTile1, ownerId: 'p1', houses: 4 };
      const t2FourHouses = { ...brownTile2, ownerId: 'p1', houses: 4 };
      expect(canUpgradeProperty(t1FourHouses, [t1FourHouses, t2FourHouses], player1, 5, 1).canUpgrade).toBe(true);
    });
  });
});
