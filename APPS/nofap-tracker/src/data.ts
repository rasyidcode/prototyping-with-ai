import type { Benefit } from './types';

export const MOTIVATIONAL_QUOTES = [
  {
    text: "The secret of change is to focus all of your energy, not on fighting the old, but on building the new.",
    author: "Socrates"
  },
  {
    text: "He who conquers others is strong; he who conquers himself is mighty.",
    author: "Lao Tzu"
  },
  {
    text: "Your urges are not commands. They are just temporary thoughts. You are the master of your actions.",
    author: "Mindfulness Wisdom"
  },
  {
    text: "If you quit now, you will end up right back where you first began. And when you first began, you were desperate to be where you are right now. Keep going.",
    author: "Self-Discipline Guide"
  },
  {
    text: "Discipline is choosing between what you want now and what you want most.",
    author: "Abraham Lincoln"
  },
  {
    text: "Urges are like waves. You cannot stop them from coming, but you can learn to surf them.",
    author: "Jon Kabat-Zinn"
  },
  {
    text: "The chains of habit are too weak to be felt until they are too strong to be broken. Break them now.",
    author: "Samuel Johnson"
  },
  {
    text: "It is not that some people have willpower and others don't... It's that some people are ready to change and others are not.",
    author: "James Gordon"
  },
  {
    text: "An urge lasts on average 15-30 minutes if you do not feed it. Sit with it, observe it, let it pass.",
    author: "Clinical Psychology"
  },
  {
    text: "The only way to achieve lasting change is by rewiring your reward system day by day, choice by choice.",
    author: "Neuroscience"
  },
  {
    text: "Do not sacrifice a lifetime of peace for ten seconds of temporary pleasure.",
    author: "Stoic Maxim"
  },
  {
    text: "Self-control is strength. Right thought is mastery. Calmness is power.",
    author: "James Allen"
  }
];

export const BENEFITS_TIMELINE: Benefit[] = [
  {
    id: 'b1',
    dayStart: 0.5,
    dayEnd: 1,
    title: "Initial Decision & Clarity",
    description: "Your brain fog begins to clear slightly as you make a conscious decision to regain control. The baseline dopamine begins to stabilize.",
    category: 'mental'
  },
  {
    id: 'b2',
    dayStart: 1,
    dayEnd: 3,
    title: "Dopamine Receptors Sensitize",
    description: "Brain receptors begin adjusting to the lack of hyper-stimulation. Physical energy starts to rise and sensory sensitivity slowly increases.",
    category: 'physical'
  },
  {
    id: 'b3',
    dayStart: 3,
    dayEnd: 5,
    title: "Reduced Anxiety & Better Focus",
    description: "As sleep quality improves, cortisol (stress hormone) levels normalize. You start feeling more grounded and focused on daily tasks.",
    category: 'mental'
  },
  {
    id: 'b4',
    dayStart: 5,
    dayEnd: 7,
    title: "Testosterone Spike & Peak Vitality",
    description: "Studies show testosterone levels peak around day 7 of abstinence. You'll experience high physical energy, confidence, and motivation.",
    category: 'physical'
  },
  {
    id: 'b5',
    dayStart: 7,
    dayEnd: 14,
    title: "Social Confidence & Clear Mind",
    description: "Social anxiety decreases markedly. Eye contact becomes easier, communication feels more natural, and verbal fluency improves.",
    category: 'social'
  },
  {
    id: 'b6',
    dayStart: 14,
    dayEnd: 30,
    title: "Dopamine Reboot In Progress",
    description: "Dopamine pathways undergo serious healing. Tasks that previously felt boring (like studying or working out) become enjoyable again.",
    category: 'mental'
  },
  {
    id: 'b7',
    dayStart: 30,
    dayEnd: 60,
    title: "Emotional Equilibrium",
    description: "Irritability fades, replaced by a deep sense of inner peace. Your voice may sound deeper due to hormonal balance and confidence.",
    category: 'spiritual'
  },
  {
    id: 'b8',
    dayStart: 60,
    dayEnd: 90,
    title: "Rewiring of Healthy Attraction",
    description: "Your view of relationships and intimacy shifts to a healthy, natural state. Emotional maturity and self-respect reach new heights.",
    category: 'social'
  },
  {
    id: 'b9',
    dayStart: 90,
    dayEnd: 120,
    title: "The 90-Day Reboot Complete",
    description: "The golden milestone. Your neural pathways have largely returned to their pre-addiction baseline. You have established a new lifestyle.",
    category: 'spiritual'
  }
];
