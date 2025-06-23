// Types
export interface AttendanceSession {
  id: string;
  ip_address: string;
  checkInTime: Date;
  checkOutTime?: Date;
  checkInData: {
    screenshot: string;
    systemInfo: any;
  };
  checkOutData?: {
    screenshot: string;
    systemInfo: any;
  };
}

// In-memory storage for demo
const attendanceSessions: AttendanceSession[] = [];

// Utility functions
const generateId = () => Math.random().toString(36).substr(2, 9);

// System Information Functions
export const getSystemInfo = async () => {
  let ipAddress = "Unknown";
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    ipAddress = data.ip;
  } catch (error) {
    console.error("Failed to get IP address:", error);
  }
  return {
    ipAddress,
    userAgent: navigator.userAgent,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    systemTime: new Date().toISOString(),
    screenResolution: `${screen.width}x${screen.height}`,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    onlineStatus: navigator.onLine,
  };
};

// Screenshot function (simplified for demo)
export const takeScreenshot = async (): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
      );
    }, 1000);
  });
};

// Attendance session demo functions (optional, for UI mockup)
export const getAttendanceSessions = (): AttendanceSession[] => attendanceSessions;
export const addAttendanceSession = (session: AttendanceSession) => {
  attendanceSessions.push(session);
};
