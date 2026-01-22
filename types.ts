
export interface PartnerDetails {
  name: string;
  personality: string;
  loveLanguage: string;
  interests: string;
}

export interface MoodSignal {
  partner: 'A' | 'B';
  mood: string;
  timestamp: number;
}

export interface TaskRecord {
  id: string;
  activity: string;
  date: string;
  feedback?: string;
  moodAtTime?: {
    A: string;
    B: string;
  };
}

export interface AppState {
  partnerA: PartnerDetails;
  partnerB: PartnerDetails;
  history: TaskRecord[];
  currentMoods: {
    A: string;
    B: string;
  };
}
