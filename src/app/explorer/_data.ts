export const categories = ['Overall', 'Stellar activity', 'Developer', 'Social', 'Ecosystem', 'Wallet history'] as const
export type Category = (typeof categories)[number]
export type Profile = {
  name: string
  address: string
  level: number
  scores: [number, number, number, number, number, number]
  strongest: Category
  credentials: number
  change: string
}
export const profiles: Profile[] = [
  { name: 'stellarsmith.xlm', address: 'GASM…4K2P', level: 6, scores: [98, 96, 81, 94, 97, 98], strongest: 'Developer', credentials: 14, change: '+1' },
  { name: 'orbit-dao', address: 'GCOR…8MQA', level: 6, scores: [95, 89, 88, 80, 98, 86], strongest: 'Ecosystem', credentials: 11, change: '−1' },
  { name: 'lina.dev', address: 'GBLN…T7ZC', level: 6, scores: [92, 86, 98, 75, 87, 85], strongest: 'Developer', credentials: 12, change: '+2' },
  { name: 'anchorwatch', address: 'GDAW…3PLE', level: 5, scores: [89, 93, 72, 85, 88, 94], strongest: 'Wallet history', credentials: 9, change: '—' },
  { name: 'kaito.xlm', address: 'GCKT…9SVD', level: 5, scores: [87, 76, 77, 98, 83, 80], strongest: 'Social', credentials: 8, change: '+4' },
  { name: 'mesh-collective', address: 'GBMC…1NXR', level: 5, scores: [84, 80, 70, 74, 94, 77], strongest: 'Ecosystem', credentials: 10, change: '−2' },
  { name: 'priya.soroban', address: 'GAPS…6QWE', level: 5, scores: [81, 78, 97, 72, 87, 80], strongest: 'Developer', credentials: 7, change: '+1' },
  { name: 'tidepool', address: 'GDTP…0HJK', level: 5, scores: [78, 95, 66, 67, 78, 75], strongest: 'Stellar activity', credentials: 6, change: '−1' },
  { name: 'ren.builds', address: 'GCRB…5YTU', level: 5, scores: [75, 72, 96, 83, 81, 69], strongest: 'Developer', credentials: 8, change: '+3' },
  { name: 'quietlumen', address: 'GBQL…2MFF', level: 5, scores: [73, 79, 58, 77, 74, 83], strongest: 'Wallet history', credentials: 5, change: '—' },
]
