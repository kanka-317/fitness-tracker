import {
  Coffee,
  Cookie,
  Image,
  LoaderCircle,
  Moon,
  Plus,
  Sparkles,
  SunMedium,
  Trash2,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react"
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react"
import api from "../configs/api"
import { useAppContext } from "../context/AppContext"
import type { FoodEntry, FoodImageAnalysisResult } from "../types"

type MealType = FoodEntry["mealType"]

const mealOrder: MealType[] = ["breakfast", "lunch", "dinner", "snack"]
const maxImageSizeBytes = 4 * 1024 * 1024
const supportedImageTypes = ["image/jpeg", "image/png", "image/webp"]
const confidenceLabels: Record<FoodImageAnalysisResult["confidence"], string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
}

const mealMeta: Record<
  MealType,
  { label: string; icon: LucideIcon; accentClass: string }
> = {
  breakfast: {
    label: "Breakfast",
    icon: Coffee,
    accentClass: "is-breakfast",
  },
  lunch: {
    label: "Lunch",
    icon: SunMedium,
    accentClass: "is-lunch",
  },
  dinner: {
    label: "Dinner",
    icon: Moon,
    accentClass: "is-dinner",
  },
  snack: {
    label: "Snack",
    icon: Cookie,
    accentClass: "is-snack",
  },
}

const getEntryDate = (entry: FoodEntry) =>
  entry.createdAt?.slice(0, 10) ?? entry.date

const getEntryTimestamp = (entry: FoodEntry) =>
  Date.parse(entry.createdAt ?? `${getEntryDate(entry)}T00:00:00`)

const formatFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`
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

const getCreatedFoodEntry = (payload: unknown): FoodEntry | null => {
  if (payload && typeof payload === "object") {
    const nestedData = (payload as { data?: unknown }).data

    if (nestedData && typeof nestedData === "object" && !Array.isArray(nestedData)) {
      return nestedData as FoodEntry
    }

    if (!Array.isArray(payload)) {
      return payload as FoodEntry
    }
  }

  return null
}

const getAnalysisResult = (payload: unknown): FoodImageAnalysisResult | null => {
  if (payload && typeof payload === "object") {
    const nestedData = (payload as { data?: unknown }).data

    if (
      nestedData &&
      typeof nestedData === "object" &&
      !Array.isArray(nestedData) &&
      "result" in nestedData
    ) {
      const result = (nestedData as { result?: unknown }).result

      if (result && typeof result === "object" && !Array.isArray(result)) {
        return result as FoodImageAnalysisResult
      }
    }

    if ("result" in payload) {
      const result = (payload as { result?: unknown }).result

      if (result && typeof result === "object" && !Array.isArray(result)) {
        return result as FoodImageAnalysisResult
      }
    }
  }

  return null
}

const getMealTypeForHour = (hour: number): MealType => {
  if (hour < 12) {
    return "breakfast"
  }

  if (hour < 16) {
    return "lunch"
  }

  if (hour < 18) {
    return "snack"
  }

  return "dinner"
}

const FoodLog = () => {
  const { allFoodLogs, setAllFoodLogs } = useAppContext()
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSnapping, setIsSnapping] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState<
    string | null
  >(null)
  const [analysisResult, setAnalysisResult] =
    useState<FoodImageAnalysisResult | null>(null)
  const [feedback, setFeedback] = useState<{
    tone: "error" | "success"
    message: string
  } | null>(null)
  const [formState, setFormState] = useState<{
    name: string
    calories: string
    mealType: MealType
  }>({
    name: "",
    calories: "",
    mealType: "breakfast",
  })

  const today = new Date().toISOString().split("T")[0]
  const todayFood = allFoodLogs.filter(
    (entry) => getEntryDate(entry) === today,
  )
  const totalCalories = todayFood.reduce((sum, entry) => sum + entry.calories, 0)
  const selectedMeal = mealMeta[formState.mealType]

  useEffect(() => {
    if (!selectedImageFile) {
      setSelectedImagePreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(selectedImageFile)
    setSelectedImagePreviewUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [selectedImageFile])

  const mealGroups = mealOrder
    .map((mealType) => {
      const entries = todayFood
        .filter((entry) => entry.mealType === mealType)
        .sort((a, b) => getEntryTimestamp(b) - getEntryTimestamp(a))

      return {
        mealType,
        entries,
        calories: entries.reduce((sum, entry) => sum + entry.calories, 0),
      }
    })
    .filter((group) => group.entries.length > 0)

  const openFormForMeal = (mealType: MealType) => {
    setFormState((current) => ({ ...current, mealType }))
    setIsFormOpen(true)
    setFeedback(null)
  }

  const clearAiSelection = (options: { keepAnalysis?: boolean } = {}) => {
    setSelectedImageFile(null)

    if (!options.keepAnalysis) {
      setAnalysisResult(null)
    }

    if (imageInputRef.current) {
      imageInputRef.current.value = ""
    }
  }

  const handleImageSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0]

    if (!nextFile) {
      return
    }

    if (!supportedImageTypes.includes(nextFile.type)) {
      event.target.value = ""
      setFeedback({
        tone: "error",
        message: "Upload a JPG, PNG, or WEBP food image.",
      })
      return
    }

    if (nextFile.size > maxImageSizeBytes) {
      event.target.value = ""
      setFeedback({
        tone: "error",
        message: "Use a food image smaller than 4 MB.",
      })
      return
    }

    setSelectedImageFile(nextFile)
    setAnalysisResult(null)
    setFeedback(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const name = formState.name.trim()
    const calories = Number(formState.calories)

    if (!name || !Number.isFinite(calories) || calories <= 0) {
      setFeedback({
        tone: "error",
        message: "Add a food name and a calorie value greater than 0.",
      })
      return
    }

    setIsSaving(true)
    setFeedback(null)

    try {
      const { data } = await api.post("/api/food-logs", {
        data: {
          name,
          calories,
          mealType: formState.mealType,
        },
      })
      const createdEntry = getCreatedFoodEntry(data)

      if (!createdEntry) {
        throw new Error("The server returned an empty food entry.")
      }

      setAllFoodLogs((current) => [createdEntry, ...current])
      setFormState((current) => ({ ...current, name: "", calories: "" }))
      clearAiSelection()
      setIsFormOpen(false)
      setFeedback({
        tone: "success",
        message: `${name} added to ${mealMeta[formState.mealType].label.toLowerCase()}.`,
      })
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getApiErrorMessage(
          error,
          "Couldn't save this entry right now. Please try again.",
        ),
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAiFoodSnap = async () => {
    if (!selectedImageFile) {
      setFeedback({
        tone: "error",
        message: "Upload a meal photo before running AI Food Snap.",
      })
      return
    }

    setIsSnapping(true)
    setFeedback(null)

    try {
      const formData = new FormData()
      formData.append("image", selectedImageFile)

      const { data } = await api.post("/api/image-analysis/analyze", formData)
      const detectedFood = getAnalysisResult(data)

      if (!detectedFood) {
        throw new Error("The Gemini analyzer returned an empty response.")
      }

      setAnalysisResult(detectedFood)

      if (!detectedFood.isFood || !detectedFood.name || detectedFood.calories <= 0) {
        setFeedback({
          tone: "error",
          message:
            detectedFood.notes ||
            "Gemini couldn't detect a meal in that image. Please try another photo.",
        })
        return
      }

      const mealType = getMealTypeForHour(new Date().getHours())
      const { data: createdFoodLog } = await api.post("/api/food-logs", {
        data: {
          name: detectedFood.name,
          calories: detectedFood.calories,
          mealType,
        },
      })
      const createdEntry = getCreatedFoodEntry(createdFoodLog)

      if (!createdEntry) {
        throw new Error("The server returned an empty food entry.")
      }

      setAllFoodLogs((current) => [createdEntry, ...current])
      setFormState((current) => ({
        ...current,
        name: "",
        calories: "",
        mealType,
      }))
      clearAiSelection({ keepAnalysis: true })
      setIsFormOpen(false)
      setFeedback({
        tone: "success",
        message: `${detectedFood.name} logged to ${mealMeta[mealType].label.toLowerCase()} with Gemini AI.`,
      })
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getApiErrorMessage(
          error,
          "AI Food Snap couldn't analyze a meal right now. Please try again.",
        ),
      })
    } finally {
      setIsSnapping(false)
    }
  }

  const handleDelete = async (documentId?: string) => {
    if (!documentId) {
      return
    }

    setDeletingId(documentId)
    setFeedback(null)

    try {
      await api.delete(`/api/food-logs/${documentId}`)
      setAllFoodLogs((current) =>
        current.filter((entry) => entry.documentId !== documentId),
      )
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getApiErrorMessage(
          error,
          "This entry couldn't be deleted right now. Please try again.",
        ),
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="food-log-shell">
      <header className="food-log-header">
        <div className="food-log-header-copy">
          <h1>Food Log</h1>
          <p>Track your daily intake</p>
        </div>

        <div className="food-log-total">
          <span>Today's Total</span>
          <strong>{totalCalories} kcal</strong>
        </div>
      </header>

      <div className="food-log-grid">
        <div className="food-log-left-column">
          <section className="food-log-card">
            <div className="food-log-card-header">
              <h2>Quick Add</h2>
            </div>

            <div className="food-log-chip-grid">
              {mealOrder.map((mealType) => {
                const { label, icon: Icon } = mealMeta[mealType]

                return (
                  <button
                    key={mealType}
                    type="button"
                    className={`food-log-chip ${formState.mealType === mealType ? "is-active" : ""}`}
                    onClick={() => openFormForMeal(mealType)}
                  >
                    <Icon size={14} />
                    <span>{label.toLowerCase()}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <button
            type="button"
            className="food-log-action food-log-action-primary"
            onClick={() => {
              setIsFormOpen(true)
              setFeedback(null)
            }}
          >
            <Plus size={18} />
            <span>Add Food Entry</span>
          </button>

          {isFormOpen && (
            <form className="food-log-form" onSubmit={handleSubmit}>
              <div className="food-log-form-header">
                <div>
                  <h3>New {selectedMeal.label} entry</h3>
                  <p>Log your meal and it will appear in today's tracker.</p>
                </div>
              </div>

              <div className="food-log-form-grid">
                <label className="food-log-field food-log-field-wide">
                  <span>Food name</span>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Ex. Toast & Milk"
                    className="food-log-input"
                  />
                </label>

                <label className="food-log-field">
                  <span>Calories</span>
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
                    placeholder="400"
                    className="food-log-input"
                  />
                </label>

                <label className="food-log-field">
                  <span>Meal type</span>
                  <select
                    value={formState.mealType}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        mealType: event.target.value as MealType,
                      }))
                    }
                    className="food-log-select"
                  >
                    {mealOrder.map((mealType) => (
                      <option key={mealType} value={mealType}>
                        {mealMeta[mealType].label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="food-log-form-actions">
                <button
                  type="button"
                  className="food-log-secondary-button"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="food-log-primary-button"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      <span>Saving entry...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Save entry</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <section className="food-log-card food-log-ai-card">
            <div className="food-log-ai-header">
              <div className="food-log-card-header">
                <h2>AI Food Snap</h2>
                <p>
                  Upload a meal photo and Google Gemini will estimate the food,
                  portion, and calories for your tracker.
                </p>
              </div>

              <span className="food-log-ai-pill">
                <Sparkles size={14} />
                <span>Gemini AI</span>
              </span>
            </div>

            <label
              className={`food-log-upload-surface ${selectedImagePreviewUrl ? "has-preview" : ""}`}
            >
              {selectedImagePreviewUrl ? (
                <img
                  src={selectedImagePreviewUrl}
                  alt="Selected food preview"
                  className="food-log-upload-preview"
                />
              ) : (
                <div className="food-log-upload-placeholder">
                  <span className="food-log-upload-icon">
                    <Image size={20} />
                  </span>
                  <strong>Upload a food image</strong>
                  <p>JPG, PNG, or WEBP up to 4 MB.</p>
                </div>
              )}

              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageSelection}
                className="food-log-upload-input"
              />
            </label>

            {selectedImageFile && (
              <div className="food-log-upload-meta">
                <span>{selectedImageFile.name}</span>
                <span>{formatFileSize(selectedImageFile.size)}</span>
              </div>
            )}

            <div className="food-log-ai-actions">
              <button
                type="button"
                className="food-log-action"
                onClick={handleAiFoodSnap}
                disabled={isSnapping || !selectedImageFile}
              >
                {isSnapping ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <Sparkles size={18} />
                )}
                <span>
                  {isSnapping ? "Analyzing image..." : "Analyze with Gemini"}
                </span>
              </button>

              {selectedImageFile && (
                <button
                  type="button"
                  className="food-log-secondary-button"
                  onClick={() => clearAiSelection()}
                  disabled={isSnapping}
                >
                  Remove image
                </button>
              )}
            </div>

            {analysisResult && (
              <div className="food-log-ai-result">
                <div className="food-log-ai-result-header">
                  <div>
                    <span className="food-log-ai-result-label">
                      Latest Gemini read
                    </span>
                    <h3>{analysisResult.name}</h3>
                  </div>

                  <span
                    className={`food-log-ai-confidence is-${analysisResult.confidence}`}
                  >
                    {confidenceLabels[analysisResult.confidence]}
                  </span>
                </div>

                <div className="food-log-ai-stat-grid">
                  <div className="food-log-ai-stat">
                    <span>Estimated calories</span>
                    <strong>{analysisResult.calories} kcal</strong>
                  </div>

                  <div className="food-log-ai-stat">
                    <span>Portion</span>
                    <strong>{analysisResult.portionDescription}</strong>
                  </div>
                </div>

                <p className="food-log-ai-note">{analysisResult.notes}</p>
              </div>
            )}
          </section>

          {feedback && (
            <p
              className={`food-log-feedback ${feedback.tone === "error" ? "is-error" : "is-success"}`}
            >
              {feedback.message}
            </p>
          )}
        </div>

        <div className="food-log-right-column">
          {mealGroups.length > 0 ? (
            mealGroups.map((group) => {
              const { label, icon: Icon, accentClass } = mealMeta[group.mealType]

              return (
                <section key={group.mealType} className="food-log-meal-card">
                  <div className="food-log-meal-card-header">
                    <div className="food-log-meal-card-title">
                      <span className={`food-log-meal-badge ${accentClass}`}>
                        <Icon size={18} />
                      </span>

                      <div>
                        <h3>{label}</h3>
                        <p>
                          {group.entries.length}{" "}
                          {group.entries.length === 1 ? "item" : "items"}
                        </p>
                      </div>
                    </div>

                    <div className="food-log-meal-calories">
                      <strong>{group.calories} kcal</strong>
                    </div>
                  </div>

                  <div className="food-log-entry-list">
                    {group.entries.map((entry) => {
                      const isDeleting = deletingId === entry.documentId

                      return (
                        <div
                          key={entry.documentId ?? String(entry.id)}
                          className="food-log-entry-row"
                        >
                          <div className="food-log-entry-copy">
                            <strong>{entry.name}</strong>
                          </div>

                          <div className="food-log-entry-meta">
                            <span className="food-log-entry-calories">
                              {entry.calories} kcal
                            </span>

                            <button
                              type="button"
                              className="food-log-delete"
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
                    })}
                  </div>
                </section>
              )
            })
          ) : (
            <section className="food-log-empty-state">
              <span className="food-log-empty-icon">
                <UtensilsCrossed size={20} />
              </span>
              <h3>No meals logged today</h3>
              <p>
                Pick a meal on the left and add your first food entry to start
                building today's log.
              </p>
            </section>
          )}
        </div>
      </div>
    </section>
  )
}

export default FoodLog
