import {
  Activity,
  Bike,
  Clock3,
  Dumbbell,
  Flame,
  Footprints,
  Leaf,
  LoaderCircle,
  Plus,
  Trash2,
  Waves,
  type LucideIcon,
} from "lucide-react"
import { useState, type FormEvent } from "react"
import api from "../configs/api"
import { useAppContext } from "../context/AppContext"
import type { ActivityEntry } from "../types"

type QuickActivityPreset = {
  name: string
  duration: number
  caloriesPerMinute: number
  icon: LucideIcon
}

const quickActivityPresets: QuickActivityPreset[] = [
  { name: "Walking", duration: 30, caloriesPerMinute: 5, icon: Footprints },
  { name: "Running", duration: 30, caloriesPerMinute: 11, icon: Activity },
  { name: "Cycling", duration: 10, caloriesPerMinute: 8, icon: Bike },
  { name: "Swimming", duration: 20, caloriesPerMinute: 10, icon: Waves },
  { name: "Yoga", duration: 20, caloriesPerMinute: 4, icon: Leaf },
  {
    name: "Weight Training",
    duration: 20,
    caloriesPerMinute: 6,
    icon: Dumbbell,
  },
]
const activityLogsPathCandidates = ["/api/activitiy-logs", "/api/activity-logs"]
const canTryNextActivityLogsPath = (status?: number) => status === 404 || status === 405

const getEntryDate = (entry: ActivityEntry) =>
  entry.createdAt?.slice(0, 10) ?? entry.date

const getEntryTimestamp = (entry: ActivityEntry) =>
  Date.parse(entry.createdAt ?? `${getEntryDate(entry)}T00:00:00`)

