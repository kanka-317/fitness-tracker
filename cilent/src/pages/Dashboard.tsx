import {
  Activity,
  Flame,
  Salad,
  Scale,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react"
import { goalLabels } from "../assets/assets"
import CaloriesChart from "../assets/CaloriesChart"
import Card from "../components/ui/Card"
import ProgressBar from "../components/ui/ProgressBar"
import { useAppContext } from "../context/AppContext"

const Dashboard = () => {
  const { user, allFoodLogs, allActivityLogs } = useAppContext()

  if (!user) {
    return null
  }

  const today = new Date().toISOString().split("T")[0]
  const todayFood = allFoodLogs.filter(
    (entry) => (entry.createdAt?.split("T")[0] ?? entry.date) === today,
  )
  const todayActivity = allActivityLogs.filter(
    (entry) => (entry.createdAt?.split("T")[0] ?? entry.date) === today,
  )

  const caloriesConsumed = todayFood.reduce((sum, entry) => sum + entry.calories, 0)
  const caloriesBurned = todayActivity.reduce(
    (sum, entry) => sum + entry.calories,
    0,
  )
  const activeMinutes = todayActivity.reduce(
    (sum, entry) => sum + entry.duration,
    0,
  )
  const workoutCount = todayActivity.length
  const mealCount = todayFood.length
  const calorieLimit = user.dailyCalorieIntake ?? 2000
  const burnGoal = user.dailyCalorieBurn ?? 400
  const remainingCalories = Math.max(calorieLimit - caloriesConsumed, 0)
  const intakePercent = Math.min(Math.round((caloriesConsumed / calorieLimit) * 100), 100)
  const bmi =
    user.height && user.weight
      ? user.weight / ((user.height / 100) * (user.height / 100))
      : null
  const bmiValue = bmi ? bmi.toFixed(1) : "--"
  const bmiProgress = bmi ? Math.min(Math.max(((bmi - 15) / 20) * 100, 0), 100) : 0

  const heroMessage =
    activeMinutes >= 30
      ? "Great workout today! Keep it up!"
      : caloriesConsumed > 0
        ? "Nice logging streak. Keep building momentum."
        : "Let's get your first meal or workout logged today."

  return (
    <div className="dashboard-shell">
      <section className="dashboard-hero">
        <p className="dashboard-hero-eyebrow">Welcome back</p>
        <h1 className="dashboard-hero-title">Hi there! {user.username}</h1>

        <div className="dashboard-hero-banner">
          <Flame size={18} className="text-amber-100" />
          <span>{heroMessage}</span>
        </div>
      </section>

      <section className="dashboard-highlight">
        <Card className="dashboard-highlight-card">
          <div className="dashboard-progress-block">
            <div className="dashboard-progress-header">
              <div className="dashboard-progress-label">
                <span className="dashboard-stat-icon bg-amber-50 text-amber-600">
                  <Salad size={16} />
                </span>
                <div>
                  <p>Calories Consumed</p>
                  <strong>{caloriesConsumed}</strong>
                </div>
              </div>

              <div className="dashboard-progress-meta">
                <span>Limit</span>
                <strong>{calorieLimit}</strong>
              </div>
            </div>

            <ProgressBar value={caloriesConsumed} max={calorieLimit} />

            <div className="dashboard-progress-footer">
              <span>
                {remainingCalories > 0
                  ? `${remainingCalories} kcal remaining`
                  : `${Math.abs(calorieLimit - caloriesConsumed)} kcal over`}
              </span>
              <span>{intakePercent}%</span>
            </div>
          </div>

          <div className="dashboard-progress-divider" />

          <div className="dashboard-progress-block">
            <div className="dashboard-progress-header">
              <div className="dashboard-progress-label">
                <span className="dashboard-stat-icon bg-rose-50 text-rose-500">
                  <Flame size={16} />
                </span>
                <div>
                  <p>Calories Burned</p>
                  <strong>{caloriesBurned}</strong>
                </div>
              </div>

              <div className="dashboard-progress-meta">
                <span>Goal</span>
                <strong>{burnGoal}</strong>
              </div>
            </div>

            <div className="dashboard-burn-track">
              <div
                className="dashboard-burn-fill"
                style={{
                  width: `${Math.min((caloriesBurned / burnGoal) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </Card>
      </section>

      <section className="dashboard-grid">
        <Card className="dashboard-metric-card">
          <div className="dashboard-metric-header">
            <span className="dashboard-stat-icon bg-cyan-50 text-cyan-600">
              <Activity size={16} />
            </span>
            <p>Active</p>
          </div>
          <strong>{activeMinutes}</strong>
          <span>minutes today</span>
        </Card>

        <Card className="dashboard-metric-card">
          <div className="dashboard-metric-header">
            <span className="dashboard-stat-icon bg-fuchsia-50 text-fuchsia-600">
              <Sparkles size={16} />
            </span>
            <p>Workouts</p>
          </div>
          <strong>{workoutCount}</strong>
          <span>activities logged</span>
        </Card>

        <Card className="dashboard-goal-card">
          <div className="dashboard-goal-head">
            <span className="dashboard-stat-icon bg-emerald-400/15 text-emerald-300">
              <TrendingUp size={16} />
            </span>
            <div>
              <p>Your Goal</p>
              <strong>{goalLabels[user.goal ?? "maintain"]}</strong>
            </div>
          </div>
        </Card>

        <Card className="dashboard-body-card">
          <div className="dashboard-card-heading">
            <span className="dashboard-stat-icon bg-violet-50 text-violet-600">
              <Scale size={16} />
            </span>
            <div>
              <h3>Body Metrics</h3>
              <p>Your stats</p>
            </div>
          </div>

          <div className="dashboard-detail-list">
            <div className="dashboard-detail-row">
              <span className="dashboard-detail-label">
                <Scale size={14} />
                Weight
              </span>
              <strong>{user.weight ?? "--"} kg</strong>
            </div>

            <div className="dashboard-detail-row">
              <span className="dashboard-detail-label">
                <Target size={14} />
                Height
              </span>
              <strong>{user.height ? `${user.height} cm` : "--"}</strong>
            </div>
          </div>

          <div className="dashboard-bmi-block">
            <div className="dashboard-bmi-header">
              <span>BMI</span>
              <strong>{bmiValue}</strong>
            </div>
            <div className="dashboard-bmi-bar">
              <div
                className="dashboard-bmi-bar-fill"
                style={{ width: `${bmiProgress}%` }}
              />
            </div>
            <div className="dashboard-bmi-scale">
              <span>18.5</span>
              <span>25</span>
              <span>30</span>
            </div>
          </div>
        </Card>

        <Card className="dashboard-summary-card">
          <h3>Today's Summary</h3>
          <div className="dashboard-summary-list">
            <div className="dashboard-summary-row">
              <span>Meals logged</span>
              <strong>{mealCount}</strong>
            </div>
            <div className="dashboard-summary-row">
              <span>Total calories</span>
              <strong>{caloriesConsumed} kcal</strong>
            </div>
            <div className="dashboard-summary-row">
              <span>Active time</span>
              <strong>{activeMinutes} min</strong>
            </div>
          </div>
        </Card>

        <Card className="dashboard-chart-card">
          <h3>This Week's Progress</h3>
          <CaloriesChart />
        </Card>
      </section>
    </div>
  )
}

export default Dashboard
