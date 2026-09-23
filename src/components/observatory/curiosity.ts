export type TrailId = 'replays' | 'agents' | 'learning' | 'systems';
export type PublicProjectId = 'gem-dota' | 'wisp' | 'krill' | 'opencouch' | 'nimble' | 'quantrl' | 'fractional-bonds' | 'shipping-ml' | 'mental-gym' | 'claude-code-anatomy';
/** Projects hidden in the world until a visitor flies out and finds them. */
export type SecretProjectId = 'alpha-workbench';
export type ProjectId = PublicProjectId | SecretProjectId;

export const trails: { id: TrailId; name: string; question: string; description: string; project: ProjectId }[] = [
  { id: 'replays', name: 'Gaming', question: 'What can games teach us?', description: 'Strategy, competition, and patterns hidden in how we play.', project: 'gem-dota' },
  { id: 'agents', name: 'Building with agents', question: 'What makes an agent useful?', description: 'Coding tools, thoughtful companions, and the frameworks behind them.', project: 'wisp' },
  { id: 'learning', name: 'Learning to learn', question: 'How does practice change how we think?', description: 'Algorithms, reinforcement learning, and the habit of trying again.', project: 'mental-gym' },
  { id: 'systems', name: 'Applied systems', question: 'How do ideas hold up in practice?', description: 'Programmable bonds and the work of getting a model beyond a notebook.', project: 'shipping-ml' },
];

