// In-memory mock data store for DEMO_MODE
// Rich 30-day dataset for realistic analytics and history

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function minsAgo(n)  { return new Date(Date.now() - n * 60000).toISOString(); }
function hoursAgo(n) { return new Date(Date.now() - n * 3600000).toISOString(); }
function daysAgo(n)  { return new Date(Date.now() - n * 86400000).toISOString(); }

const VILLAGES = [
  { name: 'Shirur',   lat: 18.8268, lng: 74.3677 },
  { name: 'Daund',    lat: 18.4607, lng: 74.5826 },
  { name: 'Baramati', lat: 18.1522, lng: 74.5815 },
  { name: 'Indapur',  lat: 18.1167, lng: 75.0167 },
  { name: 'Bhor',     lat: 18.1500, lng: 73.8500 },
  { name: 'Velhe',    lat: 18.2667, lng: 73.6500 },
  { name: 'Junnar',   lat: 19.2000, lng: 73.8833 },
  { name: 'Ambegaon', lat: 19.1167, lng: 73.7167 },
  { name: 'Khed',     lat: 18.8500, lng: 73.9833 },
  { name: 'Maval',    lat: 18.7167, lng: 73.5833 },
];

const mockUsers = [
  { id: 'u1', name: 'Ramesh Patil',    phone: '+919876543210', role: 'responder', is_trained: true,  vehicle_type: 'bike' },
  { id: 'u2', name: 'Sunita Jadhav',   phone: '+919876543211', role: 'responder', is_trained: true,  vehicle_type: 'car'  },
  { id: 'u3', name: 'Vijay Shinde',    phone: '+919876543212', role: 'responder', is_trained: false, vehicle_type: 'bike' },
  { id: 'u4', name: 'Priya Deshmukh',  phone: '+919876543213', role: 'responder', is_trained: true,  vehicle_type: 'car'  },
  { id: 'u5', name: 'Anil Kulkarni',   phone: '+919876543214', role: 'responder', is_trained: true,  vehicle_type: 'bike' },
  { id: 'u6', name: 'Meena Bhosale',   phone: '+919876543215', role: 'responder', is_trained: false, vehicle_type: 'bike' },
  { id: 'u7', name: 'Santosh More',    phone: '+919876543216', role: 'responder', is_trained: true,  vehicle_type: 'car'  },
  { id: 'u8', name: 'Kavita Pawar',    phone: '+919876543217', role: 'responder', is_trained: true,  vehicle_type: 'bike' },
  { id: 'p1', name: 'Ganesh Waghmare', phone: '+919876543220', role: 'patient' },
  { id: 'p2', name: 'Lata Nimbalkar',  phone: '+919876543221', role: 'patient' },
  { id: 'p3', name: 'Suresh Gaikwad',  phone: '+919876543222', role: 'patient' },
];

const mockRespondersLive = [
  { user_id: 'u1', name: 'Ramesh Patil',   vehicle_type: 'bike', lat: 18.8300, lng: 74.3700, is_available: true,  last_seen: minsAgo(1)  },
  { user_id: 'u2', name: 'Sunita Jadhav',  vehicle_type: 'car',  lat: 18.4650, lng: 74.5850, is_available: true,  last_seen: minsAgo(2)  },
  { user_id: 'u3', name: 'Vijay Shinde',   vehicle_type: 'bike', lat: 18.1550, lng: 74.5800, is_available: false, last_seen: minsAgo(15) },
  { user_id: 'u4', name: 'Priya Deshmukh', vehicle_type: 'car',  lat: 18.1200, lng: 75.0200, is_available: true,  last_seen: minsAgo(0)  },
  { user_id: 'u5', name: 'Anil Kulkarni',  vehicle_type: 'bike', lat: 18.1600, lng: 73.8600, is_available: true,  last_seen: minsAgo(3)  },
  { user_id: 'u6', name: 'Meena Bhosale',  vehicle_type: 'bike', lat: 18.2700, lng: 73.6600, is_available: false, last_seen: minsAgo(30) },
  { user_id: 'u7', name: 'Santosh More',   vehicle_type: 'car',  lat: 19.2050, lng: 73.8900, is_available: true,  last_seen: minsAgo(1)  },
  { user_id: 'u8', name: 'Kavita Pawar',   vehicle_type: 'bike', lat: 18.8550, lng: 73.9900, is_available: true,  last_seen: minsAgo(4)  },
];

