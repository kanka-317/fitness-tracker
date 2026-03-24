import {
  CalendarDays,
  LoaderCircle,
  LogOut,
  Pencil,
  Ruler,
  Save,
  Scale,
  Target,
  UserRound,
  X,
} from "lucide-react"
import { useState, type FormEvent } from "react"
import { goalLabels, goalOptions } from "../assets/assets"
import api from "../configs/api"
import { useAppContext } from "../context/AppContext"
import type { UserData } from "../types"

type Goal = "lose" | "maintain" | "gain"

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

const Profile = () => {
  const { user, fetchUser, allFoodLogs, allActivityLogs, logout } = useAppContext()

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{
    tone: "error" | "success"
    message: string
  } | null>(null)
  const [formState, setFormState] = useState({
    age: user?.age ? String(user.age) : "",
    weight: user?.weight ? String(user.weight) : "",
    height: user?.height ? String(user.height) : "",
    goal: (user?.goal ?? "maintain") as Goal,
  })

  if (!user) {
    return null
  }

  const memberSince = user.createdAt
    ? new Intl.DateTimeFormat("en-GB").format(new Date(user.createdAt))
    : "Today"

  const profileRows = [
    {
      label: "Age",
      value: user.age ? `${user.age} years` : "Not set",
      icon: CalendarDays,
      accentClass: "is-age",
    },
    {
      label: "Weight",
      value: user.weight ? `${user.weight} kg` : "Not set",
      icon: Scale,
      accentClass: "is-weight",
    },
    {
      label: "Height",
      value: user.height ? `${user.height} cm` : "Not set",
      icon: Ruler,
      accentClass: "is-height",
    },
    {
      label: "Goal",
      value: goalLabels[user.goal ?? "maintain"],
      icon: Target,
      accentClass: "is-goal",
    },
  ]

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const age = Number(formState.age)
    const weight = Number(formState.weight)
    const height = Number(formState.height)

    if (!Number.isFinite(age) || age < 10 || age > 120) {
      setFeedback({
        tone: "error",
        message: "Age should be between 10 and 120.",
      })
      return
    }

    if (!Number.isFinite(weight) || weight < 20 || weight > 350) {
      setFeedback({
        tone: "error",
        message: "Weight should be between 20 and 350 kg.",
      })
      return
    }

    if (formState.height && (!Number.isFinite(height) || height < 90 || height > 260)) {
      setFeedback({
        tone: "error",
        message: "Height should be between 90 and 260 cm.",
      })
      return
    }

    setIsSaving(true)
    setFeedback(null)

    try {
      const updates: Partial<UserData> = {
        age,
        weight,
        goal: formState.goal,
        height: formState.height ? height : undefined,
      }

      await api.put(`/api/users/${user.id}`, updates)
      await fetchUser(user.token)
      setIsEditing(false)
      setFeedback({
        tone: "success",
        message: "Profile updated successfully.",
      })
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getApiErrorMessage(
          error,
          "Couldn't save your profile right now. Please try again.",
        ),
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditOpen = () => {
    setFormState({
      age: user.age ? String(user.age) : "",
      weight: user.weight ? String(user.weight) : "",
      height: user.height ? String(user.height) : "",
      goal: (user.goal ?? "maintain") as Goal,
    })
    setFeedback(null)
    setIsEditing(true)
  }

  return (
    <section className="profile-shell">
      <header className="profile-header">
        <div className="profile-header-copy">
          <h1>Profile</h1>
          <p>Manage your settings</p>
        </div>
      </header>

      <div className="profile-layout">
        <section className="profile-card">
          <div className="profile-card-heading">
            <span className="profile-avatar-badge">
              <UserRound size={18} />
            </span>

            <div>
              <h2>Your Profile</h2>
              <p>Member since {memberSince}</p>
            </div>
          </div>

          {!isEditing ? (
            <>
              <div className="profile-info-list">
                {profileRows.map((row) => {
                  const Icon = row.icon

                  return (
                    <div key={row.label} className="profile-info-card">
                      <div className="profile-info-card-copy">
                        <span className={`profile-info-icon ${row.accentClass}`}>
                          <Icon size={15} />
                        </span>

                        <div>
                          <p>{row.label}</p>
                          <strong>{row.value}</strong>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <button
                type="button"
                className="profile-edit-button"
                onClick={handleEditOpen}
              >
                <Pencil size={16} />
                <span>Edit Profile</span>
              </button>
            </>
          ) : (
            <form className="profile-form" onSubmit={handleSubmit}>
              <div className="profile-form-grid">
                <label className="profile-field">
                  <span>Age</span>
                  <input
                    type="number"
                    min="10"
                    max="120"
                    value={formState.age}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        age: event.target.value,
                      }))
                    }
                    className="profile-input"
                  />
                </label>

                <label className="profile-field">
                  <span>Weight (kg)</span>
                  <input
                    type="number"
                    min="20"
                    max="350"
                    step="0.1"
                    value={formState.weight}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        weight: event.target.value,
                      }))
                    }
                    className="profile-input"
                  />
                </label>

                <label className="profile-field">
                  <span>Height (cm)</span>
                  <input
                    type="number"
                    min="90"
                    max="260"
                    value={formState.height}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        height: event.target.value,
                      }))
                    }
                    className="profile-input"
                  />
                </label>

                <label className="profile-field">
                  <span>Goal</span>
                  <select
                    value={formState.goal}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        goal: event.target.value as Goal,
                      }))
                    }
                    className="profile-select"
                  >
                    {goalOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="profile-form-actions">
                <button
                  type="button"
                  className="profile-cancel-button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  <X size={16} />
                  <span>Cancel</span>
                </button>

                <button
                  type="submit"
                  className="profile-save-button"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save Profile</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {feedback && (
            <p className={`profile-feedback ${feedback.tone === "error" ? "is-error" : "is-success"}`}>
              {feedback.message}
            </p>
          )}
        </section>

        <div className="profile-side-column">
          <section className="profile-stats-card">
            <div className="profile-stats-heading">
              <h2>Your Stats</h2>
            </div>

            <div className="profile-stats-grid">
              <div className="profile-stat-tile is-food">
                <strong>{allFoodLogs.length}</strong>
                <span>Food entries</span>
              </div>

              <div className="profile-stat-tile is-activity">
                <strong>{allActivityLogs.length}</strong>
                <span>Activities</span>
              </div>
            </div>
          </section>

          <button type="button" className="profile-logout-button" onClick={logout}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </section>
  )
}

export default Profile
