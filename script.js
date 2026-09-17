/* ============================================================
   GAMHUB JOBS — "Thousands of Opportunities" scroll reel
   ============================================================

   TUNABLE TIMING VARIABLES
   Adjust these to retime the reel. All durations are in
   milliseconds, all speeds are in pixels of scroll per second.
   ============================================================ */
const INITIAL_SLOW_DURATION_MS   = 1000;   // ① slow, natural opening scroll
const INITIAL_SCROLL_SPEED_PX_S  = 95;     // ① speed during that slow opening
const ACCELERATION_DURATION_MS   = 1100;   // ② ramp from slow → fast
const FAST_SCROLL_SPEED_PX_S     = 2500;   // ③ cruising speed once accelerated
const END_EASE_DURATION_MS       = 750;    // ④ smooth deceleration to a stop
const TOTAL_ANIMATION_DURATION_MS = 10500; // total reel length, start to full stop
const END_HOLD_MS                = 1600;   // clean frame held after stopping (for the cut)

/* Small, low-frequency jitter so the scroll rhythm feels handheld
   rather than robotically linear. Kept subtle on purpose. */
const JITTER_AMOUNT_SLOW = 0.05;   // ±5% during the slow open
const JITTER_AMOUNT_FAST = 0.035;  // ±3.5% during the fast cruise

/* ============================================================
   JOB DATA — a wide spread of professions, companies and
   Gambian locations so nothing feels repetitive as it streams by.
   ============================================================ */
const LOGO_THEMES = [
  { bg: 'linear-gradient(135deg,#C89B3C,#E5B64A)', fg: '#111827' },
  { bg: 'linear-gradient(135deg,#2f7fb8,#63b8ea)',  fg: '#0b1420' },
  { bg: 'linear-gradient(135deg,#1f9e6b,#5fe0a8)',  fg: '#0b1a14' },
  { bg: 'linear-gradient(135deg,#7c5cd6,#b49bf2)',  fg: '#160f2b' },
  { bg: 'linear-gradient(135deg,#d97a3f,#f4b26a)',  fg: '#2a1305' },
  { bg: 'linear-gradient(135deg,#c65d6c,#f0909c)',  fg: '#2a0d11' },
];

