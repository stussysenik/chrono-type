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

  # Enable LiveDashboard in development
  if Application.compile_env(:chrono_type, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through [:fetch_session, :protect_from_forgery]

      live_dashboard "/dashboard", metrics: ChronoTypeWeb.Telemetry
    end
  end
end
