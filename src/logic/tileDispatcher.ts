import { TileData, PlayerState, GameLog } from '../types/game';
import { calculateRent } from './propertyHandler';
import { calculateTax } from './taxHandler';
import { drawRandomCard, resolveCardEffect } from './cardHandler';

export type TileActionResolution =
  | {
      action: 'PROMPT_BUY';
      tile: TileData;
      log: GameLog;
    }
  | {
      action: 'PAY_RENT';
      tile: TileData;
      tenantId: string;
      landlordId: string;
      amount: number;
      log: GameLog;
    }
  | {
      action: 'PAY_TAX';
      amount: number;
      log: GameLog;
    }
  | {
      action: 'DRAW_CARD';
      card: ReturnType<typeof drawRandomCard>;
      cardEffect: ReturnType<typeof resolveCardEffect>;
      log: GameLog;
    }
  | {
      action: 'GO_TO_JAIL';
      log: GameLog;
    }
  | {
      action: 'NO_ACTION';
      log?: GameLog;
    };

/**
 * 🎯 TILE EVENT DISPATCHER
 * Nhận thông tin ô vừa đáp xuống và điều phối xử lý theo đúng chuyên môn của từng Handler
 */
export function dispatchTileEvent(
  tile: TileData,
  player: PlayerState,
  allPlayers: PlayerState[],
  allBoard: TileData[],
  diceRoll?: number
): TileActionResolution {
  const timestamp = Date.now();

  // 1. Ô Đất / Ga tàu / Tiện ích (PROPERTY, STATION, UTILITY)
  if (tile.type === 'PROPERTY' || tile.type === 'STATION' || tile.type === 'UTILITY') {
    if (!tile.ownerId) {
      // Đất chưa có chủ -> Yêu cầu mở Modal hỏi mua
      return {
        action: 'PROMPT_BUY',
        tile,
        log: {
          id: `log_${timestamp}_buy`,
          timestamp,
          message: `${player.name} dừng chân tại ${tile.name} (Giá: $${tile.price})`,
          type: 'info',
          playerId: player.id,
        },
      };
    } else if (tile.ownerId !== player.id) {
      // Đất của đối thủ -> Tính tiền thuê và trả tiền
      const landlord = allPlayers.find((p) => p.id === tile.ownerId);
      if (landlord && !tile.isMortgaged) {
        const rawRent = calculateRent(tile, allBoard, landlord, diceRoll);

        return {
          action: 'PAY_RENT',
          tile,
          tenantId: player.id,
          landlordId: landlord.id,
          amount: rawRent,
          log: {
            id: `log_${timestamp}_rent`,
            timestamp,
            message: `${player.name} dừng chân tại ${tile.name} của ${landlord.name} (Tiền thuê: $${rawRent})`,
            type: 'rent',
            playerId: player.id,
          },
        };
      }
    } else {
      // Đất của chính mình
      return {
        action: 'NO_ACTION',
        log: {
          id: `log_${timestamp}_self`,
          timestamp,
          message: `${player.name} ghé thăm mảnh đất ${tile.name} của chính mình.`,
          type: 'info',
          playerId: player.id,
        },
      };
    }
  }

  // 2. Ô Thuế (TAX)
  if (tile.type === 'TAX') {
    const { taxAmount } = calculateTax(tile, player);
    return {
      action: 'PAY_TAX',
      amount: taxAmount,
      log: {
        id: `log_${timestamp}_tax`,
        timestamp,
        message: `${player.name} dừng chân tại ô Thuế (Cần nộp $${taxAmount})`,
        type: 'tax',
        playerId: player.id,
      },
    };
  }

  // 3. Ô Vào Tù (GO_TO_JAIL)
  if (tile.type === 'GO_TO_JAIL') {
    return {
      action: 'GO_TO_JAIL',
      log: {
        id: `log_${timestamp}_jail`,
        timestamp,
        message: `${player.name} bước vào ô Vào Tù và bị bắt giam ngay lập tức!`,
        type: 'jail',
        playerId: player.id,
      },
    };
  }

  // 4. Ô Cơ Hội / Khí Vận (CHANCE / COMMUNITY_CHEST)
  if (tile.type === 'CHANCE' || tile.type === 'COMMUNITY_CHEST') {
    const cardType = tile.type === 'CHANCE' ? 'chance' : 'community';
    const card = drawRandomCard(cardType);
    const cardEffect = resolveCardEffect(card, player);

    return {
      action: 'DRAW_CARD',
      card,
      cardEffect,
      log: {
        id: `log_${timestamp}_card`,
        timestamp,
        message: `${player.name} bốc được thẻ [${card.title}]: ${card.description}`,
        type: 'chance',
        playerId: player.id,
      },
    };
  }

  // 5. Ô Góc thông thường (GO, FREE_PARKING, JAIL Visiting)
  return {
    action: 'NO_ACTION',
  };
}
