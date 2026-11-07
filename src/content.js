// Single source of truth for ALL site text (simple English, B1). Do not invent facts.
export const CONTENT = {
  email: 'dearolucio@gmail.com',
  github: 'https://github.com/Luxus3',
  boot: [
    '$ ssh guest@lucio.local',
    'Connecting to lucio.local:22 ...',
    '[ OK ] Handshake complete',
    '[ OK ] Cooling systems online',
    '[ OK ] Loading portfolio modules',
    'Access granted. Opening door.'
  ],
  hero: { title: 'LUCIO', subtitle: 'I build the machines behind the internet.' },
  whoami: {
    tag: 'WHOAMI',
    lines: [
      'Lucio De Aro.',
      '2nd-year Computer Engineering student at UCC.',
      'Córdoba, Argentina.',
      'I love servers, hardware and infrastructure.',
      'I like big, strange projects.',
      'The ones that make you say: wait, that\'s possible?'
    ]
  },
  experience: {
    tag: 'EXPERIENCE',
    items: [
      { name: 'Bettermin', status: 'NOW', text: 'A startup that mixes AI and biotech for mining. I work here today.' },
      { name: 'Freelance', status: 'ACTIVE', text: 'I set up and ship services for clients.' }
    ]
  },
  stack: {
    tag: 'STACK',
    items: ['Linux', 'Docker', 'Nginx', 'Networking', 'SQL', 'Git', 'Bash', 'CI/CD', 'Cloud', 'Monitoring', 'Hardware assembly', 'C++', 'Python', 'Basic cybersecurity']
  },
  services: {
    tag: 'WHAT I DO',
    items: [
      { title: 'Server setup & hardening', text: 'Clean installs. Locked doors.' },
      { title: 'Deploy & host your services', text: 'Your app, live and stable.' },
      { title: 'Infrastructure that doesn\'t break at 3AM', text: 'Monitoring. Backups. Sleep.' }
    ]
  },
  contact: { tag: 'CONTACT', lines: ['Have a wild idea?', 'Let\'s build it.'] },
  logs: [
    'nginx: 200 GET /index.html 3ms',
    'docker: container web-1 healthy',
    'sshd: accepted key for deploy@10.0.0.4',
    'cron: backup finished (0 errors)',
    'kernel: fan2 speed 4200 rpm',
    'monitor: cpu 23% mem 41% disk 58%',
    'ci: pipeline #482 passed',
    'ufw: blocked 185.220.101.4:22',
    'systemd: unit lucio.service active',
    'ntp: clock synced (+0.002s)'
  ],
  terminal: {
    welcome: 'lucio.local terminal. Type "help".',
    hint: 'Try: neofetch, ping lucio.local, top, rm -rf /',
    help: [
      'help         list commands',
      'whoami       who I am',
      'stack        my tools',
      'contact      how to reach me',
      'ls cd cat pwd  browse my files (try ls -a)',
      'neofetch     me vs your machine',
      'ping lucio.local  real latency',
      'top          live system view',
      'docker ps    my containers',
      'chaos        cut the power',
      'matrix       follow the rabbit',
      'fortune      engineer wisdom',
      'cowsay hi    a cow talks',
      'sudo hire me',
      'clear        clear screen',
      'exit         close',
      'Tab completes. Arrows show history.'
    ],
    secret: ['You found it.', 'Hire me. :)', 'dearolucio@gmail.com'],
    flag: ['FLAG{hire_lucio}', 'You are good at this. Let\'s talk.', 'Email: dearolucio@gmail.com', 'GitHub: https://github.com/Luxus3'],
    fortunes: [
      'It works on my machine. Ship the machine.',
      'There is no cloud. It is just someone else\'s computer.',
      'Have you tried turning it off and on again?',
      'Backups are a love letter to your future self.',
      'Friends do not let friends deploy on Friday.',
      'Weeks of coding can save hours of planning.',
      'A good server is boring. Boring is beautiful.',
      'If it is not monitored, it is already broken.',
      'chmod 777 is not a fix. It is a cry for help.',
      'The best log is the one you read before the incident.',
      'It is always DNS.',
      'Real engineers test in production. Brave ones have backups.'
    ],
    hire: ['[sudo] password for guest: ********', 'Permission granted.', 'Great choice. Write to dearolucio@gmail.com'],
    neofetch: ['guest@lucio.local', '-----------------', 'OS: Lucio OS (Argentina)', 'Host: UCC Computer Eng., year 2', 'Kernel: curiosity 5.0', 'Uptime: always on', 'Shell: bash', 'Stack: Linux, Docker, Nginx...', 'Status: open to work']
  }
};