const JOBS = [
  { title: 'Senior Accountant', company: 'Trust Bank Gambia', location: 'Banjul', type: 'Full-Time', tag: 'Finance', salary: 'GMD 22,000/mo', desc: 'Manage month-end closing, reconcile ledgers and support the annual audit for a leading commercial bank.', posted: '2h ago' },
  { title: 'Sales Representative', company: 'Teranga Foods', location: 'Serrekunda', type: 'Full-Time', tag: 'Sales', salary: 'GMD 12,000/mo + comm.', desc: 'Grow retail accounts across the Kombo area and build lasting relationships with shop owners.', posted: 'Today' },
  { title: 'Software Developer', company: 'BluWave Digital', location: 'Kololi', type: 'Remote', tag: 'IT & Tech', salary: 'GMD 35,000/mo', desc: 'Build and maintain client web platforms using JavaScript and modern frameworks. Fully remote role.', posted: '5h ago', featured: true },
  { title: 'Graphic Designer', company: 'Coastal Radio 92.3', location: 'Bakau', type: 'Part-Time', tag: 'Design', desc: 'Design on-air graphics, social posts and promo material for a growing Gambian radio brand.', posted: '1d ago' },
  { title: 'Secondary School Teacher', company: 'Gambia College Prep', location: 'Brikama', type: 'Full-Time', tag: 'Education', salary: 'GMD 15,000/mo', desc: 'Teach Mathematics to Grades 9–11 and support students preparing for WASSCE exams.', posted: '3d ago' },
  { title: 'Customer Service Officer', company: 'Africell Gambia', location: 'Kanifing', type: 'Full-Time', tag: 'Telecom', desc: 'Handle walk-in and call-centre enquiries, resolve billing issues and promote new packages.', posted: 'Just posted' },
  { title: 'Marketing Officer', company: 'Ocean Bay Hotel & Resort', location: 'Kololi', type: 'Full-Time', tag: 'Marketing', salary: 'GMD 18,500/mo', desc: 'Plan seasonal campaigns and manage partnerships with tour operators across West Coast Region.', posted: '4h ago' },
  { title: 'Delivery Driver', company: 'Silverback Logistics', location: 'Greater Banjul Area', type: 'Full-Time', tag: 'Logistics', salary: 'GMD 9,500/mo', desc: 'Deliver parcels across Greater Banjul on set routes. Valid licence and 2+ years driving required.', posted: '2d ago' },
  { title: 'Administrative Assistant', company: 'Njie & Associates', location: 'Banjul', type: 'Full-Time', tag: 'Admin', desc: 'Support a busy legal practice with filing, scheduling and client correspondence.', posted: '6h ago' },
  { title: 'Construction Worker', company: 'Sunrise Construction Ltd', location: 'Brikama', type: 'Contract', tag: 'Construction', salary: 'GMD 400/day', desc: 'Join a residential housing project in Brikama. Site experience and own PPE preferred.', posted: '1d ago' },
  { title: 'Electrician', company: 'National Water & Electricity Co', location: 'Kanifing', type: 'Full-Time', tag: 'Trades', salary: 'GMD 14,000/mo', desc: 'Install and repair residential and light commercial wiring across the Kanifing municipality.', posted: 'Today' },
  { title: 'Registered Nurse', company: 'Serrekunda General Hospital', location: 'Serrekunda', type: 'Full-Time', tag: 'Healthcare', salary: 'GMD 16,500/mo', desc: 'Provide ward care on rotating shifts within a busy general hospital department.', posted: '8h ago', featured: true },
  { title: 'Head Chef', company: 'Paradise Suites Hotel', location: 'Kololi', type: 'Full-Time', tag: 'Hospitality', salary: 'GMD 20,000/mo', desc: 'Lead the kitchen brigade for a beachfront hotel restaurant serving local and international menus.', posted: '3h ago' },
  { title: 'Social Media Manager', company: 'GamHub Digital Agency', location: 'Kololi', type: 'Remote', tag: 'Marketing', desc: 'Plan and publish content calendars for three Gambian retail brands. Portfolio required.', posted: '9h ago' },
  { title: 'Project Coordinator', company: 'Save the Children Gambia', location: 'Banjul', type: 'Contract', tag: 'NGO', salary: 'GMD 24,000/mo', desc: 'Coordinate field activities for a child-nutrition programme across West Coast Region.', posted: '2d ago' },
  { title: 'Security Officer', company: 'Golden Coast Security', location: 'Bakau', type: 'Full-Time', tag: 'Security', salary: 'GMD 8,800/mo', desc: 'Provide access control and night patrols for a hotel compound. Prior security experience required.', posted: '5d ago' },
  { title: 'Procurement Officer', company: 'Gambia Ports Authority', location: 'Banjul', type: 'Full-Time', tag: 'Government', desc: 'Manage supplier tenders and purchase orders for port operations and maintenance.', posted: '1d ago' },
  { title: 'HR Assistant', company: 'Standard Chartered Gambia', location: 'Banjul', type: 'Full-Time', tag: 'HR', salary: 'GMD 15,000/mo', desc: 'Support recruitment, onboarding and staff records for a regional banking office.', posted: '7h ago' },
  { title: 'Field Agronomist', company: 'EcoFarm Gambia', location: 'West Coast Region', type: 'Full-Time', tag: 'Agriculture', desc: 'Advise smallholder farmers on crop rotation and soil health across coastal growing regions.', posted: '3d ago' },
  { title: 'Tour Guide', company: 'Kombo Discovery Tours', location: 'Kololi', type: 'Part-Time', tag: 'Tourism', salary: 'GMD 600/tour', desc: 'Lead cultural and wildlife tours for international visitors. Fluent English essential.', posted: '4d ago' },
  { title: 'Bank Teller', company: 'Access Bank Gambia', location: 'Serrekunda', type: 'Full-Time', tag: 'Finance', salary: 'GMD 11,500/mo', desc: 'Process deposits, withdrawals and account enquiries at a busy branch counter.', posted: 'Today' },
  { title: 'Warehouse Supervisor', company: 'Riverside Logistics', location: 'Kanifing', type: 'Full-Time', tag: 'Logistics', salary: 'GMD 17,000/mo', desc: 'Oversee inbound stock, inventory counts and a small warehouse team.', posted: '2d ago' },
  { title: 'Front Desk Receptionist', company: 'Kairaba Beach Hotel', location: 'Kololi', type: 'Full-Time', tag: 'Hospitality', desc: 'Welcome guests, manage bookings and coordinate with housekeeping on a rotating shift.', posted: '6h ago' },
  { title: 'Plumber', company: 'Sunrise Construction Ltd', location: 'Brikama', type: 'Contract', tag: 'Trades', salary: 'GMD 450/day', desc: 'Fit and repair plumbing systems on residential builds. Own tools an advantage.', posted: '1d ago' },
  { title: 'Pharmacist', company: 'Baobab Health Clinic', location: 'Bakau', type: 'Full-Time', tag: 'Healthcare', salary: 'GMD 19,000/mo', desc: 'Dispense prescriptions and advise patients at a community pharmacy counter.', posted: '2h ago' },
  { title: 'Logistics Coordinator', company: 'Gambia Ports Authority', location: 'Banjul', type: 'Full-Time', tag: 'Logistics', desc: 'Track container movements and coordinate customs clearance schedules.', posted: '4d ago' },
  { title: 'Content Writer', company: 'Coastal Radio 92.3', location: 'Bakau', type: 'Remote', tag: 'Media', desc: 'Write scripts, web copy and social captions for a growing Gambian media brand.', posted: '9h ago' },
  { title: 'Data Analyst', company: 'MRC Gambia', location: 'Fajara', type: 'Full-Time', tag: 'IT & Tech', salary: 'GMD 26,000/mo', desc: 'Clean and analyse public-health survey data for an international research unit.', posted: '3h ago', featured: true },
  { title: 'Internal Auditor', company: 'Gambia Revenue Authority', location: 'Banjul', type: 'Full-Time', tag: 'Finance', desc: 'Review departmental spending and compliance across regional tax offices.', posted: '2d ago' },
  { title: 'Hotel Operations Manager', company: 'Ocean Bay Hotel & Resort', location: 'Kololi', type: 'Full-Time', tag: 'Hospitality', salary: 'GMD 32,000/mo', desc: 'Oversee front office, housekeeping and F&B teams for a 140-room beachfront property.', posted: '5h ago' },
  { title: 'NGO Field Officer', company: 'YMCA Gambia', location: 'Brikama', type: 'Contract', tag: 'NGO', salary: 'GMD 21,000/mo', desc: 'Run youth-employment workshops in rural communities across West Coast Region.', posted: '1d ago' },
  { title: 'Auto Mechanic', company: 'Kombo Motor Works', location: 'Serrekunda', type: 'Full-Time', tag: 'Trades', salary: 'GMD 13,500/mo', desc: 'Diagnose and repair petrol and diesel engines for a busy independent garage.', posted: 'Today' },
  { title: 'Legal Assistant', company: 'Njie & Associates', location: 'Banjul', type: 'Internship', tag: 'Legal', desc: 'Support case research and client filings at a Banjul-based commercial law firm.', posted: '6d ago' },
  { title: 'Fisheries Officer', company: 'Ministry of Fisheries', location: 'West Coast Region', type: 'Full-Time', tag: 'Government', desc: 'Monitor catch reporting and support sustainable-fishing outreach along the coast.', posted: '3d ago' },
  { title: 'Radio Presenter', company: 'Coastal Radio 92.3', location: 'Bakau', type: 'Part-Time', tag: 'Media', desc: 'Host a weekday afternoon show covering local news, music and listener call-ins.', posted: '4h ago' },
  { title: 'Cashier', company: 'Teranga Foods', location: 'Serrekunda', type: 'Full-Time', tag: 'Retail', salary: 'GMD 8,200/mo', desc: 'Handle till transactions and stock replenishment at a busy supermarket branch.', posted: '1d ago' },
  { title: 'IT Support Technician', company: 'Access Bank Gambia', location: 'Banjul', type: 'Full-Time', tag: 'IT & Tech', salary: 'GMD 17,500/mo', desc: 'Troubleshoot hardware, network and POS issues across three branch locations.', posted: '7h ago' },
  { title: 'Community Health Worker', company: 'Baobab Health Clinic', location: 'Brikama', type: 'Full-Time', tag: 'Healthcare', desc: 'Run outreach clinics and health-education sessions in surrounding villages.', posted: '2d ago' },
  { title: 'Junior Software Developer', company: 'BluWave Digital', location: 'Kololi', type: 'Internship', tag: 'IT & Tech', desc: 'Assist the dev team building client SPAs. Great entry point for recent grads.', posted: '3d ago' },
  { title: 'Insurance Sales Agent', company: 'West Africa Insurance', location: 'Kanifing', type: 'Full-Time', tag: 'Sales', salary: 'GMD 10,000/mo + comm.', desc: 'Prospect and onboard new individual and business insurance clients.', posted: 'Today' },
  { title: 'Municipal Clerk', company: 'Kanifing Municipal Council', location: 'Kanifing', type: 'Full-Time', tag: 'Government', desc: 'Process permit applications and maintain public records for the municipality.', posted: '5d ago' },
  { title: 'Barista & Café Assistant', company: "Fatou's Kitchen Group", location: 'Kololi', type: 'Part-Time', tag: 'Hospitality', salary: 'GMD 6,500/mo', desc: 'Prepare drinks and serve customers at a busy beach-road café.', posted: '8h ago' },
];

