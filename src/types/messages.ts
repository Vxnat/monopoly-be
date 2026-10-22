/**
 * 📡 MONOPOLY COLYSEUS NETWORK PROTOCOL & MESSAGE TYPES
 */

export enum MessageType {
  // Room / Lobby
  START_GAME = 'START_GAME',
  ADD_AI_BOT = 'ADD_AI_BOT',
  REMOVE_AI_BOT = 'REMOVE_AI_BOT',

  // Core Turn Gameplay
  ROLL_DICE = 'ROLL_DICE',
  BUY_PROPERTY = 'BUY_PROPERTY',
  DECLINE_PROPERTY = 'DECLINE_PROPERTY',
  END_TURN = 'END_TURN',

  // Property Construction & Management
  UPGRADE_PROPERTY = 'UPGRADE_PROPERTY',
  SELL_HOUSE = 'SELL_HOUSE',
  MORTGAGE_PROPERTY = 'MORTGAGE_PROPERTY',
  UNMORTGAGE_PROPERTY = 'UNMORTGAGE_PROPERTY',

  // Auction
  AUCTION_BID = 'AUCTION_BID',
  AUCTION_FOLD = 'AUCTION_FOLD',

  // Rent / Debt / Tax / Card confirmations
  PAY_RENT_CONFIRM = 'PAY_RENT_CONFIRM',
  PAY_TAX_CONFIRM = 'PAY_TAX_CONFIRM',
  CARD_CONFIRM = 'CARD_CONFIRM',
  JAIL_PAY_BAIL = 'JAIL_PAY_BAIL',
  JAIL_USE_CARD = 'JAIL_USE_CARD',
  DECLARE_BANKRUPTCY = 'DECLARE_BANKRUPTCY',

  // Player-to-Player Trading
  TRADE_PROPOSE = 'TRADE_PROPOSE',
  TRADE_ACCEPT = 'TRADE_ACCEPT',
  TRADE_REJECT = 'TRADE_REJECT',
  TRADE_CANCEL = 'TRADE_CANCEL',

  // UI / Animations Sync
  MOVEMENT_ANIMATION_COMPLETE = 'MOVEMENT_ANIMATION_COMPLETE',
}

// Payload Interfaces
export interface UpgradePropertyPayload {
  tileId: number;
}

export interface SellHousePayload {
  tileId: number;
}

export interface MortgagePayload {
  tileId: number;
}

export interface AuctionBidPayload {
  amount?: number; // Optional: if omitted, increments by minIncrement
}

export interface TradeProposePayload {
  targetPlayerId: string;
  offeredMoney: number;
  offeredTileIds: number[];
  requestedMoney: number;
  requestedTileIds: number[];
}
