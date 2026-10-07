import { makeUnknown } from '../schema.js';

/**
 * Sansanピックルボールコート池袋 アダプタ。
 *
 * 状態: 未実装(調査待ち)。
 * 実装前に必要: (1) 規約の確認で自動取得が禁止されていないこと
 *               (2) 予約ページの通信を観察し、API(JSON)の有無を判断すること
 * それまでは推測せず unknown を返す。
 */
export const id = 'sansan-ikebukuro';

/** @param {{facility:object, from:string, to:string, now:string, sleep:(ms:number)=>Promise<void>}} ctx */
export async function fetchAvailability({ facility, from, now }) {
  return [makeUnknown({
    facility: id,
    date: from,
    booking_url: facility.booking_url,
    fetched_at: now,
    note: 'adapter not implemented yet (site investigation pending)',
  })];
}