/* ============================================================
   CARD BUILDING
   ============================================================ */
function typeMeta(type) {
  switch (type) {
    case 'Remote':     return { cls: 'remote',   icon: '🌍' };
    case 'Part-Time':  return { cls: 'part',     icon: '⏰' };
    case 'Internship': return { cls: 'intern',   icon: '🎓' };
    case 'Contract':   return { cls: 'contract', icon: '📋' };
    default:           return { cls: '',         icon: '💼' };
  }
}

function initialsFor(company) {
  const words = company.replace(/[^\w\s&]/g, '').split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map(w => w[0].toUpperCase());
  return letters.join('') || 'GJ';
}

function buildCard(job, themeIndex) {
  const theme = LOGO_THEMES[themeIndex % LOGO_THEMES.length];
  const t = typeMeta(job.type);
  const card = document.createElement('article');
  card.className = 'gh-card';

  card.innerHTML = `
    ${job.featured ? '<span class="gh-featured-tag">Featured</span>' : ''}
    <div class="gh-card-head">
      <div class="gh-logo" style="background:${theme.bg};color:${theme.fg}">${initialsFor(job.company)}</div>
      <div class="gh-card-title-wrap">
        <div class="gh-card-title">${job.title}</div>
        <div class="gh-card-company">${job.company}</div>
      </div>
      ${job.salary ? `<div class="gh-card-salary">${job.salary}</div>` : ''}
    </div>
    <div class="gh-badge-row">
      <span class="gh-badge gh-badge-type ${t.cls}">${t.icon} ${job.type}</span>
      <span class="gh-badge gh-badge-loc">📍 ${job.location}</span>
      <span class="gh-badge gh-badge-loc">${job.tag}</span>
    </div>
    <p class="gh-card-desc">${job.desc}</p>
    <div class="gh-card-foot">
      <span class="gh-posted">🕐 ${job.posted}</span>
      <span class="gh-apply-btn">Apply Now</span>
    </div>
  `;
  return card;
}

