import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS, GameCard } from '../constants/cards';
import { PlayerState } from '../types/game';
import { CardDeck } from '../utils/random';

/**
 * 🃏 CARD HANDLER - Quản lý Chồng Thẻ Bài với Thuật toán Fisher–Yates Shuffle
 */

// Khởi tạo 2 xấp bài được xáo bài ngẫu nhiên chuẩn xác ngay từ đầu game
const chanceDeck = new CardDeck<GameCard>(CHANCE_CARDS);
const communityDeck = new CardDeck<GameCard>(COMMUNITY_CHEST_CARDS);

/**
 * Rút 1 lá bài từ xấp bài tương ứng (đã xáo chuẩn Fisher–Yates)
 */
export function drawRandomCard(type: 'chance' | 'community'): GameCard {
  return type === 'chance' ? chanceDeck.draw() : communityDeck.draw();
}

/**
 * Xáo lại toàn bộ bài khi bắt đầu ván đấu mới
 */
export function reshuffleAllDecks(): void {
  chanceDeck.reshuffle();
  communityDeck.reshuffle();
}

/**
 * Tính toán hiệu ứng của thẻ bài đối với người chơi
 */
export function resolveCardEffect(card: GameCard, player: PlayerState): {
  newMoney: number;
  newPosition?: number;
  sendToJail?: boolean;
  getOutOfJailCard?: boolean;
} {
  let newMoney = player.money;
  let newPosition: number | undefined = undefined;
  let sendToJail = false;
  let getOutOfJailCard = false;

  switch (card.actionType) {
    case 'MONEY_REWARD':
      newMoney += card.value;
      break;

    case 'MONEY_PENALTY':
      newMoney = Math.max(0, newMoney - card.value);
      break;

    case 'MOVE_TO':
      newPosition = card.value;
      break;

    case 'JAIL':
      sendToJail = true;
      break;

    case 'GET_OUT_OF_JAIL':
      getOutOfJailCard = true;
      break;

    default:
      break;
  }

  return { newMoney, newPosition, sendToJail, getOutOfJailCard };
}
