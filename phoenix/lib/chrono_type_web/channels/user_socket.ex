defmodule ChronoTypeWeb.UserSocket do
  @moduledoc """
  The main WebSocket entry point for authenticated users.

  ## Authentication flow
  1. Client obtains a Phoenix.Token via `GET /api/auth/token`.
  2. Client connects to `/socket` passing `%{"token" => token}`.
  3. This module verifies the token and assigns `:user_id` to the socket.
  """

  use Phoenix.Socket

  channel "typing:*", ChronoTypeWeb.TypingChannel
  channel "lobby:*", ChronoTypeWeb.LobbyChannel

  @impl true
  def connect(%{"token" => token}, socket, _connect_info) do
    case Phoenix.Token.verify(ChronoTypeWeb.Endpoint, "user socket", token, max_age: 86_400) do
      {:ok, user_id} -> {:ok, assign(socket, :user_id, user_id)}
      {:error, _} -> :error
    end
  end

  def connect(_params, _socket, _connect_info), do: :error

  @impl true
  def id(socket), do: "user_socket:#{socket.assigns.user_id}"
end
