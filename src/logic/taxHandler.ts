import { TileData, PlayerState } from '../types/game';
import { GAME_CONFIG } from '../constants/gameConfig';

/**
 * 🏛️ TAX HANDLER - Xử lý logic tính thuế và trừ tiền
 */
export function calculateTax(tile: TileData, player: PlayerState): { taxAmount: number; actualDeducted: number } {
  const taxAmount = tile.price || GAME_CONFIG.INCOME_TAX_AMOUNT;
  const actualDeducted = Math.min(player.money, taxAmount);
  return {
    taxAmount,
    actualDeducted,
  };
}
