/**
 * 🎲 RANDOM & SHUFFLE UTILITIES (Thuật toán xáo bài Fisher–Yates)
 * 
 * Cung cấp các hàm sinh ngẫu nhiên chuẩn xác, không thiên vị (unbiased),
 * tối ưu cho các trò chơi cờ bàn và quản lý bộ bài rút.
 */

/**
 * Thuật toán xáo trộn mảng Fisher–Yates (Knuth Shuffle) O(N)
 * Đảm bảo mọi hoán vị đều có xác suất xuất hiện hoàn toàn bằng nhau.
 */
export function shuffleArray<T>(array: readonly T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Lấy ngẫu nhiên 1 số nguyên trong khoảng [min, max] (bao gồm cả min và max)
 */
export function getRandomInt(min: number, max: number): number {
  const minCeil = Math.ceil(min);
  const maxFloor = Math.floor(max);
  return Math.floor(Math.random() * (maxFloor - minCeil + 1)) + minCeil;
}

/**
 * Tung xúc xắc chuẩn
 * @param count Số lượng viên xúc xắc (mặc định 2)
 * @param sides Số mặt mỗi viên (mặc định 6)
 */
export function rollDiceValues(count = 2, sides = 6): number[] {
  return Array.from({ length: count }, () => getRandomInt(1, sides));
}

/**
 * 🃏 Bộ quản lý Chồng Bài Rút (Deck Manager)
 * Mô phỏng chính xác xấp bài thực tế:
 * - Xáo bài khi khởi tạo
 * - Rút lần lượt từng lá trên cùng
 * - Khi rút hết bài, tự động gom lại và xáo bài mới
 */
export class CardDeck<T> {
  private originalCards: readonly T[];
  private drawPile: T[];
  private discardPile: T[] = [];

  constructor(cards: readonly T[]) {
    this.originalCards = cards;
    this.drawPile = shuffleArray(cards);
  }

  /**
   * Rút 1 lá bài trên cùng của chồng bài
   */
  public draw(): T {
    // Nếu hết bài, gom chồng bài bỏ và xáo lại
    if (this.drawPile.length === 0) {
      this.drawPile = shuffleArray(
        this.discardPile.length > 0 ? this.discardPile : this.originalCards
      );
      this.discardPile = [];
    }

    const card = this.drawPile.pop()!;
    this.discardPile.push(card);
    return card;
  }

  /**
   * Xáo lại toàn bộ bộ bài
   */
  public reshuffle(): void {
    this.drawPile = shuffleArray(this.originalCards);
    this.discardPile = [];
  }

  /**
   * Số lượng lá bài còn lại trong chồng rút
   */
  public get remainingCount(): number {
    return this.drawPile.length;
  }
}
