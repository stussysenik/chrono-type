defmodule ChronoTypeWeb.AuthJSON do
  @doc "Render a user with their bearer token."
  def user(%{user: user, token: token}) do
    %{
      user: %{
        id: user.id,
        username: user.username,
        email: user.email
      },
      token: token
    }
  end
end
