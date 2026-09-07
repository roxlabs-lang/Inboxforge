/**
 * High-Diversity Synthetic Test-Data Engine
 * 
 * Generates realistic fictional identities across multiple categories:
 * - PERSON:
 *   - First Name + Last Name (diverse global origins: South Asian, East Asian, Hispanic, European, African, Middle Eastern, etc.)
 *   - Nickname (standalone and combined)
 *   - Creator-style name (e.g., MayaTechVlog, CodeWithEthan, PixelCrafted)
 *   - Professional name (e.g., Dr. Elena Rossi, MD; Camille Dubois, CFA; Prof. Kenji Tanaka)
 * - COMPANY:
 *   - Fictional company (e.g., Nova Pixel Labs, Cedar Systems, OrbitForge, BrightStack)
 *   - Fictional startup (e.g., HyperScale AI, SynapseFlow, KiteRoute, OmniLayer)
 *   - Fictional studio (e.g., LunaWorks, Vertex Studio, Prism Motion Studios)
 *   - Fictional technology company (e.g., Apex Silicon Technologies, Vortex Microelectronics)
 *   - Fictional agency (e.g., Foundry & Co. Agency, Signal Strategy Partners, Bespoke Brand Collective)
 * - PROJECT:
 *   - Fictional product (e.g., BeaconAuth, TitanDB, Quasar Engine, Starlight UI)
 *   - Fictional application (e.g., FlowTask App, MindPulse Tracker, EchoNotes Mobile)
 *   - Fictional project (e.g., Project Chimera, Project Apollo-9, Project DeepSky)
 *   - Fictional organization (e.g., OpenWeb Foundation, Digital Ethics Consortium)
 * - USERNAME:
 *   - Structured usernames using different naming patterns (first.last, first_last, flast, firstl, etc.)
 * 
 * Scalability:
 * - Combinatorial vocabulary yielding 10,000,000+ unique synthetic combinations
 * - Deterministic PRNG seeding (Mulberry32) for 100% reproducible testing
 * - High-entropy random seeding for natural diversity
 * - Immediate duplicate avoidance via LRU memory ring buffer & in-batch uniqueness enforcement
 * - Strictly represents all output as synthetic test data internally
 */

import { IdentityCategory, IdentitySubCategory, IdentityType, Variant } from '../types';

export interface SyntheticIdentityData {
  id: string;
  identityName: string;
  identityCategory: IdentityCategory;
  subCategory: IdentitySubCategory;
  identityType: IdentityType;
  organization: string;
  roleTitle: string;
  username: string;
  email?: string;
  suffix?: string;
  avatarSeed: string;
  tags: string[];
  notes: string;
  createdAt: number;
  isSyntheticTestIdentity: true;
  seedUsed?: string;
}

export interface SyntheticGenerationOptions {
  category?: 'ALL' | IdentityCategory;
  subCategory?: 'all' | IdentitySubCategory;
  identityType?: 'all' | IdentityType;
  seed?: string | number;
  baseUsername?: string;
  domain?: string;
  workspaceId?: string;
  count?: number;
}

// ==========================================
// 1. HIGH-DIVERSITY COMBINATORIAL DATASETS
// ==========================================

export const FIRST_NAMES = [
  // South Asian
  'Arjun', 'Priya', 'Rohan', 'Ananya', 'Siddharth', 'Sunita', 'Dev', 'Mira', 'Kiran', 'Aarav',
  'Deepika', 'Karan', 'Pooja', 'Vikram', 'Aditi', 'Rajesh', 'Neha', 'Nikhil', 'Meera', 'Gautam',
  'Shreya', 'Pranav', 'Divya', 'Sanjay', 'Isha', 'Ashwin', 'Devi', 'Kabir', 'Rhea', 'Manish',
  // Anglo / Celtic / American
  'Ethan', 'Maya', 'Daniel', 'Chloe', 'Oliver', 'Hannah', 'Alexander', 'Zoe', 'Caleb', 'Rowan',
  'Nico', 'Silas', 'Hugo', 'Jonah', 'Maxwell', 'Declan', 'Emmett', 'Miles', 'Owen', 'Connor',
  'Harper', 'Mason', 'Audrey', 'Wyatt', 'Hazel', 'Sawyer', 'Piper', 'Hudson', 'Finley', 'Jasper',
  'Clara', 'Graham', 'Bennett', 'Callum', 'Elowen', 'Seraphina', 'Gideon', 'Tobias', 'Corinne', 'Rhys',
  // East Asian
  'Jin', 'Kenji', 'Mei', 'Sora', 'Kaito', 'Zara', 'Hana', 'Ren', 'Yuki', 'Min-ho',
  'Soo-jin', 'Haruto', 'Aoi', 'Jun', 'Ji-won', 'Ryota', 'Emi', 'Daiki', 'Xiaoyu', 'Chen',
  'Wei', 'Lin', 'Tao', 'Bao', 'Hyeon', 'Seo-yeon', 'Kazuya', 'Sayuri', 'Takeshi', 'Yuna',
  // Hispanic / Latin American
  'Sofia', 'Diego', 'Mateo', 'Lucas', 'Camille', 'Adrian', 'Selena', 'Gabriel', 'Valentina', 'Santiago',
  'Isabella', 'Thiago', 'Lucia', 'Emiliano', 'Mariana', 'Javier', 'Elena', 'Fernando', 'Carmen', 'Rafael',
  'Catalina', 'Alonso', 'Daniela', 'Esteban', 'Paola', 'Andres', 'Renata', 'Joaquin', 'Paloma', 'Dante',
  // Middle Eastern & North African
  'Tariq', 'Fatima', 'Aisha', 'Zayn', 'Samira', 'Farah', 'Zubair', 'Nadia', 'Leila', 'Omar',
  'Yasmin', 'Kareem', 'Soraya', 'Rashid', 'Layla', 'Hamza', 'Zahra', 'Malik', 'Dina', 'Mustafa',
  'Salma', 'Ibrahim', 'Rania', 'Bilal', 'Noor', 'Amir', 'Habiba', 'Zayd', 'Lina', 'Hassan',
  // African / Diaspora
  'Adebayo', 'Nia', 'Amara', 'Keziah', 'Aaliyah', 'Kwame', 'Zendaya', 'Chidi', 'Folami', 'Tendai',
  'Zola', 'Jelani', 'Kofi', 'Eshe', 'Obinna', 'Ayanna', 'Mandla', 'Simba', 'Bamidele', 'Nala',
  // European & Nordic
  'Astrid', 'Freya', 'Ingrid', 'Soren', 'Lars', 'Henrik', 'Linnea', 'Magnus', 'Eira', 'Nils',
  'Saskia', 'Klaus', 'Elise', 'Matthias', 'Greta', 'Stefan', 'Anja', 'Felix', 'Valerie', 'Xavier',
];