// ── Active emergencies (today) ────────────────────────────────────────────────
const mockEmergencies = [
  { id: 'e1', patient_id: 'p1', patient_name: 'Ganesh Waghmare', lat: 18.8268, lng: 74.3677, village: 'Shirur',   type: 'cardiac',  status: 'en_route', severity: 1, responder_id: 'u1', responder_name: 'Ramesh Patil',   eta_minutes: 4,    created_at: minsAgo(8)   },
  { id: 'e2', patient_id: 'p2', patient_name: 'Lata Nimbalkar',  lat: 18.4607, lng: 74.5826, village: 'Daund',    type: 'accident', status: 'matched',  severity: 2, responder_id: 'u2', responder_name: 'Sunita Jadhav',  eta_minutes: 7,    created_at: minsAgo(3)   },
  { id: 'e3', patient_id: 'p3', patient_name: 'Suresh Gaikwad',  lat: 18.1522, lng: 74.5815, village: 'Baramati', type: 'delivery', status: 'pending',  severity: 3, responder_id: null, responder_name: null,            eta_minutes: null, created_at: minsAgo(1)   },
  // Recent done
  { id: 'e4', patient_id: 'p1', patient_name: 'Ganesh Waghmare', lat: 18.1167, lng: 75.0167, village: 'Indapur',  type: 'general',  status: 'done', severity: 4, responder_id: 'u4', responder_name: 'Priya Deshmukh', eta_minutes: 0, created_at: minsAgo(120) },
  { id: 'e5', patient_id: 'p2', patient_name: 'Lata Nimbalkar',  lat: 19.2000, lng: 73.8833, village: 'Junnar',   type: 'accident', status: 'done', severity: 2, responder_id: 'u7', responder_name: 'Santosh More',   eta_minutes: 0, created_at: minsAgo(240) },
  { id: 'e6', patient_id: 'p3', patient_name: 'Suresh Gaikwad',  lat: 18.8500, lng: 73.9833, village: 'Khed',     type: 'cardiac',  status: 'done', severity: 1, responder_id: 'u8', responder_name: 'Kavita Pawar',   eta_minutes: 0, created_at: minsAgo(360) },
];

// ── 30-day historical emergencies ─────────────────────────────────────────────
const TYPES      = ['cardiac', 'accident', 'delivery', 'general'];
const RESPONDERS = [
  { id: 'u1', name: 'Ramesh Patil'   },
  { id: 'u2', name: 'Sunita Jadhav'  },
  { id: 'u4', name: 'Priya Deshmukh' },
  { id: 'u5', name: 'Anil Kulkarni'  },
  { id: 'u7', name: 'Santosh More'   },
  { id: 'u8', name: 'Kavita Pawar'   },
];
const PATIENTS = [
  'Ramesh Kumar', 'Sunita Devi', 'Vijay Patil', 'Priya Shinde', 'Anil Jadhav',
  'Meena Kulkarni', 'Santosh Bhosale', 'Kavita More', 'Ganesh Waghmare', 'Lata Nimbalkar',
  'Suresh Gaikwad', 'Anita Pawar', 'Rajesh Deshmukh', 'Pooja Kulkarni', 'Mohan Shinde',
];

const historicalEmergencies = [];
const historicalRides = [];

let rideCounter = 11;
for (let day = 1; day <= 30; day++) {
  const count = Math.floor(Math.random() * 4) + 1; // 1-4 per day
  for (let j = 0; j < count; j++) {
    const village   = VILLAGES[Math.floor(Math.random() * VILLAGES.length)];
    const type      = TYPES[Math.floor(Math.random() * TYPES.length)];
    const responder = RESPONDERS[Math.floor(Math.random() * RESPONDERS.length)];
    const patient   = PATIENTS[Math.floor(Math.random() * PATIENTS.length)];
    const severity  = Math.ceil(Math.random() * 4);
    const eta       = Math.floor(Math.random() * 20) + 3;
    const eId       = `eh${day}_${j}`;
    const rId       = `rh${rideCounter++}`;
    const dist      = +(Math.random() * 15 + 2).toFixed(1);
    const bonus     = Math.round(dist * 5);
    const hoursOffset = day * 24 - Math.floor(Math.random() * 20);

    historicalEmergencies.push({
      id: eId,
      patient_id: 'p_hist',
      patient_name: patient,
      lat: village.lat + (Math.random() - 0.5) * 0.05,
      lng: village.lng + (Math.random() - 0.5) * 0.05,
      village: village.name,
      type,
      status: 'done',
      severity,
      responder_id:   responder.id,
      responder_name: responder.name,
      eta_minutes: 0,
      created_at: hoursAgo(hoursOffset),
    });

    historicalRides.push({
      id: rId,
      emergency_id:   eId,
      responder_id:   responder.id,
      responder_name: responder.name,
      distance_km:    dist,
      base_rate:      50,
      distance_bonus: bonus,
      total_inr:      50 + bonus,
      status:         'completed',
      pickup_time:    hoursAgo(hoursOffset - 0.1),
      drop_time:      hoursAgo(hoursOffset - 0.4),
      village:        village.name,
    });
  }
}

