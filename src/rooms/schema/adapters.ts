import { TileSchema, PlayerSchema } from './MonopolyState';
import { TileData, PlayerState, ColorGroup, TileType, PlayerColor } from '../../types/game';
import { ArraySchema } from '@colyseus/schema';

export function tileSchemaToData(t: TileSchema): TileData {
  return {
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    type: t.type as TileType,
    colorGroup: (t.colorGroup || undefined) as ColorGroup | undefined,
    price: t.price || undefined,
    houseCost: t.houseCost || undefined,
    rent: Array.from(t.rent),
    mortgageValue: t.mortgageValue || undefined,
    ownerId: t.ownerId || null,
    houses: t.houses,
    isMortgaged: t.isMortgaged,
  };
}

export function playerSchemaToState(p: PlayerSchema): PlayerState {
  return {
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    color: p.color as PlayerColor,
    hexColor: p.hexColor,
    tokenId: p.tokenId,
    position: p.position,
    money: p.money,
    inJail: p.inJail,
    jailTurns: p.jailTurns,
    getOutOfJailFreeCards: p.getOutOfJailFreeCards,
    isBankrupt: p.isBankrupt,
    isAI: p.isAI,
  };
}

export function boardSchemaToArray(board: ArraySchema<TileSchema>): TileData[] {
  return board.map(tileSchemaToData);
}

export function playersSchemaToArray(players: ArraySchema<PlayerSchema>): PlayerState[] {
  return players.map(playerSchemaToState);
}