export const LAST_NAMES = [
  // South Asian
  'Mehta', 'Nair', 'Patel', 'Chatterjee', 'Banerjee', 'Kapoor', 'Bhandari', 'Sengupta', 'Mukherjee', 'Sharma',
  'Verma', 'Gupta', 'Reddy', 'Iyer', 'Choudhury', 'Deshmukh', 'Menon', 'Joshi', 'Bhat', 'Rao',
  'Pillai', 'Saxena', 'Malhotra', 'Aggarwal', 'Goswami', 'Acharya', 'Trivedi', 'Kulkarni', 'Pandey', 'Mishra',
  // Anglo / Celtic / American
  'Reynolds', 'Carter', 'Brooks', 'O\'Connor', 'Holt', 'Sinclair', 'Mercer', 'Vance', 'Blackwood', 'Sterling',
  'Winter', 'Thorne', 'Lancaster', 'Hawthorne', 'Sutherland', 'Montgomery', 'Kensington', 'Carmichael', 'Lockwood', 'Harrington',
  'Winslow', 'Gallagher', 'Bradford', 'Donovan', 'Holloway', 'Beaumont', 'Abercrombie', 'Whitmore', 'Pendleton', 'Fairchild',
  // East Asian
  'Chen', 'Sato', 'Kim', 'Tanaka', 'Nakamura', 'Takahashi', 'Suzuki', 'Watanabe', 'Ishikawa', 'Park',
  'Lee', 'Choi', 'Yamamoto', 'Kobayashi', 'Inoue', 'Kato', 'Yoshida', 'Saito', 'Zheng', 'Huang',
  'Wang', 'Zhang', 'Liu', 'Zhou', 'Wu', 'Kwon', 'Shin', 'Matsumoto', 'Shimizu', 'Hayashi',
  // Hispanic / Latin American
  'Silva', 'Morales', 'Vargas', 'Mendoza', 'Navarro', 'Castillo', 'Delgado', 'Cabrera', 'Reyes', 'Santoro',
  'Rodriguez', 'Hernandez', 'Gomez', 'Fernandez', 'Alvarez', 'Romero', 'Gutierrez', 'Medina', 'Vega', 'Cortes',
  'Paredes', 'Herrera', 'Fuentes', 'Soto', 'Guerrero', 'Aguilar', 'Rojas', 'Figueroa', 'Espinoza', 'Cordova',
  // Middle Eastern & North African
  'Al-Mansoor', 'Ibrahim', 'Rahman', 'Qureshi', 'Farooq', 'Soltani', 'Husseini', 'Khoury', 'Darwish', 'Najjar',
  'Kabbara', 'Hadad', 'Boutros', 'Tahan', 'Saad', 'Mansour', 'Barakat', 'Nassar', 'Ghanem', 'Haddad',
  // African / Diaspora
  'Adebayo', 'Okafor', 'Mensah', 'Diallo', 'Traore', 'Kamau', 'Nwabueze', 'Sow', 'Kone', 'Ndlovu',
  'Okoro', 'Nwosu', 'Asante', 'Kalu', 'Diop', 'Keita', 'Baloyi', 'Dlamini', 'Chukwu', 'Osei',
  // European & Nordic
  'Kowalski', 'Jensen', 'Dubois', 'Rossi', 'Lindqvist', 'Novak', 'Hansen', 'Schneider', 'Larsson', 'Bergman',
  'Fischer', 'Weber', 'Eriksson', 'Strand', 'Müller', 'Dahl', 'Bauer', 'Kallio', 'Eklund', 'Richter',
  'Adler', 'Valerius', 'De Vries', 'Van Dijk', 'Bakker', 'Visser', 'Smit', 'Meijer', 'Bos', 'Vos',
];

export const NICKNAMES = [
  'Ace', 'Red', 'Flash', 'Fox', 'Pip', 'Nova', 'Dash', 'Sparky', 'Blaze', 'Echo',
  'Kit', 'Rusty', 'Sky', 'Wolf', 'Doc', 'Skip', 'Neo', 'Ghost', 'Zero', 'Shadow',
  'Rook', 'Jax', 'Scout', 'Blade', 'Byte', 'Pixel', 'Hawk', 'Storm', 'Frost', 'Rebel',
  'Cipher', 'Sage', 'Finn', 'Chip', 'Spike', 'Bolt', 'Arrow', 'Raven', 'Copper', 'Flint',
  'Onyx', 'Rune', 'Echo', 'Drift', 'Verve', 'Zephyr', 'Apex', 'Blitz', 'Knox', 'Dex',
  'Quinn', 'Bex', 'Nash', 'Jett', 'Remy', 'Kip', 'Joss', 'Wren', 'Tate', 'Bram',
];