const formatLoggedTime = (entry: ActivityEntry) => {
  const date = new Date(entry.createdAt ?? `${getEntryDate(entry)}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return "Logged today"
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === "object") {
    const responseMessage =
      "response" in error &&
      typeof (
        error as {
          response?: {
            data?: {
              error?: {
                message?: string
              }
            }
          }
        }
      ).response?.data?.error?.message === "string"
        ? (
            error as {
              response?: {
                data?: {
                  error?: {
                    message?: string
                  }
                }
              }
            }
          ).response?.data?.error?.message
        : ""

    if (responseMessage) {
      return responseMessage
    }

    const message =
      "message" in error && typeof (error as { message?: string }).message === "string"
        ? (error as { message?: string }).message
        : ""

    if (message) {
      return message
    }
  }

  return fallback
}

const getCreatedActivityEntry = (payload: unknown): ActivityEntry | null => {
  if (payload && typeof payload === "object") {
    const nestedData = (payload as { data?: unknown }).data

    if (nestedData && typeof nestedData === "object" && !Array.isArray(nestedData)) {
      return nestedData as ActivityEntry
    }

    if (!Array.isArray(payload)) {
      return payload as ActivityEntry
    }
  }

  return null
}

const ActivityLog = () => {
  const { allActivityLogs, setAllActivityLogs } = useAppContext()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSavingCustom, setIsSavingCustom] = useState(false)
  const [savingPreset, setSavingPreset] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    tone: "error" | "success"
    message: string
  } | null>(null)
  const [formState, setFormState] = useState({
    name: "",
    duration: "",
    calories: "",
  })

  const today = new Date().toISOString().split("T")[0]
  const todayActivities = allActivityLogs
    .filter((entry) => getEntryDate(entry) === today)
    .sort((a, b) => getEntryTimestamp(b) - getEntryTimestamp(a))

  const totalActiveMinutes = todayActivities.reduce(
    (sum, entry) => sum + entry.duration,
    0,
  )

  const createActivityLog = async (payload: {
    name: string
    duration: number
    calories: number
  }) => {
    for (const path of activityLogsPathCandidates) {
      try {
        const { data } = await api.post(path, { data: payload })
        const createdEntry = getCreatedActivityEntry(data)

        if (!createdEntry) {
          throw new Error("The server returned an empty activity entry.")
        }

        return createdEntry
      } catch (error) {
        const status =
          typeof error === "object" && error !== null && "response" in error
            ? (error as { response?: { status?: number } }).response?.status
            : undefined

        if (
          !canTryNextActivityLogsPath(status) ||
          path === activityLogsPathCandidates[activityLogsPathCandidates.length - 1]
        ) {
          throw error
        }
      }
    }

    throw new Error("Couldn't find an activity log endpoint.")
  }

  const deleteActivityLog = async (documentId: string) => {
    for (const path of activityLogsPathCandidates) {
      try {
        await api.delete(`${path}/${documentId}`)
        return
      } catch (error) {
        const status =
          typeof error === "object" && error !== null && "response" in error
            ? (error as { response?: { status?: number } }).response?.status
            : undefined

        if (
          !canTryNextActivityLogsPath(status) ||
          path === activityLogsPathCandidates[activityLogsPathCandidates.length - 1]
        ) {
          throw error
        }
      }
    }
  }

  const addActivity = async (payload: {
    name: string
    duration: number
    calories: number
  }) => {
    const createdEntry = await createActivityLog(payload)
    setAllActivityLogs((current) => [createdEntry, ...current])
    return createdEntry
  }

  const handleQuickAdd = async (preset: QuickActivityPreset) => {
    setSavingPreset(preset.name)
    setFeedback(null)

    try {
      const calories = preset.duration * preset.caloriesPerMinute
      await addActivity({
        name: preset.name,
        duration: preset.duration,
        calories,
      })
      setFeedback({
        tone: "success",
        message: `${preset.name} added for ${preset.duration} minutes.`,
      })
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getApiErrorMessage(
          error,
          "Couldn't add that activity right now. Please try again.",
        ),
      })
    } finally {
      setSavingPreset(null)
    }
  }

  const handleCustomSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const name = formState.name.trim()
    const duration = Number(formState.duration)
    const calories = Number(formState.calories)

    if (
      !name ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      !Number.isFinite(calories) ||
      calories <= 0
    ) {
      setFeedback({
        tone: "error",
        message: "Add a valid name, duration, and calories value greater than 0.",
      })
      return
    }

    setIsSavingCustom(true)
    setFeedback(null)

    try {
      await addActivity({ name, duration, calories })
      setFormState({
        name: "",
        duration: "",
        calories: "",
      })
      setIsFormOpen(false)
      setFeedback({
        tone: "success",
        message: `${name} added to today's activity log.`,
      })
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getApiErrorMessage(
          error,
          "Couldn't save this activity right now. Please try again.",
        ),
      })
    } finally {
      setIsSavingCustom(false)
    }
  }

  const handleDelete = async (documentId?: string) => {
    if (!documentId) {
      return
    }

    setDeletingId(documentId)
    setFeedback(null)

    try {
      await deleteActivityLog(documentId)
      setAllActivityLogs((current) =>
        current.filter((entry) => entry.documentId !== documentId),
      )
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getApiErrorMessage(
          error,
          "This activity couldn't be deleted right now. Please try again.",
        ),
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="activity-log-shell">
      <header className="activity-log-header">
        <div className="activity-log-header-copy">
          <h1>Activity Log</h1>
          <p>Track your workouts</p>
        </div>

        <div className="activity-log-total">
          <span>Active Today</span>
          <strong>{totalActiveMinutes} min</strong>
        </div>
      </header>

      <div className="activity-log-grid">
        <div className="activity-log-left-column">
          <section className="activity-log-card">
            <div className="activity-log-card-header">
              <h2>Quick Add</h2>
            </div>

            <div className="activity-log-chip-grid">
              {quickActivityPresets.map((preset) => {
                const Icon = preset.icon
                const isSaving = savingPreset === preset.name

                return (
                  <button
                    key={preset.name}
                    type="button"
                    className="activity-log-chip"
                    onClick={() => handleQuickAdd(preset)}
                    disabled={Boolean(savingPreset) || isSavingCustom}
                  >
                    {isSaving ? (
                      <LoaderCircle size={14} className="animate-spin" />
                    ) : (
                      <Icon size={14} />
                    )}
                    <span>{preset.name}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <button
            type="button"
            className="activity-log-action"
            onClick={() => {
              setIsFormOpen(true)
              setFeedback(null)
            }}
          >
            <Plus size={18} />
            <span>Add Custom Activity</span>
          </button>

          {isFormOpen && (
            <form className="activity-log-form" onSubmit={handleCustomSubmit}>
              <div className="activity-log-form-header">
                <div>
                  <h3>Add a custom workout</h3>
                  <p>
                    Log your own session with the exact duration and calories
                    burned.
                  </p>
                </div>
              </div>

              <div className="activity-log-form-grid">
                <label className="activity-log-field activity-log-field-wide">
                  <span>Activity name</span>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Ex. Evening Walk"
                    className="activity-log-input"
                  />
                </label>

                <label className="activity-log-field">
                  <span>Duration (min)</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formState.duration}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        duration: event.target.value,
                      }))
                    }
                    placeholder="30"
                    className="activity-log-input"
                  />
                </label>

                <label className="activity-log-field">
                  <span>Calories burned</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formState.calories}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        calories: event.target.value,
                      }))
                    }
                    placeholder="180"
                    className="activity-log-input"
                  />
                </label>
              </div>

              <div className="activity-log-form-actions">
                <button
                  type="button"
                  className="activity-log-secondary-button"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSavingCustom}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="activity-log-primary-button"
                  disabled={isSavingCustom}
                >
                  {isSavingCustom ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      <span>Saving activity...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Save activity</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {feedback && (
            <p
              className={`activity-log-feedback ${feedback.tone === "error" ? "is-error" : "is-success"}`}
            >
              {feedback.message}
            </p>
          )}
        </div>

        <div className="activity-log-right-column">
          <section className="activity-log-summary-card">
            <div className="activity-log-summary-header">
              <div className="activity-log-summary-title">
                <span className="activity-log-summary-badge">
                  <Activity size={18} />
                </span>

                <div>
                  <h2>Today's Activities</h2>
                  <p>{todayActivities.length} logged</p>
                </div>
              </div>
            </div>

            <div className="activity-log-list">
              {todayActivities.length > 0 ? (
                todayActivities.map((entry) => {
                  const isDeleting = deletingId === entry.documentId

                  return (
                    <div
                      key={entry.documentId ?? String(entry.id)}
                      className="activity-log-row"
                    >
                      <div className="activity-log-row-left">
                        <span className="activity-log-row-icon">
                          <Clock3 size={16} />
                        </span>

                        <div className="activity-log-row-copy">
                          <strong>{entry.name}</strong>
                          <span>{formatLoggedTime(entry)}</span>
                        </div>
                      </div>

                      <div className="activity-log-row-right">
                        <div className="activity-log-row-metrics">
                          <strong>{entry.duration} min</strong>
                          <span>{entry.calories} kcal</span>
                        </div>

                        <button
                          type="button"
                          className="activity-log-delete"
                          onClick={() => handleDelete(entry.documentId)}
                          disabled={isDeleting || !entry.documentId}
                          aria-label={`Delete ${entry.name}`}
                        >
                          {isDeleting ? (
                            <LoaderCircle size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="activity-log-empty-state">
                  <span className="activity-log-empty-icon">
                    <Flame size={20} />
                  </span>
                  <h3>No activities logged today</h3>
                  <p>
                    Use the quick-add buttons or create a custom workout to
                    start filling today's tracker.
                  </p>
                </div>
              )}
            </div>

            <footer className="activity-log-footer">
              <span>Total Active Time</span>
              <strong>{totalActiveMinutes} minutes</strong>
            </footer>
          </section>
        </div>
      </div>
    </section>
  )
}

export default ActivityLog
