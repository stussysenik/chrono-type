defmodule ChronoTypeWeb.StatsJSON do
  def global(%{stats: stats}) do
    %{stats: stats}
  end

  def leaderboard(%{sessions: sessions}) do
    %{
      leaderboard:
        Enum.map(sessions, fn s ->
          %{
            id: s.id,
            user_id: s.user_id,
            wpm: s.wpm,
            accuracy: s.accuracy,
            started_at: s.started_at
          }
        end)
    }
  end
end