export const PROFESSIONAL_TITLES_PRE = [
  'Dr.', 'Prof.', 'Chief Architect', 'Principal Scientist', 'Lead Counsel', 'Director',
  'Managing Partner', 'Senior Fellow', 'Staff Engineer', 'Chief Medical Officer',
  'Distinguished Fellow', 'VP of Engineering', 'Research Director', 'Senior Counsel',
];

export const PROFESSIONAL_TITLES_POST = [
  'MD', 'PhD', 'CFA', 'PE', 'Esq.', 'CPA', 'PMP', 'FAIA', 'ScD', 'JD', 'LEED AP',
];

export const CREATOR_PREFIXES = [
  'Maya', 'Code', 'Pixel', 'Audio', 'Design', 'Cinema', 'Game', 'Visual', 'Vibe', 'Cyber',
  'Flow', 'Synth', 'Prompt', 'Motion', 'Deep', 'Indie', 'Next', 'Algo', 'Cloud', 'Byte',
  'Zero', 'Apex', 'Voxel', 'Logic', 'Data', 'Kernel', 'Syntax', 'Neon', 'Vector', 'Pulse',
  'Hyper', 'Wave', 'Macro', 'Micro', 'Infinite', 'Astra', 'Studio', 'Echo', 'Tempo', 'Flux',
  'Forge', 'Drift', 'Frame', 'Signal', 'Sync', 'Craft', 'Hub', 'Zone', 'Verse', 'Realm',
  'Bit', 'Glitch', 'Chroma', 'Prism', 'Orbit', 'Loom', 'Lens', 'Sound', 'Techno', 'Foundry',
];

export const CREATOR_SUFFIXES = [
  'TechVlog', 'WithEthan', 'Crafted', 'Alchemist', 'Streamer', 'Daily', 'Lens', 'Dev',
  'Craftsman', 'Logic', 'Journey', 'Hacker', 'Voyager', 'Luminance', 'Canvas', 'Cast',
  'Node', 'Lab', 'Wire', 'Pulse', 'Frame', 'Loop', 'Drift', 'Signal', 'Sync', 'Craft',
  'Wave', 'Hub', 'Zone', 'Verse', 'Realm', 'Bytes', 'Workshop', 'Review', 'Chronicles',
  'Guild', 'Vault', 'Collective', 'Works', 'Forge', 'Digest', 'Dispatch', 'Notes', 'Visuals',
];

// COMPANY DATASETS
export const COMPANY_PREFIXES = [
  'Nova', 'Cedar', 'Orbit', 'Luna', 'Bright', 'Vertex', 'Aether', 'Solstice', 'Prism', 'Apex',
  'Pulse', 'Beacon', 'Catalyst', 'Strata', 'Kestrel', 'Obsidian', 'IronClad', 'Horizon', 'Cobalt',
  'Zephyr', 'Vanguard', 'Elysium', 'Polaris', 'Crestview', 'Radiant', 'Aegis', 'Alpine', 'Argonaut',
  'Banyan', 'Carbon', 'Dynamo', 'Element', 'Foundry', 'Granite', 'Halcyon', 'Ironwood', 'Juniper',
  'Kinetic', 'Lattice', 'Meridian', 'Nexus', 'Onyx', 'Pinnacle', 'Quantum', 'Redwood', 'Summit',
  'Tectonic', 'Umbra', 'Vector', 'Zenith', 'Silverline', 'Monolith', 'Timber', 'Mosaic', 'Canyon',
];

export const COMPANY_CORES = [
  'Pixel', 'Systems', 'Forge', 'Works', 'Stack', 'Studio', 'Dynamics', 'Cloud', 'Interactive',
  'Quantum', 'Grid', 'Security', 'Software', 'Media', 'Automation', 'Cloudworks', 'Networks',
  'Analytics', 'Matrix', 'Logistics', 'Digital', 'Labs', 'Technologies', 'Solutions', 'Capital',
  'Ventures', 'Platform', 'Compute', 'Micro', 'Logic', 'Robotics', 'Bio', 'Aerospace', 'Mobility',
  'Optics', 'Silicon', 'Energy', 'Materials', 'Cyber', 'Infrastructure', 'Intelligence', 'Protocol',
];

export const COMPANY_SUFFIXES = [
  'Labs', 'Systems', 'Technologies', 'Dynamics', 'Global', 'Solutions', 'Group', 'Networks',
  'Partners', 'Interactive', 'Ventures', 'Enterprises', 'International', 'Corp', 'Inc',
];

// STARTUP DATASETS
export const STARTUP_ROOTS = [
  'HyperScale', 'Synapse', 'Kite', 'Omni', 'Crestline', 'Vector', 'Echo', 'Nexus', 'Loom', 'Fluid',
  'Zephyr', 'Relay', 'Voxel', 'Aura', 'Kubo', 'Tandem', 'Quantal', 'Spectra', 'Stratos', 'Chronos',
  'Glide', 'Cipher', 'Luminary', 'Parallax', 'Drift', 'Prompt', 'Agent', 'Model', 'Deep', 'Infer',
  'Neural', 'Cache', 'Logic', 'Cortex', 'Mesh', 'Pulse', 'Byte', 'Wave', 'Tensor', 'Subtle',
  'Helios', 'Velo', 'Scale', 'Beam', 'Spur', 'Kloud', 'Stackr', 'Dock', 'Latch', 'KiteRoute',
];

