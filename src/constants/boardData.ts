/**
 * 🎲 DANH SÁCH 40 Ô BÀN CỜ CỜ TỶ PHÚ VIỆT NAM (INITIAL_BOARD_DATA)
 * 
 * 📌 GIẢI THÍCH Ý NGHĨA CÁC THUỘC TÍNH CỦA MỖI Ô ĐẤT:
 * -------------------------------------------------------------------------------------
 * - id: number            -> Vị trí ô trên bàn cờ (0 -> 39). Ô 0 là ô Khởi Hành (GO).
 * - name: string          -> Tên đầy đủ hiển thị trên Sổ Đỏ và Modal thông báo.
 * - shortName: string     -> Tên rút gọn in trên mặt bàn cờ 3D.
 * - type: TileType        -> Loại ô:
 *                              + 'PROPERTY'        : Ô đất (có thể mua & xây nhà).
 *                              + 'STATION'         : Bến xe / Sân bay / Ga tàu.
 *                              + 'UTILITY'         : Tiện ích (Điện lực, Cấp nước).
 *                              + 'TAX'             : Ô nộp thuế.
 *                              + 'CHANCE'          : Ô thẻ bài Cơ Hội.
 *                              + 'COMMUNITY_CHEST' : Ô thẻ bài Khí Vận.
 *                              + 'GO', 'JAIL', 'FREE_PARKING', 'GO_TO_JAIL' : 4 ô góc.
 * - colorGroup: string    -> Nhóm màu khu đất ('brown', 'light_blue', 'pink', 'orange', 'red', 'yellow', 'green', 'dark_blue').
 *                              * Gom đủ bộ màu -> được quyền Xây Nhà.
 * - price: number         -> Giá tiền mua từ Ngân hàng ($).
 * - houseCost: number     -> Chi phí xây thêm 1 ngôi nhà ($).
 * - rent: number[]        -> Bảng giá tiền thuê đối thủ phải trả khi dẫm vào ô:
 *                              + rent[0] : Đất trống (chưa có nhà).
 *                              + rent[1] : Đã xây 1 nhà.
 *                              + rent[2] : Đã xây 2 nhà.
 *                              + rent[3] : Đã xây 3 nhà.
 *                              + rent[4] : Đã xây 4 nhà.
 *                              + rent[5] : Đã nâng cấp lên Khách Sạn (Hotel).
 * - mortgageValue: number -> Giá trị thế chấp cắm sổ đỏ cho ngân hàng (50% giá mua).
 * - ownerId: string|null  -> ID người sở hữu ô đất (null: đất trống, 'p1', 'p2'...).
 * - houses: number        -> Số lượng công trình đang có (0: đất trống, 1-4: nhà, 5: khách sạn).
 * -------------------------------------------------------------------------------------
 */

import { TileData } from '../types/game';

