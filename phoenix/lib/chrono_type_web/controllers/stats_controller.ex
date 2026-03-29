defmodule ChronoTypeWeb.StatsController do
  use ChronoTypeWeb, :controller

  alias ChronoType.Analytics.Pipeline

  @doc "Return global aggregate stats from the analytics pipeline."
  def global(conn, _params) do
    stats = Pipeline.get_global_stats()
    render(conn, :global, stats: stats)
  end

  @doc "Return top 10 sessions ranked by WPM."
  def leaderboard(conn, _params) do
    sessions = ChronoType.Typing.leaderboard(10)
    render(conn, :leaderboard, sessions: sessions)
  end
end
