defmodule ChronoTypeWeb.LobbyChannel do
  @moduledoc """
  The lobby channel provides real-time presence tracking and global stats.

  ## Topics
  - `"lobby:main"` — single global lobby all users share.

  ## Presence
  On join, each user is tracked via `Phoenix.Presence` with metadata
  like `typing: false` and `current_wpm: 0`. The Analytics Pipeline
  broadcasts `global_stats` to this topic every 2 seconds.
  """

  use ChronoTypeWeb, :channel
  alias ChronoTypeWeb.Presence

  @impl true
  def join("lobby:main", _params, socket) do
    send(self(), :after_join)
    {:ok, socket}
  end

  @impl true
  def handle_info(:after_join, socket) do
    Presence.track(socket, socket.assigns.user_id, %{
      typing: false,
      current_wpm: 0,
      joined_at: System.system_time(:second)
    })

    push(socket, "presence_state", Presence.list(socket))
    {:noreply, socket}
  end
end
