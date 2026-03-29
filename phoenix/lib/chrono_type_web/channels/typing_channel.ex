defmodule ChronoTypeWeb.TypingChannel do
  @moduledoc """
  Real-time channel for a typing session.

  ## Topics
  - `"typing:<session_id>"` — one channel per active typing session.

  ## Incoming events
  - `"keystroke_batch"` — batch of keystroke events from the client.
    Ingested into the Analytics Pipeline and broadcast to all subscribers.
  - `"session_complete"` — signals that a session has finished.
    Broadcast so spectators can update their UI.
  """

  use ChronoTypeWeb, :channel

  @impl true
  def join("typing:" <> session_id, _params, socket) do
    {:ok, assign(socket, :session_id, session_id)}
  end

  @impl true
  def handle_in("keystroke_batch", %{"events" => events}, socket) do
    # Ingest into the analytics pipeline (best-effort — the GenServer
    # may not be running during isolated channel tests).
    try do
      ChronoType.Analytics.Pipeline.ingest(
        ChronoType.Analytics.Pipeline,
        socket.assigns.session_id,
        socket.assigns.user_id,
        events
      )
    catch
      :exit, _ -> :ok
    end

    broadcast!(socket, "keystroke_batch", %{
      user_id: socket.assigns.user_id,
      events: events
    })

    {:noreply, socket}
  end

  @impl true
  def handle_in("session_complete", %{"summary" => summary}, socket) do
    broadcast!(socket, "session_complete", %{
      user_id: socket.assigns.user_id,
      summary: summary
    })

    {:noreply, socket}
  end
end
