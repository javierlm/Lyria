import type { RecentVideo } from '../domain/IVideoRepository';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

const getRandomTimestamp = (minOffset: number, maxOffset: number) => {
  const randomOffset = Math.floor(Math.random() * (maxOffset - minOffset + 1)) + minOffset;
  return Date.now() - randomOffset;
};

const demoVideos: RecentVideo[] = [
  {
    videoId: 'dQw4w9WgXcQ',
    artist: 'Rick Astley',
    track: 'Never Gonna Give You Up',
    thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    timestamp: getRandomTimestamp(0, 5 * MINUTE)
  },
  {
    videoId: 'SRXH9AbT280',
    artist: 'Linkin Park',
    track: 'The Emptiness Machine',
    thumbnailUrl: 'https://img.youtube.com/vi/SRXH9AbT280/mqdefault.jpg',
    timestamp: getRandomTimestamp(5 * MINUTE, HOUR)
  },
  {
    videoId: 'fJ9rUzIMcZQ',
    artist: 'Queen',
    track: 'Bohemian Rhapsody',
    thumbnailUrl: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/mqdefault.jpg',
    timestamp: getRandomTimestamp(HOUR, 12 * HOUR)
  },
  {
    videoId: 'oiKj0Z_Xnjc',
    artist: 'Stromae ',
    track: 'Papaoutai',
    thumbnailUrl: 'https://img.youtube.com/vi/oiKj0Z_Xnjc/mqdefault.jpg',
    timestamp: getRandomTimestamp(12 * HOUR, DAY)
  },
  {
    videoId: 'hkij4LvACZ0',
    artist: 'BABYMETAL feat Tom Morello',
    track: 'メタり！！ (METALI)',
    thumbnailUrl: 'https://img.youtube.com/vi/hkij4LvACZ0/mqdefault.jpg',
    timestamp: getRandomTimestamp(DAY, 3 * DAY)
  },
  {
    videoId: 'dvgZkm1xWPE',
    artist: 'Coldplay',
    track: 'Viva La Vida',
    thumbnailUrl: 'https://img.youtube.com/vi/dvgZkm1xWPE/mqdefault.jpg',
    timestamp: getRandomTimestamp(MONTH, 3 * MONTH)
  },
  {
    videoId: 'lLFoLJIXayk',
    artist: 'NF',
    track: 'FEAR',
    thumbnailUrl: 'https://img.youtube.com/vi/lLFoLJIXayk/mqdefault.jpg',
    timestamp: getRandomTimestamp(3 * DAY, WEEK)
  },
  {
    videoId: 'K5KAc5CoCuk',
    artist: 'Indila',
    track: 'Dernière Danse',
    thumbnailUrl: 'https://img.youtube.com/vi/K5KAc5CoCuk/mqdefault.jpg',
    timestamp: getRandomTimestamp(WEEK, 2 * WEEK)
  },
  {
    videoId: 'Zi_XLOBDo_Y',
    artist: 'Michael Jackson',
    track: 'Billie Jean',
    thumbnailUrl: 'https://img.youtube.com/vi/Zi_XLOBDo_Y/mqdefault.jpg',
    timestamp: getRandomTimestamp(2 * WEEK, MONTH)
  },
  {
    videoId: 'lDK9QqIzhwk',
    artist: 'Bon Jovi',
    track: "Livin' On A Prayer",
    thumbnailUrl: 'https://img.youtube.com/vi/lDK9QqIzhwk/mqdefault.jpg',
    timestamp: getRandomTimestamp(MONTH, 3 * MONTH)
  },
  {
    videoId: 'OPf0YbXqDm0',
    artist: 'Mark Ronson ft. Bruno Mars',
    track: 'Uptown Funk',
    thumbnailUrl: 'https://img.youtube.com/vi/OPf0YbXqDm0/mqdefault.jpg',
    timestamp: getRandomTimestamp(3 * MONTH, 6 * MONTH)
  },
  {
    videoId: 'rYEDA3JcQqw',
    artist: 'Adele',
    track: 'Rolling in the Deep',
    thumbnailUrl: 'https://img.youtube.com/vi/rYEDA3JcQqw/mqdefault.jpg',
    timestamp: getRandomTimestamp(6 * MONTH, 12 * MONTH)
  }
];

export default demoVideos;