/* ============================================================
   RENDER — the list is duplicated back-to-back so that once the
   scroll passes one full set's height, resetting the offset by
   that same height is visually seamless (both copies are
   pixel-identical, so there is no jump or teleport).
   ============================================================ */
const track = document.getElementById('gh-scroll-track');
const setFragmentA = document.createDocumentFragment();
const setFragmentB = document.createDocumentFragment();

JOBS.forEach((job, i) => {
  setFragmentA.appendChild(buildCard(job, i));
  setFragmentB.appendChild(buildCard(job, i));
});
track.appendChild(setFragmentA);
const setMarker = document.createElement('div'); // measuring boundary
setMarker.style.height = '0px';
track.appendChild(setMarker);
track.appendChild(setFragmentB);

/* ============================================================
   SCALE THE STAGE TO FIT THE BROWSER WINDOW
   (native 1080×1920 DOM, scaled visually — animation math is
   unaffected since it runs in the stage's own pixel space)
   ============================================================ */
const stage = document.getElementById('stage');
function fitStage() {
  const scale = Math.min(window.innerWidth / 1080, window.innerHeight / 1920);
  stage.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', fitStage);
fitStage();

/* ============================================================
   ANIMATION ENGINE
   ============================================================ */
function lerp(a, b, t) { return a + (b - a) * t; }
function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

let singleSetHeight = 0;
let distance = 0;
let startTime = null;
let stopped = false;
const endcard = document.getElementById('gh-endcard');

function measure() {
  // Height of one full set = marker's offsetTop (everything before it).
  singleSetHeight = setMarker.offsetTop || track.scrollHeight / 2;
}

function speedAt(elapsed) {
  const slowEnd = INITIAL_SLOW_DURATION_MS;
  const accelEnd = slowEnd + ACCELERATION_DURATION_MS;
  const endEaseStart = TOTAL_ANIMATION_DURATION_MS - END_EASE_DURATION_MS;

  if (elapsed <= slowEnd) {
    const jitter = 1 + JITTER_AMOUNT_SLOW * Math.sin(elapsed / 210) + (JITTER_AMOUNT_SLOW * 0.4) * Math.sin(elapsed / 97 + 1.3);
    return INITIAL_SCROLL_SPEED_PX_S * jitter;
  }
  if (elapsed <= accelEnd) {
    const t = (elapsed - slowEnd) / ACCELERATION_DURATION_MS;
    return lerp(INITIAL_SCROLL_SPEED_PX_S, FAST_SCROLL_SPEED_PX_S, easeInOutCubic(t));
  }
  if (elapsed <= endEaseStart) {
    const jitter = 1 + JITTER_AMOUNT_FAST * Math.sin(elapsed / 260) + (JITTER_AMOUNT_FAST * 0.5) * Math.sin(elapsed / 133 + 0.7);
    return FAST_SCROLL_SPEED_PX_S * jitter;
  }
  if (elapsed <= TOTAL_ANIMATION_DURATION_MS) {
    const t = (elapsed - endEaseStart) / END_EASE_DURATION_MS;
    return lerp(FAST_SCROLL_SPEED_PX_S, 0, easeOutCubic(t));
  }
  return 0;
}

function frame(now) {
  if (startTime === null) startTime = now;
  const elapsed = now - startTime;

  if (!stopped) {
    if (elapsed >= TOTAL_ANIMATION_DURATION_MS) {
      stopped = true;
      // Hold the final offset — the deceleration already eased
      // speed down to 0, so this is a naturally settled frame.
      track.style.transform = `translateY(${-(distance % singleSetHeight)}px)`;
      setTimeout(() => endcard.classList.add('visible'), 120);
    } else {
      const prevNow = frame.lastNow || now;
      const dt = Math.min(now - prevNow, 48); // clamp big tab-switch gaps
      const speed = speedAt(elapsed);
      distance += (speed * dt) / 1000;

      if (singleSetHeight > 0) {
        const offset = distance % singleSetHeight;
        track.style.transform = `translateY(${-offset}px)`;
      }
    }
  }

  frame.lastNow = now;
  requestAnimationFrame(frame);
}

function start() {
  measure();
  // Re-measure once more after fonts/layout settle, in case web
  // fonts shift line counts and therefore card heights.
  requestAnimationFrame(() => {
    measure();
    requestAnimationFrame(frame);
  });
}

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(start);
} else {
  start();
}
