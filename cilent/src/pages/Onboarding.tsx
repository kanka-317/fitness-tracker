import { useState, type FormEvent } from "react"
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CircleHelp,
  Loader2Icon,
  Scale,
  Target,
  UserRound,
  type LucideIcon,
} from "lucide-react"
import { ageRanges, goalOptions } from "../assets/assets"
import Tooltip from "../components/ui/Tooltip"
import api from "../configs/api"
import { useAppContext } from "../context/AppContext"
import type { UserData } from "../types"

type Goal = "lose" | "maintain" | "gain"

type StepDetail = {
  title: string
  subtitle: string
  icon: LucideIcon
}

type TargetSliderProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  infoText: string
  onChange: (value: number) => void
}

const stepDetails: StepDetail[] = [
  {
    title: "How old are you?",
    subtitle: "This helps us calculate your needs",
    icon: UserRound,
  },
  {
    title: "Your measurements",
    subtitle: "Help us track your progress",
    icon: Scale,
  },
  {
    title: "What's your goal?",
    subtitle: "We'll tailor your experience",
    icon: Target,
  },
]

const getTargetPreset = (age: number, goal: Goal) => {
  const baseRange = ageRanges.find((range) => age <= range.max) ?? ageRanges[ageRanges.length - 1]

  const intakeAdjustment = {
    lose: -250,
    maintain: 0,
    gain: 250,
  }[goal]

  const burnAdjustment = {
    lose: 75,
    maintain: 0,
    gain: -50,
  }[goal]

  return {
    dailyCalorieIntake: Math.max(1400, baseRange.maintain + intakeAdjustment),
    dailyCalorieBurn: Math.max(250, baseRange.burn + burnAdjustment),
  }
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

const TargetSlider = ({
  label,
  value,
  min,
  max,
  step = 25,
  infoText,
  onChange,
}: TargetSliderProps) => {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="onboarding-target-slider">
      <div className="onboarding-target-header">
        <div className="onboarding-target-label">
          <span>{label}</span>
          <Tooltip content={infoText}>
            <CircleHelp className="onboarding-help-icon" size={15} />
          </Tooltip>
        </div>
        <span className="onboarding-target-value">{value} kcal</span>
      </div>

      <div className="onboarding-range">
        <div className="onboarding-range-fill" style={{ width: `${percentage}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="onboarding-range-input"
        />
        <div
          className="onboarding-range-thumb"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
    </div>
  )
}

const Onboarding = () => {
  const { user, fetchUser, setOnboardingCompleted } = useAppContext()

  const initialGoal: Goal = user?.goal ?? "maintain"
  const initialAge = user?.age && user.age > 0 ? user.age : 30
  const presetTargets = getTargetPreset(initialAge, initialGoal)

  const [step, setStep] = useState(1)
  const [age, setAge] = useState(user?.age ? String(user.age) : "")
  const [weight, setWeight] = useState(user?.weight ? String(user.weight) : "")
  const [height, setHeight] = useState(user?.height ? String(user.height) : "")
  const [goal, setGoal] = useState<Goal>(initialGoal)
  const [dailyCalorieIntake, setDailyCalorieIntake] = useState(
    user?.dailyCalorieIntake ?? presetTargets.dailyCalorieIntake,
  )
  const [dailyCalorieBurn, setDailyCalorieBurn] = useState(
    user?.dailyCalorieBurn ?? presetTargets.dailyCalorieBurn,
  )
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const currentStep = stepDetails[step - 1]

  const syncTargets = (nextAge: string, nextGoal: Goal) => {
    const parsedAge = Number(nextAge)
    const safeAge = Number.isFinite(parsedAge) && parsedAge > 0 ? parsedAge : 30
    const targets = getTargetPreset(safeAge, nextGoal)

    setDailyCalorieIntake(targets.dailyCalorieIntake)
    setDailyCalorieBurn(targets.dailyCalorieBurn)
  }

  const handleAgeChange = (value: string) => {
    setAge(value)
    syncTargets(value, goal)
  }

  const handleGoalChange = (nextGoal: Goal) => {
    setGoal(nextGoal)
    syncTargets(age, nextGoal)
  }

  const validateCurrentStep = () => {
    const parsedAge = Number(age)
    const parsedWeight = Number(weight)
    const parsedHeight = Number(height)

    if (step === 1) {
      if (!age || Number.isNaN(parsedAge) || parsedAge < 10 || parsedAge > 120) {
        setError("Please enter an age between 10 and 120.")
        return false
      }
    }

    if (step === 2) {
      if (!weight || Number.isNaN(parsedWeight) || parsedWeight < 20 || parsedWeight > 350) {
        setError("Please enter a valid weight between 20 and 350 kg.")
        return false
      }

      if (height && (Number.isNaN(parsedHeight) || parsedHeight < 90 || parsedHeight > 260)) {
        setError("Height should be between 90 and 260 cm, or left empty.")
        return false
      }
    }

    setError("")
    return true
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!validateCurrentStep()) {
      return
    }

    if (step < 3) {
      setStep((prev) => prev + 1)
      return
    }

    if (!user) {
      setError("Your session has expired. Please log in again.")
      return
    }

    setIsSaving(true)
    setError("")

    try {
      const parsedAge = Number(age)
      const parsedWeight = Number(weight)
      const parsedHeight = Number(height)

      const updates: Partial<UserData> & {
        dailyCalorietake: number
        height: number | null
      } = {
        age: parsedAge,
        weight: parsedWeight,
        goal,
        dailyCalorieIntake,
        dailyCalorietake: dailyCalorieIntake,
        dailyCalorieBurn,
        height:
          height && Number.isFinite(parsedHeight) && parsedHeight > 0
            ? parsedHeight
            : null,
      }

      await api.put(`/api/users/${user.id}`, updates)
      setOnboardingCompleted(true)
      await fetchUser(user.token)
    } catch (error) {
      setError(
        getApiErrorMessage(
          error,
          "Couldn't save your onboarding details. Please try again.",
        ),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    setError("")
    setStep((prev) => Math.max(1, prev - 1))
  }

  const StepIcon = currentStep.icon

  return (
    <div className="onboarding-shell">
      <div className="onboarding-shell-glow onboarding-shell-glow-one" />
      <div className="onboarding-shell-glow onboarding-shell-glow-two" />

      <form className="onboarding-container" onSubmit={handleSubmit}>
        <div className="onboarding-wrapper">
          <div className="onboarding-brand">
            <span className="onboarding-brand-icon">
              <Activity size={16} />
            </span>
            <div className="onboarding-brand-copy">
              <h1>FitTrack</h1>
              <p>Let's personalize your experience</p>
            </div>
          </div>

          <div className="onboarding-progress">
            {[1, 2, 3].map((segment) => (
              <span
                key={segment}
                className={`onboarding-progress-segment ${segment <= step ? "is-active" : ""}`}
              />
            ))}
          </div>

          <p className="onboarding-step-counter">Step {step} of 3</p>

          <div className="onboarding-step-card">
            <span className="onboarding-step-icon">
              <StepIcon size={20} />
            </span>
            <div>
              <h2>{currentStep.title}</h2>
              <p>{currentStep.subtitle}</p>
            </div>
          </div>

          {step === 1 && (
            <div className="onboarding-form-grid">
              <label className="onboarding-field">
                <span className="onboarding-field-label">
                  Age <span className="onboarding-required">*</span>
                </span>
                <input
                  type="number"
                  min="10"
                  max="120"
                  value={age}
                  onChange={(event) => handleAgeChange(event.target.value)}
                  className="onboarding-input"
                  autoFocus
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-form-grid">
              <label className="onboarding-field">
                <span className="onboarding-field-label">
                  Weight (kg) <span className="onboarding-required">*</span>
                </span>
                <input
                  type="number"
                  min="20"
                  max="350"
                  step="0.1"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  className="onboarding-input"
                  autoFocus
                />
              </label>

              <label className="onboarding-field">
                <span className="onboarding-field-label">Height (cm) - Optional</span>
                <input
                  type="number"
                  min="90"
                  max="260"
                  value={height}
                  onChange={(event) => setHeight(event.target.value)}
                  className="onboarding-input"
                />
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-form-grid">
              <div className="onboarding-goal-list">
                {goalOptions.map((option) => {
                  const optionValue = option.value as Goal

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`onboarding-goal-option ${goal === optionValue ? "is-active" : ""}`}
                      onClick={() => handleGoalChange(optionValue)}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>

              <div className="onboarding-divider" />

              <div className="onboarding-targets">
                <h3>Daily Targets</h3>

                <TargetSlider
                  label="Daily Calorie Intake"
                  value={dailyCalorieIntake}
                  min={1400}
                  max={3200}
                  step={25}
                  infoText="Your suggested calorie intake adjusts with age and goal, and you can fine-tune it here."
                  onChange={setDailyCalorieIntake}
                />

                <TargetSlider
                  label="Daily Calorie Burn"
                  value={dailyCalorieBurn}
                  min={250}
                  max={900}
                  step={25}
                  infoText="Set how many calories you want to burn through activity each day."
                  onChange={setDailyCalorieBurn}
                />
              </div>
            </div>
          )}

          {error && <p className="onboarding-error">{error}</p>}
        </div>

        <div className="onboarding-actions">
          {step > 1 && (
            <button type="button" onClick={handleBack} className="onboarding-secondary-button">
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          )}

          <button type="submit" className="onboarding-primary-button" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>{step === 3 ? "Get Started" : "Continue"}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default Onboarding
