import { eq, and, gte, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, patients, dailyLogs, alerts, familyAccess, appSettings } from "../drizzle/schema";
import type { InsertPatient, InsertDailyLog, InsertAlert, InsertFamilyAccess } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER (framework) ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ APP SETTINGS (PIN) ============

export async function getAppSettings() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(appSettings).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function saveAppSettings(pinHash: string, caregiverName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete existing and insert new
  await db.delete(appSettings);
  await db.insert(appSettings).values({ pinHash, caregiverName });
}

// ============ PATIENTS ============

export async function getPatient() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(patients).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function savePatient(data: Omit<InsertPatient, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(patients).limit(1);
  if (existing.length > 0) {
    await db.update(patients).set(data).where(eq(patients.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(patients).values(data);
    return result[0].insertId;
  }
}

// ============ DAILY LOGS ============

export async function getDailyLogs(patientId: number, days: number = 14) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split('T')[0];
  
  const result = await db.select().from(dailyLogs)
    .where(and(eq(dailyLogs.patientId, patientId), gte(dailyLogs.logDate, startStr)))
    .orderBy(asc(dailyLogs.logDate));
  return result;
}

export async function saveDailyLog(data: Omit<InsertDailyLog, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if log exists for today
  const existing = await db.select().from(dailyLogs)
    .where(and(eq(dailyLogs.patientId, data.patientId), eq(dailyLogs.logDate, data.logDate)))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(dailyLogs).set(data).where(eq(dailyLogs.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(dailyLogs).values(data);
    return result[0].insertId;
  }
}

// ============ ALERTS ============

export async function getAlerts(patientId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(alerts)
    .where(eq(alerts.patientId, patientId))
    .orderBy(desc(alerts.createdAt))
    .limit(limit);
  return result;
}

export async function saveAlert(data: Omit<InsertAlert, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(alerts).values(data);
}

// ============ FAMILY ACCESS ============

export async function getFamilyMembers(patientId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(familyAccess).where(eq(familyAccess.patientId, patientId));
}

export async function addFamilyMember(data: Omit<InsertFamilyAccess, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(familyAccess).values(data);
}

export async function getFamilyAccessByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(familyAccess).where(eq(familyAccess.accessCode, code)).limit(1);
  return result.length > 0 ? result[0] : null;
}