export const projects: Record<ProjectId, {
  name: string; mapName?: string;
  /** A few words on what the project is, shown beneath its map label. */
  tagline: string;
  /** Private and unlisted: no repository link, revealed only by exploration. */
  secret?: true;
  trail: TrailId; title: [string, string]; question: string;
  description: string;
  stack: string[]; repository: string; docs?: string;
  gallery: { src: string; width: number; height: number; alt: string; label: string; caption?: string }[];
}> = {
  'gem-dota': {
    tagline: 'Dota 2 replay parser',
    name: 'Gem Dota', trail: 'replays', title: ['Replay.', 'Revealed.'],
    question: 'What can a replay reveal?',
    description: 'A Python-native Dota 2 replay parser that turns binary match data into structured events, player paths, interactive reports, and analysis-ready DataFrames.',
    stack: ['Python', 'Protocol Buffers', 'pandas', 'Plotly'],
    repository: 'https://github.com/whanyu1212/gem-dota', docs: 'https://whanyu1212.github.io/gem-dota/',
    gallery: [
      { src: '/projects/gem-dota/banner.webp', width: 1600, height: 800, alt: 'Gem Dota wordmark over a Dota map illustration', label: 'Repository overview' },
      { src: '/projects/gem-dota/movement-trail.webp', width: 1600, height: 1139, alt: 'Interactive Dota map showing a player movement trail', label: 'Movement analysis', caption: 'An interactive path reconstructed from parsed replay positions.' },
      { src: '/projects/gem-dota/cli.png', width: 2194, height: 762, alt: 'Gem Dota command-line interface parsing a replay', label: 'Command line' },
    ],
  },
  wisp: {
    tagline: 'Inspectable coding-agent runtime',
    name: 'Wisp', trail: 'agents', title: ['An agent.', 'In sync.'],
    question: 'How can a coding agent keep its work inspectable?',
    description: 'An event-driven coding-agent runtime with resumable sessions, explicit approval controls, and inspectable transcripts shared across terminal, RPC, and SDK interfaces.',
    stack: ['Coding agents', 'Session state', 'Tool use', 'RPC / SDK'],
    repository: 'https://github.com/whanyu1212/Wisp',
    gallery: [{ src: '/projects/wisp/banner.webp', width: 1600, height: 400, alt: 'Wisp coding agent connected to a terminal session', label: 'Repository overview' }],
  },
  krill: {
    tagline: 'Chat agent with memory',
    name: 'Krill.jl', trail: 'agents', title: ['Beyond', 'the chat.'],
    question: 'What does an agent need beyond a single conversation?',
    description: 'A Julia-native agent runtime for Telegram and Discord, combining persistent memory, scheduled tasks, MCP tools, and coding-agent delegation for longer-running work.',
    stack: ['Julia', 'MCP', 'Persistent memory', 'Delegation'],
    repository: 'https://github.com/whanyu1212/Krill.jl',
    gallery: [{ src: '/projects/repositories/krill.png', width: 1200, height: 600, alt: 'Krill.jl GitHub repository preview', label: 'GitHub repository' }],
  },
  opencouch: {
    tagline: 'Reflective AI companion',
    name: 'OpenCouch', trail: 'agents', title: ['Room to', 'reflect.'],
    question: 'How can an AI companion support reflection over time?',
    description: 'A pre-beta companion for guided self-reflection, pairing layered memory and structured wellness exercises with safety-aware routing across web and terminal interfaces.',
    stack: ['Python', 'Agents SDK', 'FastAPI', 'Postgres', 'Next.js'],
    repository: 'https://github.com/whanyu1212/OpenCouch',
    gallery: [{ src: '/projects/repositories/opencouch.png', width: 1200, height: 600, alt: 'OpenCouch GitHub repository preview', label: 'GitHub repository' }],
  },
  nimble: {
    tagline: 'Tiny multi-agent framework',
    name: 'NimbleAgents.jl', trail: 'agents', title: ['Less setup.', 'More ideas.'],
    question: 'How small can the building blocks of an agent be?',
    description: 'A lightweight Julia framework for building tool-using agents with generated schemas, structured outputs, persistent sessions, handoffs, and threaded multi-agent workflows.',
    stack: ['Julia', 'Tool calling', 'Multi-agent workflows', 'MCP'],
    repository: 'https://github.com/whanyu1212/NimbleAgents.jl',
    docs: 'https://whanyu1212.github.io/NimbleAgents.jl/dev/',
    gallery: [{ src: '/projects/repositories/nimble.png', width: 1200, height: 600, alt: 'NimbleAgents.jl GitHub repository preview', label: 'GitHub repository' }],
  },
  quantrl: {
    tagline: 'RL trading testbed',
    name: 'QuantRL-Lab', trail: 'learning', title: ['Act. Learn.', 'Try again.'],
    question: 'How does feedback change a decision?',
    description: 'A modular Python testbed for reinforcement learning in quantitative trading, built to compare pluggable action, observation, and reward strategies.',
    stack: ['Python', 'Reinforcement learning', 'Experiments'],
    repository: 'https://github.com/whanyu1212/QuantRL-Lab',
    gallery: [{ src: '/projects/repositories/quantrl.png', width: 1200, height: 600, alt: 'QuantRL-Lab GitHub repository preview', label: 'GitHub repository' }],
  },
  'fractional-bonds': {
    tagline: 'Tokenized bond trading',
    name: 'Fractional Bond Trading', mapName: 'Fractional bonds', trail: 'systems', title: ['Bonds.', 'In pieces.'],
    question: 'What changes when bond ownership becomes programmable?',
    description: 'An Ethereum proof of concept for fractional bond ownership, covering tokenized issuance, peer-to-peer exchange, coupon payments, pricing oracles, and redemption.',
    stack: ['Solidity', 'Hardhat', 'Next.js', 'Ethers.js', 'Chainlink'],
    repository: 'https://github.com/whanyu1212/fractional-bond-trading',
    gallery: [{ src: '/projects/repositories/fractional-bonds.png', width: 1200, height: 600, alt: 'Fractional Bond Trading GitHub repository preview', label: 'GitHub repository' }],
  },
  'shipping-ml': {
    tagline: 'End-to-end MLOps pipeline',
    name: 'Shipping ML', trail: 'systems', title: ['Train it.', 'Ship it.'],
    question: 'What does it take to move a model beyond a notebook?',
    description: 'An end-to-end MLOps reference that takes a toy rental model through validation, experiment tracking, serving, automated retraining, and evidence-based promotion.',
    stack: ['Python', 'FastAPI', 'XGBoost', 'MLflow', 'Docker'],
    repository: 'https://github.com/whanyu1212/shipping-ml',
    gallery: [{ src: '/projects/repositories/shipping-ml.png', width: 1200, height: 600, alt: 'Shipping ML GitHub repository preview', label: 'GitHub repository' }],
  },
  'mental-gym': {
    tagline: 'Algorithm practice platform',
    name: 'Mental Gym', trail: 'learning', title: ['Stay sharp.', 'Keep going.'],
    question: 'How does solving a problem change the way I approach the next one?',
    description: 'A hands-on algorithm practice platform combining first-principles solutions, interactive visualizations, and spaced repetition to turn problem-solving notes into lasting understanding.',
    stack: ['Python', 'Julia', 'C++', 'Data structures + algorithms'],
    repository: 'https://github.com/whanyu1212/mental-gym',
    gallery: [{ src: '/projects/repositories/mental-gym.png', width: 1200, height: 600, alt: 'Mental Gym GitHub repository preview', label: 'GitHub repository' }],
  },
  'claude-code-anatomy': {
    tagline: 'Coding-agent internals guide',
    name: 'Claude Code Anatomy', mapName: 'Claude Anatomy', trail: 'agents', title: ['Under', 'the hood.'],
    question: 'What actually happens inside a coding agent?',
    description: 'An independent, source-level guide to Claude Code’s internals, tracing its agent loop, tools, context, sessions, permissions, and architectural trade-offs.',
    stack: ['Agent architecture', 'TypeScript', 'Docusaurus', 'Technical writing'],
    repository: 'https://github.com/whanyu1212/claude-code-anatomy',
    docs: 'https://claude-code-anatomy-sigma.vercel.app/',
    gallery: [{ src: '/projects/repositories/claude-code-anatomy.png', width: 1200, height: 600, alt: 'Claude Code Anatomy GitHub repository preview', label: 'GitHub repository' }],
  },
  'alpha-workbench': {
    tagline: 'Agentic trading, in progress',
    name: 'Alpha Workbench', secret: true, trail: 'agents', title: ['Alpha.', 'In the works.'],
    question: 'What if a team of agents ran the trading desk?',
    description: 'A private, in-progress workbench exploring agentic trading: what happens when a team of AI agents shares the work of a trading desk.',
    stack: [], repository: '', gallery: [],
  },
};
