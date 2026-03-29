defmodule ChronoTypeWeb.Router do
  use ChronoTypeWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  # Public API routes — no authentication required
  scope "/api", ChronoTypeWeb do
    pipe_through :api

    post "/auth/register", AuthController, :register
    post "/auth/login", AuthController, :login

    get "/stats/global", StatsController, :global
    get "/stats/leaderboard", StatsController, :leaderboard

    get "/health", HealthController, :index
  end

  # Authenticated API routes — require Bearer token
  scope "/api", ChronoTypeWeb do
    pipe_through [:api, ChronoTypeWeb.Plugs.Auth]

    delete "/auth/logout", AuthController, :logout
    get "/auth/token", AuthController, :socket_token

    resources "/sessions", SessionController, only: [:index, :show, :create]
  end

  # LiveDashboard — available in dev via /dev/dashboard
  if Application.compile_env(:chrono_type, :dev_routes) do
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through [:fetch_session, :protect_from_forgery]

      live_dashboard "/dashboard", metrics: ChronoTypeWeb.Telemetry
    end
  end

  # Also expose LiveDashboard at /dashboard behind session auth
  import Phoenix.LiveDashboard.Router

  scope "/" do
    pipe_through [:fetch_session, :protect_from_forgery]

    live_dashboard "/dashboard", metrics: ChronoTypeWeb.Telemetry
  end

  # SPA catch-all — must be LAST so it doesn't shadow API/dashboard routes
  scope "/", ChronoTypeWeb do
    get "/*path", PageController, :index
  end
end
