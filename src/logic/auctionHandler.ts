import { TileData, PlayerState, AuctionState } from '../types/game';
import { getColorGroupTiles } from './propertyHandler';

/**
 * 🔨 AUCTION HANDLER - Quản lý toàn bộ phiên đấu giá Bất Động Sản chuẩn Monopoly Plus
 */

/**
 * Khởi tạo phiên đấu giá mới cho một ô đất
 */
export function createAuction(
  tile: TileData,
  activePlayers: PlayerState[]
): AuctionState {
  const eligibleBidders = activePlayers
    .filter((p) => !p.isBankrupt && p.money >= 10)
    .map((p) => p.id);

  return {
    tileId: tile.id,
    currentBid: 0,
    highestBidderId: null,
    activeBidderIds: eligibleBidders,
    minIncrement: 10,
    history: [],
  };
}

/**
 * Người chơi đặt mức giá mới
 */
export function placeBid(
  auction: AuctionState,
  playerId: string,
  bidAmount: number,
  playerMoney: number
): { valid: boolean; newAuction?: AuctionState; reason?: string } {
  if (!auction.activeBidderIds.includes(playerId)) {
    return { valid: false, reason: 'Bạn đã rút lui khỏi phiên đấu giá này!' };
  }

  const minRequiredBid = auction.highestBidderId
    ? auction.currentBid + auction.minIncrement
    : 10;

  if (bidAmount < minRequiredBid) {
    return {
      valid: false,
      reason: `Mức giá tối thiểu hợp lệ là $${minRequiredBid}!`,
    };
  }

  if (playerMoney < bidAmount) {
    return {
      valid: false,
      reason: `Bạn không đủ tiền mặt ($${playerMoney}) để đặt mức giá $${bidAmount}!`,
    };
  }

  const newAuction: AuctionState = {
    ...auction,
    currentBid: bidAmount,
    highestBidderId: playerId,
    history: [
      {
        playerId,
        amount: bidAmount,
        timestamp: Date.now(),
      },
      ...auction.history,
    ],
  };

  return { valid: true, newAuction };
}

/**
 * Người chơi rút lui khỏi phiên đấu giá
 */
export function foldAuction(
  auction: AuctionState,
  playerId: string
): { newAuction: AuctionState; isEnded: boolean; winnerId: string | null } {
  const updatedActiveBidders = auction.activeBidderIds.filter((id) => id !== playerId);

  const newAuction: AuctionState = {
    ...auction,
    activeBidderIds: updatedActiveBidders,
  };

  // Phiên đấu giá kết thúc khi:
  // 1. Chỉ còn 1 người duy nhất và người đó đang là người trả giá cao nhất
  if (updatedActiveBidders.length === 1 && auction.highestBidderId === updatedActiveBidders[0]) {
    return {
      newAuction,
      isEnded: true,
      winnerId: auction.highestBidderId,
    };
  }

  // 2. Toàn bộ người chơi đều rút lui
  if (updatedActiveBidders.length === 0) {
    return {
      newAuction,
      isEnded: true,
      winnerId: auction.highestBidderId,
    };
  }

  return {
    newAuction,
    isEnded: false,
    winnerId: null,
  };
}

/**
 * Trí tuệ nhân tạo (Bot AI) đánh giá giá trị ô đất và đưa ra quyết định đấu giá
 */
export function getAiBidDecision(
  auction: AuctionState,
  bot: PlayerState,
  tile: TileData,
  allBoard: TileData[],
  allPlayers: PlayerState[]
): { shouldBid: boolean; bidAmount: number } {
  // Nếu bot không còn trong danh sách đấu giá hoặc là người đang giữ giá cao nhất
  if (!auction.activeBidderIds.includes(bot.id) || auction.highestBidderId === bot.id) {
    return { shouldBid: false, bidAmount: 0 };
  }

  const basePrice = tile.price || 100;
  let strategicMultiplier = 1.0;

  if (tile.type === 'PROPERTY' && tile.colorGroup) {
    const groupTiles = getColorGroupTiles(tile.colorGroup, allBoard);
    const botOwnedInGroup = groupTiles.filter((t) => t.ownerId === bot.id).length;
    const remainingInGroup = groupTiles.length - botOwnedInGroup;

    // Nếu mua ô này giúp Bot hoàn thành trọn bộ màu (Monopoly Set) -> Sẵn sàng trả giá rất cao (160%)
    if (remainingInGroup === 1 && botOwnedInGroup > 0) {
      strategicMultiplier = 1.6;
    } else if (botOwnedInGroup > 0) {
      strategicMultiplier = 1.25;
    }

    // Kiểm tra xem có đối thủ nào sắp gom đủ bộ màu không -> Đấu giá chặn đầu (Blocker)
    const opponents = allPlayers.filter((p) => p.id !== bot.id && !p.isBankrupt);
    for (const opp of opponents) {
      const oppOwned = groupTiles.filter((t) => t.ownerId === opp.id).length;
      if (oppOwned === groupTiles.length - 1) {
        // Đối thủ chỉ thiếu ô này là gom đủ bộ!
        strategicMultiplier = Math.max(strategicMultiplier, 1.45);
        break;
      }
    }
  } else if (tile.type === 'STATION') {
    const botStations = allBoard.filter((t) => t.type === 'STATION' && t.ownerId === bot.id).length;
    strategicMultiplier = 1.0 + botStations * 0.25; // Càng nhiều ga càng có giá trị
  }

  // Mức giá trần tối đa mà Bot sẵn sàng chi trả (giữ lại ít nhất $100 dự phòng)
  const maxWillingPrice = Math.min(
    bot.money - 100,
    Math.floor(basePrice * strategicMultiplier)
  );

  const nextMinBid = auction.highestBidderId
    ? auction.currentBid + auction.minIncrement
    : 10;

  // Quyết định đặt thêm $10 hoặc $20 tùy mức độ muốn sở hữu
  if (nextMinBid <= maxWillingPrice && bot.money >= nextMinBid) {
    const jump = strategicMultiplier > 1.4 && bot.money >= nextMinBid + 20 ? 20 : 10;
    const bidAmount = Math.min(maxWillingPrice, nextMinBid + jump - 10);
    return { shouldBid: true, bidAmount: Math.max(nextMinBid, bidAmount) };
  }

  return { shouldBid: false, bidAmount: 0 };
}