export const STARTUP_SUFFIXES = [
  'AI', 'Flow', 'Route', 'Layer', 'IO', 'Pulse', 'Sphere', 'Logic', 'Graph', 'Auth',
  'Grid', 'Bridge', 'Scale', 'Stack', 'Mesh', 'HQ', 'Metrics', 'Engine', 'Point', 'Cloud',
  'scale', 'ify', 'run', 'lab', 'dev', 'sync', 'nest', 'forge', 'link', 'base', 'pilot',
];

// STUDIO DATASETS
export const STUDIO_PREFIXES = [
  'Moonbeam', 'Ironwood', 'Prism', 'Analog', 'Subtle', 'Velvet & Ink', 'Soundwave', 'Sundial',
  'Northlight', 'Ember', 'Polymath', 'Chromatic', 'Aurora', 'Monolith', 'Starlight', 'Wildflower',
  'Silverline', 'Opal', 'Halcyon', 'Cobalt', 'Zephyr', 'Mosaic', 'Neon', 'Horizon', 'Solstice',
];

export const STUDIO_SUFFIXES = [
  'Studio', 'Creative Studio', 'Motion Studios', 'Pixel Studio', 'Interactive Studio',
  'Game Studio', 'Design Studio', 'Audio Studio', 'Digital Workshop', 'Visual Arts Studio',
];

// TECH COMPANY DATASETS
export const TECH_PREFIXES = [
  'Apex Silicon', 'Vortex Microelectronics', 'Nova Quantum', 'NeuralCore', 'Strata Compute',
  'OpticMatrix', 'Aether Cloud', 'HyperGrid', 'Titan Semiconductor', 'Cortex Hardware',
  'Pinnacle Optics', 'SiliconWave', 'NanoLogic', 'QuantumEdge', 'PhotonCore', 'CyberShield',
  'TerraBit', 'CryoCompute', 'BionicSilicon', 'LatticeLogic', 'AeroCompute', 'Aegis Silicon',
];

export const TECH_SUFFIXES = [
  'Technologies', 'Systems', 'Semiconductor', 'Microdevices', 'Devices', 'Infrastructure',
  'Computing', 'Solutions', 'Labs', 'Dynamics', 'Engineering',
];

// AGENCY DATASETS
export const AGENCY_PREFIXES = [
  'Foundry & Co.', 'Bespoke Brand', 'Elevation Growth', 'Signal Strategy', 'NorthStar Digital',
  'Apex Media', 'Cipher Growth', 'Catalyst Creative', 'Kinetic Venture', 'Banyan Marketing',
  'Beacon Interactive', 'Vanguard Media', 'Prism Strategy', 'Horizon Creative', 'Redwood Collective',
  'Slate & Stone', 'Echo Digital', 'Meridian Brand', 'Blueprint Growth', 'TrueNorth Digital',
];

export const AGENCY_SUFFIXES = [
  'Agency', 'Collective', 'Partners', 'Media Group', 'Growth Labs', 'Creative Group',
  'Strategy Associates', 'Communications', 'Advisors', 'Digital Studio',
];

// PRODUCT DATASETS
export const PRODUCT_PREFIXES = [
  'Beacon', 'Titan', 'Starlight', 'Quasar', 'Vortex', 'Prism', 'Aegis', 'Atlas', 'Helios',
  'IronGate', 'Cascade', 'Orion', 'Nova', 'Aura', 'Vector', 'Sentinel', 'Chronos', 'Nimbus',
  'Eclipse', 'Horizon', 'Zenith', 'Hyper', 'Drift', 'Echo', 'Quantum', 'Flux', 'Terra',
  'Kestrel', 'Solstice', 'Obsidian', 'Cipher', 'Parallax', 'Apex', 'Cobalt', 'Polaris',
];

export const PRODUCT_SUFFIXES = [
  'Auth', 'DB', 'UI', 'Engine', 'Cache', 'Gateway', 'Shield', 'SDK', 'Telemetry', 'Vault',
  'Router', 'Indexer', 'CDN', 'Terminal', 'Store', 'Sync', 'Pipeline', 'Agent', 'Runner',
  'Proxy', 'Protocol', 'Mesh', 'Monitor', 'Probe', 'Relay', 'Guard', 'Bridge', 'Vault',
];

// APPLICATION DATASETS
export const APP_PREFIXES = [
  'FlowTask', 'MindPulse', 'EchoNotes', 'PocketLedger', 'OmniCalc', 'SwiftRoute', 'CanvasDraft',
  'HyperLog', 'Waveform', 'FocusZen', 'SnapAudit', 'PulseTrack', 'QuickDocket', 'AuraReader',
  'HorizonSpend', 'CodeScribe', 'TaskVibe', 'AgileBoard', 'SyncPad', 'DailySprint', 'CleanInbox',
  'DevForge', 'MetricPulse', 'ScriptDock', 'TraceLog', 'TimeWeaver', 'SoundDraft',
];

export const APP_SUFFIXES = [
  'App', 'Mobile', 'Pro', 'Studio', 'Desktop', 'Suite', 'Workspace', 'Companion',
  'Inspector', 'Assistant', 'Manager', 'Navigator', 'Dashboard', 'Client',
];

