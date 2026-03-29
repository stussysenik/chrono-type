defmodule ChronoType.TypingTest do
  use ChronoType.DataCase

  alias ChronoType.{Typing, Accounts}

  setup do
    {:ok, user} = Accounts.register_user(%{username: "typist", email: "typist@test.com", password: "password123"})
    %{user: user}
  end

  describe "create_session/2" do
    test "creates a typing session", %{user: user} do
      attrs = %{started_at: DateTime.utc_now(), mode: "free"}
      assert {:ok, session} = Typing.create_session(user, attrs)
      assert session.user_id == user.id
      assert session.mode == "free"
    end
  end

  describe "list_sessions/1" do
    test "returns sessions for a user", %{user: user} do
      {:ok, _} = Typing.create_session(user, %{started_at: DateTime.utc_now(), mode: "free"})
      {:ok, _} = Typing.create_session(user, %{started_at: DateTime.utc_now(), mode: "prompted"})
      sessions = Typing.list_sessions(user)
      assert length(sessions) == 2
    end
  end

  describe "complete_session/2" do
    test "updates session with final stats", %{user: user} do
      {:ok, session} = Typing.create_session(user, %{started_at: DateTime.utc_now(), mode: "free"})
      attrs = %{ended_at: DateTime.utc_now(), wpm: 85.5, accuracy: 97.2, mean_iki: 70.5, std_iki: 12.3, total_keys: 500}
      assert {:ok, updated} = Typing.complete_session(session, attrs)
      assert updated.wpm == 85.5
      assert updated.total_keys == 500
    end
  end

  describe "bulk_insert_keystrokes/2" do
    test "inserts multiple keystrokes", %{user: user} do
      {:ok, session} = Typing.create_session(user, %{started_at: DateTime.utc_now(), mode: "free"})
      keystrokes = [
        %{key: "a", timestamp_ms: 100.0, duration_ms: 50.0},
        %{key: "b", timestamp_ms: 200.0, duration_ms: 45.0}
      ]
      assert {:ok, 2} = Typing.bulk_insert_keystrokes(session, keystrokes)
    end
  end
end
