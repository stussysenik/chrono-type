defmodule ChronoTypeWeb.Plugs.Auth do
  @moduledoc """
  Simple authentication plug that reads a Bearer token from the
  Authorization header, verifies it as a Phoenix.Token, and assigns
  the authenticated `:current_user` to the connection.

  ## How it works
  1. Extracts `Bearer <token>` from the Authorization header.
  2. Verifies the token using `Phoenix.Token.verify/4` with a 24-hour max age.
  3. Loads the user from the database and puts it in `conn.assigns.current_user`.
  4. If any step fails, halts with 401 Unauthorized.
  """

  import Plug.Conn
  import Phoenix.Controller, only: [json: 2]

  def init(opts), do: opts

  def call(conn, _opts) do
    with ["Bearer " <> token] <- get_req_header(conn, "authorization"),
         {:ok, user_id} <-
           Phoenix.Token.verify(ChronoTypeWeb.Endpoint, "user socket", token, max_age: 86_400),
         user <- ChronoType.Accounts.get_user!(user_id) do
      assign(conn, :current_user, user)
    else
      _ ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: "unauthorized"})
        |> halt()
    end
  end
end
