import { useState, type FormEvent } from "react"
import { AtSign, Eye, EyeOff, Lock, Mail, Activity } from "lucide-react"
import { useAppContext } from "../context/AppContext"

type AuthMode = "signup" | "login"

type AuthForm = {
  username: string
  email: string
  password: string
}

const initialForm: AuthForm = {
  username: "",
  email: "",
  password: "",
}

const Login = () => {
  const { login, signup } = useAppContext()
  const [mode, setMode] = useState<AuthMode>("signup")
  const [form, setForm] = useState<AuthForm>(initialForm)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const isSignup = mode === "signup"

  const handleChange = (field: keyof AuthForm, value: string) => {
    setError("")
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError("")
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSignup && !form.username.trim()) {
      setError("Please enter a username.")
      return
    }

    if (!form.email.trim()) {
      setError("Please enter your email.")
      return
    }

    if (!form.password.trim()) {
      setError("Please enter your password.")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      if (isSignup) {
        await signup({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
        })
      } else {
        await login({
          email: form.email.trim(),
          password: form.password,
        })
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />

      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-icon">
            <Activity size={16} />
          </span>
          <span>FitTrack</span>
        </div>

        <div className="auth-copy">
          <h1>{isSignup ? "Sign up" : "Login"}</h1>
          <p>
            {isSignup
              ? "Please enter your details to create an account."
              : "Welcome back. Please enter your details to continue."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {isSignup && (
            <label className="auth-field">
              <span className="auth-label">Username</span>
              <div className="auth-input-shell">
                <AtSign size={18} className="auth-input-icon" />
                <input
                  type="text"
                  value={form.username}
                  onChange={(event) => handleChange("username", event.target.value)}
                  placeholder="enter a username"
                  className="auth-input"
                  autoComplete="username"
                />
              </div>
            </label>
          )}

          <label className="auth-field">
            <span className="auth-label">Email</span>
            <div className="auth-input-shell">
              <Mail size={18} className="auth-input-icon" />
              <input
                type="email"
                value={form.email}
                onChange={(event) => handleChange("email", event.target.value)}
                placeholder="Please enter your email"
                className="auth-input"
                autoComplete="email"
              />
            </div>
          </label>

          <label className="auth-field">
            <span className="auth-label">Password</span>
            <div className="auth-input-shell">
              <Lock size={18} className="auth-input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) => handleChange("password", event.target.value)}
                placeholder="Please enter your password"
                className="auth-input"
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
              <button
                type="button"
                className="auth-visibility-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={isSubmitting} className="auth-submit">
            {isSubmitting
              ? isSignup
                ? "Creating account..."
                : "Logging in..."
              : isSignup
                ? "Sign up"
                : "Login"}
          </button>
        </form>

        <p className="auth-switch-copy">
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            className="auth-switch-button"
            onClick={() => handleModeChange(isSignup ? "login" : "signup")}
          >
            {isSignup ? "Login" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  )
}

export default Login
