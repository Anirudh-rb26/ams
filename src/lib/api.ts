import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// You should set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env for best practice.
// For direct Postgres connection, you would use DATABASE_URL, but supabase-js expects the API URL and anon key.
// If you only have DATABASE_URL, you need to use a backend or edge function, but for now, we'll show the supabase-js client setup.

// Types
export interface AttendanceSession {
  id: number;
  ip: string;
  checkin: string;
  checkout?: string;
  check_in_system_info?: any;
  check_out_system_info?: any;
  project_id?: number;
  work_hours?: number; // duration in minutes
}

export interface CheckInRequest {
  // screenshot?: string;
  system_info?: any;
}

export interface CheckOutRequest {
  session_id: number;
  // screenshot?: string;
  system_info?: any;
}

export interface CheckInResponse {
  success: boolean;
  session: AttendanceSession;
  message: string;
}

export interface CheckOutResponse {
  success: boolean;
  session: AttendanceSession;
  message: string;
}

export interface ActiveSessionResponse {
  has_active_session: boolean;
  session?: AttendanceSession;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const TABLE_NAME = "attendance";
export const PROJECTS_TABLE = "projects";

export const apiService = {
  async checkIn({ system_info, project_id }: { system_info: any; project_id?: number }) {
    // Always store check-in time as UTC ISO string; DB column should be timestamptz
    const ip = system_info.ipAddress || "";
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([
        {
          ip,
          checkin: new Date().toISOString(), // UTC
          check_in_system_info: system_info,
          project_id: project_id || null,
        },
      ])
      .select()
      .single();
    if (error) throw error;
    return { session: data };
  },

  async checkOut({ session_id, system_info }: { session_id: number; system_info: any }) {
    // Fetch the session to calculate work_hours
    // DB column for checkin should be timestamptz (UTC)
    const { data: session, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select("checkin")
      .eq("id", session_id)
      .single();
    if (fetchError) throw fetchError;
    // Parse checkin and checkout as UTC
    const checkinTime = new Date(session.checkin); // UTC
    const checkoutTime = new Date(); // UTC
    const diffMs = checkoutTime.getTime() - checkinTime.getTime();
    const work_minutes = Math.floor(diffMs / 60000);
    console.log("Checkin (raw):", session.checkin);
    console.log("Checkin (parsed):", checkinTime.toISOString());
    console.log("Checkout:", checkoutTime.toISOString());
    console.log("Diff ms:", diffMs, "Diff min:", work_minutes);
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        checkout: checkoutTime.toISOString(), // UTC
        check_out_system_info: system_info,
        work_hours: work_minutes,
      })
      .eq("id", session_id)
      .select()
      .single();
    if (error) throw error;
    return { session: data };
  },

  async getAttendanceLogs() {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("checkin", { ascending: false });
    if (error) throw error;
    return data as AttendanceSession[];
  },

  async getActiveSession(): Promise<ActiveSessionResponse> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("checkin", { ascending: false })
      .limit(1);
    if (error) throw error;
    return {
      has_active_session: data.length > 0,
      session: data[0] as AttendanceSession,
    };
  },

  async getProjects() {
    const { data, error } = await supabase
      .from(PROJECTS_TABLE)
      .select("id, name, estimated_time")
      .order("name", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async addProject({ name, estimated_time }: { name: string; estimated_time: number }) {
    const { data, error } = await supabase
      .from(PROJECTS_TABLE)
      .insert([{ name, estimated_time }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// Export types for use in other files
export type { AttendanceSession, CheckInRequest, CheckOutRequest };
