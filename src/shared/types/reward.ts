// 所有奖励都以可序列化的数据描述，便于等级奖励、成就和签到复用同一套发放逻辑。
export type RewardSpec =
  | { type: 'coins'; amount: number }
  | { type: 'fragments'; amount: number }
  | { type: 'item'; itemId: string; quantity: number }
  | { type: 'character'; id: string }
  | { type: 'scene'; id: string };

export function describeReward(reward: RewardSpec): string {
  switch (reward.type) {
    case 'coins':
      return `${reward.amount} 星星币`;
    case 'fragments':
      return `${reward.amount} 星光碎片`;
    case 'item':
      return `装扮 ×${reward.quantity}`;
    case 'character':
      return '新伙伴';
    case 'scene':
      return '新场景';
  }
}
