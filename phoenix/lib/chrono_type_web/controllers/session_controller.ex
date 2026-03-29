defmodule ChronoTypeWeb.SessionController do
  use ChronoTypeWeb, :controller

  alias ChronoType.Typing

  action_fallback ChronoTypeWeb.FallbackController

  @doc "List all typing sessions for the authenticated user."
  def index(conn, _params) do
    user = conn.assigns.current_user
    sessions = Typing.list_sessions(user)
    render(conn, :index, sessions: sessions)
  end

  @doc "Get a single typing session by ID."
  def show(conn, %{"id" => id}) do
    session = Typing.get_session!(id)
    render(conn, :show, session: session)
  end

  @doc "Create a new typing session for the authenticated user."
  def create(conn, %{"session" => session_params}) do
    user = conn.assigns.current_user

    case Typing.create_session(user, session_params) do
      {:ok, session} ->
        conn
        |> put_status(:created)
        |> render(:show, session: session)

      {:error, changeset} ->
        {:error, changeset}
    end
  end
end
