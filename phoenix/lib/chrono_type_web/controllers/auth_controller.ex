defmodule ChronoTypeWeb.AuthController do
  use ChronoTypeWeb, :controller

  alias ChronoType.Accounts

  action_fallback ChronoTypeWeb.FallbackController

  @doc "Register a new user account."
  def register(conn, %{"username" => username, "email" => email, "password" => password}) do
    case Accounts.register_user(%{username: username, email: email, password: password}) do
      {:ok, user} ->
        token = Phoenix.Token.sign(ChronoTypeWeb.Endpoint, "user socket", user.id)

        conn
        |> put_status(:created)
        |> render(:user, user: user, token: token)

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  @doc "Authenticate with email + password, receive a bearer token."
  def login(conn, %{"email" => email, "password" => password}) do
    case Accounts.authenticate_user(email, password) do
      {:ok, user} ->
        token = Phoenix.Token.sign(ChronoTypeWeb.Endpoint, "user socket", user.id)
        conn |> put_status(:ok) |> render(:user, user: user, token: token)

      {:error, :invalid_credentials} ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: "invalid credentials"})
    end
  end

  @doc "Log out (client should discard the token)."
  def logout(conn, _params) do
    send_resp(conn, :no_content, "")
  end

  @doc "Generate a short-lived Phoenix.Token for WebSocket authentication."
  def socket_token(conn, _params) do
    user = conn.assigns.current_user
    token = Phoenix.Token.sign(ChronoTypeWeb.Endpoint, "user socket", user.id)
    json(conn, %{token: token})
  end
end
