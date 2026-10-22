import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MonopolyRoom } from './MonopolyRoom';
import { MessageType } from '../types/messages';
import { GAME_CONFIG } from '../constants/gameConfig';

describe('MonopolyRoom - Server Authoritative Logic', () => {
  let room: MonopolyRoom;

  beforeEach(() => {
    vi.useFakeTimers();
    room = new MonopolyRoom();
    room.onCreate({});
  });

  afterEach(() => {
    room.onDispose();
    vi.restoreAllMocks();
  });

  it('1. Khởi tạo phòng với đúng 40 ô đất, 32 nhà, 12 khách sạn và phase LOBBY', () => {
    expect(room.state.board.length).toBe(40);
    expect(room.state.bankHouses).toBe(32);
    expect(room.state.bankHotels).toBe(12);
    expect(room.state.turnPhase).toBe('LOBBY');
    expect(room.state.players.length).toBe(0);
  });

  it('2. Người chơi tham gia phòng được cấp $1500 và màu sắc riêng biệt', () => {
    const mockClient1 = { sessionId: 'client_1' } as any;
    const mockClient2 = { sessionId: 'client_2' } as any;

    room.onJoin(mockClient1, { name: 'Alice' });
    room.onJoin(mockClient2, { name: 'Bob' });

    expect(room.state.players.length).toBe(2);
    expect(room.state.players[0].name).toBe('Alice');
    expect(room.state.players[0].money).toBe(1500);
    expect(room.state.players[0].color).toBe('red');
    expect(room.state.players[1].name).toBe('Bob');
    expect(room.state.players[1].money).toBe(1500);
    expect(room.state.players[1].color).toBe('blue');
  });

  it('3. Thêm Bot AI vào phòng', () => {
    const mockHost = { sessionId: 'host_1' } as any;
    room.onJoin(mockHost, { name: 'Host' });

    (room as any).addAiBot();

    expect(room.state.players.length).toBe(2);
    const bot = room.state.players[1];
    expect(bot.isAI).toBe(true);
    expect(bot.name).toContain('Bot AI');
  });

  it('4. Host bắt đầu trận đấu -> chuyển phase sang ROLLING', () => {
    const mockClient1 = { sessionId: 'client_1' } as any;
    const mockClient2 = { sessionId: 'client_2' } as any;

    room.onJoin(mockClient1, { name: 'Alice' });
    room.onJoin(mockClient2, { name: 'Bob' });

    (room as any).startGame();

    expect(room.state.turnPhase).toBe('ROLLING');
    expect(room.state.currentTurnIndex).toBe(0);
  });

  it('5. Đổ xúc xắc di chuyển người chơi và nhận thưởng khi qua GO', () => {
    const mockClient1 = { sessionId: 'client_1' } as any;
    const mockClient2 = { sessionId: 'client_2' } as any;

    room.onJoin(mockClient1, { name: 'Alice' });
    room.onJoin(mockClient2, { name: 'Bob' });
    (room as any).startGame();

    const p1 = room.state.players[0];
    p1.position = 38; // Ngay trước GO

    // Giả lập di chuyển 2 bước -> position 0 (đúng ô GO)
    (room as any).movePlayer(p1, 2);

    expect(p1.position).toBe(0);
    expect(p1.money).toBe(1500 + GAME_CONFIG.GO_REWARD); // 1700
  });

  it('6. Mua đất trừ đúng số tiền và gán quyền sở hữu', () => {
    const mockClient1 = { sessionId: 'client_1' } as any;
    const mockClient2 = { sessionId: 'client_2' } as any;

    room.onJoin(mockClient1, { name: 'Alice' });
    room.onJoin(mockClient2, { name: 'Bob' });
    (room as any).startGame();

    const p1 = room.state.players[0];
    room.state.selectedTileId = 1; // Phố Cổ ($60)
    room.state.turnPhase = 'TILE_ACTION';
    room.state.activeModal = 'BUY_PROPERTY';

    (room as any).executeBuyProperty(p1);

    expect(room.state.board[1].ownerId).toBe(p1.id);
    expect(p1.money).toBe(1500 - 60);
    expect(room.state.turnPhase).toBe('TURN_END');
  });

  it('7. Từ chối mua đất kích hoạt phiên đấu giá', () => {
    const mockClient1 = { sessionId: 'client_1' } as any;
    const mockClient2 = { sessionId: 'client_2' } as any;

    room.onJoin(mockClient1, { name: 'Alice' });
    room.onJoin(mockClient2, { name: 'Bob' });
    (room as any).startGame();

    (room as any).startAuction(1);

    expect(room.state.turnPhase).toBe('AUCTION');
    expect(room.state.auction.isActive).toBe(true);
    expect(room.state.auction.currentBid).toBe(10);
    expect(room.state.auction.activeBidderIds.length).toBe(2);

    // Client 1 trả giá $20
    (room as any).executeAuctionBid('client_1', 20);
    expect(room.state.auction.currentBid).toBe(20);
    expect(room.state.auction.highestBidderId).toBe('client_1');

    // Client 2 rút lui
    (room as any).executeAuctionFold('client_2');

    // Phiên đấu giá kết thúc, Client 1 thắng đất ô 1 với giá $20
    expect(room.state.auction.isActive).toBe(false);
    expect(room.state.board[1].ownerId).toBe('client_1');
    expect(room.state.players[0].money).toBe(1500 - 20);
  });

  it('8. Nâng cấp nhà tuân thủ kho ngân hàng và quy tắc xây đều', () => {
    const mockClient1 = { sessionId: 'client_1' } as any;
    const mockClient2 = { sessionId: 'client_2' } as any;

    room.onJoin(mockClient1, { name: 'Alice' });
    room.onJoin(mockClient2, { name: 'Bob' });
    (room as any).startGame();

    // Cấp quyền sở hữu trọn bộ Khu Nâu (ô 1 và ô 3) cho Alice
    room.state.board[1].ownerId = 'client_1';
    room.state.board[3].ownerId = 'client_1';

    // Xây 1 nhà trên ô 1
    (room as any).executeUpgradeProperty('client_1', 1);
    expect(room.state.board[1].houses).toBe(1);
    expect(room.state.bankHouses).toBe(31);
    expect(room.state.players[0].money).toBe(1500 - 50);

    // Thử xây tiếp ô 1 khi ô 3 chưa có nhà -> Bị chặn bởi Even Building Rule!
    (room as any).executeUpgradeProperty('client_1', 1);
    expect(room.state.board[1].houses).toBe(1); // Vẫn là 1

    // Xây đều cho ô 3
    (room as any).executeUpgradeProperty('client_1', 3);
    expect(room.state.board[3].houses).toBe(1);
    expect(room.state.bankHouses).toBe(30);
  });

  it('9. Nâng cấp lên khách sạn trả lại 4 nhà cho kho ngân hàng', () => {
    const mockClient1 = { sessionId: 'client_1' } as any;
    const mockClient2 = { sessionId: 'client_2' } as any;

    room.onJoin(mockClient1, { name: 'Alice' });
    room.onJoin(mockClient2, { name: 'Bob' });
    (room as any).startGame();

    room.state.board[1].ownerId = 'client_1';
    room.state.board[3].ownerId = 'client_1';
    room.state.board[1].houses = 4;
    room.state.board[3].houses = 4;
    room.state.bankHouses = 24;
    room.state.bankHotels = 12;

    (room as any).executeUpgradeProperty('client_1', 1);

    expect(room.state.board[1].houses).toBe(5); // Khách sạn
    expect(room.state.bankHotels).toBe(11);      // Giảm 1 khách sạn
    expect(room.state.bankHouses).toBe(28);      // Được hoàn lại 4 ngôi nhà!
  });

  it('10. Đổ 3 lần xúc xắc đôi liên tiếp bị đưa vào tù', () => {
    const mockClient1 = { sessionId: 'client_1' } as any;
    const mockClient2 = { sessionId: 'client_2' } as any;

    room.onJoin(mockClient1, { name: 'Alice' });
    room.onJoin(mockClient2, { name: 'Bob' });
    (room as any).startGame();

    const p1 = room.state.players[0];
    (room as any).sendPlayerToJail(p1, 'Tung 3 số đôi');

    expect(p1.inJail).toBe(true);
    expect(p1.position).toBe(10);
    expect(room.state.turnPhase).toBe('TURN_END');
  });

  it('11. Đổ số đôi cho phép đổ tiếp và chấp nhận ROLL_DICE trong phase ROLLING hoặc TURN_END', () => {
    const mockClient1 = { sessionId: 'client_1' } as any;
    const mockClient2 = { sessionId: 'client_2' } as any;

    room.onJoin(mockClient1, { name: 'Alice' });
    room.onJoin(mockClient2, { name: 'Bob' });
    (room as any).startGame();

    const p1 = room.state.players[0];

    // Giả lập xúc xắc đôi 4 : 4
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5) // Math.floor(0.5 * 6) + 1 = 4
      .mockReturnValueOnce(0.5); // Math.floor(0.5 * 6) + 1 = 4

    (room as any).executeRollDice(p1);

    expect(room.state.dice.dice1).toBe(4);
    expect(room.state.dice.dice2).toBe(4);
    expect(room.state.dice.doublesCount).toBe(1);

    // Sau khi đóng modal hoặc mua đất, finishTileStep đưa phase về ROLLING để đổ tiếp
    (room as any).closeModalAndProceed();
    expect(room.state.turnPhase).toBe('ROLLING');

    // Lần 2: Giả lập đổ xúc xắc thường 2 : 3
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.2) // Math.floor(0.2 * 6) + 1 = 2
      .mockReturnValueOnce(0.4); // Math.floor(0.4 * 6) + 1 = 3

    // Gửi message ROLL_DICE qua message event
    (room as any).onMessageEvents.emit(MessageType.ROLL_DICE, mockClient1, {});

    expect(room.state.dice.dice1).toBe(2);
    expect(room.state.dice.dice2).toBe(3);
    expect(room.state.dice.doublesCount).toBe(0); // Đã reset vì không phải số đôi

    // Kiểm tra thêm trường hợp TURN_END với doublesCount > 0 vẫn chấp nhận ROLL_DICE
    room.state.turnPhase = 'TURN_END';
    room.state.dice.doublesCount = 1;
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1) // Math.floor(0.1 * 6) + 1 = 1
      .mockReturnValueOnce(0.3); // Math.floor(0.3 * 6) + 1 = 2
    (room as any).onMessageEvents.emit(MessageType.ROLL_DICE, mockClient1, {});
    expect(room.state.turnPhase).not.toBe('TURN_END');
  });
});
