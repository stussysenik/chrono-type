defmodule ChronoTypeWeb.Presence do
  @moduledoc """
  Phoenix Presence module for tracking online users in the lobby.

  Presence uses a CRDT-based protocol to synchronize user presence
  across distributed nodes without a central server. Each connected
  user gets a presence entry with metadata (typing status, WPM, etc.).
  """

  use Phoenix.Presence,
    otp_app: :chrono_type,
    pubsub_server: ChronoType.PubSub
end
