import { describe, it, expect } from 'vitest';
import { drawRandomCard, reshuffleAllDecks, resolveCardEffect } from './cardHandler';
import { GameCard } from '../constants/cards';
import { PlayerState } from '../types/game';

describe('🃏 Card Handler Tests', () => {
  const dummyPlayer: PlayerState = {
    id: 'p1',
    name: 'Player 1',
    avatar: '🎩',
    color: 'red',
    hexColor: '#EF4444',
    position: 7,
    money: 1000,
    inJail: false,
    jailTurns: 0,
    getOutOfJailFreeCards: 0,
    isBankrupt: false,
  };

  it('drawRandomCard returns valid Chance and Community Chest cards', () => {
    const chanceCard = drawRandomCard('chance');
    expect(chanceCard.type).toBe('chance');
    expect(chanceCard.title).toBeDefined();

    const chestCard = drawRandomCard('community');
    expect(chestCard.type).toBe('community');
    expect(chestCard.title).toBeDefined();
  });

  it('reshuffleAllDecks reloads and shuffles without throwing errors', () => {
    expect(() => reshuffleAllDecks()).not.toThrow();
  });

  it('resolveCardEffect correctly handles MONEY_REWARD and MONEY_PENALTY', () => {
    const rewardCard: GameCard = {
      id: 'c1',
      title: 'Thắng cổ phiếu',
      description: 'Nhận $200',
      type: 'chance',
      actionType: 'MONEY_REWARD',
      value: 200,
    };
    const resReward = resolveCardEffect(rewardCard, dummyPlayer);
    expect(resReward.newMoney).toBe(1200);

    const penaltyCard: GameCard = {
      id: 'c2',
      title: 'Đóng phạt viện phí',
      description: 'Nộp $150',
      type: 'community',
      actionType: 'MONEY_PENALTY',
      value: 150,
    };
    const resPenalty = resolveCardEffect(penaltyCard, dummyPlayer);
    expect(resPenalty.newMoney).toBe(850);
  });

  it('resolveCardEffect correctly handles MOVE_TO and JAIL', () => {
    const moveCard: GameCard = {
      id: 'c3',
      title: 'Tiến thẳng đến ô Khởi Hành',
      description: 'Di chuyển đến ô 0',
      type: 'chance',
      actionType: 'MOVE_TO',
      value: 0,
    };
    const resMove = resolveCardEffect(moveCard, dummyPlayer);
    expect(resMove.newPosition).toBe(0);

    const jailCard: GameCard = {
      id: 'c4',
      title: 'Vào tù ngay lập tức',
      description: 'Vào tù',
      type: 'chance',
      actionType: 'JAIL',
      value: 10,
    };
    const resJail = resolveCardEffect(jailCard, dummyPlayer);
    expect(resJail.sendToJail).toBe(true);
  });
});
