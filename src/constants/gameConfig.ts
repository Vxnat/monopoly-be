export const GAME_CONFIG = {
  STARTING_MONEY: 1500,
  GO_REWARD: 200,
  JAIL_BAIL_COST: 50,
  MAX_JAIL_TURNS: 3,
  INCOME_TAX_AMOUNT: 200,
  LUXURY_TAX_AMOUNT: 100,
  TURN_TIME_LIMIT_SECONDS: 45,
  MAX_PLAYERS: 4,
  MIN_PLAYERS: 2,
  MAX_HOUSES_PER_TILE: 4,
  HOTEL_HOUSE_COUNT: 5,
  TOTAL_BANK_HOUSES: 32,
  TOTAL_BANK_HOTELS: 12,
  UTILITY_RENT_SINGLE_MULTIPLIER: 4,
  UTILITY_RENT_DOUBLE_MULTIPLIER: 10,
} as const;

export const TURN_TIMER_CONFIG = {
  ROLLING: 10,        // 10s để đổ xúc xắc
  BUY_PROPERTY: 15,   // 15s để quyết định mua đất
  AUCTION: 15,        // 15s đấu giá bất động sản
  PAY_RENT: 10,       // 10s trả tiền thuê / hóa đơn
  CARD_DRAW: 10,      // 10s xem thẻ Cơ hội / Khí vận
  JAIL_CHOICE: 10,    // 10s chọn cách ra tù
  DEBT_SETTLEMENT: 25,// 25s để thế chấp đất, bán nhà trả nợ
  TURN_END: 12,       // 12s xem xét kết thúc lượt
} as const;

export const COLOR_GROUP_HEX: Record<string, string> = {
  brown: '#8B4513',
  light_blue: '#38BDF8',
  pink: '#EC4899',
  orange: '#F97316',
  red: '#EF4444',
  yellow: '#EAB308',
  green: '#22C55E',
  dark_blue: '#1E40AF',
};

export const COLOR_GROUP_NAMES_VN: Record<string, string> = {
  brown: 'Khu Nâu',
  light_blue: 'Khu Lam',
  pink: 'Khu Hồng',
  orange: 'Khu Cam',
  red: 'Khu Đỏ',
  yellow: 'Khu Vàng',
  green: 'Khu Lục',
  dark_blue: 'Khu Chàm',
};
