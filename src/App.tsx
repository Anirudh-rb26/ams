"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Camera, MapPin, Monitor, Wifi, AlertCircle } from "lucide-react"
import { apiService, AttendanceSession } from "@/lib/api"
import { useNavigate } from "react-router-dom"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"

export default function AttendancePage() {
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [systemInfo, setSystemInfo] = useState<any>(null)
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceSession[]>([])
  const [projectName, setProjectName] = useState("")
  const [projectTime, setProjectTime] = useState("")
  const [projects, setProjects] = useState<{ id: number; name: string; estimated_time: number }[]>([])
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectTime, setNewProjectTime] = useState("")
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // Fetch attendance logs for this IP
    const loadAttendanceLogs = async () => {
      try {
        const logs = await apiService.getAttendanceLogs()
        setAttendanceLogs(logs)
        // Set active session if any
        const active = logs.find((log) => !log.checkout)
        setActiveSession(active || null)
        setIsCheckedIn(!!active)
      } catch (err) {
        setError("Failed to load attendance logs")
        console.error("Error loading attendance logs:", err)
      }
    }

    loadAttendanceLogs()
    getSystemInfo().then(setSystemInfo)

    // Fetch projects from Supabase
    const fetchProjects = async () => {
      try {
        const data = await apiService.getProjects()
        setProjects(data)
      } catch (err) {
        // Optionally handle error
      }
    }
    fetchProjects()

    return () => clearInterval(timer)
  }, [])

  const getSystemInfo = async () => {
    let ipAddress = "Unknown"
    try {
      const response = await fetch("https://api.ipify.org?format=json")
      const data = await response.json()
      ipAddress = data.ip
    } catch (error) {
      console.error("Failed to get IP address:", error)
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
    }
  }

  // Comment out the takeScreenshot function
  // const takeScreenshot = async (): Promise<string> => {
  //   return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
  // }

  // Add new project handler
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName || !newProjectTime) return
    try {
      await apiService.addProject({ name: newProjectName, estimated_time: Number(newProjectTime) })
      setNewProjectName("")
      setNewProjectTime("")
      // Refresh project list
      const data = await apiService.getProjects()
      setProjects(data)
    } catch (err) {
      // Optionally handle error
    }
  }

  const handleCheckIn = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const sysInfo = await getSystemInfo()
      const response = await apiService.checkIn({
        system_info: sysInfo,
        project_id: selectedProjectId ? Number(selectedProjectId) : undefined,
      })
      setActiveSession(response.session)
      setIsCheckedIn(true)
      setSelectedProjectId("")
      // Refresh logs
      const logs = await apiService.getAttendanceLogs()
      setAttendanceLogs(logs)
    } catch (error) {
      console.error("Check-in failed:", error)
      setError("Check-in failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckOut = async () => {
    if (!activeSession) {
      setError("No active session found")
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      // const screenshot = await takeScreenshot()
      const sysInfo = await getSystemInfo()
      await apiService.checkOut({
        session_id: activeSession.id,
        // screenshot,
        system_info: sysInfo,
      })
      setActiveSession(null)
      setIsCheckedIn(false)
      // Refresh logs
      const logs = await apiService.getAttendanceLogs()
      setAttendanceLogs(logs)
    } catch (error) {
      console.error("Check-out failed:", error)
      setError("Check-out failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Attendance System</h1>
            <p className="text-gray-600">IP-based Proof of Concept</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/admin")}>Admin Panel</Button>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Time */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-mono font-bold text-gray-900 mb-2">{currentTime.toLocaleTimeString()}</div>
              <div className="text-lg text-gray-600">
                {currentTime.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New Project Card */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Project/Task</CardTitle>
            <CardDescription>Enter a project name and estimated time (in minutes)</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4 md:flex-row md:items-end" onSubmit={handleAddProject}>
              <input
                type="text"
                placeholder="Project Name"
                className="border rounded px-3 py-2 flex-1"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                required
              />
              <input
                type="number"
                placeholder="Estimated Time (min)"
                className="border rounded px-3 py-2 w-48"
                value={newProjectTime}
                onChange={e => setNewProjectTime(e.target.value)}
                min={1}
                required
              />
              <Button type="submit" className="w-fit">Add Project</Button>
            </form>
            {/* Project List Table */}
            {projects.length > 0 && (
              <div className="mt-6">
                <div className="font-semibold mb-2">Current Projects/Tasks</div>
                <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden shadow-sm bg-white">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Project Name</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Estimated Time (min)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {projects.map((project) => (
                      <tr key={project.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{project.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{project.estimated_time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Current Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant={isCheckedIn ? "default" : "secondary"} className="text-sm">
                  {isCheckedIn ? "Checked In" : "Checked Out"}
                </Badge>
                {activeSession && (
                  <span className="text-sm text-gray-600">
                    Since {new Date(activeSession.checkin).toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2 items-end min-w-[220px]">
                {/* Project/Task Dropdown for Check-In */}
                {!isCheckedIn && (
                  <div className="w-full">
                    <label className="block mb-1 font-medium text-gray-700">Select Project/Task to Check In</label>
                    <div className="rounded border-2 border-blue-400 bg-blue-50 p-2">
                      <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Project/Task" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={String(project.id)}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 w-full justify-end">
                  <Button
                    onClick={handleCheckIn}
                    disabled={isCheckedIn || isLoading || !selectedProjectId}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Check In
                  </Button>
                  <Button onClick={handleCheckOut} disabled={!isCheckedIn || isLoading} variant="destructive">
                    <Clock className="h-4 w-4 mr-2" />
                    Check Out
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Attendance Log
            </CardTitle>
            <CardDescription>All check-in and check-out times for this IP address</CardDescription>
          </CardHeader>
          <CardContent>
            {attendanceLogs.length === 0 ? (
              <div className="text-center text-gray-500">No attendance records yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Check In</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Check Out</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">IP</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Project Name</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Time (min)</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Allocated Time (min)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {attendanceLogs.map((log) => {
                      const project = projects.find(p => p.id === log.project_id)
                      return (
                        <tr key={log.id} className="hover:bg-blue-50 transition-colors">
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{log.checkin ? new Date(log.checkin).toLocaleString() : '-'}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{log.checkout ? new Date(log.checkout).toLocaleString() : <span className="text-gray-400">-</span>}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{log.ip || '-'}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{project ? project.name : '-'}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{typeof log.work_hours === 'number' ? log.work_hours : '-'}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{project ? project.estimated_time : '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
