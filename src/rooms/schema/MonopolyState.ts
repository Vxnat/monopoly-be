import { Schema, type, ArraySchema } from '@colyseus/schema';

export class PlayerSchema extends Schema {
  @type('string') id: string = '';
  @type('string') name: string = '';
  @type('string') avatar: string = '';
  @type('string') color: string = 'red';
  @type('string') hexColor: string = '#EF4444';
  @type('string') tokenId: string = 'char_male_a';
  @type('number') position: number = 0;
  @type('number') money: number = 1500;
  @type('boolean') inJail: boolean = false;
  @type('number') jailTurns: number = 0;
  @type('number') getOutOfJailFreeCards: number = 0;
  @type('boolean') isBankrupt: boolean = false;
  @type('boolean') isAI: boolean = false;
  @type('boolean') isConnected: boolean = true;
}

export class TileSchema extends Schema {
  @type('number') id: number = 0;
  @type('string') name: string = '';
  @type('string') shortName: string = '';
  @type('string') type: string = 'PROPERTY';
  @type('string') colorGroup: string = '';
  @type('number') price: number = 0;
  @type('number') houseCost: number = 0;
  @type(['number']) rent = new ArraySchema<number>();
  @type('number') mortgageValue: number = 0;
  @type('string') ownerId: string = ''; // '' means unowned
  @type('number') houses: number = 0; // 0: empty, 1-4: house, 5: hotel
  @type('boolean') isMortgaged: boolean = false;
}

export class DiceSchema extends Schema {
  @type('number') dice1: number = 1;
  @type('number') dice2: number = 1;
  @type('boolean') isRolling: boolean = false;
  @type('number') doublesCount: number = 0;
}

export class AuctionSchema extends Schema {
  @type('number') tileId: number = 0;
  @type('number') currentBid: number = 0;
  @type('string') highestBidderId: string = '';
  @type(['string']) activeBidderIds = new ArraySchema<string>();
  @type('number') minIncrement: number = 10;
  @type('boolean') isActive: boolean = false;
}

export class TradeSchema extends Schema {
  @type('string') initiatorId: string = '';
  @type('string') targetId: string = '';
  @type('number') offeredMoney: number = 0;
  @type(['number']) offeredTileIds = new ArraySchema<number>();
  @type('number') requestedMoney: number = 0;
  @type(['number']) requestedTileIds = new ArraySchema<number>();
  @type('string') status: string = 'NONE'; // 'NONE' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
}

export class CardDataSchema extends Schema {
  @type('string') title: string = '';
  @type('string') description: string = '';
  @type('string') type: string = 'chance';
  @type('string') actionType: string = 'MONEY_REWARD';
  @type('number') rewardOrPenalty: number = 0;
  @type('number') targetPosition: number = -1;
  @type('boolean') sendToJail: boolean = false;
}

export class PendingRentSchema extends Schema {
  @type('string') tenantId: string = '';
  @type('string') landlordId: string = '';
  @type('number') amount: number = 0;
  @type('string') tileName: string = '';
}

export class GameLogSchema extends Schema {
  @type('string') id: string = '';
  @type('number') timestamp: number = 0;
  @type('string') message: string = '';
  @type('string') type: string = 'info';
  @type('string') playerId: string = '';
}

export class TurnTimerSchema extends Schema {
  @type('number') timeLeft: number = 45;
  @type('number') maxTime: number = 45;
  @type('boolean') isRunning: boolean = false;
}

export class MonopolyState extends Schema {
  @type([PlayerSchema]) players = new ArraySchema<PlayerSchema>();
  @type([TileSchema]) board = new ArraySchema<TileSchema>();
  @type('number') currentTurnIndex: number = 0;
  @type('string') turnPhase: string = 'LOBBY'; // LOBBY, ROLLING, MOVING, TILE_ACTION, AUCTION, TURN_END, GAME_OVER
  @type(DiceSchema) dice = new DiceSchema();
  @type([GameLogSchema]) logs = new ArraySchema<GameLogSchema>();
  @type('number') selectedTileId: number = -1;
  @type('string') activeModal: string = ''; // '' | 'BUY_PROPERTY' | 'AUCTION' | 'RENT_PAID' | 'CARD_DRAW' | 'TRADE' | 'JAIL_CHOICE' | 'GAME_OVER'
  @type(CardDataSchema) activeCard = new CardDataSchema();
  @type(PendingRentSchema) pendingRent = new PendingRentSchema();
  @type(AuctionSchema) auction = new AuctionSchema();
  @type(TradeSchema) trade = new TradeSchema();
  @type('number') bankHouses: number = 32;
  @type('number') bankHotels: number = 12;
  @type(TurnTimerSchema) turnTimer = new TurnTimerSchema();
  @type('string') winnerId: string = '';
}
