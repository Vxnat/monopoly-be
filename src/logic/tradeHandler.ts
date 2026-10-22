import { PlayerState, TileData } from '../types/game';
import { getColorGroupTiles, hasMonopolySet } from './propertyHandler';

/**
 * 🤝 TRADE HANDLER - Quản lý Hệ Thống Giao Dịch & Đàm Phán Chuẩn Monopoly Plus
 */

export interface TradeOffer {
  senderId: string;
  receiverId: string;
  offeredTileIds: number[];
  requestedTileIds: number[];
  offeredMoney: number;
  requestedMoney: number;
  offeredJailCards: number;
  requestedJailCards: number;
}

export interface TradeValidationResult {
  isValid: boolean;
  reason?: string;
}

export interface AiTradeDecisionResult {
  accept: boolean;
  reason: string;
  score: number;
  valueReceived: number;
  valueGiven: number;
  suggestedCashExtra?: number;
}

/**
 * Kiểm tra xem một ô đất có đủ điều kiện để đem ra giao dịch không.
 * Theo luật chuẩn Monopoly:
 * "Không được phép giao dịch bất kỳ ô đất nào nếu trong cùng nhóm màu còn nhà hoặc khách sạn.
 *  Người chơi phải bán hết toàn bộ nhà/khách sạn về Ngân Hàng trước khi trao đổi!"
 */
export function canTradeProperty(
  tile: TileData,
  allBoard: TileData[]
): { canTrade: boolean; reason?: string } {
  if (!tile) {
    return { canTrade: false, reason: 'Ô đất không tồn tại' };
  }
  if (tile.type !== 'PROPERTY' && tile.type !== 'STATION' && tile.type !== 'UTILITY') {
    return { canTrade: false, reason: 'Ô này không phải là tài sản có thể giao dịch' };
  }

  // Nếu là ô đất thuộc nhóm màu
  if (tile.type === 'PROPERTY' && tile.colorGroup) {
    const groupTiles = getColorGroupTiles(tile.colorGroup, allBoard);
    const hasBuildings = groupTiles.some((t) => (t.houses || 0) > 0);
    if (hasBuildings) {
      return {
        canTrade: false,
        reason: `Khu đất màu [${tile.colorGroup}] vẫn còn công trình xây dựng. Phải dỡ/bán hết nhà trước khi giao dịch!`,
      };
    }
  }

  return { canTrade: true };
}

/**
 * Xác thực tính hợp lệ của toàn bộ gói đề xuất giao dịch
 */
