import { describe, it, expect } from 'vitest';
import { calculateTax } from './taxHandler';
import { TileData, PlayerState } from '../types/game';

describe('🏛️ Tax Handler Tests', () => {
  const player: PlayerState = {
    id: 'p1',
    name: 'Player 1',
    avatar: '🎩',
    color: 'red',
    hexColor: '#EF4444',
    position: 4,
    money: 1500,
    inJail: false,
    jailTurns: 0,
    getOutOfJailFreeCards: 0,
    isBankrupt: false,
  };

  it('calculates full tax when player has sufficient funds', () => {
    const incomeTaxTile: TileData = { id: 4, name: 'Thuế Thu Nhập', type: 'TAX', price: 200 };
    const result = calculateTax(incomeTaxTile, player);
    expect(result.taxAmount).toBe(200);
    expect(result.actualDeducted).toBe(200);
  });

  it('caps actualDeducted to player wallet balance when funds are insufficient', () => {
    const poorPlayer: PlayerState = { ...player, money: 50 };
    const incomeTaxTile: TileData = { id: 4, name: 'Thuế Thu Nhập', type: 'TAX', price: 200 };
    const result = calculateTax(incomeTaxTile, poorPlayer);
    expect(result.taxAmount).toBe(200);
    expect(result.actualDeducted).toBe(50);
  });
});
