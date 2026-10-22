import { Room, Client, ServerError } from 'colyseus';
import { ArraySchema } from '@colyseus/schema';
import { MonopolyState, PlayerSchema, TileSchema, GameLogSchema } from './schema/MonopolyState';
import { 
  MessageType, 
  UpgradePropertyPayload, 
  SellHousePayload, 
  MortgagePayload, 
  AuctionBidPayload, 
  TradeProposePayload 
} from '../types/messages';
import { INITIAL_BOARD_DATA } from '../constants/boardData';
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS } from '../constants/cards';
import { GAME_CONFIG, TURN_TIMER_CONFIG } from '../constants/gameConfig';
import { CardDeck } from '../utils/random';
import { 
  canUpgradeProperty, 
  canSellHouse, 
  calculateRent, 
  getMortgageValue, 
  getUnmortgageCost,
  canMortgageProperty,
  canUnmortgageProperty
} from '../logic/propertyHandler';
import { calculateTax } from '../logic/taxHandler';
import { validateTrade, evaluateAiTradeDecision, TradeOffer } from '../logic/tradeHandler';
import { getAiBidDecision } from '../logic/auctionHandler';
import { 
  tileSchemaToData, 
  playerSchemaToState, 
  boardSchemaToArray, 
  playersSchemaToArray 
} from './schema/adapters';

const PLAYER_COLORS = [
  { color: 'red', hexColor: '#EF4444', tokenId: 'char_male_a' },
  { color: 'blue', hexColor: '#38BDF8', tokenId: 'char_female_a' },
  { color: 'green', hexColor: '#22C55E', tokenId: 'char_male_b' },
  { color: 'yellow', hexColor: '#EAB308', tokenId: 'char_female_b' },
];

export class MonopolyRoom extends Room<{ state: MonopolyState }> {
  maxClients = 4;
  private chanceDeck = new CardDeck(CHANCE_CARDS);
  private communityDeck = new CardDeck(COMMUNITY_CHEST_CARDS);
  private timerInterval?: NodeJS.Timeout;
  private botActionTimeout?: NodeJS.Timeout;

  onCreate(options: any) {
    this.setState(new MonopolyState());

    // 1. Khởi tạo 40 ô bàn cờ từ dữ liệu chuẩn
    this.initializeBoard();

    // 2. Cài đặt các Message Handlers
    this.registerMessageHandlers();

    // 3. Khởi động đồng hồ đếm ngược mỗi giây
    this.timerInterval = setInterval(() => {
      this.tickTurnTimer();
    }, 1000);

    this.addLog('🎮 Phòng chơi đã được tạo. Chờ người chơi tham gia...', 'info');
  }

  onJoin(client: Client, options: any) {
    if (this.state.turnPhase !== 'LOBBY') {
      // Cho phép reconnect nếu người chơi đã từng tham gia
      const existingPlayer = this.state.players.find((p: PlayerSchema) => p.id === client.sessionId);
      if (existingPlayer) {
        existingPlayer.isConnected = true;
        this.addLog(`🔄 ${existingPlayer.name} đã kết nối lại phòng!`, 'info', existingPlayer.id);
        return;
      }
      throw new ServerError(403, 'Trận đấu đang diễn ra, không thể tham gia!');
    }

    const playerIndex = this.state.players.length;
    const colorConfig = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];

    const player = new PlayerSchema();
    player.id = client.sessionId;
    player.name = options?.name || `Người chơi ${playerIndex + 1}`;
    player.avatar = options?.avatar || `/avatars/${colorConfig.tokenId}.jpg`;
    player.color = colorConfig.color;
    player.hexColor = colorConfig.hexColor;
    player.tokenId = colorConfig.tokenId;
    player.money = GAME_CONFIG.STARTING_MONEY;
    player.position = 0;
    player.isConnected = true;
    player.isAI = !!options?.isAI;

    this.state.players.push(player);
    this.addLog(`👋 ${player.name} đã tham gia phòng.`, 'info', player.id);