export function validateTrade(
  offer: TradeOffer,
  players: PlayerState[],
  board: TileData[]
): TradeValidationResult {
  const sender = players.find((p) => p.id === offer.senderId);
  const receiver = players.find((p) => p.id === offer.receiverId);

  if (!sender || !receiver) {
    return { isValid: false, reason: 'Người chơi hoặc đối tác không tồn tại!' };
  }

  if (sender.isBankrupt || receiver.isBankrupt) {
    return { isValid: false, reason: 'Người chơi đã phá sản không thể tham gia giao dịch!' };
  }

  if (sender.id === receiver.id) {
    return { isValid: false, reason: 'Không thể tự giao dịch với chính mình!' };
  }

  // Kiểm tra tiền mặt
  if (offer.offeredMoney < 0 || offer.requestedMoney < 0) {
    return { isValid: false, reason: 'Số tiền giao dịch không được âm!' };
  }
  if (sender.money < offer.offeredMoney) {
    return { isValid: false, reason: `Bạn không đủ tiền mặt (Có $${sender.money}, đưa ra $${offer.offeredMoney})` };
  }
  if (receiver.money < offer.requestedMoney) {
    return { isValid: false, reason: `Đối phương không đủ tiền mặt (Có $${receiver.money}, yêu cầu $${offer.requestedMoney})` };
  }

  // Kiểm tra Thẻ Miễn Đi Tù
  if (offer.offeredJailCards < 0 || offer.requestedJailCards < 0) {
    return { isValid: false, reason: 'Số lượng thẻ tù không hợp lệ!' };
  }
  if ((sender.getOutOfJailFreeCards || 0) < offer.offeredJailCards) {
    return { isValid: false, reason: 'Bạn không có đủ số Thẻ Miễn Đi Tù đã đưa ra!' };
  }
  if ((receiver.getOutOfJailFreeCards || 0) < offer.requestedJailCards) {
    return { isValid: false, reason: 'Đối phương không có đủ số Thẻ Miễn Đi Tù yêu cầu!' };
  }

  // Kiểm tra quyền sở hữu đất
  for (const tileId of offer.offeredTileIds) {
    const tile = board.find((t) => t.id === tileId);
    if (!tile || tile.ownerId !== sender.id) {
      return { isValid: false, reason: `Bạn không sở hữu ô [${tile?.name || tileId}] để giao dịch!` };
    }
    const tradeCheck = canTradeProperty(tile, board);
    if (!tradeCheck.canTrade) {
      return { isValid: false, reason: tradeCheck.reason };
    }
  }

  for (const tileId of offer.requestedTileIds) {
    const tile = board.find((t) => t.id === tileId);
    if (!tile || tile.ownerId !== receiver.id) {
      return { isValid: false, reason: `Đối tác không sở hữu ô [${tile?.name || tileId}]!` };
    }
    const tradeCheck = canTradeProperty(tile, board);
    if (!tradeCheck.canTrade) {
      return { isValid: false, reason: tradeCheck.reason };
    }
  }

  // Kiểm tra ít nhất một bên có trao đổi tài sản
  const hasOfferedAssets =
    offer.offeredTileIds.length > 0 || offer.offeredMoney > 0 || offer.offeredJailCards > 0;
  const hasRequestedAssets =
    offer.requestedTileIds.length > 0 || offer.requestedMoney > 0 || offer.requestedJailCards > 0;

  if (!hasOfferedAssets && !hasRequestedAssets) {
    return { isValid: false, reason: 'Giao dịch trống! Vui lòng chọn tài sản để trao đổi.' };
  }

  return { isValid: true };
}

/**
 * Thực hiện chuyển giao toàn bộ tài sản sau khi giao dịch được đồng thuận
 */
export function executeTrade(
  offer: TradeOffer,
  players: PlayerState[],
  board: TileData[]
): { updatedPlayers: PlayerState[]; updatedBoard: TileData[] } {
  const updatedBoard = board.map((tile) => {
    if (offer.offeredTileIds.includes(tile.id)) {
      return { ...tile, ownerId: offer.receiverId };
    }
    if (offer.requestedTileIds.includes(tile.id)) {
      return { ...tile, ownerId: offer.senderId };
    }
    return tile;
  });

  const updatedPlayers = players.map((p) => {
    if (p.id === offer.senderId) {
      return {
        ...p,
        money: p.money - offer.offeredMoney + offer.requestedMoney,
        getOutOfJailFreeCards:
          (p.getOutOfJailFreeCards || 0) - offer.offeredJailCards + offer.requestedJailCards,
      };
    }
    if (p.id === offer.receiverId) {
      return {
        ...p,
        money: p.money - offer.requestedMoney + offer.offeredMoney,
        getOutOfJailFreeCards:
          (p.getOutOfJailFreeCards || 0) - offer.requestedJailCards + offer.offeredJailCards,
      };
    }
    return p;
  });

  return { updatedPlayers, updatedBoard };
}

/**
 * 🤖 AI BOT TRADE DECISION - Đánh giá đề xuất giao dịch với tư duy chiến lược
 */
