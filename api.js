const BASE = '/api';

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

async function patch(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

async function del(path) {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export const api = {
  // Emergencies
  getEmergencies:       ()         => get('/emergencies'),
  getActiveEmergencies: ()         => get('/emergencies/active'),
  getEmergency:         (id)       => get(`/emergencies/${id}`),
  createEmergency:      (body)     => post('/emergencies', body),
  updateEmergency:      (id, body) => patch(`/emergencies/${id}`, body),
  assignResponder:      (id, responder_id) => post(`/emergencies/${id}/assign`, { responder_id }),
  searchEmergencies:    (params)   => get(`/emergencies/search?${new URLSearchParams(params)}`),
  exportEmergenciesUrl: ()         => '/api/emergencies/export',

  // Responders
  getResponders:           ()              => get('/responders'),
  getResponderHistory:     (id)            => get(`/responders/${id}/history`),
  updateResponderLocation: (id, lat, lng)  => patch(`/responders/${id}/location`, { lat, lng }),
  updateResponderAvail:    (id, available) => patch(`/responders/${id}/availability`, { is_available: available }),

  // Hospitals
  getHospitals:        ()         => get('/hospitals'),
  createHospital:      (body)     => post('/hospitals', body),
  getHospitalIncoming: (id)       => get(`/hospitals/${id}/incoming`),
  updateBeds:          (id, beds) => patch(`/hospitals/${id}/beds`, { beds_available: beds }),

  // Analytics
  getAnalytics: () => get('/analytics'),

  // Triage
  triage:       (body)         => post('/triage', body),
  getTriageLog: (emergency_id) => get(`/triage/${emergency_id}`),

  // Earnings
  getEarnings:        ()          => get('/earnings'),
  getEarningsSummary: ()          => get('/earnings/summary'),
  completeRide:       (ride_id)   => post(`/earnings/complete/${ride_id}`, {}),

  // Relay
  getRelay:    (emergency_id) => get(`/relay${emergency_id ? `?emergency_id=${emergency_id}` : ''}`),
  planRelay:   (body)         => post('/relay/plan', body),
  updateRelay: (id, body)     => patch(`/relay/${id}`, body),

  // Training
  getTraining:      ()         => get('/training'),
  getTrainingModule:(id)       => get(`/training/${id}`),
  completeTraining: (id, body) => post(`/training/${id}/complete`, body),
  getProgress:      (user_id)  => get(`/training/progress/${user_id}`),

  // Notifications
  getNotifications:     ()    => get('/notifications'),
  readNotification:     (id)  => patch(`/notifications/${id}/read`, {}),
  readAllNotifications: ()    => post('/notifications/read-all', {}),
  deleteNotification:   (id)  => del(`/notifications/${id}`),

  // Users
  getUsers:       (role)   => get(`/users${role ? `?role=${role}` : ''}`),
  getUser:        (id)     => get(`/users/${id}`),
  createUser:     (body)   => post('/users', body),
  updateUser:     (id, body) => patch(`/users/${id}`, body),

  // SMS
  sendSms: (body) => post('/sms/send', body),

  // Audit
  getAuditLog: (action) => get(`/audit${action ? `?action=${action}` : ''}`),

  // Health
  getHealth: () => get('/health'),

  // Timeline
  getTimeline: (emergency_id) => get(`/emergencies/${emergency_id}/timeline`),
};
