// the 22 demo people. each has a hidden skill (where their rating will settle),
// a main language, a time zone that decides when they practise, and a habit:
// how often they show up, and whether weekends or weekdays are their days.

export interface Person {
  username: string;
  displayName: string;
  location: string;
  bio: string;
  joined: string;          // yyyy-mm-dd
  skill: number;           // hidden, ~ the rating they converge to
  lang: 'cpp17' | 'python3';
  otherLang?: number;      // share of submissions in the other language
  tz: number;              // utc offset in hours
  activity: number;        // chance of practising on a given weekday
  weekendBoost: number;    // multiplier on saturdays and sundays
  hours: [number, number]; // local practice hours
  breaks?: [string, string][]; // dates away (exams, travel)
}

export const PEOPLE: Person[] = [
  { username: 'mei_lin', displayName: 'Mei Lin', location: 'Singapore', bio: 'Quant intern. Fast fingers, slow proofs.', joined: '2026-03-02', skill: 2230, lang: 'cpp17', tz: 8, activity: 0.45, weekendBoost: 1.3, hours: [21, 25] },
  { username: 'kavya_s', displayName: 'Kavya Subramanian', location: 'Chennai, India', bio: 'ICPC regionals 2025. Learning segment trees properly this time.', joined: '2026-02-18', skill: 2080, lang: 'cpp17', tz: 5.5, activity: 0.55, weekendBoost: 1.2, hours: [19, 24], breaks: [['2026-05-04', '2026-05-22']] },
  { username: 'tomasz_nowak', displayName: 'Tomasz Nowak', location: 'Kraków, Poland', bio: 'Ex-ICPC, now mostly mentoring juniors. I review more code than I write.', joined: '2026-04-11', skill: 1990, lang: 'cpp17', tz: 2, activity: 0.25, weekendBoost: 2.2, hours: [18, 23] },
  { username: 'noah_kim', displayName: 'Noah Kim', location: 'Seoul, South Korea', bio: 'I like problems with short statements.', joined: '2026-03-27', skill: 1960, lang: 'cpp17', tz: 9, activity: 0.4, weekendBoost: 1.1, hours: [22, 26] },
  { username: 'lukas_weber', displayName: 'Lukas Weber', location: 'Munich, Germany', bio: 'Compiler engineer. Yes, I read the assembly.', joined: '2026-05-06', skill: 1890, lang: 'cpp17', tz: 2, activity: 0.3, weekendBoost: 1.8, hours: [20, 24] },
  { username: 'ananya_iyer', displayName: 'Ananya Iyer', location: 'Bengaluru, India', bio: 'Final-year CSE. Graphs over everything.', joined: '2026-02-24', skill: 1840, lang: 'cpp17', tz: 5.5, activity: 0.6, weekendBoost: 1.1, hours: [21, 26], breaks: [['2026-06-08', '2026-06-20']] },
  { username: 'aditya_verma', displayName: 'Aditya Verma', location: 'Kolkata, India', bio: 'Leads the competitive programming club at college. Ask me about bitmasks.', joined: '2026-03-09', skill: 1810, lang: 'cpp17', tz: 5.5, activity: 0.5, weekendBoost: 1.3, hours: [20, 25] },
  { username: 'kenji_tanaka', displayName: 'Kenji Tanaka', location: 'Osaka, Japan', bio: 'AtCoder cyan. Here for the variety.', joined: '2026-04-19', skill: 1760, lang: 'cpp17', tz: 9, activity: 0.35, weekendBoost: 1.6, hours: [20, 24] },
  { username: 'diego_alvarez', displayName: 'Diego Álvarez', location: 'Buenos Aires, Argentina', bio: 'Mate, football and DP on subsets.', joined: '2026-05-21', skill: 1700, lang: 'cpp17', tz: -3, activity: 0.3, weekendBoost: 1.7, hours: [18, 23] },
  { username: 'sara_haddad', displayName: 'Sara Haddad', location: 'Amman, Jordan', bio: 'Maths undergrad. Number theory is my comfort zone; graphs are my homework.', joined: '2026-04-02', skill: 1670, lang: 'python3', otherLang: 0.35, tz: 3, activity: 0.4, weekendBoost: 1.2, hours: [17, 22] },
  { username: 'rohan_mehta', displayName: 'Rohan Mehta', location: 'Pune, India', bio: 'Backend engineer by day, contest grinder on Sundays.', joined: '2026-03-15', skill: 1630, lang: 'cpp17', tz: 5.5, activity: 0.22, weekendBoost: 2.6, hours: [21, 25] },
  { username: 'olivia_chen', displayName: 'Olivia Chen', location: 'Toronto, Canada', bio: 'CS student. Co-op interview season, send help.', joined: '2026-06-03', skill: 1590, lang: 'cpp17', otherLang: 0.3, tz: -4, activity: 0.5, weekendBoost: 0.9, hours: [19, 24] },
  { username: 'aisha_khan', displayName: 'Aisha Khan', location: 'Lucknow, India', bio: 'Android developer. Kotlin at work, C++ when it counts.', joined: '2026-04-28', skill: 1560, lang: 'cpp17', tz: 5.5, activity: 0.35, weekendBoost: 1.5, hours: [21, 24] },
  { username: 'ishaan_g', displayName: 'Ishaan Gupta', location: 'Noida, India', bio: 'Class 12. Preparing for INOI between board exams.', joined: '2026-03-21', skill: 1520, lang: 'cpp17', tz: 5.5, activity: 0.55, weekendBoost: 1.2, hours: [16, 22], breaks: [['2026-03-30', '2026-04-14']] },
  { username: 'vikram_rao', displayName: 'Vikram Rao', location: 'Hyderabad, India', bio: 'SDE-2. Practising for interviews, one pattern at a time.', joined: '2026-05-12', skill: 1460, lang: 'cpp17', otherLang: 0.4, tz: 5.5, activity: 0.3, weekendBoost: 1.9, hours: [22, 25] },
  { username: 'arjun_dev', displayName: 'Arjun Dev', location: 'New Delhi, India', bio: 'Started with Python, staying for the DP.', joined: '2026-04-07', skill: 1390, lang: 'python3', tz: 5.5, activity: 0.45, weekendBoost: 1.2, hours: [20, 24] },
  { username: 'meera_krishnan', displayName: 'Meera Krishnan', location: 'Mysuru, India', bio: 'Data scientist brushing up on graphs and complexity.', joined: '2026-06-15', skill: 1340, lang: 'python3', tz: 5.5, activity: 0.3, weekendBoost: 1.6, hours: [20, 23] },
  { username: 'sneha_patel', displayName: 'Sneha Patel', location: 'Ahmedabad, India', bio: 'Second-year student. Binary search on everything.', joined: '2026-05-30', skill: 1310, lang: 'cpp17', tz: 5.5, activity: 0.5, weekendBoost: 1.1, hours: [18, 23] },
  { username: 'nikhil_jain', displayName: 'Nikhil Jain', location: 'Jaipur, India', bio: 'Python only. Yes, even for the ones that TLE.', joined: '2026-04-23', skill: 1250, lang: 'python3', tz: 5.5, activity: 0.35, weekendBoost: 1.4, hours: [19, 24] },
  { username: 'harsh_v', displayName: 'Harsh Vardhan', location: 'Indore, India', bio: 'Slow and steady. Early mornings, before work.', joined: '2026-03-01', skill: 1210, lang: 'cpp17', tz: 5.5, activity: 0.97, weekendBoost: 1, hours: [6, 8] },
  { username: 'priya_nair', displayName: 'Priya Nair', location: 'Kochi, India', bio: 'Design graduate teaching myself DSA. Sorting finally makes sense.', joined: '2026-06-22', skill: 1140, lang: 'python3', tz: 5.5, activity: 0.4, weekendBoost: 1.3, hours: [20, 23] },
  { username: 'fatima_zahra', displayName: 'Fatima Zahra', location: 'Casablanca, Morocco', bio: 'Web developer learning algorithms one problem at a time.', joined: '2026-07-08', skill: 1090, lang: 'python3', tz: 1, activity: 0.35, weekendBoost: 1.5, hours: [19, 23] },
];

/** the shared demo password, for local testing only. never used outside the seed. */
export const DEMO_PASSWORD = 'demo-password';

export interface ContestPlan { title: string; date: string; minutes: number; size: number }

// sundays at 20:00 in india (14:30 utc), when most of the field is awake
export const CONTESTS: ContestPlan[] = [
  { title: 'Weekly round 1', date: '2026-08-23', minutes: 120, size: 5 },
  { title: 'Weekly round 2', date: '2026-08-30', minutes: 120, size: 5 },
  { title: 'Monsoon long round', date: '2026-09-13', minutes: 180, size: 6 },
  { title: 'Weekly round 3', date: '2026-09-20', minutes: 120, size: 5 },
  { title: 'Weekly round 4', date: '2026-10-04', minutes: 120, size: 5 },
  { title: 'Weekly round 5', date: '2026-10-18', minutes: 120, size: 5 },
  { title: 'Weekly round 6', date: '2026-10-25', minutes: 120, size: 5 },
];
