defmodule ChronoTypeWeb.FallbackController do
  @moduledoc """
  Translates controller action results into appropriate HTTP responses.

  Used as `action_fallback` in controllers — Phoenix calls this module
  when a controller action returns `{:error, ...}` instead of a conn.
  """

  use ChronoTypeWeb, :controller

  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    errors =
      Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
        Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
          opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
        end)
      end)

    conn
    |> put_status(:unprocessable_entity)
    |> json(%{errors: errors})
  end

  def call(conn, {:error, :not_found}) do
    conn
    |> put_status(:not_found)
    |> json(%{error: "not found"})
  end
end