export function evaluateAiTradeDecision(
  offer: TradeOffer,
  players: PlayerState[],
  board: TileData[]
): AiTradeDecisionResult {
  const sender = players.find((p) => p.id === offer.senderId);
  const bot = players.find((p) => p.id === offer.receiverId);

  if (!bot || !sender) {
    return { accept: false, reason: 'Lỗi thông tin người chơi', score: 0, valueReceived: 0, valueGiven: 0 };
  }

  // 1. TÍNH TỔNG GIÁ TRỊ TÀI SẢN BOT NHẬN ĐƯỢC (Value Received)
  let valueReceived = offer.offeredMoney + offer.offeredJailCards * 50;

  for (const tileId of offer.offeredTileIds) {
    const tile = board.find((t) => t.id === tileId);
    if (!tile) continue;

    const basePrice = tile.price || 100;
    let tileValue = tile.isMortgaged ? basePrice * 0.6 : basePrice;

    // Bonus chiến lược theo nhóm màu
    if (tile.type === 'PROPERTY' && tile.colorGroup) {
      const groupTiles = getColorGroupTiles(tile.colorGroup, board);
      const botOwnedCount = groupTiles.filter((t) => t.ownerId === bot.id).length;
      const totalInGroup = groupTiles.length;

      // Nếu ô đất này giúp Bot hoàn thành Monopoly Set (Full bộ màu)!
      if (botOwnedCount + 1 === totalInGroup) {
        tileValue += 300 + basePrice * 1.5;
      } else if (botOwnedCount + 1 === totalInGroup - 1) {
        // Có 2/3 ô
        tileValue += 100;
      }
    } else if (tile.type === 'STATION') {
      const botStations = board.filter((t) => t.type === 'STATION' && t.ownerId === bot.id).length;
      tileValue += botStations * 60;
    }

    valueReceived += tileValue;
  }

  // 2. TÍNH TỔNG GIÁ TRỊ TÀI SẢN BOT PHẢI TRAO ĐI (Value Given)
  let valueGiven = offer.requestedMoney + offer.requestedJailCards * 50;

  for (const tileId of offer.requestedTileIds) {
    const tile = board.find((t) => t.id === tileId);
    if (!tile) continue;

    const basePrice = tile.price || 100;
    let tileCost = tile.isMortgaged ? basePrice * 0.6 : basePrice;

    // Phân tích chiến lược nếu phải nhượng đất
    if (tile.type === 'PROPERTY' && tile.colorGroup) {
      const groupTiles = getColorGroupTiles(tile.colorGroup, board);
      const totalInGroup = groupTiles.length;

      // A. Bot đang sở hữu Monopoly Set mà bị đòi đất -> Penalty cực nặng
      if (hasMonopolySet(bot, tile.colorGroup, board)) {
        tileCost += 500 + basePrice * 2.0;
      }

      // B. Mảnh đất này giúp Sender hoàn thành Monopoly Set -> Blocker Penalty
      const senderOwnedCount = groupTiles.filter((t) => t.ownerId === sender.id).length;
      if (senderOwnedCount + 1 === totalInGroup) {
        tileCost += 350 + basePrice * 1.5;
      }
    } else if (tile.type === 'STATION') {
      const senderStations = board.filter((t) => t.type === 'STATION' && t.ownerId === sender.id).length;
      if (senderStations >= 2) {
        tileCost += 120;
      }
    }

    valueGiven += tileCost;
  }

  // 3. TÍNH ĐIỂM CHÊNH LỆCH VÀ RA QUYẾT ĐỊNH
  const score = Math.round(valueReceived - valueGiven);

  if (score >= 0) {
    return {
      accept: true,
      reason: 'Đề xuất rất hấp dẫn và hợp lý! Tôi đồng ý giao dịch.',
      score,
      valueReceived,
      valueGiven,
    };
  }

  // Nếu từ chối, đưa ra lý do phù hợp kèm gợi ý số tiền chênh lệch
  const diff = Math.abs(score);
  let rejectReason = 'Đề xuất này chưa đủ giá trị để tôi chấp thuận.';
  if (diff > 350) {
    rejectReason = 'Đề xuất này quá bất lợi cho tôi hoặc giúp bạn tạo thế độc quyền quá lớn!';
  } else if (diff > 50) {
    rejectReason = `Bạn cần các thêm khoảng $${diff} tiền mặt hoặc tài sản giá trị hơn để tôi đồng ý.`;
  }

  return {
    accept: false,
    reason: rejectReason,
    score,
    valueReceived,
    valueGiven,
    suggestedCashExtra: diff,
  };
}
