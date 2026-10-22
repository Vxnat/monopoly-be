import { GAME_CONFIG } from '../constants/gameConfig';
import { TileData, PlayerState } from '../types/game';

/**
 * 🏠 PROPERTY HANDLER - Xử lý toàn bộ logic liên quan đến Đất đai, Nhà cửa, Tiền thuê
 */

export interface RentCalculationResult {
  rentAmount: number;
  landlord: PlayerState;
  isMonopolyDoubleRent?: boolean;
}

/**
 * Lấy danh sách tất cả các ô đất cùng nhóm màu trên bàn cờ
 */
export function getColorGroupTiles(
  colorGroup: string,
  allBoard: TileData[]
): TileData[] {
  return allBoard.filter(
    (t) => t.type === 'PROPERTY' && t.colorGroup === colorGroup
  );
}

/**
 * Kiểm tra người chơi có đang sở hữu trọn bộ toàn bộ các ô trong nhóm màu (Monopoly Set) không
 */
export function hasMonopolySet(
  player: PlayerState,
  colorGroup: string | undefined,
  allBoard: TileData[]
): boolean {
  if (!colorGroup || !player || !player.id) return false;
  const groupTiles = getColorGroupTiles(colorGroup, allBoard);
  if (groupTiles.length === 0) return false;
  return groupTiles.every((t) => t.ownerId === player.id);
}

/**
 * Tính toán số tiền thuê chính xác của 1 ô đất theo chuẩn Monopoly Plus
 */
export function calculateRent(
  tile: TileData,
  allBoard: TileData[],
  landlord: PlayerState,
  diceRoll: number = 7
): number {
  if (tile.isMortgaged) return 0;

  // 1. Ô Đất thường (PROPERTY)
  if (tile.type === 'PROPERTY') {
    const houseCount = tile.houses || 0;

    // A. Đất trống (chưa xây nhà: houses === 0)
    if (houseCount === 0) {
      const baseRent = tile.rent && tile.rent[0] !== undefined ? tile.rent[0] : 10;
      // Nếu sở hữu trọn bộ màu -> Nhân đôi tiền thuê đất trống (x2 Rent)
      if (tile.colorGroup && hasMonopolySet(landlord, tile.colorGroup, allBoard)) {
        return baseRent * 2;
      }
      return baseRent;
    }

    // B. Đã xây từ 1 -> 4 Nhà hoặc 5 (Khách sạn)
    if (tile.rent && tile.rent[houseCount] !== undefined) {
      return tile.rent[houseCount];
    }
    return 10;
  }

  // 2. Ô Bến xe / Sân bay (STATION)
  // Thuê = $25 x (2 ^ (số bến xe sở hữu - 1)) -> 25, 50, 100, 200
  if (tile.type === 'STATION') {
    const ownedStations = allBoard.filter(
      (t) => t.type === 'STATION' && t.ownerId === landlord.id && !t.isMortgaged
    ).length;
    const baseRent = tile.rent ? tile.rent[0] : 25;
    return baseRent * Math.pow(2, Math.max(0, ownedStations - 1));
  }

  // 3. Ô Tiện ích (Điện lực / Cấp nước)
  // Theo chuẩn Monopoly:
  // - Sở hữu 1 tiện ích: Tiền thuê = Điểm xúc xắc x 4
  // - Sở hữu cả 2 tiện ích: Tiền thuê = Điểm xúc xắc x 10
  if (tile.type === 'UTILITY') {
    const ownedUtilities = allBoard.filter(
      (t) => t.type === 'UTILITY' && t.ownerId === landlord.id && !t.isMortgaged
    ).length;
    const multiplier = ownedUtilities >= 2 ? GAME_CONFIG.UTILITY_RENT_DOUBLE_MULTIPLIER : GAME_CONFIG.UTILITY_RENT_SINGLE_MULTIPLIER;
    return (diceRoll || 7) * multiplier;
  }

  return 0;
}

/**
 * Kiểm tra người chơi có đủ điều kiện mua đất không
 */
export function canBuyProperty(tile: TileData, player: PlayerState): boolean {
  if (tile.ownerId !== null && tile.ownerId !== undefined) return false;
  if (!tile.price) return false;
  return player.money >= tile.price;
}

/**
 * Kiểm tra điều kiện nâng cấp xây nhà / khách sạn theo chuẩn Monopoly Plus:
 * 1. Phải sở hữu mảnh đất
 * 2. Phải gom đủ toàn bộ các ô trong cùng dải màu (Monopoly Full-Set)
 * 3. Không có bất kỳ ô nào trong cùng nhóm màu đang bị thế chấp
 * 4. Quy tắc xây nhà đồng đều (Even Building Rule): không được xây chênh quá 1 nhà so với các ô cùng màu
 * 5. Giới hạn kho Ngân Hàng (Bank Housing Shortage): Ngân Hàng phải còn nhà/khách sạn trong kho
 * 6. Đủ tiền và chưa vượt quá cấp tối đa (Khách sạn)
 */