const mockHospitals = [
  { id: 'h1', name: 'Shirur Rural Hospital',        lat: 18.8300, lng: 74.3750, beds_available: 12, total_beds: 30, specializations: ['general', 'trauma'],                         phone: '+912137222111', district: 'Pune' },
  { id: 'h2', name: 'Daund Primary Health Centre',  lat: 18.4650, lng: 74.5900, beds_available: 4,  total_beds: 15, specializations: ['general', 'maternity'],                      phone: '+912117222222', district: 'Pune' },
  { id: 'h3', name: 'Baramati District Hospital',   lat: 18.1600, lng: 74.5900, beds_available: 28, total_beds: 80, specializations: ['cardiac', 'trauma', 'maternity', 'general'], phone: '+912112222333', district: 'Pune' },
  { id: 'h4', name: 'Indapur Community Hospital',   lat: 18.1200, lng: 75.0250, beds_available: 6,  total_beds: 20, specializations: ['general'],                                   phone: '+912111222444', district: 'Pune' },
  { id: 'h5', name: 'Junnar Sub-District Hospital', lat: 19.2100, lng: 73.8900, beds_available: 18, total_beds: 40, specializations: ['general', 'trauma'],                         phone: '+912132222555', district: 'Pune' },
];

const mockTriageLogs = [
  { id: 't1', emergency_id: 'e1', ai_severity: 1, first_aid_steps: ['Call 108 immediately', 'Keep patient still', 'Loosen tight clothing', 'Do not give water'], hospital_dept: 'Cardiac ICU', hindi_message: 'मरीज को हिलाएं नहीं। तुरंत अस्पताल ले जाएं।', created_at: minsAgo(7) },
  { id: 't2', emergency_id: 'e2', ai_severity: 2, first_aid_steps: ['Control bleeding with cloth', 'Keep patient warm', 'Check breathing', 'Do not move spine'],  hospital_dept: 'Trauma',      hindi_message: 'खून रोकें। मरीज को गर्म रखें।',              created_at: minsAgo(2) },
];

const mockRides = [
  { id: 'r1',  emergency_id: 'e4', responder_id: 'u4', responder_name: 'Priya Deshmukh', distance_km: 8.2,  base_rate: 50, distance_bonus: 41, total_inr: 91,  status: 'completed', pickup_time: minsAgo(125), drop_time: minsAgo(110), village: 'Indapur' },
  { id: 'r2',  emergency_id: 'e5', responder_id: 'u7', responder_name: 'Santosh More',   distance_km: 12.5, base_rate: 50, distance_bonus: 62, total_inr: 112, status: 'completed', pickup_time: minsAgo(245), drop_time: minsAgo(225), village: 'Junnar'  },
  { id: 'r3',  emergency_id: 'e6', responder_id: 'u8', responder_name: 'Kavita Pawar',   distance_km: 6.1,  base_rate: 50, distance_bonus: 30, total_inr: 80,  status: 'completed', pickup_time: minsAgo(365), drop_time: minsAgo(350), village: 'Khed'    },
  { id: 'r4',  emergency_id: 'e1', responder_id: 'u1', responder_name: 'Ramesh Patil',   distance_km: 3.8,  base_rate: 50, distance_bonus: 19, total_inr: 69,  status: 'active',    pickup_time: minsAgo(6),   drop_time: null,         village: 'Shirur'  },
  { id: 'r5',  emergency_id: 'e2', responder_id: 'u2', responder_name: 'Sunita Jadhav',  distance_km: 5.4,  base_rate: 50, distance_bonus: 27, total_inr: 77,  status: 'active',    pickup_time: minsAgo(2),   drop_time: null,         village: 'Daund'   },
  { id: 'r6',  emergency_id: null, responder_id: 'u1', responder_name: 'Ramesh Patil',   distance_km: 9.0,  base_rate: 50, distance_bonus: 45, total_inr: 95,  status: 'completed', pickup_time: daysAgo(1),   drop_time: daysAgo(1),   village: 'Shirur'  },
  { id: 'r7',  emergency_id: null, responder_id: 'u4', responder_name: 'Priya Deshmukh', distance_km: 14.2, base_rate: 50, distance_bonus: 71, total_inr: 121, status: 'completed', pickup_time: daysAgo(1),   drop_time: daysAgo(1),   village: 'Indapur' },
  { id: 'r8',  emergency_id: null, responder_id: 'u7', responder_name: 'Santosh More',   distance_km: 7.3,  base_rate: 50, distance_bonus: 36, total_inr: 86,  status: 'completed', pickup_time: daysAgo(2),   drop_time: daysAgo(2),   village: 'Junnar'  },
  { id: 'r9',  emergency_id: null, responder_id: 'u8', responder_name: 'Kavita Pawar',   distance_km: 11.0, base_rate: 50, distance_bonus: 55, total_inr: 105, status: 'completed', pickup_time: daysAgo(2),   drop_time: daysAgo(2),   village: 'Khed'    },
  { id: 'r10', emergency_id: null, responder_id: 'u2', responder_name: 'Sunita Jadhav',  distance_km: 4.5,  base_rate: 50, distance_bonus: 22, total_inr: 72,  status: 'completed', pickup_time: daysAgo(3),   drop_time: daysAgo(3),   village: 'Daund'   },
  ...historicalRides,
];