export const INITIAL_BOARD_DATA: TileData[] = [
  // 0: Góc Khởi Hành (GO)
  {
    id: 0,
    name: 'Khởi Hành (GO)',
    shortName: 'GO',
    icon: '/tiles/go.png',
    type: 'GO',
  },
  // 1: Phố Cổ Hà Nội (Nâu 1)
  {
    id: 1,
    name: 'Phố Cổ',
    shortName: 'Phố Cổ',
    icon: '/tiles/ho_guom.png',
    type: 'PROPERTY',
    colorGroup: 'brown',
    price: 60,
    houseCost: 50,
    rent: [2, 10, 30, 90, 160, 250],
    mortgageValue: 30,
    ownerId: null,
    houses: 0,
  },
  // 2: Khí Vận 1
  {
    id: 2,
    name: 'Khí Vận',
    shortName: 'Khí Vận',
    icon: '/tiles/chest.png',
    type: 'COMMUNITY_CHEST',
  },
  // 3: Ô Quan Chưởng (Nâu 2)
  {
    id: 3,
    name: 'Ô Quan Chưởng',
    shortName: 'Quan Chưởng',
    icon: '/tiles/pho_co.svg',
    type: 'PROPERTY',
    colorGroup: 'brown',
    price: 60,
    houseCost: 50,
    rent: [4, 20, 60, 180, 320, 450],
    mortgageValue: 30,
    ownerId: null,
    houses: 0,
  },
  // 4: Thuế Thu Nhập
  {
    id: 4,
    name: 'Thuế Thu Nhập',
    shortName: 'Thuế ($200)',
    icon: '/tiles/tax_income.svg',
    type: 'TAX',
    price: 200,
  },
  // 5: Ga Hà Nội (Bến xe 1)
  {
    id: 5,
    name: 'Ga Hà Nội',
    shortName: 'Ga Hà Nội',
    icon: '/tiles/station.svg',
    type: 'STATION',
    price: 200,
    rent: [25, 50, 100, 200],
    mortgageValue: 100,
    ownerId: null,
  },
  // 6: Cầu Rồng Đà Nẵng (Lam 1)
  {
    id: 6,
    name: 'Cầu Rồng',
    shortName: 'Cầu Rồng',
    icon: '/tiles/da_nang.png',
    type: 'PROPERTY',
    colorGroup: 'light_blue',
    price: 100,
    houseCost: 50,
    rent: [6, 30, 90, 270, 400, 550],
    mortgageValue: 50,
    ownerId: null,
    houses: 0,
  },
  // 7: Cơ Hội 1
  {
    id: 7,
    name: 'Cơ Hội',
    shortName: 'Cơ Hội',
    icon: '/tiles/chance.svg',
    type: 'CHANCE',
  },
  // 8: Bán Đảo Sơn Trà (Lam 2)
  {
    id: 8,
    name: 'Sơn Trà',
    shortName: 'Sơn Trà',
    icon: '/tiles/sam_son.svg',
    type: 'PROPERTY',
    colorGroup: 'light_blue',
    price: 100,
    houseCost: 50,
    rent: [6, 30, 90, 270, 400, 550],
    mortgageValue: 50,
    ownerId: null,
    houses: 0,
  },
  // 9: Bãi Biển Mỹ Khê (Lam 3)
  {
    id: 9,
    name: 'Biển Mỹ Khê',
    shortName: 'Mỹ Khê',
    icon: '/tiles/cua_lo.svg',
    type: 'PROPERTY',
    colorGroup: 'light_blue',
    price: 120,
    houseCost: 50,
    rent: [8, 40, 100, 300, 450, 600],
    mortgageValue: 60,
    ownerId: null,
    houses: 0,
  },
  // 10: Góc Đi Tù / Thăm Tù
  {
    id: 10,
    name: 'Nhà Tù / Thăm Tù',
    shortName: 'Nhà Tù',
    icon: '/tiles/jail.svg',
    type: 'JAIL',
  },
  // 11: Chợ Bến Thành (Hồng 1)
  {
    id: 11,
    name: 'Chợ Bến Thành',
    shortName: 'Bến Thành',
    icon: '/tiles/cho_ben_thanh.svg',
    type: 'PROPERTY',
    colorGroup: 'pink',
    price: 140,
    houseCost: 100,
    rent: [10, 50, 150, 450, 625, 750],
    mortgageValue: 70,
    ownerId: null,
    houses: 0,
  },
  // 12: Nhà Máy Điện (Tiện ích 1)
  {
    id: 12,
    name: 'Điện Lực Quốc Gia',
    shortName: 'Điện Lực',
    icon: '/tiles/electric.svg',
    type: 'UTILITY',
    price: 150,
    mortgageValue: 75,
    ownerId: null,
  },
  // 13: Phố Đi Bộ Nguyễn Huệ (Hồng 2)
  {
    id: 13,
    name: 'Nguyễn Huệ',
    shortName: 'Nguyễn Huệ',
    icon: '/tiles/pho_di_bo.svg',
    type: 'PROPERTY',
    colorGroup: 'pink',
    price: 140,
    houseCost: 100,
    rent: [10, 50, 150, 450, 625, 750],
    mortgageValue: 70,
    ownerId: null,
    houses: 0,
  },
  // 14: Nhà Hát Thành Phố (Hồng 3)
  {
    id: 14,
    name: 'Nhà Hát Lớn',
    shortName: 'Nhà Hát',
    icon: '/tiles/dinh_doc_lap.svg',
    type: 'PROPERTY',
    colorGroup: 'pink',
    price: 160,
    houseCost: 100,
    rent: [12, 60, 180, 500, 700, 900],
    mortgageValue: 80,
    ownerId: null,
    houses: 0,
  },
  // 15: Ga Sài Gòn (Bến xe 2)
  {
    id: 15,
    name: 'Ga Sài Gòn',
    shortName: 'Ga Sài Gòn',
    icon: '/tiles/station.svg',
    type: 'STATION',
    price: 200,
    rent: [25, 50, 100, 200],
    mortgageValue: 100,
    ownerId: null,
  },
  // 16: Tháp Rùa Hồ Gươm (Cam 1)
  {
    id: 16,
    name: 'Hồ Gươm',
    shortName: 'Hồ Gươm',
    icon: '/tiles/ho_guom.png',
    type: 'PROPERTY',
    colorGroup: 'orange',
    price: 180,
    houseCost: 100,
    rent: [14, 70, 200, 550, 750, 950],
    mortgageValue: 90,
    ownerId: null,
    houses: 0,
  },
  // 17: Khí Vận 2
  {
    id: 17,
    name: 'Khí Vận',
    shortName: 'Khí Vận',
    icon: '/tiles/chest.png',
    type: 'COMMUNITY_CHEST',
  },
  // 18: Hoàng Thành Thăng Long (Cam 2)
  {
    id: 18,
    name: 'Hoàng Thành',
    shortName: 'Hoàng Thành',
    icon: '/tiles/hue.svg',
    type: 'PROPERTY',
    colorGroup: 'orange',
    price: 180,
    houseCost: 100,
    rent: [14, 70, 200, 550, 750, 950],
    mortgageValue: 90,
    ownerId: null,
    houses: 0,
  },
  // 19: Văn Miếu Quốc Tử Giám (Cam 3)
  {
    id: 19,
    name: 'Văn Miếu',
    shortName: 'Văn Miếu',
    icon: '/tiles/ho_guom.png',
    type: 'PROPERTY',
    colorGroup: 'orange',
    price: 200,
    houseCost: 100,
    rent: [16, 80, 220, 600, 800, 1000],
    mortgageValue: 100,
    ownerId: null,
    houses: 0,
  },
  // 20: Bãi Đỗ Xe Miễn Phí (Free Parking)
  {
    id: 20,
    name: 'Bãi Đỗ Xe',
    shortName: 'Bãi Đỗ Xe',
    icon: '/tiles/parking.svg',
    type: 'FREE_PARKING',
  },
  // 21: Phố Cổ Hội An (Đỏ 1)
  {
    id: 21,
    name: 'Hội An',
    shortName: 'Hội An',
    icon: '/tiles/hoi_an.svg',
    type: 'PROPERTY',
    colorGroup: 'red',
    price: 220,
    houseCost: 150,
    rent: [18, 90, 250, 700, 875, 1050],
    mortgageValue: 110,
    ownerId: null,
    houses: 0,
  },
  // 22: Cơ Hội 2
  {
    id: 22,
    name: 'Cơ Hội',
    shortName: 'Cơ Hội',
    icon: '/tiles/chance.svg',
    type: 'CHANCE',
  },
  // 23: Cố Đô Huế (Đỏ 2)
  {
    id: 23,
    name: 'Cố Đô Huế',
    shortName: 'Cố Đô Huế',
    icon: '/tiles/hue.svg',
    type: 'PROPERTY',
    colorGroup: 'red',
    price: 220,
    houseCost: 150,
    rent: [18, 90, 250, 700, 875, 1050],
    mortgageValue: 110,
    ownerId: null,
    houses: 0,
  },
  // 24: Vịnh Hạ Long (Đỏ 3)
  {
    id: 24,
    name: 'Vịnh Hạ Long',
    shortName: 'Vịnh Hạ Long',
    icon: '/tiles/vinh_ha_long.svg',
    type: 'PROPERTY',
    colorGroup: 'red',
    price: 240,
    houseCost: 150,
    rent: [20, 100, 300, 750, 925, 1100],
    mortgageValue: 120,
    ownerId: null,
    houses: 0,
  },
  // 25: Sân Bay Quốc Tế Nội Bài (Bến xe 3)
  {
    id: 25,
    name: 'Sân Bay Nội Bài',
    shortName: 'Nội Bài',
    icon: '/tiles/station.svg',
    type: 'STATION',
    price: 200,
    rent: [25, 50, 100, 200],
    mortgageValue: 100,
    ownerId: null,
  },
  // 26: Tràng An Ninh Bình (Vàng 1)
  {
    id: 26,
    name: 'Tràng An',
    shortName: 'Tràng An',
    icon: '/tiles/ninh_binh.svg',
    type: 'PROPERTY',
    colorGroup: 'yellow',
    price: 260,
    houseCost: 150,
    rent: [22, 110, 330, 800, 975, 1150],
    mortgageValue: 130,
    ownerId: null,
    houses: 0,
  },
  // 27: Fansipan Sa Pa (Vàng 2)
  {
    id: 27,
    name: 'Fansipan',
    shortName: 'Fansipan',
    icon: '/tiles/quang_ninh.svg',
    type: 'PROPERTY',
    colorGroup: 'yellow',
    price: 260,
    houseCost: 150,
    rent: [22, 110, 330, 800, 975, 1150],
    mortgageValue: 130,
    ownerId: null,
    houses: 0,
  },
  // 28: Công Ty Cấp Nước (Tiện ích 2)
  {
    id: 28,
    name: 'Cấp Nước Sạch',
    shortName: 'Cấp Nước',
    icon: '/tiles/water.svg',
    type: 'UTILITY',
    price: 150,
    mortgageValue: 75,
    ownerId: null,
  },
  // 29: Phong Nha Kẻ Bàng (Vàng 3)
  {
    id: 29,
    name: 'Phong Nha',
    shortName: 'Phong Nha',
    icon: '/tiles/ninh_binh.svg',
    type: 'PROPERTY',
    colorGroup: 'yellow',
    price: 280,
    houseCost: 150,
    rent: [24, 120, 360, 850, 1025, 1200],
    mortgageValue: 140,
    ownerId: null,
    houses: 0,
  },
  // 30: Góc Vào Tù (Go To Jail)
  {
    id: 30,
    name: 'Vào Tù Ngay',
    shortName: 'Vào Tù',
    icon: '/tiles/gotojail.svg',
    type: 'GO_TO_JAIL',
  },
  // 31: Đảo Ngọc Phú Quốc (Lục 1)
  {
    id: 31,
    name: 'Phú Quốc',
    shortName: 'Phú Quốc',
    icon: '/tiles/phu_quoc.svg',
    type: 'PROPERTY',
    colorGroup: 'green',
    price: 300,
    houseCost: 200,
    rent: [26, 130, 390, 900, 1100, 1275],
    mortgageValue: 150,
    ownerId: null,
    houses: 0,
  },
  // 32: Nha Trang Biển Xanh (Lục 2)
  {
    id: 32,
    name: 'Nha Trang',
    shortName: 'Nha Trang',
    icon: '/tiles/nha_trang.svg',
    type: 'PROPERTY',
    colorGroup: 'green',
    price: 300,
    houseCost: 200,
    rent: [26, 130, 390, 900, 1100, 1275],
    mortgageValue: 150,
    ownerId: null,
    houses: 0,
  },
  // 33: Khí Vận 3
  {
    id: 33,
    name: 'Khí Vận',
    shortName: 'Khí Vận',
    icon: '/tiles/chest.png',
    type: 'COMMUNITY_CHEST',
  },
  // 34: Đà Lạt Ngàn Hoa (Lục 3)
  {
    id: 34,
    name: 'Đà Lạt',
    shortName: 'Đà Lạt',
    icon: '/tiles/da_lat.svg',
    type: 'PROPERTY',
    colorGroup: 'green',
    price: 320,
    houseCost: 200,
    rent: [28, 150, 450, 1000, 1200, 1400],
    mortgageValue: 160,
    ownerId: null,
    houses: 0,
  },
  // 35: Sân Bay Tân Sơn Nhất (Bến xe 4)
  {
    id: 35,
    name: 'Tân Sơn Nhất',
    shortName: 'Tân Sơn Nhất',
    icon: '/tiles/station.svg',
    type: 'STATION',
    price: 200,
    rent: [25, 50, 100, 200],
    mortgageValue: 100,
    ownerId: null,
  },
  // 36: Cơ Hội 3
  {
    id: 36,
    name: 'Cơ Hội',
    shortName: 'Cơ Hội',
    icon: '/tiles/chance.svg',
    type: 'CHANCE',
  },
  // 37: Đường Đồng Khởi (Chàm 1 - Đất Kim Cương)
  {
    id: 37,
    name: 'Đồng Khởi',
    shortName: 'Đồng Khởi',
    icon: '/tiles/pho_di_bo.svg',
    type: 'PROPERTY',
    colorGroup: 'dark_blue',
    price: 350,
    houseCost: 200,
    rent: [35, 175, 500, 1100, 1300, 1500],
    mortgageValue: 175,
    ownerId: null,
    houses: 0,
  },
  // 38: Thuế Đặc Biệt / Xa Xỉ
  {
    id: 38,
    name: 'Thuế Xa Xỉ',
    shortName: 'Thuế ($100)',
    icon: '/tiles/tax_luxury.svg',
    type: 'TAX',
    price: 100,
  },
  // 39: Phố Tràng Tiền - Hà Nội (Chàm 2 - Đất Đắt Nhất Bàn Cờ)
  {
    id: 39,
    name: 'Tràng Tiền',
    shortName: 'Tràng Tiền',
    icon: '/tiles/landmark81.png',
    type: 'PROPERTY',
    colorGroup: 'dark_blue',
    price: 400,
    houseCost: 200,
    rent: [50, 200, 600, 1400, 1700, 2000],
    mortgageValue: 200,
    ownerId: null,
    houses: 0,
  },
];