export function canUpgradeProperty(
  tile: TileData,
  allBoard: TileData[],
  player: PlayerState,
  bankHouses: number = 32,
  bankHotels: number = 12
): { canUpgrade: boolean; reason?: string } {
  if (tile.ownerId !== player.id) {
    return { canUpgrade: false, reason: 'Bạn không sở hữu mảnh đất này' };
  }
  if (tile.type !== 'PROPERTY' || !tile.houseCost || !tile.colorGroup) {
    return { canUpgrade: false, reason: 'Ô này không thể xây nhà' };
  }
  if ((tile.houses || 0) >= 5) {
    return { canUpgrade: false, reason: 'Đã đạt cấp tối đa (Khách Sạn VIP)' };
  }
  if (player.money < tile.houseCost) {
    return { canUpgrade: false, reason: `Không đủ tiền xây nhà (Cần $${tile.houseCost})` };
  }

  const groupTiles = getColorGroupTiles(tile.colorGroup, allBoard);

  // 2. Kiểm tra gom trọn bộ màu
  const ownsAll = groupTiles.every((t) => t.ownerId === player.id);
  if (!ownsAll) {
    return {
      canUpgrade: false,
      reason: 'Bạn cần gom đủ toàn bộ các ô trong nhóm màu này mới được phép xây nhà!',
    };
  }

  // 3. Kiểm tra có ô nào trong nhóm màu đang bị thế chấp
  const hasMortgaged = groupTiles.some((t) => t.isMortgaged);
  if (hasMortgaged) {
    return {
      canUpgrade: false,
      reason: 'Không thể xây nhà khi có ô đất cùng nhóm màu đang bị thế chấp!',
    };
  }

  // 4. Quy tắc xây nhà đồng đều (Even Building Rule)
  const currentHouses = tile.houses || 0;
  const minHousesInGroup = Math.min(...groupTiles.map((t) => t.houses || 0));

  if (currentHouses > minHousesInGroup) {
    return {
      canUpgrade: false,
      reason: 'Quy tắc xây đều: Bạn cần nâng cấp các ô đất ít nhà hơn trong cùng nhóm màu trước!',
    };
  }

  // 5. Kiểm tra kho Ngân Hàng (Bank Housing Shortage)
  if (currentHouses < 4) {
    // Đang xây thêm 1 ngôi nhà (0->1, 1->2, 2->3, 3->4)
    if (bankHouses <= 0) {
      return {
        canUpgrade: false,
        reason: 'Ngân hàng tạm thời hết nhà trong kho (0/32)! Vui lòng chờ người chơi khác giải phóng nhà.',
      };
    }
  } else if (currentHouses === 4) {
    // Đang nâng cấp lên Khách Sạn (4->5)
    if (bankHotels <= 0) {
      return {
        canUpgrade: false,
        reason: 'Ngân hàng tạm thời hết khách sạn trong kho (0/12)!',
      };
    }
  }

  return { canUpgrade: true };
}

/**
 * Kiểm tra điều kiện bán bớt nhà / khách sạn theo Quy tắc bán đồng đều (Even Selling Rule)
 */
export function canSellHouse(
  tile: TileData,
  allBoard: TileData[],
  player: PlayerState
): { canSell: boolean; reason?: string } {
  if (tile.ownerId !== player.id) {
    return { canSell: false, reason: 'Bạn không sở hữu mảnh đất này' };
  }
  if (!tile.houses || tile.houses <= 0) {
    return { canSell: false, reason: 'Mảnh đất này chưa có công trình để bán' };
  }

  if (tile.colorGroup) {
    const groupTiles = getColorGroupTiles(tile.colorGroup, allBoard);
    const currentHouses = tile.houses || 0;
    const maxHousesInGroup = Math.max(...groupTiles.map((t) => t.houses || 0));

    if (currentHouses < maxHousesInGroup) {
      return {
        canSell: false,
        reason: 'Quy tắc bán đều: Bạn phải bán ở ô có nhiều nhà/khách sạn hơn trong cùng nhóm màu trước!',
      };
    }
  }

  return { canSell: true };
}

/**
 * Lấy giá trị tiền mặt nhận được khi thế chấp đất cho Ngân Hàng (50% giá mua)
 */
export function getMortgageValue(tile: TileData): number {
  if (tile.mortgageValue) return tile.mortgageValue;
  return Math.floor((tile.price || 0) / 2);
}

/**
 * Lấy chi phí để chuộc lại sổ đỏ (Giá thế chấp + 10% tiền lãi)
 */
export function getUnmortgageCost(tile: TileData): number {
  const mortgageVal = getMortgageValue(tile);
  return Math.round(mortgageVal * 1.1);
}

/**
 * Kiểm tra xem một ô đất có thể thế chấp được không:
 * - Ô đất chưa bị thế chấp
 * - Không có bất kỳ công trình (nhà/khách sạn) nào trên ô đất này
 * - Toàn bộ các ô khác trong cùng nhóm màu cũng phải không có nhà
 */
export function canMortgageProperty(tile: TileData, allBoard: TileData[]): boolean {
  if (tile.isMortgaged) return false;
  if ((tile.houses || 0) > 0) return false;

  if (tile.colorGroup) {
    const groupTiles = getColorGroupTiles(tile.colorGroup, allBoard);
    const hasBuildingsInGroup = groupTiles.some((t) => (t.houses || 0) > 0);
    if (hasBuildingsInGroup) return false;
  }

  return true;
}

/**
 * Kiểm tra xem người chơi có đủ tiền để chuộc lại sổ đỏ không
 */
export function canUnmortgageProperty(tile: TileData, playerMoney: number): boolean {
  if (!tile.isMortgaged) return false;
  return playerMoney >= getUnmortgageCost(tile);
}
