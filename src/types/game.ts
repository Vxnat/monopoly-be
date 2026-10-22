export type TileType = 
  | 'GO' 
  | 'PROPERTY' 
  | 'COMMUNITY_CHEST' 
  | 'TAX' 
  | 'STATION' 
  | 'CHANCE' 
  | 'JAIL' 
  | 'UTILITY' 
  | 'FREE_PARKING' 
  | 'GO_TO_JAIL';

export type ColorGroup = 
  | 'brown' 
  | 'light_blue' 
  | 'pink' 
  | 'orange' 
  | 'red' 
  | 'yellow' 
  | 'green' 
  | 'dark_blue';

export interface TileData {
  id: number;                 // 0 to 39
  name: string;               // Vietnamese name: "Hồ Gươm", "Bến Thành"...
  shortName?: string;
  icon?: string;              // Path to icon image
  type: TileType;
  colorGroup?: ColorGroup;
  price?: number;             // Buying price
  houseCost?: number;         // Cost to build 1 house
  rent?: number[];            // [Base rent, 1 house, 2 houses, 3 houses, 4 houses, Hotel]
  mortgageValue?: number;     // Mortgage cash value
  ownerId?: string | null;    // SessionId or player ID who owns this tile
  houses?: number;            // 0: empty, 1-4: houses, 5: hotel
  isMortgaged?: boolean;
}

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export interface PlayerState {
  id: string;
  name: string;
  avatar: string;
  color: PlayerColor;
  hexColor: string;
  tokenId?: string;
  position: number;
  money: number;
  inJail: boolean;
  jailTurns: number;
  getOutOfJailFreeCards: number;
  isBankrupt: boolean;
  isAI?: boolean;
}

export type TurnPhase = 
  | 'LOBBY'                   // Waiting for players in room
  | 'ROLLING'                 // Waiting for player to roll dice
  | 'MOVING'                  // Token is animating jump along tiles
  | 'TILE_ACTION'             // Landed on tile: buy prompt, pay rent, draw card
  | 'AUCTION'                 // Landed on unbought property passed to auction
  | 'TURN_END'                // Finished tile action, can build houses, trade, or end turn
  | 'GAME_OVER';

export interface DiceState {
  dice1: number;
  dice2: number;
  isRolling: boolean;
  doublesCount: number;
}

export interface GameLog {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'trade' | 'jail' | 'buy' | 'rent' | 'tax' | 'chance';
  playerId?: string;
}

export interface TurnTimerState {
  timeLeft: number;
  maxTime: number;
  isRunning: boolean;
}

export interface PendingDebtInfo {
  debtorId: string;
  creditorId: string | null; // null = Bank (Thuế, Tù, Thẻ)
  amount: number;
  reason: string;
}

export interface AuctionState {
  tileId: number;
  currentBid: number;
  highestBidderId: string | null;
  activeBidderIds: string[];
  minIncrement: number;
  history: Array<{
    playerId: string;
    amount: number;
    timestamp: number;
  }>;
}

export interface CardData {
  title: string;
  description: string;
  type: 'chance' | 'community';
  actionType: 'MONEY_REWARD' | 'MONEY_PENALTY' | 'MOVE_TO' | 'JAIL' | 'GET_OUT_OF_JAIL' | 'REPAIR_HOUSES';
  rewardOrPenalty: number;
  targetPosition?: number;
  sendToJail?: boolean;
}

export interface PendingRentInfo {
  tenantId: string;
  landlordId: string;
  amount: number;
  tileName: string;
}