// PROJECT CODENAMES
export const PROJECT_CODENAMES = [
  'Project Apollo-9', 'Project Chimera', 'Project BlueShift', 'Project Borealis', 'Project DeepSky',
  'Project Nautilus', 'Project Sunburst', 'Project Titan-X', 'Project NightHawk', 'Project Halcyon',
  'Project Ironclad', 'Project Phoenix-II', 'Project Vanguard-4', 'Project Horizon-Alpha',
  'Project Polaris-Echo', 'Project DarkStar', 'Project SolarFlare', 'Project Zephyr-Omega',
  'Project Prometheus', 'Project Valkyrie', 'Project Cerberus', 'Project Hyperion', 'Project Odyssey',
  'Project Blackthorn', 'Project Silverwing', 'Project Starfall', 'Project Firefly', 'Project Eclipse-9',
];

// ORGANIZATION DATASETS
export const ORG_PREFIXES = [
  'OpenWeb', 'Global Telemetry', 'Digital Ethics', 'Quantum Protocol', 'Open Compute',
  'International Data Standards', 'BioTech Open', 'Green Energy Data', 'Algorithmic Integrity',
  'Distributed Systems', 'Web Performance', 'Open Source Cryptography', 'Privacy Tech',
  'Sustainable Cloud', 'Neural Safety', 'Open Semantic', 'NextGen Internet', 'Machine Trust',
];

export const ORG_SUFFIXES = [
  'Foundation', 'Alliance', 'Consortium', 'Working Group', 'Collective', 'Org', 'Initiative',
  'Forum', 'Council', 'Society', 'Institute', 'Commission', 'Committee', 'Association',
];

// ROLES & TITLES BY TYPE
export const ROLES: Record<IdentityType, string[]> = {
  personal: [
    'Software Engineer', 'Product Designer', 'Research Scientist', 'Data Analyst',
    'DevOps Specialist', 'Frontend Architect', 'Solutions Consultant', 'Product Manager',
    'Security Analyst', 'UX Researcher', 'Technical Writer', 'Full Stack Developer',
    'Customer Success Lead', 'System Administrator', 'AI Engineer', 'Platform Specialist',
    'Cloud Security Consultant', 'Database Architect', 'QA Automation Engineer', 'Site Reliability Engineer',
  ],
  creator: [
    'Content Lead & Host', 'Creative Director', 'Lead Streamer', 'Podcast Producer',
    'Technical Educator', 'Visual Storyteller', 'Community Architect', 'Indie Maker',
    'Tech Reviewer', 'Design Influencer', 'Audio Producer', 'Tutorial Creator',
    'VFX Artist & Director', 'Open Source Creator', 'Animation Specialist', 'Game Developer & Broadcaster',
  ],
  company: [
    'Enterprise Billing Admin', 'IT Operations Lead', 'Global Support Desk',
    'Compliance & Auditing', 'Infrastructure Director', 'Enterprise Sales Lead',
    'Talent Acquisition Lead', 'Corporate Security', 'Procurement Dept', 'Operations Manager',
    'Chief Information Officer', 'Director of Infrastructure', 'Principal Solutions Architect',
  ],
  startup: [
    'Founder & CEO', 'Co-Founder & CTO', 'Founding Engineer', 'Growth Lead',
    'Head of Product', 'Lead Architect', 'DevRel Champion', 'Head of Design',
    'Early Adopter Tester', 'Core Maintainer', 'Chief of Staff', 'Automation Lead',
    'Staff AI Researcher', 'VP of Engineering', 'Principal Full Stack Developer',
  ],
  project: [
    'Automated CI/CD Worker', 'Synthetic Test Runner', 'Load Test Bot #01',
    'Nightly Regression Agent', 'Webhook Dispatcher', 'OAuth Integration Client',
    'OTP Verification Bot', 'API Health Prober', 'Staging Mock Agent', 'Sandbox Runner',
    'E2E Journey Emulator', 'Stress Simulation Engine', 'Webhook Relay Client',
  ],
};

export const TAGS_POOL: Record<IdentityType, string[]> = {
  personal: ['Synthetic Human', 'Test Person', 'Verified Mock', 'Active QA Persona', 'Synthetic Identity'],
  creator: ['Test Creator', 'Synthetic Channel', 'Media Persona', 'Verified Creator QA', 'Synthetic Identity'],
  company: ['Synthetic Enterprise', 'Test Corp', 'Enterprise Org', 'Mock Company', 'Synthetic Identity'],
  startup: ['Test Startup', 'Seed Persona', 'Fast Iterate', 'Mock SaaS', 'Synthetic Identity'],
  project: ['Automated Bot', 'Synthetic Project', 'Regression Suite', 'Mock Service', 'Synthetic Identity'],
};

