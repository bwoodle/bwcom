import { NextResponse } from 'next/server';

type DailyEntry = {
  id: string;
  logId: string;
  date: string;
  entryType: 'daily';
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  description: string;
  miles: number;
  highlight?: boolean;
};

type WeeklyEntry = {
  id: string;
  logId: string;
  date: string;
  entryType: 'week';
  description: string;
  miles: number;
};

type TrainingLogEntry = DailyEntry | WeeklyEntry;

type TrainingLogSection = {
  id: string;
  name: string;
  entries: TrainingLogEntry[];
};

const mockSections: TrainingLogSection[] = [
  {
    id: 'paris-2026',
    name: 'Paris 2026',
    entries: [
      {
        id: 'd-2026-01-19-am',
        logId: 'paris-2026',
        date: '2026-01-19',
        entryType: 'daily',
        timeOfDay: 'morning',
        description: 'Easy aerobic run',
        miles: 5.0,
      },
      {
        id: 'd-2026-01-19-pm',
        logId: 'paris-2026',
        date: '2026-01-19',
        entryType: 'daily',
        timeOfDay: 'evening',
        description: 'Mobility + strides',
        miles: 2.0,
      },
      {
        id: 'd-2026-01-20-am',
        logId: 'paris-2026',
        date: '2026-01-20',
        entryType: 'daily',
        timeOfDay: 'morning',
        description: 'Progression run',
        miles: 7.0,
      },
      {
        id: 'd-2026-01-21-am',
        logId: 'paris-2026',
        date: '2026-01-21',
        entryType: 'daily',
        timeOfDay: 'morning',
        description: 'Hill repeats',
        miles: 6.0,
      },
      {
        id: 'd-2026-01-21-pm',
        logId: 'paris-2026',
        date: '2026-01-21',
        entryType: 'daily',
        timeOfDay: 'evening',
        description: 'Recovery jog',
        miles: 2.5,
      },
      {
        id: 'd-2026-01-22-pm',
        logId: 'paris-2026',
        date: '2026-01-22',
        entryType: 'daily',
        timeOfDay: 'afternoon',
        description: 'Tempo intervals',
        miles: 6.5,
      },
      {
        id: 'd-2026-01-23-am',
        logId: 'paris-2026',
        date: '2026-01-23',
        entryType: 'daily',
        timeOfDay: 'morning',
        description: 'Easy run + drills',
        miles: 5.5,
      },
      {
        id: 'd-2026-01-24-am',
        logId: 'paris-2026',
        date: '2026-01-24',
        entryType: 'daily',
        timeOfDay: 'morning',
        description: 'Long run',
        miles: 12.0,
        highlight: true,
      },
      {
        id: 'd-2026-01-25-am',
        logId: 'paris-2026',
        date: '2026-01-25',
        entryType: 'daily',
        timeOfDay: 'morning',
        description: 'Shakeout + strides',
        miles: 3.0,
      },
      {
        id: 'w-2026-01-25',
        logId: 'paris-2026',
        date: '2026-01-25',
        entryType: 'week',
        description: 'Solid base week; legs felt fresh.',
        miles: 49.5,
      },
      {
        id: 'd-2026-01-26-am',
        logId: 'paris-2026',
        date: '2026-01-26',
        entryType: 'daily',
        timeOfDay: 'morning',
        description: 'Easy aerobic run',
        miles: 6.0,
      },
      {
        id: 'd-2026-01-27-am',
        logId: 'paris-2026',
        date: '2026-01-27',
        entryType: 'daily',
        timeOfDay: 'morning',
        description: 'Threshold workout',
        miles: 7.5,
        highlight: true,
      },
      {
        id: 'd-2026-01-27-pm',
        logId: 'paris-2026',
        date: '2026-01-27',
        entryType: 'daily',
        timeOfDay: 'evening',
        description: 'Recovery jog',
        miles: 2.0,
      },
      {
        id: 'd-2026-01-28-am',
        logId: 'paris-2026',
        date: '2026-01-28',
        entryType: 'daily',
        timeOfDay: 'morning',
        description: 'Hill sprints',
        miles: 5.0,
      },
      {
        id: 'd-2026-01-29-pm',
        logId: 'paris-2026',
        date: '2026-01-29',
        entryType: 'daily',
        timeOfDay: 'afternoon',
        description: 'Steady run',
        miles: 6.0,
      },
      {
        id: 'd-2026-01-30-am',
        logId: 'paris-2026',
        date: '2026-01-30',
        entryType: 'daily',
        timeOfDay: 'morning',
        description: 'Easy run + strides',
        miles: 5.5,
      },
      {
        id: 'd-2026-01-31-am',
        logId: 'paris-2026',
        date: '2026-01-31',
        entryType: 'daily',
        timeOfDay: 'morning',
        description: 'Long run',
        miles: 13.0,
        highlight: true,
      },
      {
        id: 'd-2026-02-01-am',
        logId: 'paris-2026',
        date: '2026-02-01',
        entryType: 'daily',
        timeOfDay: 'morning',
        description: 'Shakeout',
        miles: 3.5,
      },
      {
        id: 'w-2026-02-01',
        logId: 'paris-2026',
        date: '2026-02-01',
        entryType: 'week',
        description: 'Strong week with quality sessions.',
        miles: 48.5,
      },
    ],
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sectionId = searchParams.get('sectionId');

  if (sectionId) {
    const section = mockSections.find((item) => item.id === sectionId);
    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }
    return NextResponse.json(section);
  }

  return NextResponse.json({ sections: mockSections });
}
