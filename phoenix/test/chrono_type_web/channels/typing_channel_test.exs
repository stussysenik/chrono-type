defmodule ChronoTypeWeb.TypingChannelTest do
  use ChronoTypeWeb.ChannelCase

  alias ChronoTypeWeb.UserSocket
  alias ChronoType.Accounts

  setup do
    {:ok, user} =
      Accounts.register_user(%{
        username: "channeltest",
        email: "channel@test.com",
        password: "password123"
      })

    token = Phoenix.Token.sign(ChronoTypeWeb.Endpoint, "user socket", user.id)
    {:ok, socket} = connect(UserSocket, %{"token" => token})
    %{socket: socket, user: user}
  end

  test "joins typing channel", %{socket: socket} do
    {:ok, _, _socket} = subscribe_and_join(socket, "typing:test-session", %{})
  end

  test "broadcasts keystroke_batch", %{socket: socket} do
    {:ok, _, socket} = subscribe_and_join(socket, "typing:test-session", %{})
    events = [%{"key" => "a", "timestamp_ms" => 100.0, "duration_ms" => 50.0}]
    push(socket, "keystroke_batch", %{"events" => events})
    assert_broadcast "keystroke_batch", _payload
  end
end
