import type { CaseDefinition } from './types';

/**
 * CASE 001 — THE 3:17 INCIDENT
 * Everything case-specific lives here. The engine never hard-codes story.
 *
 * Truth (spoilers): Michael Ross poisoned Victor's whisky (~03:10) because Victor
 * found the $4.2M he embezzled and planned to go to regulators at 09:00.
 * Emma, paid off, altered the guestbook (02:40 "checkout") and issued him a
 * duplicate key. Michael came back at ~03:31, smashed the clock to 3:17 and left
 * a pill bottle to stage a suicide. Victor called Sarah at 03:24 — after the "time
 * of death" on the clock.
 */
export const case001: CaseDefinition = {
  id: 'case001',
  number: 'CASE 001',
  title: 'THE 3:17 INCIDENT',
  tagline: 'DO NOT BLINDLY TRUST AI.',
  intro: [
    'Hotel Meridian. 04:02 AM.',
    'Victor Hale, co-founder of Hale & Ross Capital, was found dead in Room 317.',
    'A broken clock on the floor reads 03:17. The night staff are calling it suicide.',
    'Your AI partner is online. It is fast, confident — and not always right.',
  ],
  victim: {
    name: 'Victor Hale',
    bio: 'Co-founder of Hale & Ross Capital. 52. Found by housekeeping at 03:58.',
  },
  world: 'hotel',
  playerStart: [-6, 0, 11.5],

  evidence: [
    {
      id: 'guestbook',
      name: 'Hotel Guestbook',
      description:
        'Night ledger at reception. "M. Ross — checked out 02:40". The ink of that line is fresher than the rest and the time has been written over.',
      quote: '"M. Ross — out 02:40" … written over in fresh ink.',
      location: 'Reception desk',
      importance: 'medium',
      relatedCharacters: ['emma', 'michael'],
      relatedEvidence: ['cctv'],
      position: [-1.2, 1.12, 9.3],
      prop: 'book',
      kind: 'Book',
    },
    {
      id: 'notebook',
      name: 'Red Notebook',
      description:
        "Victor's private notebook. Pages of account numbers: $4.2M moved to a shell company signed off by \"M.\". Final entry: \"03:17 — Don't trust the AI audit. M. retrained it to hide the transfers. Regulators at 9.\"",
      quote: '"03:17 — Don\'t trust AI."',
      location: 'Room 317 — writing desk',
      importance: 'high',
      relatedCharacters: ['michael', 'sarah'],
      relatedEvidence: ['clock'],
      position: [-10.2, 0.86, -12.6],
      prop: 'notebook',
      kind: 'Book',
    },
    {
      id: 'phone',
      name: 'Phone Record',
      description:
        "Victor's phone. Last outgoing call: Sarah Hale, 03:24, duration 1m 52s. A half-typed text: \"drink tastes bitter. M was h\"",
      quote: 'Last call: 03:24 — seven minutes after the clock stopped.',
      location: 'Room 317 — bedside table',
      importance: 'high',
      relatedCharacters: ['sarah', 'michael'],
      relatedEvidence: ['clock'],
      position: [-8.6, 0.62, -12.95],
      prop: 'phone',
      kind: 'Phone',
    },
    {
      id: 'clock',
      name: 'Broken Clock',
      description:
        'Travel alarm clock, face cracked, hands frozen at 03:17. It was struck on top — not knocked off the table. Someone wanted 03:17 remembered.',
      quote: 'Frozen at 03:17. Struck from above, not dropped.',
      location: 'Room 317 — floor',
      importance: 'medium',
      relatedCharacters: [],
      relatedEvidence: ['phone', 'notebook'],
      position: [-7.4, 0.08, -6.6],
      prop: 'clock',
      kind: 'EnvironmentalObject',
    },
    {
      id: 'cctv',
      name: 'CCTV Screenshot',
      description:
        'Security terminal, camera 3F-ELEV. 03:06 — Michael Ross exits the elevator on floor 3. 03:33 — he returns, wiping his hands.',
      quote: '3F-ELEV 03:06 / 03:33 — Michael Ross.',
      location: 'Lobby — security terminal',
      importance: 'high',
      relatedCharacters: ['michael', 'emma'],
      relatedEvidence: ['guestbook'],
      position: [9.4, 1.25, 11.4],
      prop: 'terminal',
      kind: 'Computer',
    },
    {
      id: 'room_key',
      name: 'Room Key',
      description:
        'A duplicate keycard for Room 317, encoded 03:05 under "M. Ross". Found crumpled in the lounge wastebin. Faint bitter-almond smell on the sleeve.',
      quote: 'Duplicate key 317 — issued 03:05 to M. Ross.',
      location: 'Executive lounge — wastebin',
      importance: 'high',
      relatedCharacters: ['michael', 'emma'],
      relatedEvidence: ['guestbook', 'cctv'],
      position: [11.0, 0.55, -6.2],
      prop: 'bin',
      kind: 'Container',
    },
  ],

  suspects: [
    {
      id: 'emma',
      name: 'Emma Chen',
      role: 'Hotel Receptionist',
      bio: 'Night-shift receptionist, 3 years at the Meridian. Behind on rent.',
      position: [0.5, 0, 11.4],
      facing: Math.PI,
      palette: { coat: 0x2c3e5c, accent: 0xc9a14a, skin: 0xe6c2a0, hair: 0x1a1412 },
      baseSuspicion: 20,
      persona: {
        personality: 'Polite, anxious, over-explains when nervous.',
        secrets: ['Took $500 from Michael to rewrite his checkout time.', 'Encoded a duplicate key 317 for him at 03:05.'],
        lies: ['Claims Michael checked out at 02:40.'],
      },
      greetings: [
        { text: 'Detective. I— I called it in as soon as housekeeping screamed. What do you need?' },
        { requires: { evidence: ['guestbook'] }, text: 'You\'ve been looking at the ledger. I can explain that, I promise.' },
        { requires: { minSuspicion: 55 }, text: 'Please. I didn\'t hurt anyone. I just… needed the money.' },
      ],
      topics: [
        {
          id: 'emma_night', key: true, label: 'Walk me through tonight.',
          lines: ['Quiet shift. Mr. Hale came down at one for ice, he looked stressed.', 'Mr. Ross was in the bar until about two-thirty. Then he checked out — 02:40.'],
          setFlags: ['emma_alibi'],
        },
        {
          id: 'emma_visitors', key: true, label: 'Did anyone go up to Room 317?',
          lines: ['Not that I saw. Mrs. Hale has her own room — 319. They\'d been arguing all week.', 'The elevator camera would know better than me.'],
          setFlags: ['hint_cctv'],
        },
        {
          id: 'emma_guestbook', key: true, label: 'The 02:40 entry was written over.',
          requires: { evidence: ['guestbook'] },
          lines: ['…He asked me to. Mr. Ross said he\'d forgotten to sign out, and to put 02:40.', 'He tipped me. Generously. I didn\'t think it mattered.'],
          setFlags: ['emma_guestbook'], suspicion: 20,
        },
        {
          id: 'emma_key', key: true, label: 'Who encoded a duplicate key for 317?',
          requires: { evidence: ['room_key'] },
          lines: ['…Me. At 03:05. He said Victor had his contract and he needed it before morning.', 'I swear I thought it was about paperwork. I didn\'t know.'],
          setFlags: ['emma_key'], suspicion: 15,
        },
        {
          id: 'emma_cctv', label: 'The 3F camera shows Mr. Ross at 03:06.',
          requires: { evidence: ['cctv'] },
          lines: ['Then he never checked out. He lied to me too.', 'I\'ll make a full statement. Whatever you need.'],
          setFlags: ['emma_flips'], suspicion: -15,
        },
      ],
    },
    {
      id: 'michael',
      name: 'Michael Ross',
      role: 'Business Partner',
      bio: 'Co-founder of Hale & Ross Capital. Charming, meticulous, recently bought a yacht.',
      position: [8.2, 0, -10.2],
      facing: 0.6,
      palette: { coat: 0x3a2a26, accent: 0x8a1c1c, skin: 0xd9b08c, hair: 0x5a4632 },
      baseSuspicion: 30,
      persona: {
        personality: 'Smooth, condescending, deflects with charm, cracks under specifics.',
        secrets: ['Embezzled $4.2M.', 'Poisoned Victor\'s whisky with cyanide at ~03:10.', 'Smashed the clock and planted pills at 03:31.'],
        lies: ['Checked out at 02:40.', 'Never went back to the 3rd floor.'],
      },
      greetings: [
        { text: 'Detective. Awful business. Victor was… fragile lately. I suppose we all saw it coming.' },
        { requires: { minSuspicion: 55 }, text: 'You again. Should I be calling my lawyer?' },
        { requires: { minSuspicion: 85 }, text: '…Whatever you think you have, it\'s circumstantial.' },
      ],
      topics: [
        {
          id: 'michael_where', key: true, label: 'Where were you at 3 AM?',
          lines: ['I checked out at 02:40 — ask the girl at the desk. Then I came here to sleep off the bourbon.', 'I never went back upstairs.'],
          setFlags: ['michael_denied'],
        },
        {
          id: 'michael_business', key: true, label: 'How was the partnership?',
          lines: ['Twelve years. Solid as granite.', 'Victor got paranoid about our audit software, but that\'s Victor. He saw ghosts in spreadsheets.'],
          setFlags: ['michael_business'],
        },
        {
          id: 'michael_notebook', key: true, label: 'Victor documented $4.2M moved by "M."',
          requires: { evidence: ['notebook'] },
          lines: ['"M." could be anyone. Marketing. Morgan in compliance.', 'You\'re reading the scribbles of a depressed man, Detective.'],
          suspicion: 20,
        },
        {
          id: 'michael_cctv', key: true, label: 'The 3F camera has you at 03:06 and 03:33.',
          requires: { evidence: ['cctv'], flags: ['michael_denied'] },
          lines: ['…Cameras glitch. Timestamps drift.', 'Fine — I went up to talk. He was alive when I left. Very alive.'],
          setFlags: ['michael_admits_visit'], suspicion: 25,
        },
        {
          id: 'michael_key', label: 'This duplicate key 317 was in your wastebin.',
          requires: { evidence: ['room_key'] },
          lines: ['Anyone could have dropped that there.', '(He doesn\'t look at the keycard. He looks at the door.)'],
          suspicion: 20,
        },
        {
          id: 'michael_bitter', label: 'Victor texted that his drink tasted bitter.',
          requires: { evidence: ['phone'] },
          lines: ['He always drank cheap whisky. Everything tasted bitter to Victor.', 'Are we done?'],
          suspicion: 15,
        },
      ],
    },
    {
      id: 'sarah',
      name: 'Sarah Hale',
      role: "Victim's Wife",
      bio: 'Architect. Separated from Victor, staying in Room 319. Beneficiary of a $2M life policy.',
      position: [-6.2, 0, -2.0],
      facing: 0,
      palette: { coat: 0x4a4f5e, accent: 0x9fb4d8, skin: 0xefcfb4, hair: 0x7a4a2a },
      baseSuspicion: 35,
      persona: {
        personality: 'Composed, sharp, grieving in a way she does not show.',
        secrets: ['Was filing for divorce.', 'Knew Victor suspected Michael.'],
        lies: [],
      },
      greetings: [
        { text: 'They won\'t let me in to see him. Are you the one who\'s going to tell me what happened?' },
        { requires: { evidence: ['phone'] }, text: 'You found his phone. Then you know he called me.' },
      ],
      topics: [
        {
          id: 'sarah_victor', key: true, label: 'Tell me about Victor.',
          lines: ['Brilliant. Stubborn. We were separating — that\'s why I\'m in 319.', 'He wasn\'t suicidal. He was angry. Those are different things.'],
          setFlags: ['sarah_not_suicide'],
        },
        {
          id: 'sarah_where', key: true, label: 'Where were you tonight?',
          lines: ['In my room. Awake. He called me — sometime after three.', 'I didn\'t pick up the first time. I wish I had.'],
        },
        {
          id: 'sarah_call', key: true, label: 'The 03:24 call. What did he say?',
          requires: { evidence: ['phone'] },
          lines: ['His voice was slurred. He said the whisky tasted bitter… and that Michael had come by "to make peace".', 'Then he stopped talking. I ran to 317 but the door was locked.'],
          setFlags: ['sarah_call'],
        },
        {
          id: 'sarah_company', key: true, label: 'Did Victor mention the company accounts?',
          requires: { evidence: ['notebook'] },
          lines: ['He found money missing. A lot. He said their own AI audit had been "taught to look away".', 'He was meeting regulators at nine this morning.'],
          setFlags: ['sarah_motive'],
        },
        {
          id: 'sarah_insurance', label: 'You inherit a $2M policy.',
          lines: ['I know how that looks.', 'We were divorcing — I\'d get half of everything anyway. I didn\'t need him dead, Detective.'],
          suspicion: 10,
        },
      ],
    },
  ],

  contradictions: [
    {
      id: 'c_time', title: 'Time of death is staged',
      detail: 'The clock stopped at 03:17 but Victor made a call at 03:24 — and wrote in his notebook at 03:17. Someone broke the clock to fake the time.',
      requires: { evidence: ['clock', 'phone'] }, between: ['clock', 'phone'],
    },
    {
      id: 'c_alibi', title: "Michael's alibi is false",
      detail: 'The guestbook says Michael left at 02:40, but camera 3F-ELEV shows him on Victor\'s floor at 03:06 and 03:33.',
      requires: { evidence: ['guestbook', 'cctv'] }, between: ['guestbook', 'cctv'],
    },
    {
      id: 'c_key', title: 'Access to Room 317',
      detail: 'Michael claims he never went back upstairs, yet a duplicate key 317 encoded under his name was in his wastebin.',
      requires: { evidence: ['room_key'], flags: ['michael_denied'] }, between: ['room_key', 'michael'],
    },
    {
      id: 'c_poison', title: 'Not a suicide',
      detail: '"Drink tastes bitter", a bitter-almond smell on the key sleeve, and a man who was planning a 9 AM meeting — this was poison, not pills.',
      requires: { evidence: ['phone', 'room_key'] }, between: ['phone', 'room_key'],
    },
  ],

  objectives: [
    { until: { evidence: ['notebook'] }, text: 'Find the Red Notebook in Room 317' },
    { until: { evidence: ['phone'] }, text: "Check the victim's phone" },
    { until: { evidence: ['clock'] }, text: 'Examine what broke at 03:17' },
    { until: { evidence: ['guestbook'] }, text: 'Check the reception guestbook' },
    { until: { evidence: ['cctv'] }, text: 'Review the lobby security terminal' },
    { until: { evidence: ['room_key'] }, text: 'Search the executive lounge' },
    { until: { flags: ['sarah_call'] }, text: 'Ask Sarah about the 03:24 call' },
    { until: { flags: ['__never__'] }, text: 'Open the Case Board [B] and make your deduction' },
  ],

  ai: {
    summarize: [
      { text: 'Victim: Victor Hale, Room 317. No evidence logged yet. Recommend starting at the crime scene.', confidence: 99, supersededBy: { evidence: ['notebook'] } },
      { requires: { evidence: ['notebook'] }, text: 'The Red Notebook documents $4.2M in transfers signed by "M." The victim distrusted an AI audit. Financial motive is now on the table.', confidence: 88 },
      { requires: { evidence: ['clock'] }, supersededBy: { evidence: ['phone'] }, text: 'The broken clock fixes the time of death at 03:17. Anyone with an alibi at 03:17 can be cleared.', confidence: 92, hallucination: true },
      { requires: { evidence: ['phone'] }, text: 'Phone record: Victor was alive and talking at 03:24 and mentioned a bitter drink. Revise any timeline anchored to 03:17.', confidence: 90 },
      { requires: { evidence: ['cctv'] }, text: 'CCTV places Michael Ross on floor 3 at 03:06 and 03:33.', confidence: 95 },
      { requires: { evidence: ['room_key'] }, text: 'A duplicate key for 317 was issued under M. Ross at 03:05.', confidence: 93 },
    ],
    contradictions: [
      { requires: { evidence: ['clock'] }, supersededBy: { evidence: ['phone'] }, text: 'No contradictions. The clock\'s 03:17 is consistent with an overdose taken around 03:00.', confidence: 84, hallucination: true },
      { requires: { evidence: ['clock', 'phone'] }, text: 'Contradiction: clock 03:17 vs. call at 03:24. The clock was likely staged.', confidence: 91 },
      { requires: { evidence: ['guestbook', 'cctv'] }, text: 'Contradiction: guestbook checkout 02:40 vs. camera at 03:06. The guestbook entry is unreliable.', confidence: 94 },
      { requires: { evidence: ['room_key'], flags: ['michael_denied'] }, text: 'Contradiction: a suspect denied returning upstairs, but a duplicate key exists in his name.', confidence: 89 },
      { text: 'Insufficient data to identify contradictions. Collect more evidence.', confidence: 60, supersededBy: { evidence: ['clock'] } },
    ],
    suggest: [
      { supersededBy: { evidence: ['notebook'] }, text: 'Start at the crime scene, Room 317 (north-west). Victims often leave notes near where they work.', confidence: 80 },
      { requires: { evidence: ['notebook'] }, supersededBy: { evidence: ['phone'] }, text: 'Check the nightstand in 317. Communications establish timelines.', confidence: 78 },
      { requires: { evidence: ['phone'] }, supersededBy: { flags: ['sarah_call'] }, text: 'The last call went to Sarah Hale. She is in the corridor outside 317.', confidence: 82 },
      { requires: { flags: ['hint_cctv'] }, supersededBy: { evidence: ['cctv'] }, text: 'The receptionist mentioned an elevator camera. The security terminal is in the lobby (south-east).', confidence: 86 },
      { requires: { evidence: ['guestbook'] }, supersededBy: { evidence: ['room_key'] }, text: 'The person who signed out at 02:40 spent the night in the executive lounge. Search it.', confidence: 74 },
      { requires: { evidence: ['notebook', 'phone', 'clock', 'guestbook', 'cctv', 'room_key'] }, text: 'All physical evidence collected. Open the Case Board and decide. Remember: I can be wrong.', confidence: 70 },
    ],
    relationships: [
      { text: 'Known parties: Emma Chen (reception), Michael Ross (partner), Sarah Hale (wife, separated). Sarah holds a $2M life policy — a classic motive.', confidence: 72, supersededBy: { evidence: ['guestbook'] } },
      { requires: { evidence: ['guestbook'] }, supersededBy: { evidence: ['cctv'] }, text: 'Emma Chen altered the guestbook and controls every keycard on the property. Michael Ross has a documented 02:40 checkout. Highest-probability suspect: EMMA CHEN.', confidence: 81, hallucination: true },
      { requires: { evidence: ['cctv'] }, text: 'Update: my earlier Emma assessment relied on the altered guestbook — the very record being questioned. Emma appears to have been used. Michael Ross\'s alibi is broken.', confidence: 76 },
      { requires: { flags: ['sarah_motive'] }, text: 'Sarah and Victor were separating but she shared his suspicions about the accounts. Her insurance motive is weaker than it first appeared.', confidence: 68 },
    ],
  },

  deduction: {
    who: ['Emma', 'Michael', 'Sarah', 'Unknown'],
    why: ['Money', 'Revenge', 'Blackmail', 'Accident'],
    how: ['Poison', 'Staged Suicide', 'Direct Attack', 'Unknown'],
  },
  solution: {
    who: 'Michael',
    why: 'Money',
    how: 'Poison',
    explanation: [
      'Michael Ross embezzled $4.2M and retrained the company\'s AI audit to hide it. Victor found out and planned to meet regulators at 9 AM.',
      'Michael paid Emma to rewrite his checkout as 02:40 and to encode a duplicate key. At 03:06 he went up and poisoned Victor\'s whisky.',
      'Victor called Sarah at 03:24 — still alive. Michael returned at 03:31, smashed the clock to 03:17 and planted pills to stage a suicide.',
      'The AI blamed Emma because it trusted the very ledger Michael had falsified.',
    ],
  },

  // detective-vision footprints: 317 door → hallway → lounge, and → elevator
  footprints: [
    [-2.0, -5.2], [-1.4, -3.4], [-0.2, -2.6], [1.2, -2.2], [2.6, -2.5], [4.0, -2.2], [5.4, -2.5],
    [6.8, -3.0], [7.8, -4.0], [8.2, -5.4], [8.8, -6.6], [9.8, -6.4],
    [8.2, -1.6], [9.4, -0.8], [10.6, -0.4],
  ],
};
