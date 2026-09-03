import type { EncounterSummary, PersonSummary } from '@togetherly/contracts';
import { demoPhotoPool } from './media';

export const demoPeople: PersonSummary[] = [
  { id: 'lin', displayName: '林初', nickname: '小林', avatarUrl: demoPhotoPool[0]!, linked: true, encounterCount: 18, firstEncounterAt: '2022-09-03T10:00:00Z', lastEncounterAt: '2026-08-20T18:30:00Z' },
  { id: 'jie', displayName: '周杰', nickname: '阿杰', avatarUrl: demoPhotoPool[1]!, linked: false, encounterCount: 11, firstEncounterAt: '2023-03-18T10:00:00Z', lastEncounterAt: '2026-07-12T12:00:00Z' },
  { id: 'yu', displayName: '陈雨', nickname: '小雨', avatarUrl: demoPhotoPool[2]!, linked: true, encounterCount: 9, firstEncounterAt: '2024-02-10T10:00:00Z', lastEncounterAt: '2026-06-02T12:00:00Z' },
];

export const demoEncounters: EncounterSummary[] = [
  { id: 'summer-night', kind: 'MEETING', title: '夏夜散步和迟到的晚饭', story: '本来只准备见一会儿，最后沿着河边走了很久。', locationText: '上海 · 苏州河', startAt: '2026-08-20T18:30:00+08:00', endAt: '2026-08-20T23:10:00+08:00', version: 3, coverUrl: demoPhotoPool[2]!, participantCount: 2, participantNames: ['小林'], photoCount: 47, photoUrls: [demoPhotoPool[2]!, demoPhotoPool[0]!, demoPhotoPool[1]!] },
  { id: 'movie', kind: 'MEETING', title: '下班后临时决定看电影', story: '没有做计划的一天，反而刚刚好。', locationText: '静安寺', startAt: '2026-06-12T18:00:00+08:00', endAt: null, version: 1, coverUrl: demoPhotoPool[1]!, participantCount: 2, participantNames: ['阿杰'], photoCount: 16, photoUrls: [demoPhotoPool[1]!, demoPhotoPool[0]!] },
  { id: 'new-year', kind: 'MEETING', title: '一起跨年', story: '零点的时候大家都在笑。', locationText: '外滩', startAt: '2025-12-31T20:00:00+08:00', endAt: null, version: 2, coverUrl: demoPhotoPool[0]!, participantCount: 4, participantNames: ['小雨', '小林', '阿杰'], photoCount: 83, photoUrls: [demoPhotoPool[0]!, demoPhotoPool[2]!, demoPhotoPool[1]!] },
];