    // Tự động bắt đầu nếu đủ 4 người
    if (this.state.players.length === 4 && options?.autoStart) {
      this.startGame();
    }
  }

  onLeave(client: Client, code?: number) {
    const player = this.state.players.find((p: PlayerSchema) => p.id === client.sessionId);
    if (!player) return;

    if (this.state.turnPhase === 'LOBBY') {
      const idx = this.state.players.findIndex((p: PlayerSchema) => p.id === client.sessionId);
      if (idx !== -1) {
        this.state.players.splice(idx, 1);
        this.addLog(`🚪 ${player.name} đã rời phòng.`, 'info');
      }
    } else {
      player.isConnected = false;
      this.addLog(`⚠️ ${player.name} đã mất kết nối. Đang chờ kết nối lại...`, 'info', player.id);

      // Nếu người chơi rời đi trong lượt của họ, cho phép bot/auto kết thúc sau timeout
      if (this.getCurrentPlayer()?.id === player.id) {
        this.clock.setTimeout(() => {
          if (!player.isConnected && this.getCurrentPlayer()?.id === player.id) {
            this.handlePlayerTimeout();
          }
        }, 15000);
      }
    }
  }

  onDispose() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.botActionTimeout) clearTimeout(this.botActionTimeout);
  }

  // =========================================================================
  // 🎲 KHỞI TẠO BÀN CỜ & ĐĂNG KÝ XỬ LÝ SỰ KIỆN
  // =========================================================================

  private initializeBoard() {
    this.state.board.clear();
    for (const tile of INITIAL_BOARD_DATA) {
      const t = new TileSchema();
      t.id = tile.id;
      t.name = tile.name;
      t.shortName = tile.shortName || tile.name;
      t.type = tile.type;
      t.colorGroup = tile.colorGroup || '';
      t.price = tile.price || 0;
      t.houseCost = tile.houseCost || 0;
      t.mortgageValue = tile.mortgageValue || 0;
      t.ownerId = tile.ownerId || '';
      t.houses = tile.houses || 0;
      t.isMortgaged = !!tile.isMortgaged;
      if (tile.rent && tile.rent.length > 0) {
        t.rent = new ArraySchema<number>(...tile.rent);
      }
      this.state.board.push(t);
    }
  }

  private registerMessageHandlers() {
    // 1. Quản lý phòng
    this.onMessage(MessageType.START_GAME, (client) => {
      // Chỉ Host (người đầu tiên) được bấm Start
      if (this.state.players.length > 0 && this.state.players[0].id === client.sessionId) {
        this.startGame();
      }
    });

    this.onMessage(MessageType.ADD_AI_BOT, () => {
      if (this.state.turnPhase === 'LOBBY' && this.state.players.length < 4) {
        this.addAiBot();
      }
    });

    // 2. Đổ xúc xắc
    this.onMessage(MessageType.ROLL_DICE, (client) => {
      const cur = this.getCurrentPlayer();
      if (!cur || cur.id !== client.sessionId) return;
      const canRoll =
        this.state.turnPhase === 'ROLLING' ||
        (this.state.turnPhase === 'TURN_END' && this.state.dice.doublesCount > 0);
      if (!canRoll) return;

      this.executeRollDice(cur);
    });

    // 3. Mua đất
    this.onMessage(MessageType.BUY_PROPERTY, (client) => {
      const cur = this.getCurrentPlayer();
      if (!cur || cur.id !== client.sessionId) return;
      if (this.state.turnPhase !== 'TILE_ACTION' || this.state.activeModal !== 'BUY_PROPERTY') return;

      this.executeBuyProperty(cur);
    });

    // 4. Từ chối mua -> Đưa ra đấu giá
    this.onMessage(MessageType.DECLINE_PROPERTY, (client) => {
      const cur = this.getCurrentPlayer();
      if (!cur || cur.id !== client.sessionId) return;
      if (this.state.turnPhase !== 'TILE_ACTION' || this.state.activeModal !== 'BUY_PROPERTY') return;

      this.startAuction(this.state.selectedTileId);
    });

    // 5. Đấu giá
    this.onMessage(MessageType.AUCTION_BID, (client, payload: AuctionBidPayload) => {
      this.executeAuctionBid(client.sessionId, payload?.amount);
    });

    this.onMessage(MessageType.AUCTION_FOLD, (client) => {
      this.executeAuctionFold(client.sessionId);
    });

    // 6. Xây nhà & Nâng cấp Khách sạn
    this.onMessage(MessageType.UPGRADE_PROPERTY, (client, payload: UpgradePropertyPayload) => {
      this.executeUpgradeProperty(client.sessionId, payload.tileId);
    });

    // 7. Bán nhà / Khách sạn
    this.onMessage(MessageType.SELL_HOUSE, (client, payload: SellHousePayload) => {
      this.executeSellHouse(client.sessionId, payload.tileId);
    });

    // 8. Thế chấp / Chuộc sổ đỏ
    this.onMessage(MessageType.MORTGAGE_PROPERTY, (client, payload: MortgagePayload) => {
      this.executeMortgage(client.sessionId, payload.tileId);
    });

    this.onMessage(MessageType.UNMORTGAGE_PROPERTY, (client, payload: MortgagePayload) => {
      this.executeUnmortgage(client.sessionId, payload.tileId);
    });

    // 9. Xác nhận trả tiền thuê / Nộp thuế / Xem thẻ (Chỉ người có liên quan mới được xác nhận)
    this.onMessage(MessageType.PAY_RENT_CONFIRM, (client) => {
      if (this.state.activeModal === 'RENT_PAID') {
        const isParticipant =
          !this.state.pendingRent.tenantId ||
          client.sessionId === this.state.pendingRent.tenantId ||
          client.sessionId === this.state.pendingRent.landlordId;
        if (isParticipant) {
          this.closeModalAndProceed();
        }
      }
    });

    this.onMessage(MessageType.PAY_TAX_CONFIRM, (client) => {
      if (this.state.activeModal === 'RENT_PAID') {
        const isTenant = !this.state.pendingRent.tenantId || client.sessionId === this.state.pendingRent.tenantId;
        if (isTenant) {
          this.closeModalAndProceed();
        }
      }
    });

    this.onMessage(MessageType.CARD_CONFIRM, (client) => {
      if (this.state.activeModal === 'CARD_DRAW') {
        const isDrawer = !this.getCurrentPlayer()?.id || client.sessionId === this.getCurrentPlayer()?.id;
        if (isDrawer) {
          this.closeModalAndProceed();
        }
      }
    });

    // 10. Ra tù
    this.onMessage(MessageType.JAIL_PAY_BAIL, (client) => {
      const cur = this.getCurrentPlayer();
      if (cur && cur.id === client.sessionId && cur.inJail && cur.money >= GAME_CONFIG.JAIL_BAIL_COST) {
        cur.money -= GAME_CONFIG.JAIL_BAIL_COST;
        cur.inJail = false;
        cur.jailTurns = 0;
        this.addLog(`🗝️ ${cur.name} nộp $${GAME_CONFIG.JAIL_BAIL_COST} tiền bảo lãnh để ra tù ngay!`, 'jail', cur.id);
        this.closeModalAndProceed();
      }
    });

    this.onMessage(MessageType.JAIL_USE_CARD, (client) => {
      const cur = this.getCurrentPlayer();
      if (cur && cur.id === client.sessionId && cur.inJail && cur.getOutOfJailFreeCards > 0) {
        cur.getOutOfJailFreeCards--;
        cur.inJail = false;
        cur.jailTurns = 0;
        this.addLog(`🎫 ${cur.name} sử dụng Vé Miễn Đi Tù để được tự do!`, 'jail', cur.id);
        this.closeModalAndProceed();
      }
    });

    // 11. Giao dịch người chơi (Trading)
    this.onMessage(MessageType.TRADE_PROPOSE, (client, payload: TradeProposePayload) => {
      this.executeTradePropose(client.sessionId, payload);
    });

    this.onMessage(MessageType.TRADE_ACCEPT, (client) => {
      this.executeTradeAccept(client.sessionId);
    });

    this.onMessage(MessageType.TRADE_REJECT, (client) => {
      this.executeTradeReject(client.sessionId);
    });

    this.onMessage(MessageType.TRADE_CANCEL, (client) => {
      this.executeTradeCancel(client.sessionId);
    });

    // 12. Kết thúc lượt
    this.onMessage(MessageType.END_TURN, (client) => {
      const cur = this.getCurrentPlayer();
      if (cur && cur.id === client.sessionId && this.state.turnPhase === 'TURN_END') {
        this.nextTurn();
      }
    });
  }

  // =========================================================================
  // 🕹️ TIẾN TRÌNH LƯỢT CHƠI (TURN CYCLE & GAMEPLAY)
  // =========================================================================

  private startGame() {
    if (this.state.players.length < 2) {
      this.addLog('⚠️ Cần tối thiểu 2 người chơi để bắt đầu trận đấu!', 'info');
      return;
    }

    this.state.currentTurnIndex = 0;
    this.state.turnPhase = 'ROLLING';
    this.resetTimer(TURN_TIMER_CONFIG.ROLLING);
    if ((this as any).listing) {
      this.lock().catch(() => {});
    } else {
      (this as any)._locked = true;
    }

    const firstPlayer = this.getCurrentPlayer();
    this.addLog(`🎲 Trận đấu bắt đầu! Lượt đầu tiên thuộc về ${firstPlayer?.name}.`, 'info');

    this.checkAndTriggerAiTurn();
  }

  private addAiBot() {
    const playerIndex = this.state.players.length;
    const colorConfig = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];

    const bot = new PlayerSchema();
    bot.id = `bot_${Date.now()}_${playerIndex}`;
    bot.name = `Bot AI ${playerIndex + 1}`;
    bot.avatar = `/avatars/${colorConfig.tokenId}.jpg`;
    bot.color = colorConfig.color;
    bot.hexColor = colorConfig.hexColor;
    bot.tokenId = colorConfig.tokenId;
    bot.money = GAME_CONFIG.STARTING_MONEY;
    bot.position = 0;
    bot.isConnected = true;
    bot.isAI = true;

    this.state.players.push(bot);
    this.addLog(`🤖 ${bot.name} đã được thêm vào phòng.`, 'info', bot.id);
  }

  private getCurrentPlayer(): PlayerSchema | undefined {
    if (this.state.players.length === 0) return undefined;
    return this.state.players[this.state.currentTurnIndex];
  }

  private executeRollDice(player: PlayerSchema) {
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const isDoubles = dice1 === dice2;

    this.state.dice.dice1 = dice1;
    this.state.dice.dice2 = dice2;
    this.state.dice.isRolling = false;

    this.addLog(`🎲 ${player.name} tung được [${dice1} : ${dice2}] (Tổng: ${dice1 + dice2})`, 'info', player.id);

    // 1. Nếu đang ở trong tù
    if (player.inJail) {
      player.jailTurns++;

      if (isDoubles) {
        player.inJail = false;
        player.jailTurns = 0;
        this.addLog(`🎉 ${player.name} tung được xúc xắc đôi và được ra tù ngay!`, 'jail', player.id);
        this.movePlayer(player, dice1 + dice2);
      } else if (player.jailTurns >= GAME_CONFIG.MAX_JAIL_TURNS) {
        player.money = Math.max(0, player.money - GAME_CONFIG.JAIL_BAIL_COST);
        player.inJail = false;
        player.jailTurns = 0;
        this.addLog(`⚖️ Đã hết 3 lượt trong tù. ${player.name} nộp $${GAME_CONFIG.JAIL_BAIL_COST} tiền phạt để ra tù!`, 'jail', player.id);
        this.movePlayer(player, dice1 + dice2);
      } else {
        this.addLog(`🔒 ${player.name} không tung được số đôi. Tiếp tục thụ án trong tù (Lượt ${player.jailTurns}/3).`, 'jail', player.id);
        this.state.turnPhase = 'TURN_END';
        this.resetTimer(TURN_TIMER_CONFIG.TURN_END);
        this.checkAndTriggerAiTurn();
      }
      return;
    }

    // 2. Không ở tù: Kiểm tra xúc xắc đôi liên tiếp
    if (isDoubles) {
      this.state.dice.doublesCount++;
      if (this.state.dice.doublesCount >= 3) {
        this.sendPlayerToJail(player, 'Tung được 3 lần số đôi liên tiếp!');
        return;
      }
    } else {
      this.state.dice.doublesCount = 0;
    }

    // 3. Di chuyển người chơi
    this.movePlayer(player, dice1 + dice2);
  }

  private movePlayer(player: PlayerSchema, steps: number) {
    const oldPosition = player.position;
    const newPosition = (oldPosition + steps) % 40;

    // Kiểm tra đi qua ô Khởi Hành (GO)
    if (newPosition < oldPosition) {
      player.money += GAME_CONFIG.GO_REWARD;
      this.addLog(`💰 ${player.name} đi qua ô Khởi Hành (GO) và nhận +$${GAME_CONFIG.GO_REWARD}!`, 'buy', player.id);
    }

    player.position = newPosition;
    this.resolveTileLanded(player, newPosition, steps);
  }

  private sendPlayerToJail(player: PlayerSchema, reason: string) {
    player.position = 10;
    player.inJail = true;
    player.jailTurns = 0;
    this.state.dice.doublesCount = 0;
    this.state.turnPhase = 'TURN_END';
    this.resetTimer(TURN_TIMER_CONFIG.TURN_END);

    this.addLog(`🚨 ${player.name} bị tống vào tù! Lý do: ${reason}`, 'jail', player.id);
    this.checkAndTriggerAiTurn();
  }

  private resolveTileLanded(player: PlayerSchema, tileId: number, diceSum: number) {
    const tile = this.state.board[tileId];
    this.state.selectedTileId = tileId;

    switch (tile.type) {
      case 'PROPERTY':
      case 'STATION':
      case 'UTILITY': {
        if (!tile.ownerId) {
          // Ô đất chưa có chủ sở hữu -> Hiển thị mua đất
          this.state.turnPhase = 'TILE_ACTION';
          this.state.activeModal = 'BUY_PROPERTY';
          this.resetTimer(TURN_TIMER_CONFIG.BUY_PROPERTY);
          this.checkAndTriggerAiTurn();
        } else if (tile.ownerId === player.id) {
          // Ô đất của chính mình
          this.addLog(`🏡 ${player.name} dừng chân tại bất động sản của chính mình (${tile.name}).`, 'info', player.id);
          this.finishTileStep(player);
        } else {
          // Ô đất của đối thủ -> Phải trả tiền thuê
          if (tile.isMortgaged) {
            this.addLog(`🏖️ ${tile.name} đang bị thế chấp ngân hàng, ${player.name} được miễn phí tiền thuê!`, 'rent', player.id);
            this.finishTileStep(player);
          } else {
            const allTiles = boardSchemaToArray(this.state.board);
            const allPlayers = playersSchemaToArray(this.state.players);
            const landlord = allPlayers.find((p) => p.id === tile.ownerId)!;

            const rentAmount = calculateRent(
              tileSchemaToData(tile),
              allTiles,
              landlord,
              diceSum
            );

            // Chuyển tiền thuê
            const actualRent = Math.min(player.money, rentAmount);
            player.money -= actualRent;
            const landlordSchema = this.state.players.find((p: PlayerSchema) => p.id === landlord.id);
            if (landlordSchema) landlordSchema.money += actualRent;

            this.state.pendingRent.tenantId = player.id;
            this.state.pendingRent.landlordId = landlord.id;
            this.state.pendingRent.amount = rentAmount;
            this.state.pendingRent.tileName = tile.name;

            this.addLog(
              `💸 ${player.name} trả $${rentAmount} tiền thuê cho ${landlord.name} tại [${tile.name}]!`,
              'rent',
              player.id
            );

            this.state.turnPhase = 'TILE_ACTION';
            this.state.activeModal = 'RENT_PAID';
            this.resetTimer(TURN_TIMER_CONFIG.PAY_RENT);
            this.checkAndTriggerAiTurn();
          }
        }
        break;
      }

      case 'TAX': {
        const targetTile = tileSchemaToData(tile);
        const playerState = playerSchemaToState(player);
        const taxResult = calculateTax(targetTile, playerState);
        player.money -= taxResult.actualDeducted;

        this.addLog(`🏛️ ${player.name} nộp $${taxResult.actualDeducted} tiền thuế vào ngân sách!`, 'tax', player.id);
        this.state.turnPhase = 'TILE_ACTION';
        this.state.activeModal = 'RENT_PAID';
        this.resetTimer(TURN_TIMER_CONFIG.PAY_RENT);
        this.checkAndTriggerAiTurn();
        break;
      }

      case 'CHANCE': {
        const card = this.chanceDeck.draw();
        this.applyCardEffect(player, card);
        break;
      }

      case 'COMMUNITY_CHEST': {
        const card = this.communityDeck.draw();
        this.applyCardEffect(player, card);
        break;
      }

      case 'GO_TO_JAIL': {
        this.sendPlayerToJail(player, 'Dẫm vào ô Vào Tù (Go To Jail)');
        break;
      }

      case 'GO':
      case 'JAIL':
      case 'FREE_PARKING':
      default: {
        this.finishTileStep(player);
        break;
      }
    }
  }

  private applyCardEffect(player: PlayerSchema, card: any) {
    this.state.activeCard.title = card.title;
    this.state.activeCard.description = card.description;
    this.state.activeCard.type = card.type;
    this.state.activeCard.actionType = card.actionType;
    this.state.activeCard.rewardOrPenalty = card.value || 0;
    this.state.activeCard.targetPosition = card.actionType === 'MOVE_TO' ? card.value : -1;
    this.state.activeCard.sendToJail = card.actionType === 'JAIL';

    this.addLog(`🃏 ${player.name} rút thẻ [${card.title}]: ${card.description}`, 'chance', player.id);

    switch (card.actionType) {
      case 'MONEY_REWARD':
        player.money += card.value;
        break;
      case 'MONEY_PENALTY':
        player.money = Math.max(0, player.money - card.value);
        break;
      case 'MOVE_TO':
        if (card.value < player.position) {
          player.money += GAME_CONFIG.GO_REWARD;
        }
        player.position = card.value;
        break;
      case 'JAIL':
        this.sendPlayerToJail(player, 'Rút phải thẻ Vào Tù');
        return;
      case 'GET_OUT_OF_JAIL':
        player.getOutOfJailFreeCards++;
        break;
    }

    this.state.turnPhase = 'TILE_ACTION';
    this.state.activeModal = 'CARD_DRAW';
    this.resetTimer(TURN_TIMER_CONFIG.CARD_DRAW);
    this.checkAndTriggerAiTurn();
  }

  private executeBuyProperty(player: PlayerSchema) {
    const tile = this.state.board[this.state.selectedTileId];
    if (!tile || tile.ownerId || player.money < tile.price) return;

    player.money -= tile.price;
    tile.ownerId = player.id;

    this.addLog(`🎉 ${player.name} đã mua thành công [${tile.name}] với giá $${tile.price}!`, 'buy', player.id);
    this.closeModalAndProceed();
  }

  // =========================================================================
  // 🔨 ĐẤU GIÁ BẤT ĐỘNG SẢN (PROPERTY AUCTION)
  // =========================================================================

  private startAuction(tileId: number) {
    const tile = this.state.board[tileId];
    if (!tile) return;

    this.state.turnPhase = 'AUCTION';
    this.state.activeModal = 'AUCTION';
    this.state.auction.tileId = tileId;
    this.state.auction.currentBid = 10;
    this.state.auction.highestBidderId = '';
    this.state.auction.minIncrement = 10;
    this.state.auction.isActive = true;

    this.state.auction.activeBidderIds.clear();
    for (const p of this.state.players) {
      if (!p.isBankrupt && p.money >= 10) {
        this.state.auction.activeBidderIds.push(p.id);
      }
    }

    this.addLog(`🔨 Phiên đấu giá cho ô [${tile.name}] bắt đầu! Giá khởi điểm: $10`, 'info');
    this.resetTimer(TURN_TIMER_CONFIG.AUCTION);
    this.checkAndTriggerAiTurn();
  }

  private executeAuctionBid(playerId: string, customAmount?: number) {
    if (!this.state.auction.isActive || this.state.turnPhase !== 'AUCTION') return;
    if (!this.state.auction.activeBidderIds.includes(playerId)) return;

    const bidder = this.state.players.find((p: PlayerSchema) => p.id === playerId);
    if (!bidder) return;

    const newBid = customAmount !== undefined 
      ? customAmount 
      : this.state.auction.currentBid + this.state.auction.minIncrement;

    if (newBid <= this.state.auction.currentBid || newBid > bidder.money) return;

    this.state.auction.currentBid = newBid;
    this.state.auction.highestBidderId = bidder.id;
    this.resetTimer(TURN_TIMER_CONFIG.AUCTION);

    this.addLog(`🙋 ${bidder.name} nâng mức giá lên $${newBid}!`, 'info', bidder.id);
    this.checkAndTriggerAiTurn();
  }

  private executeAuctionFold(playerId: string) {
    if (!this.state.auction.isActive || this.state.turnPhase !== 'AUCTION') return;

    const idx = this.state.auction.activeBidderIds.indexOf(playerId);
    if (idx === -1) return;

    this.state.auction.activeBidderIds.splice(idx, 1);
    const foldingPlayer = this.state.players.find((p: PlayerSchema) => p.id === playerId);
    if (foldingPlayer) {
      this.addLog(`🏳️ ${foldingPlayer.name} quyết định rút lui khỏi phiên đấu giá.`, 'info', playerId);
    }

    // Kiểm tra kết thúc đấu giá
    if (
      this.state.auction.activeBidderIds.length === 1 &&
      this.state.auction.highestBidderId === this.state.auction.activeBidderIds[0]
    ) {
      this.concludeAuction(this.state.auction.highestBidderId);
    } else if (this.state.auction.activeBidderIds.length === 0) {
      this.concludeAuction(this.state.auction.highestBidderId || null);
    } else {
      this.checkAndTriggerAiTurn();
    }
  }

  private concludeAuction(winnerId: string | null) {
    const tile = this.state.board[this.state.auction.tileId];
    if (winnerId && tile) {
      const winner = this.state.players.find((p: PlayerSchema) => p.id === winnerId);
      if (winner) {
        winner.money -= this.state.auction.currentBid;
        tile.ownerId = winner.id;
        this.addLog(`🏆 ${winner.name} đã thắng phiên đấu giá [${tile.name}] với giá $${this.state.auction.currentBid}!`, 'buy', winner.id);
      }
    } else {
      this.addLog(`❌ Phiên đấu giá kết thúc mà không có ai mua đất.`, 'info');
    }

    this.state.auction.isActive = false;
    this.closeModalAndProceed();
  }

  // =========================================================================
  // 🏗️ XÂY DỰNG & QUẢN LÝ BẤT ĐỘNG SẢN (HOUSING & UPGRADES)
  // =========================================================================

  private executeUpgradeProperty(playerId: string, tileId: number) {
    const tile = this.state.board[tileId];
    const player = this.state.players.find((p: PlayerSchema) => p.id === playerId);
    if (!tile || !player || tile.ownerId !== player.id) return;

    const allTiles = boardSchemaToArray(this.state.board);
    const targetTile = tileSchemaToData(tile);
    const playerState = playerSchemaToState(player);

    const check = canUpgradeProperty(
      targetTile,
      allTiles,
      playerState,
      this.state.bankHouses,
      this.state.bankHotels
    );

    if (!check.canUpgrade || player.money < (tile.houseCost || 0)) {
      return;
    }

    player.money -= tile.houseCost;
    if (tile.houses < 4) {
      tile.houses++;
      this.state.bankHouses--;
      this.addLog(`🏡 ${player.name} xây thêm 1 ngôi nhà trên [${tile.name}] (Tổng: ${tile.houses} nhà).`, 'buy', player.id);
    } else if (tile.houses === 4) {
      tile.houses = 5; // Khách sạn
      this.state.bankHotels--;
      this.state.bankHouses += 4; // Trả lại 4 nhà cho ngân hàng
      this.addLog(`🏨 ${player.name} nâng cấp lên Khách Sạn cao cấp trên [${tile.name}]!`, 'buy', player.id);
    }
  }

  private executeSellHouse(playerId: string, tileId: number) {
    const tile = this.state.board[tileId];
    const player = this.state.players.find((p: PlayerSchema) => p.id === playerId);
    if (!tile || !player || tile.ownerId !== player.id || tile.houses <= 0) return;

    const allTiles = boardSchemaToArray(this.state.board);
    const targetTile = tileSchemaToData(tile);
    const playerState = playerSchemaToState(player);

    const check = canSellHouse(targetTile, allTiles, playerState);
    if (!check.canSell) return;

    const refund = Math.floor((tile.houseCost || 0) / 2);
    player.money += refund;

    if (tile.houses === 5) {
      tile.houses = 4;
      this.state.bankHotels++;
      this.state.bankHouses = Math.max(0, this.state.bankHouses - 4);
      this.addLog(`📉 ${player.name} bán Khách Sạn trên [${tile.name}], nhận lại $${refund}.`, 'buy', player.id);
    } else {
      tile.houses--;
      this.state.bankHouses++;
      this.addLog(`📉 ${player.name} dỡ bớt 1 nhà trên [${tile.name}], nhận lại $${refund}.`, 'buy', player.id);
    }
  }

  private executeMortgage(playerId: string, tileId: number) {
    const tile = this.state.board[tileId];
    const player = this.state.players.find((p: PlayerSchema) => p.id === playerId);
    if (!tile || !player || tile.ownerId !== player.id) return;

    const allTiles = boardSchemaToArray(this.state.board);
    const targetTile = tileSchemaToData(tile);

    if (!canMortgageProperty(targetTile, allTiles)) return;

    const mortgageCash = getMortgageValue(targetTile);
    player.money += mortgageCash;
    tile.isMortgaged = true;

    this.addLog(`📜 ${player.name} thế chấp sổ đỏ [${tile.name}] cho ngân hàng, nhận +$${mortgageCash}.`, 'buy', player.id);
  }

  private executeUnmortgage(playerId: string, tileId: number) {
    const tile = this.state.board[tileId];
    const player = this.state.players.find((p: PlayerSchema) => p.id === playerId);
    if (!tile || !player || tile.ownerId !== player.id || !tile.isMortgaged) return;

    const targetTile = tileSchemaToData(tile);
    const unmortgageCost = getUnmortgageCost(targetTile);

    if (!canUnmortgageProperty(targetTile, player.money)) return;

    player.money -= unmortgageCost;
    tile.isMortgaged = false;

    this.addLog(`📜 ${player.name} chuộc lại sổ đỏ [${tile.name}], thanh toán -$${unmortgageCost}.`, 'buy', player.id);
  }

  // =========================================================================
  // 🤝 GIAO DỊCH NGƯỜI CHƠI (PLAYER TRADING)
  // =========================================================================

  private executeTradePropose(initiatorId: string, payload: TradeProposePayload) {
    this.state.trade.initiatorId = initiatorId;
    this.state.trade.targetId = payload.targetPlayerId;
    this.state.trade.offeredMoney = payload.offeredMoney;
    this.state.trade.offeredTileIds = new ArraySchema<number>(...payload.offeredTileIds);
    this.state.trade.requestedMoney = payload.requestedMoney;
    this.state.trade.requestedTileIds = new ArraySchema<number>(...payload.requestedTileIds);
    this.state.trade.status = 'PENDING';

    const initiator = this.state.players.find((p: PlayerSchema) => p.id === initiatorId);
    const target = this.state.players.find((p: PlayerSchema) => p.id === payload.targetPlayerId);

    this.addLog(`🤝 ${initiator?.name} đã gửi một đề xuất giao dịch bất động sản cho ${target?.name}.`, 'trade');

    // Nếu người nhận là AI Bot, tự động thẩm định giao dịch!
    if (target?.isAI) {
      this.clock.setTimeout(() => {
        this.evaluateAiTrade(target);
      }, 1500);
    }
  }

  private evaluateAiTrade(bot: PlayerSchema) {
    if (this.state.trade.status !== 'PENDING') return;

    const initiator = this.state.players.find((p: PlayerSchema) => p.id === this.state.trade.initiatorId);
    if (!initiator) return;

    const offer: TradeOffer = {
      senderId: initiator.id,
      receiverId: bot.id,
      offeredTileIds: Array.from(this.state.trade.offeredTileIds),
      requestedTileIds: Array.from(this.state.trade.requestedTileIds),
      offeredMoney: this.state.trade.offeredMoney,
      requestedMoney: this.state.trade.requestedMoney,
      offeredJailCards: 0,
      requestedJailCards: 0,
    };

    const allPlayers = playersSchemaToArray(this.state.players);
    const allBoard = boardSchemaToArray(this.state.board);

    const decision = evaluateAiTradeDecision(offer, allPlayers, allBoard);

    if (decision.accept) {
      this.executeTradeAccept(bot.id);
    } else {
      this.executeTradeReject(bot.id);
    }
  }

  private executeTradeAccept(targetId: string) {
    if (this.state.trade.status !== 'PENDING' || this.state.trade.targetId !== targetId) return;

    const initiator = this.state.players.find((p: PlayerSchema) => p.id === this.state.trade.initiatorId);
    const target = this.state.players.find((p: PlayerSchema) => p.id === targetId);
    if (!initiator || !target) return;

    const offer: TradeOffer = {
      senderId: initiator.id,
      receiverId: target.id,
      offeredTileIds: Array.from(this.state.trade.offeredTileIds),
      requestedTileIds: Array.from(this.state.trade.requestedTileIds),
      offeredMoney: this.state.trade.offeredMoney,
      requestedMoney: this.state.trade.requestedMoney,
      offeredJailCards: 0,
      requestedJailCards: 0,
    };

    const allPlayers = playersSchemaToArray(this.state.players);
    const allBoard = boardSchemaToArray(this.state.board);
    const validation = validateTrade(offer, allPlayers, allBoard);

    if (!validation.isValid) {
      this.state.trade.status = 'CANCELLED';
      this.addLog(`⚠️ Giao dịch không hợp lệ: ${validation.reason}`, 'trade');
      return;
    }

    // Chuyển tiền
    initiator.money -= this.state.trade.offeredMoney;
    target.money += this.state.trade.offeredMoney;

    target.money -= this.state.trade.requestedMoney;
    initiator.money += this.state.trade.requestedMoney;

    // Chuyển quyền sở hữu đất
    for (const tId of this.state.trade.offeredTileIds) {
      const tile = this.state.board[tId];
      if (tile) tile.ownerId = target.id;
    }

    for (const tId of this.state.trade.requestedTileIds) {
      const tile = this.state.board[tId];
      if (tile) tile.ownerId = initiator.id;
    }

    this.state.trade.status = 'ACCEPTED';
    this.addLog(`✨ Giao dịch thành công giữa ${initiator.name} và ${target.name}!`, 'trade');
  }

  private executeTradeReject(targetId: string) {
    if (this.state.trade.status !== 'PENDING' || this.state.trade.targetId !== targetId) return;
    this.state.trade.status = 'REJECTED';
    this.addLog(`🚫 Lời đề nghị giao dịch đã bị từ chối.`, 'trade');
  }

  private executeTradeCancel(initiatorId: string) {
    if (this.state.trade.status !== 'PENDING' || this.state.trade.initiatorId !== initiatorId) return;
    this.state.trade.status = 'CANCELLED';
    this.addLog(`↩️ Đề xuất giao dịch đã được rút lại.`, 'trade');
  }

  // =========================================================================
  // ⏱️ TIMER, AUTO-TURN & KẾT THÚC LƯỢT
  // =========================================================================

  private finishTileStep(player: PlayerSchema) {
    if (this.state.dice.doublesCount > 0 && !player.inJail) {
      this.state.turnPhase = 'ROLLING';
      this.resetTimer(TURN_TIMER_CONFIG.ROLLING);
      this.addLog(`⚡ ${player.name} được tung xúc xắc tiếp nhờ số đôi (${this.state.dice.doublesCount}/3)!`, 'info', player.id);
    } else {
      this.state.turnPhase = 'TURN_END';
      this.resetTimer(TURN_TIMER_CONFIG.TURN_END);
    }
    this.checkAndTriggerAiTurn();
  }

  private closeModalAndProceed() {
    this.state.activeModal = '';
    this.state.selectedTileId = -1;
    const cur = this.getCurrentPlayer();
    if (cur) {
      this.finishTileStep(cur);
    } else {
      this.state.turnPhase = 'TURN_END';
      this.resetTimer(TURN_TIMER_CONFIG.TURN_END);
      this.checkAndTriggerAiTurn();
    }
  }

  private nextTurn() {
    // Nếu tung được xúc xắc đôi và không ở tù -> Được đổ thêm 1 lần!
    if (this.state.dice.doublesCount > 0 && !this.getCurrentPlayer()?.inJail) {
      this.state.turnPhase = 'ROLLING';
      this.resetTimer(TURN_TIMER_CONFIG.ROLLING);
      this.addLog(`✨ ${this.getCurrentPlayer()?.name} được đổ xúc xắc thêm một lần nữa nhờ số đôi!`, 'info');
      this.checkAndTriggerAiTurn();
      return;
    }

    // Chuyển sang người chơi kế tiếp chưa phá sản
    let nextIdx = (this.state.currentTurnIndex + 1) % this.state.players.length;
    let attempts = 0;
    while (this.state.players[nextIdx].isBankrupt && attempts < this.state.players.length) {
      nextIdx = (nextIdx + 1) % this.state.players.length;
      attempts++;
    }

    // Kiểm tra chỉ còn 1 người duy nhất thắng trận
    const activePlayers = this.state.players.filter((p: PlayerSchema) => !p.isBankrupt);
    if (activePlayers.length === 1) {
      this.state.turnPhase = 'GAME_OVER';
      this.state.winnerId = activePlayers[0].id;
      this.addLog(`👑 CHIẾN THẮNG! ${activePlayers[0].name} là Nhà Vô Địch Tỷ Phú!`, 'info');
      return;
    }

    this.state.currentTurnIndex = nextIdx;
    this.state.turnPhase = 'ROLLING';
    this.state.dice.doublesCount = 0;
    this.resetTimer(TURN_TIMER_CONFIG.ROLLING);

    const nextPlayer = this.getCurrentPlayer();
    this.addLog(`👉 Lượt chơi tiếp theo của ${nextPlayer?.name}.`, 'info', nextPlayer?.id);

    this.checkAndTriggerAiTurn();
  }

  private tickTurnTimer() {
    if (!this.state.turnTimer.isRunning) return;

    this.state.turnTimer.timeLeft--;
    if (this.state.turnTimer.timeLeft <= 0) {
      this.handlePlayerTimeout();
    }
  }

  private resetTimer(seconds: number) {
    this.state.turnTimer.timeLeft = seconds;
    this.state.turnTimer.maxTime = seconds;
    this.state.turnTimer.isRunning = true;
  }

  private handlePlayerTimeout() {
    switch (this.state.turnPhase) {
      case 'ROLLING': {
        const cur = this.getCurrentPlayer();
        if (cur) this.executeRollDice(cur);
        break;
      }
      case 'TILE_ACTION': {
        if (this.state.activeModal === 'BUY_PROPERTY') {
          this.startAuction(this.state.selectedTileId);
        } else {
          this.closeModalAndProceed();
        }
        break;
      }
      case 'AUCTION': {
        this.concludeAuction(this.state.auction.highestBidderId || null);
        break;
      }
      case 'TURN_END': {
        const cur = this.getCurrentPlayer();
        if (this.state.dice.doublesCount > 0 && cur && !cur.inJail) {
          this.executeRollDice(cur);
        } else {
          this.nextTurn();
        }
        break;
      }
    }
  }

  // =========================================================================
  // 🤖 XỬ LÝ TRÍ TUỆ NHÂN TẠO (AI BOT AUTOMATION)
  // =========================================================================

  private checkAndTriggerAiTurn() {
    if (this.botActionTimeout) clearTimeout(this.botActionTimeout);

    const cur = this.getCurrentPlayer();
    if (!cur || !cur.isAI) {
      if (this.state.turnPhase === 'AUCTION') {
        this.triggerAiAuctionTurn();
      }
      return;
    }

    this.botActionTimeout = setTimeout(() => {
      this.executeAiBotTurn(cur);
    }, 1200);
  }

  private executeAiBotTurn(bot: PlayerSchema) {
    switch (this.state.turnPhase) {
      case 'ROLLING': {
        this.executeRollDice(bot);
        break;
      }
      case 'TILE_ACTION': {
        if (this.state.activeModal === 'BUY_PROPERTY') {
          const tile = this.state.board[this.state.selectedTileId];
          if (tile && bot.money >= (tile.price + 100)) {
            this.executeBuyProperty(bot);
          } else {
            this.startAuction(this.state.selectedTileId);
          }
        } else {
          this.closeModalAndProceed();
        }
        break;
      }
      case 'AUCTION': {
        this.triggerAiAuctionTurn();
        break;
      }
      case 'TURN_END': {
        for (const t of this.state.board) {
          if (t.ownerId === bot.id && t.type === 'PROPERTY') {
            const allTiles = boardSchemaToArray(this.state.board);
            const targetTile = tileSchemaToData(t);
            const botState = playerSchemaToState(bot);
            const check = canUpgradeProperty(targetTile, allTiles, botState, this.state.bankHouses, this.state.bankHotels);
            if (check.canUpgrade && bot.money >= (t.houseCost + 200)) {
              this.executeUpgradeProperty(bot.id, t.id);
              break;
            }
          }
        }
        this.nextTurn();
        break;
      }
    }
  }

  private triggerAiAuctionTurn() {
    if (!this.state.auction.isActive || this.state.turnPhase !== 'AUCTION') return;

    for (const bidderId of this.state.auction.activeBidderIds) {
      const bot = this.state.players.find((p: PlayerSchema) => p.id === bidderId && p.isAI);
      if (bot && this.state.auction.highestBidderId !== bot.id) {
        this.clock.setTimeout(() => {
          const tile = this.state.board[this.state.auction.tileId];
          if (!tile) return;

          const decision = getAiBidDecision(
            {
              tileId: this.state.auction.tileId,
              currentBid: this.state.auction.currentBid,
              highestBidderId: this.state.auction.highestBidderId,
              activeBidderIds: Array.from(this.state.auction.activeBidderIds),
              minIncrement: this.state.auction.minIncrement,
              history: [],
            },
            playerSchemaToState(bot),
            tileSchemaToData(tile),
            boardSchemaToArray(this.state.board),
            playersSchemaToArray(this.state.players)
          );

          if (decision.shouldBid && decision.bidAmount <= bot.money) {
            this.executeAuctionBid(bot.id, decision.bidAmount);
          } else {
            this.executeAuctionFold(bot.id);
          }
        }, 1000);
        break;
      }
    }
  }

  private addLog(message: string, type: 'info' | 'trade' | 'jail' | 'buy' | 'rent' | 'tax' | 'chance' = 'info', playerId?: string) {
    const log = new GameLogSchema();
    log.id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    log.timestamp = Date.now();
    log.message = message;
    log.type = type;
    log.playerId = playerId || '';

    this.state.logs.push(log);
    if (this.state.logs.length > 50) {
      this.state.logs.shift();
    }
  }
}
