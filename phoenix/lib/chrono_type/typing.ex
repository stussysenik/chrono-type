defmodule ChronoType.Typing do
  alias ChronoType.Repo
  alias ChronoType.Typing.{Session, Keystroke, Passage}
  import Ecto.Query

  def create_session(user, attrs) do
    %Session{}
    |> Session.create_changeset(user, attrs)
    |> Repo.insert()
  end

  def list_sessions(user) do
    Session
    |> where(user_id: ^user.id)
    |> order_by(desc: :started_at)
    |> Repo.all()
  end

  def get_session!(id), do: Repo.get!(Session, id)

  def complete_session(session, attrs) do
    session
    |> Session.complete_changeset(attrs)
    |> Repo.update()
  end

  def bulk_insert_keystrokes(session, keystrokes_attrs) do
    now = NaiveDateTime.utc_now() |> NaiveDateTime.truncate(:second)

    entries =
      Enum.map(keystrokes_attrs, fn attrs ->
        %{
          session_id: session.id,
          key: attrs[:key] || attrs["key"],
          timestamp_ms: attrs[:timestamp_ms] || attrs["timestamp_ms"],
          duration_ms: attrs[:duration_ms] || attrs["duration_ms"],
          inserted_at: now,
          updated_at: now
        }
      end)

    {count, _} = Repo.insert_all(Keystroke, entries)
    {:ok, count}
  end

  def leaderboard(limit \\ 10) do
    Session
    |> where([s], not is_nil(s.wpm))
    |> order_by(desc: :wpm)
    |> limit(^limit)
    |> Repo.all()
  end

  def list_passages do
    Repo.all(Passage)
  end
end
