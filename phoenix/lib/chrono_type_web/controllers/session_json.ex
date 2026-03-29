defmodule ChronoTypeWeb.SessionJSON do
  alias ChronoType.Typing.Session

  def index(%{sessions: sessions}) do
    %{sessions: Enum.map(sessions, &session_data/1)}
  end

  def show(%{session: session}) do
    %{session: session_data(session)}
  end

  defp session_data(%Session{} = session) do
    %{
      id: session.id,
      started_at: session.started_at,
      ended_at: session.ended_at,
      text_prompt: session.text_prompt,
      wpm: session.wpm,
      accuracy: session.accuracy,
      mean_iki: session.mean_iki,
      std_iki: session.std_iki,
      total_keys: session.total_keys,
      mode: session.mode,
      user_id: session.user_id
    }
  end
end