const mockRelaySegments = [
  { id: 'rs1', ride_id: 'r2', emergency_id: 'e5', segment_num: 1, responder_id: 'u5', responder_name: 'Anil Kulkarni', vehicle_type: 'bike', from_village: 'Junnar',   to_village: 'Ambegaon',        from_lat: 19.2000, from_lng: 73.8833, to_lat: 19.1167, to_lng: 73.7167, distance_km: 14.2, status: 'completed', handoff_time: minsAgo(230) },
  { id: 'rs2', ride_id: 'r2', emergency_id: 'e5', segment_num: 2, responder_id: 'u7', responder_name: 'Santosh More',  vehicle_type: 'car',  from_village: 'Ambegaon', to_village: 'Junnar Hospital', from_lat: 19.1167, from_lng: 73.7167, to_lat: 19.2100, to_lng: 73.8900, distance_km: 18.5, status: 'completed', handoff_time: minsAgo(225) },
];

const mockTrainingModules = [
  { id: 'tm1', title: 'Basic CPR & Cardiac First Aid',      language: 'hi', duration_mins: 15, is_required: true,  order: 1, description: 'Learn chest compressions, rescue breathing, and AED use for cardiac emergencies.', video_url: 'https://www.youtube.com/embed/cosVBV96E2g', quiz: [{ q: 'How many chest compressions per minute in CPR?', options: ['60','100','120','80'], answer: 1 }, { q: 'What does AED stand for?', options: ['Automated External Defibrillator','Advanced Emergency Device','Acute Electric Dispenser','Automated Emergency Detector'], answer: 0 }], completions: ['u1','u2','u4','u7','u8'] },
  { id: 'tm2', title: 'Trauma & Accident Response',          language: 'hi', duration_mins: 20, is_required: true,  order: 2, description: 'Bleeding control, spinal precautions, and shock management for road accidents.',    video_url: 'https://www.youtube.com/embed/NxO5LvgqZe0', quiz: [{ q: 'Should you move a patient with possible spine injury?', options: ['Yes, immediately','No, unless life-threatening danger','Always move them','Only if conscious'], answer: 1 }, { q: 'Best way to control severe bleeding?', options: ['Ice pack','Direct firm pressure','Elevate only','Tourniquet always'], answer: 1 }], completions: ['u1','u2','u4','u8'] },
  { id: 'tm3', title: 'Emergency Childbirth Assistance',     language: 'mr', duration_mins: 18, is_required: false, order: 3, description: 'Supporting emergency deliveries in rural settings without medical equipment.',       video_url: 'https://www.youtube.com/embed/example3',    quiz: [{ q: 'When should you cut the umbilical cord?', options: ['Immediately','After placenta delivered','Only with sterile scissors','Never in field'], answer: 2 }], completions: ['u2','u4'] },
  { id: 'tm4', title: 'Snake Bite & Poisoning',              language: 'hi', duration_mins: 12, is_required: false, order: 4, description: 'Identifying venomous bites, immobilization technique, and what NOT to do.',         video_url: 'https://www.youtube.com/embed/example4',    quiz: [{ q: 'Should you suck venom from a snake bite?', options: ['Yes','No — never','Only if no hospital nearby','Depends on snake'], answer: 1 }], completions: ['u1','u5','u7'] },
  { id: 'tm5', title: 'Heat Stroke & Dehydration',           language: 'en', duration_mins: 10, is_required: false, order: 5, description: 'Recognizing and treating heat emergencies common in rural Maharashtra summers.',     video_url: 'https://www.youtube.com/embed/example5',    quiz: [{ q: 'First step for heat stroke victim?', options: ['Give water immediately','Move to shade and cool body','Give paracetamol','Keep them walking'], answer: 1 }], completions: ['u1','u2','u4','u5','u7','u8'] },
];

