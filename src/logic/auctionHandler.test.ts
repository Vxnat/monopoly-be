import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAuction,
  placeBid,
  foldAuction,
  getAiBidDecision,
} from './auctionHandler';
import { TileData, PlayerState, AuctionState } from '../types/game';

describe('🔨 Auction Handler Tests - Step 1.2 Property Auction System', () => {
  const player1: PlayerState = {
    id: 'p1',
    name: 'Player 1',
    avatar: '🎩',
    color: 'red',
    hexColor: '#EF4444',
    position: 1,
    money: 1500,
    inJail: false,
    jailTurns: 0,
    getOutOfJailFreeCards: 0,
    isBankrupt: false,
  };

  const bot1: PlayerState = {
    id: 'bot_1',
    name: 'Bot Alex',
    avatar: '🤖',
    color: 'blue',
    hexColor: '#3B82F6',
    position: 1,
    money: 1200,
    inJail: false,
    jailTurns: 0,
    getOutOfJailFreeCards: 0,
    isBankrupt: false,
    isAI: true,
  };

  const bot2: PlayerState = {
    id: 'bot_2',
    name: 'Bot Sarah',
    avatar: '🦊',
    color: 'green',
    hexColor: '#10B981',
    position: 1,
    money: 1000,
    inJail: false,
    jailTurns: 0,
    getOutOfJailFreeCards: 0,
    isBankrupt: false,
    isAI: true,
  };

  const dummyTile: TileData = {
    id: 6,
    name: 'Phố Cầu Giấy',
    type: 'PROPERTY',
    colorGroup: 'light_blue',
    price: 100,
    rent: [6, 30, 90, 270, 400, 550],
    houseCost: 50,
    ownerId: null,
    houses: 0,
  };

  describe('1. createAuction', () => {
    it('initializes auction state with all eligible active players', () => {
      const auction = createAuction(dummyTile, [player1, bot1, bot2]);
      expect(auction.tileId).toBe(6);
      expect(auction.currentBid).toBe(0);
      expect(auction.highestBidderId).toBeNull();
      expect(auction.activeBidderIds).toEqual(['p1', 'bot_1', 'bot_2']);
      expect(auction.minIncrement).toBe(10);
    });

    it('excludes bankrupt players from eligible bidders', () => {
      const brokePlayer: PlayerState = { ...player1, id: 'p_broke', isBankrupt: true, money: 0 };
      const auction = createAuction(dummyTile, [player1, brokePlayer]);
      expect(auction.activeBidderIds).toEqual(['p1']);
    });
  });

  describe('2. placeBid', () => {
    let auction: AuctionState;

    beforeEach(() => {
      auction = createAuction(dummyTile, [player1, bot1, bot2]);
    });

    it('allows valid opening bid of $10 or more', () => {
      const result = placeBid(auction, 'p1', 10, player1.money);
      expect(result.valid).toBe(true);
      expect(result.newAuction?.currentBid).toBe(10);
      expect(result.newAuction?.highestBidderId).toBe('p1');
      expect(result.newAuction?.history.length).toBe(1);
    });

    it('rejects bid that does not meet the minimum increment over current bid', () => {
      const res1 = placeBid(auction, 'p1', 50, player1.money);
      const auctionAfterBid = res1.newAuction!;

      // Current bid is 50, minimum next bid must be 50 + 10 = 60
      const invalidBidRes = placeBid(auctionAfterBid, 'bot_1', 55, bot1.money);
      expect(invalidBidRes.valid).toBe(false);
      expect(invalidBidRes.reason).toContain('Mức giá tối thiểu hợp lệ là $60');
    });

    it('rejects bid if player has insufficient cash', () => {
      const poorPlayer: PlayerState = { ...player1, money: 40 };
      const res = placeBid(auction, 'p1', 50, poorPlayer.money);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('không đủ tiền mặt');
    });

    it('rejects bid from a player who has already folded', () => {
      const foldRes = foldAuction(auction, 'p1');
      const bidRes = placeBid(foldRes.newAuction, 'p1', 50, player1.money);
      expect(bidRes.valid).toBe(false);
      expect(bidRes.reason).toContain('đã rút lui');
    });
  });

  describe('3. foldAuction', () => {
    it('removes player from activeBidderIds', () => {
      const auction = createAuction(dummyTile, [player1, bot1, bot2]);
      const foldRes = foldAuction(auction, 'bot_2');
      expect(foldRes.newAuction.activeBidderIds).toEqual(['p1', 'bot_1']);
      expect(foldRes.isEnded).toBe(false);
    });

    it('ends auction when all opponents fold leaving highest bidder as winner', () => {
      let auction = createAuction(dummyTile, [player1, bot1]);
      // p1 bids $50
      auction = placeBid(auction, 'p1', 50, player1.money).newAuction!;

      // bot1 folds
      const foldRes = foldAuction(auction, 'bot_1');
      expect(foldRes.isEnded).toBe(true);
      expect(foldRes.winnerId).toBe('p1');
    });

    it('ends auction with null winner if all players fold without placing any bids', () => {
      let auction = createAuction(dummyTile, [player1, bot1]);
      auction = foldAuction(auction, 'p1').newAuction;
      const foldFinal = foldAuction(auction, 'bot_1');
      expect(foldFinal.isEnded).toBe(true);
      expect(foldFinal.winnerId).toBeNull();
    });
  });

  describe('4. getAiBidDecision', () => {
    it('bot bids when property is affordable and beneath valuation', () => {
      const auction = createAuction(dummyTile, [player1, bot1]);
      const decision = getAiBidDecision(auction, bot1, dummyTile, [dummyTile], [player1, bot1]);
      expect(decision.shouldBid).toBe(true);
      expect(decision.bidAmount).toBeGreaterThanOrEqual(10);
    });

    it('bot increases valuation when property completes a color monopoly set', () => {
      const tile1: TileData = { id: 6, name: 'Phố Cầu Giấy', type: 'PROPERTY', colorGroup: 'light_blue', price: 100, ownerId: null };
      const tile2: TileData = { id: 8, name: 'Phố Xuân Thủy', type: 'PROPERTY', colorGroup: 'light_blue', price: 100, ownerId: 'bot_1' };
      const tile3: TileData = { id: 9, name: 'Phố Hồ Tùng Mậu', type: 'PROPERTY', colorGroup: 'light_blue', price: 120, ownerId: 'bot_1' };
      const board = [tile1, tile2, tile3];

      let auction = createAuction(tile1, [player1, bot1]);
      // Current bid is $130 (higher than base price of 100)
      auction = placeBid(auction, 'p1', 130, player1.money).newAuction!;

      const decision = getAiBidDecision(auction, bot1, tile1, board, [player1, bot1]);
      // Because buying tile1 completes the set for bot1, bot is willing to bid $140
      expect(decision.shouldBid).toBe(true);
      expect(decision.bidAmount).toBeGreaterThanOrEqual(140);
    });

    it('bot does not bid if it is already the highest bidder', () => {
      let auction = createAuction(dummyTile, [player1, bot1]);
      auction = placeBid(auction, 'bot_1', 20, bot1.money).newAuction!;

      const decision = getAiBidDecision(auction, bot1, dummyTile, [dummyTile], [player1, bot1]);
      expect(decision.shouldBid).toBe(false);
    });
  });
});
