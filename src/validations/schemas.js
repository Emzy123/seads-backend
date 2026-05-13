const { z } = require('zod');

// Shared basic schemas
const emailSchema = z.string().email('Invalid email format').trim().toLowerCase();
const phoneSchema = z.string().min(5, 'Phone number is too short').max(20, 'Phone number is too long').trim();
const uidSchema = z.string().min(1, 'Firebase UID is required');
const roleSchemaParam = z.enum(['patient', 'paramedic', 'dispatcher']);

// Auth routes schemas
const loginSchema = z.object({
  email: emailSchema,
  firebase_uid: uidSchema,
});

const registerSchema = z.object({
  email: emailSchema,
  password: z.string().optional(), // Left optional for compatibility, but Flutter uses Phone OTP
  name: z.string().min(1, 'Name is required').trim(),
  role: roleSchemaParam,
  firebase_uid: uidSchema,
  phone: phoneSchema,
});

// Users routes schemas
const roleUpdateSchema = z.object({
  user_id: uidSchema,
  phone_number: phoneSchema,
  role: roleSchemaParam,
  name: z.string().trim().optional(),
});

const profileUpdateSchema = z.object({
  name: z.string().trim().optional(),
  blood_type: z.string().trim().optional(),
  allergies: z.string().trim().optional(),
  conditions: z.string().trim().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one profile field must be provided for update',
});

const fcmTokenSchema = z.object({
  fcm_token: z.string().min(1, 'FCM token is required'),
});

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  phone: phoneSchema,
  relation: z.string().min(1, 'Relation is required').trim(),
});

// Dispatch routes schemas
const dispatchSchema = z.object({
  lat: z.number({ required_error: 'Latitude is required', invalid_type_error: 'Latitude must be a number' }),
  lng: z.number({ required_error: 'Longitude is required', invalid_type_error: 'Longitude must be a number' }),
  patient_id: z.string().min(1, 'Patient ID is required'),
  emergency_type: z.string().min(1, 'Emergency type is required'),
  description: z.string().optional(),
});

// Paramedic & Dispatcher schemas
const locationSchema = z.object({
  lat: z.number({ required_error: 'Latitude is required', invalid_type_error: 'Latitude must be a number' }),
  lng: z.number({ required_error: 'Longitude is required', invalid_type_error: 'Longitude must be a number' }),
});

const incidentStatusSchema = z.object({
  status: z.enum(['pending', 'dispatched', 'en_route', 'on_scene', 'transporting', 'completed', 'cancelled']),
});

module.exports = {
  loginSchema,
  registerSchema,
  roleUpdateSchema,
  profileUpdateSchema,
  fcmTokenSchema,
  contactSchema,
  dispatchSchema,
  locationSchema,
  incidentStatusSchema,
};