const mockNotifications = [
  { id: 'n1', user_id: 'u1', type: 'emergency_assigned', message: 'New emergency assigned: Cardiac in Shirur',    payload: { emergency_id: 'e1' }, channel: 'push', sent_at: minsAgo(8),   read: false },
  { id: 'n2', user_id: 'u2', type: 'emergency_assigned', message: 'New emergency assigned: Accident in Daund',    payload: { emergency_id: 'e2' }, channel: 'push', sent_at: minsAgo(3),   read: false },
  { id: 'n3', user_id: 'p1', type: 'responder_matched',  message: 'Ramesh Patil is on the way — ETA 4 min',       payload: { emergency_id: 'e1' }, channel: 'sms',  sent_at: minsAgo(7),   read: true  },
  { id: 'n4', user_id: 'p2', type: 'responder_matched',  message: 'Sunita Jadhav is on the way — ETA 7 min',      payload: { emergency_id: 'e2' }, channel: 'sms',  sent_at: minsAgo(2),   read: true  },
  { id: 'n5', user_id: 'u4', type: 'ride_completed',     message: 'Ride completed. Earnings: ₹91 credited',       payload: { ride_id: 'r1' },      channel: 'push', sent_at: minsAgo(110), read: true  },
  { id: 'n6', user_id: 'u7', type: 'ride_completed',     message: 'Ride completed. Earnings: ₹112 credited',      payload: { ride_id: 'r2' },      channel: 'push', sent_at: minsAgo(225), read: true  },
  { id: 'n7', user_id: null, type: 'system',             message: 'SMS SOS received from +91987XXXX — Baramati',  payload: {},                     channel: 'sms',  sent_at: minsAgo(1),   read: false },
  { id: 'n8', user_id: 'u8', type: 'training_completed', message: 'Module "Heat Stroke & Dehydration" completed', payload: { module_id: 'tm5' },   channel: 'push', sent_at: minsAgo(45),  read: false },
];

// ── Mutable state ─────────────────────────────────────────────────────────────
const state = {
  emergencies:     [...mockEmergencies, ...historicalEmergencies],
  respondersLive:  [...mockRespondersLive],
  hospitals:       [...mockHospitals],
  triageLogs:      [...mockTriageLogs],
  rides:           [...mockRides],
  relaySegments:   [...mockRelaySegments],
  trainingModules: [...mockTrainingModules],
  notifications:   [...mockNotifications],
  users:           [...mockUsers],
  auditLogs: [
    { id: uid(), action: 'emergency.created',        details: { id: 'e1', type: 'cardiac',  village: 'Shirur',   status: 'matched'  }, actor: 'system', created_at: minsAgo(8)   },
    { id: uid(), action: 'emergency.status_changed', details: { id: 'e1', from: 'matched',  to: 'en_route'                          }, actor: 'system', created_at: minsAgo(6)   },
    { id: uid(), action: 'emergency.created',        details: { id: 'e2', type: 'accident', village: 'Daund',    status: 'matched'  }, actor: 'system', created_at: minsAgo(3)   },
    { id: uid(), action: 'emergency.created',        details: { id: 'e3', type: 'delivery', village: 'Baramati', status: 'pending'  }, actor: 'system', created_at: minsAgo(1)   },
    { id: uid(), action: 'emergency.status_changed', details: { id: 'e4', from: 'en_route', to: 'done'                              }, actor: 'system', created_at: minsAgo(110) },
    { id: uid(), action: 'emergency.status_changed', details: { id: 'e5', from: 'en_route', to: 'done'                              }, actor: 'system', created_at: minsAgo(225) },
    { id: uid(), action: 'emergency.status_changed', details: { id: 'e6', from: 'en_route', to: 'done'                              }, actor: 'system', created_at: minsAgo(360) },
  ],
};

module.exports = { state, uid, minsAgo, hoursAgo, daysAgo, VILLAGES };