// ==========================================
// 2. DETERMINISTIC PRNG (Mulberry32)
// ==========================================

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export function createPrng(seed?: number | string): () => number {
  if (seed === undefined || seed === null || seed === '') {
    // High-entropy random PRNG
    return () => Math.random();
  }

  let s = typeof seed === 'number' ? seed : hashString(String(seed));
  if (s === 0) s = 1;

  return function mulberry32() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ==========================================
// 3. RECENT NAMES LRU BUFFER (ANTI-REPETITION)
// ==========================================

class RecentNamesMemory {
  private recent = new Set<string>();
  private queue: string[] = [];
  private readonly maxSize = 1000;

  has(name: string): boolean {
    return this.recent.has(name.toLowerCase());
  }

  add(name: string): void {
    const key = name.toLowerCase();
    if (this.recent.has(key)) return;
    this.recent.add(key);
    this.queue.push(key);
    if (this.queue.length > this.maxSize) {
      const removed = this.queue.shift();
      if (removed) this.recent.delete(removed);
    }
  }

  clear(): void {
    this.recent.clear();
    this.queue = [];
  }
}

export const recentNamesMemory = new RecentNamesMemory();

// Helper to pick items with PRNG
function pick<T>(array: T[], prng: () => number): T {
  return array[Math.floor(prng() * array.length)];
}

// ==========================================
// 4. HIGH-DIVERSITY IDENTITY ENGINE
// ==========================================

export class SyntheticTestIdentityEngine {
  /**
   * Generates a single unique synthetic test identity with high diversity
   */
  static generate(options?: SyntheticGenerationOptions, inBatchSet?: Set<string>): SyntheticIdentityData {
    const prng = createPrng(options?.seed);
    const category = options?.category || 'ALL';
    const subCategory = options?.subCategory || 'all';
    const forcedType = options?.identityType !== 'all' ? options?.identityType : undefined;

    // Retry loop to ensure zero repetition
    let attempts = 0;
    while (attempts < 30) {
      attempts++;
      const result = this.constructIdentity(
        category,
        subCategory,
        forcedType,
        prng,
        options?.baseUsername,
        options?.domain,
        options?.seed
      );
      const uniqueKey = result.identityName.toLowerCase();

      // If already generated in this batch or in recent memory, try another combination
      if (inBatchSet && inBatchSet.has(uniqueKey)) {
        continue;
      }
      if (recentNamesMemory.has(uniqueKey) && attempts < 15) {
        continue;
      }

      // Success! Remember this name
      if (inBatchSet) inBatchSet.add(uniqueKey);
      recentNamesMemory.add(uniqueKey);
      return result;
    }

    // Fallback: construct with unique random suffix if pool saturated
    const fallback = this.constructIdentity(
      category,
      subCategory,
      forcedType,
      prng,
      options?.baseUsername,
      options?.domain,
      options?.seed
    );
    const randSuffix = Math.floor(Math.random() * 9000 + 1000);
    fallback.identityName = `${fallback.identityName} #${randSuffix}`;
    fallback.username = `${fallback.username}_${randSuffix}`;
    return fallback;
  }

  /**
   * Internal constructor for specific identity taxonomy
   */
  private static constructIdentity(
    category: 'ALL' | IdentityCategory,
    subCategory: 'all' | IdentitySubCategory,
    forcedType: IdentityType | undefined,
    prng: () => number,
    baseUsername?: string,
    domain: string = 'gmail.com',
    seedUsed?: string | number
  ): SyntheticIdentityData {
    // 1. Resolve Effective Category & Subcategory
    let effectiveCategory: IdentityCategory;
    let effectiveSubCategory: IdentitySubCategory;

    if (category !== 'ALL') {
      effectiveCategory = category;
    } else if (forcedType) {
      if (forcedType === 'personal') effectiveCategory = 'PERSON';
      else if (forcedType === 'creator') effectiveCategory = 'PERSON';
      else if (forcedType === 'company' || forcedType === 'startup') effectiveCategory = 'COMPANY';
      else effectiveCategory = 'PROJECT';
    } else {
      const roll = prng();
      if (roll < 0.40) effectiveCategory = 'PERSON';
      else if (roll < 0.70) effectiveCategory = 'COMPANY';
      else if (roll < 0.90) effectiveCategory = 'PROJECT';
      else effectiveCategory = 'USERNAME';
    }

    if (subCategory !== 'all') {
      effectiveSubCategory = subCategory;
    } else {
      switch (effectiveCategory) {
        case 'PERSON': {
          const r = prng();
          if (r < 0.50) effectiveSubCategory = 'person_name';
          else if (r < 0.70) effectiveSubCategory = 'creator';
          else if (r < 0.85) effectiveSubCategory = 'professional';
          else effectiveSubCategory = 'nickname';
          break;
        }
        case 'COMPANY': {
          const r = prng();
          if (r < 0.35) effectiveSubCategory = 'fictional_company';
          else if (r < 0.65) effectiveSubCategory = 'fictional_startup';
          else if (r < 0.80) effectiveSubCategory = 'fictional_studio';
          else if (r < 0.90) effectiveSubCategory = 'fictional_tech_company';
          else effectiveSubCategory = 'fictional_agency';
          break;
        }
        case 'PROJECT': {
          const r = prng();
          if (r < 0.35) effectiveSubCategory = 'fictional_product';
          else if (r < 0.65) effectiveSubCategory = 'fictional_application';
          else if (r < 0.85) effectiveSubCategory = 'fictional_project';
          else effectiveSubCategory = 'fictional_organization';
          break;
        }
        case 'USERNAME': {
          effectiveSubCategory = 'structured_username';
          break;
        }
      }
    }

    // 2. Generate Fields Based on Chosen Subcategory
    let identityName = '';
    let identityType: IdentityType = 'personal';
    let organization = '';
    let roleTitle = '';
    let username = '';
    let suffix: string | undefined;

    switch (effectiveSubCategory) {
      // ----------------------------------------------------
      // PERSON CATEGORIES
      // ----------------------------------------------------
      case 'person_name': {
        const first = pick(FIRST_NAMES, prng);
        const last = pick(LAST_NAMES, prng);
        identityName = `${first} ${last}`;
        identityType = 'personal';
        organization = prng() > 0.5
          ? `${pick(COMPANY_PREFIXES, prng)} ${pick(COMPANY_CORES, prng)}`
          : `${pick(STARTUP_ROOTS, prng)}${pick(STARTUP_SUFFIXES, prng)}`;
        roleTitle = pick(ROLES.personal, prng);
        username = this.generateStructuredUsername(first, last, 'first.last', prng);
        break;
      }

      case 'nickname': {
        const first = pick(FIRST_NAMES, prng);
        const nick = pick(NICKNAMES, prng);
        const last = pick(LAST_NAMES, prng);
        const style = prng();
        if (style < 0.4) {
          identityName = `${first} "${nick}" ${last}`;
        } else if (style < 0.7) {
          identityName = `${nick} ${last}`;
        } else {
          identityName = `${first} ${nick}`;
        }
        identityType = 'personal';
        organization = `${pick(COMPANY_PREFIXES, prng)} Labs`;
        roleTitle = pick(ROLES.personal, prng);
        username = `${nick.toLowerCase()}_${last.toLowerCase().replace(/[^a-z]/g, '')}`;
        break;
      }

      case 'creator': {
        const creatorPrefix = pick(CREATOR_PREFIXES, prng);
        const creatorSuffix = pick(CREATOR_SUFFIXES, prng);
        identityName = `${creatorPrefix}${creatorSuffix}`;
        identityType = 'creator';
        organization = `${identityName} Media`;
        roleTitle = pick(ROLES.creator, prng);
        username = identityName.toLowerCase();
        break;
      }

      case 'professional': {
        const first = pick(FIRST_NAMES, prng);
        const last = pick(LAST_NAMES, prng);
        const usePrefix = prng() > 0.4;
        if (usePrefix) {
          const title = pick(PROFESSIONAL_TITLES_PRE, prng);
          identityName = `${title} ${first} ${last}`;
        } else {
          const post = pick(PROFESSIONAL_TITLES_POST, prng);
          identityName = `${first} ${last}, ${post}`;
        }
        identityType = 'personal';
        organization = `${pick(COMPANY_PREFIXES, prng)} Group`;
        roleTitle = pick(ROLES.personal, prng);
        username = this.generateStructuredUsername(first, last, 'flast', prng);
        break;
      }

      // ----------------------------------------------------
      // COMPANY CATEGORIES
      // ----------------------------------------------------
      case 'fictional_company': {
        const p = pick(COMPANY_PREFIXES, prng);
        const c = pick(COMPANY_CORES, prng);
        const s = pick(COMPANY_SUFFIXES, prng);
        // e.g. Nova Pixel Labs, Cedar Systems, OrbitForge
        if (prng() > 0.3) {
          identityName = `${p} ${c} ${s}`;
        } else {
          identityName = `${p}${c}`;
        }
        identityType = 'company';
        organization = identityName;
        roleTitle = pick(ROLES.company, prng);
        const acronym = identityName.split(' ').map((w) => w[0]).join('').toLowerCase();
        username = `${acronym}_hq`;
        break;
      }

      case 'fictional_startup': {
        const root = pick(STARTUP_ROOTS, prng);
        const sfx = pick(STARTUP_SUFFIXES, prng);
        identityName = `${root} ${sfx}`.trim();
        identityType = 'startup';
        organization = identityName;
        roleTitle = pick(ROLES.startup, prng);
        const clean = identityName.toLowerCase().replace(/[^a-z0-9]/g, '');
        username = `${clean}_ops`;
        break;
      }

      case 'fictional_studio': {
        const p = pick(STUDIO_PREFIXES, prng);
        const s = pick(STUDIO_SUFFIXES, prng);
        identityName = `${p} ${s}`;
        identityType = 'company';
        organization = identityName;
        roleTitle = 'Creative Director';
        username = identityName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        break;
      }

      case 'fictional_tech_company': {
        const p = pick(TECH_PREFIXES, prng);
        const s = pick(TECH_SUFFIXES, prng);
        identityName = `${p} ${s}`;
        identityType = 'company';
        organization = identityName;
        roleTitle = 'Lead Infrastructure Architect';
        username = identityName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        break;
      }

      case 'fictional_agency': {
        const p = pick(AGENCY_PREFIXES, prng);
        const s = pick(AGENCY_SUFFIXES, prng);
        identityName = `${p} ${s}`;
        identityType = 'company';
        organization = identityName;
        roleTitle = 'Managing Partner';
        username = identityName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        break;
      }

      // ----------------------------------------------------
      // PROJECT CATEGORIES
      // ----------------------------------------------------
      case 'fictional_product': {
        const p = pick(PRODUCT_PREFIXES, prng);
        const s = pick(PRODUCT_SUFFIXES, prng);
        identityName = `${p}${s}`;
        identityType = 'project';
        organization = `${pick(COMPANY_PREFIXES, prng)} Systems`;
        roleTitle = 'Core Product Service';
        username = `${identityName.toLowerCase()}_bot`;
        break;
      }

      case 'fictional_application': {
        const p = pick(APP_PREFIXES, prng);
        const s = pick(APP_SUFFIXES, prng);
        identityName = `${p} ${s}`;
        identityType = 'project';
        organization = `${pick(STARTUP_ROOTS, prng)} IO`;
        roleTitle = 'Application Worker';
        username = identityName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        break;
      }

      case 'fictional_project': {
        identityName = pick(PROJECT_CODENAMES, prng);
        identityType = 'project';
        organization = 'R&D Advanced Initiatives';
        roleTitle = 'Autonomous Project Runner';
        username = identityName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        break;
      }

      case 'fictional_organization': {
        const p = pick(ORG_PREFIXES, prng);
        const s = pick(ORG_SUFFIXES, prng);
        identityName = `${p} ${s}`;
        identityType = 'company';
        organization = identityName;
        roleTitle = 'Executive Secretariat';
        username = identityName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        break;
      }

      // ----------------------------------------------------
      // STRUCTURED USERNAME CATEGORY
      // ----------------------------------------------------
      case 'structured_username':
      default: {
        const first = pick(FIRST_NAMES, prng);
        const last = pick(LAST_NAMES, prng);
        const pattern = pick([
          'first.last',
          'first_last',
          'first-last',
          'flast',
          'firstl',
          'first.l',
          'f.last',
          'last.first',
        ], prng);
        username = this.generateStructuredUsername(first, last, pattern, prng);
        identityName = `${first} ${last}`;
        identityType = 'personal';
        organization = `${pick(COMPANY_PREFIXES, prng)} ${pick(COMPANY_CORES, prng)}`;
        roleTitle = pick(ROLES.personal, prng);
        break;
      }
    }

    // Add clean numeric/hash suffix 35% of the time for even higher entropy
    if (prng() < 0.35) {
      const num = Math.floor(prng() * 900 + 100);
      suffix = `#${num}`;
      username = `${username}${num}`;
    }

    const id = `synth_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const avatarSeed = `${identityName}_${id}`;
    const tags = [
      'SYNTHETIC_TEST_DATA',
      effectiveCategory,
      effectiveSubCategory.toUpperCase(),
      pick(TAGS_POOL[identityType], prng),
    ];

    const cleanUser = baseUsername || username;
    const email = `${cleanUser}@${domain}`;

    return {
      id,
      identityName,
      identityCategory: effectiveCategory,
      subCategory: effectiveSubCategory,
      identityType,
      organization,
      roleTitle,
      username,
      email,
      suffix,
      avatarSeed,
      tags,
      notes: `[SYNTHETIC TEST DATA] Fictional ${effectiveCategory} test identity (${effectiveSubCategory}). Not a real person or organization.`,
      createdAt: Date.now(),
      isSyntheticTestIdentity: true,
      seedUsed: seedUsed !== undefined ? String(seedUsed) : undefined,
    };
  }

  /**
   * Generates a structured username from name components
   */
  static generateStructuredUsername(
    first: string,
    last: string,
    pattern: string,
    prng: () => number
  ): string {
    const f = first.toLowerCase().replace(/[^a-z]/g, '');
    const l = last.toLowerCase().replace(/[^a-z]/g, '');

    switch (pattern) {
      case 'first.last':
        return `${f}.${l}`;
      case 'first_last':
        return `${f}_${l}`;
      case 'first-last':
        return `${f}-${l}`;
      case 'flast':
        return `${f[0] || 'x'}${l}`;
      case 'firstl':
        return `${f}${l[0] || 'x'}`;
      case 'first.l':
        return `${f}.${l[0] || 'x'}`;
      case 'f.last':
        return `${f[0] || 'x'}.${l}`;
      case 'last.first':
        return `${l}.${f}`;
      default:
        return `${f}.${l}`;
    }
  }

  /**
   * Generates a bulk list of guaranteed-unique synthetic test identities
   */
  static generateBatch(
    count: number,
    options?: SyntheticGenerationOptions
  ): SyntheticIdentityData[] {
    const results: SyntheticIdentityData[] = [];
    const inBatchSet = new Set<string>();

    for (let i = 0; i < count; i++) {
      const itemSeed = options?.seed !== undefined ? `${options.seed}_${i}` : undefined;
      const identity = this.generate({
        ...options,
        seed: itemSeed,
      }, inBatchSet);
      results.push(identity);
    }

    return results;
  }
}

// ==========================================
// 5. BACKWARD-COMPATIBLE API EXPORTS
// ==========================================

/**
 * Standard entry point used across the applet for single synthetic identity generation
 */
export function generateSyntheticIdentity(
  baseUsername?: string,
  indexSeed?: number,
  forcedType?: IdentityType
): SyntheticIdentityData {
  return SyntheticTestIdentityEngine.generate({
    baseUsername,
    seed: indexSeed,
    identityType: forcedType,
  });
}

/**
 * Enriches a Variant record with high-diversity synthetic identity fields
 */
export function enrichVariantWithSyntheticIdentity(
  variant: Variant,
  indexSeed?: number
): Variant {
  const synth = generateSyntheticIdentity(variant.username, indexSeed);
  return {
    ...variant,
    identityName: synth.identityName,
    identityType: synth.identityType,
    identityCategory: synth.identityCategory,
    subCategory: synth.subCategory,
    syntheticUsername: synth.username,
    isSyntheticTestIdentity: true,
    organization: synth.organization,
    roleTitle: synth.roleTitle,
    avatarSeed: synth.avatarSeed,
    tags: synth.tags,
    suffix: synth.suffix,
  };
}

/**
 * Regenerates the synthetic persona for an existing Variant with zero repetition
 */
export function regenerateVariantIdentity(
  variant: Variant,
  targetType?: IdentityType,
  targetCategory?: IdentityCategory,
  targetSubCategory?: IdentitySubCategory
): Variant {
  const synth = SyntheticTestIdentityEngine.generate({
    baseUsername: variant.username,
    identityType: targetType,
    category: targetCategory,
    subCategory: targetSubCategory,
  });

  return {
    ...variant,
    identityName: synth.identityName,
    identityType: synth.identityType,
    identityCategory: synth.identityCategory,
    subCategory: synth.subCategory,
    syntheticUsername: synth.username,
    isSyntheticTestIdentity: true,
    organization: synth.organization,
    roleTitle: synth.roleTitle,
    avatarSeed: synth.avatarSeed,
    tags: synth.tags,
    suffix: synth.suffix,
    updatedAt: Date.now(),
  };
}
