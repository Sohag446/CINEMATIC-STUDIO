export type SupportedLanguage = 'en' | 'bn';

export interface LocalizationStrings {
  appName: string;
  tagline: string;
  overview: string;
  aiWorkspace: string;
  videoEditor: string;
  storyAssistant: string;
  videoAssistant: string;
  newProject: string;
  openProject: string;
  settings: string;
  diagnostics: string;
  statusPlanned: string;
  statusGenerating: string;
  statusCompleted: string;
  statusFailed: string;
  statusNeedsAttention: string;
  statusVerifying: string;
  renderTimeline: string;
  exportVideo: string;
}

export const translations: Record<SupportedLanguage, LocalizationStrings> = {
  en: {
    appName: 'CINEMATIC STUDIO',
    tagline: 'Professional AI Film Production & Video Editor',
    overview: 'Project Overview',
    aiWorkspace: 'AI Workspace',
    videoEditor: 'Video Editor',
    storyAssistant: 'Tab 1: AI Story Assistant',
    videoAssistant: 'Tab 2: AI Video Assistant',
    newProject: 'New Project',
    openProject: 'Open Project',
    settings: 'Settings',
    diagnostics: 'Diagnostics',
    statusPlanned: 'Planned',
    statusGenerating: 'Generating',
    statusCompleted: 'Completed',
    statusFailed: 'Failed',
    statusNeedsAttention: 'Needs Attention',
    statusVerifying: 'Verifying',
    renderTimeline: 'Render Timeline',
    exportVideo: 'Export Video'
  },
  bn: {
    appName: 'সিনেমেটিক স্টুডিও',
    tagline: 'প্রফেশনাল এআই চলচ্চিত্র প্রযোজনা ও ভিডিও এডিটর',
    overview: 'প্রজেক্ট বিবরণ',
    aiWorkspace: 'এআই ওয়ার্কস্পেস',
    videoEditor: 'ভিডিও এডিটর',
    storyAssistant: 'ট্যাব ১: এআই গল্প সহকারী',
    videoAssistant: 'ট্যাব ২: এআই ভিডিও সহকারী',
    newProject: 'নতুন প্রজেক্ট',
    openProject: 'প্রজেক্ট খুলুন',
    settings: 'সেটিংস',
    diagnostics: 'ডায়াগনস্টিকস',
    statusPlanned: 'পরিকল্পিত',
    statusGenerating: 'তৈরি হচ্ছে',
    statusCompleted: 'সম্পূর্ণ',
    statusFailed: 'ব্যর্থ',
    statusNeedsAttention: 'মনোযোগ প্রয়োজন',
    statusVerifying: 'যাচাই করা হচ্ছে',
    renderTimeline: 'টাইমলাইন রেন্ডার করুন',
    exportVideo: 'ভিডিও এক্সপোর্ট'
  }
};

let currentLang: SupportedLanguage = 'en';

export const getLanguage = (): SupportedLanguage => currentLang;

export const setLanguage = (lang: SupportedLanguage) => {
  currentLang = lang;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('cinematic_studio_language', lang);
  }
};

export const t = (key: keyof LocalizationStrings): string => {
  return translations[currentLang][key] || translations.en[key] || key;
};

