defmodule ChronoTypeWeb.PageController do
  @moduledoc """
  Serves the SPA's index.html for all non-API routes.

  When the RedwoodJS frontend is built and placed in `priv/static/index.html`,
  this controller serves it for any path — enabling client-side routing.
  Falls back to a JSON response when the SPA hasn't been built yet.
  """

  use ChronoTypeWeb, :controller

  def index(conn, _params) do
    index_path = Application.app_dir(:chrono_type, "priv/static/index.html")

    if File.exists?(index_path) do
      conn
      |> put_resp_header("content-type", "text/html; charset=utf-8")
      |> send_file(200, index_path)
    else
      conn |> put_status(200) |> json(%{status: "api_only", message: "SPA not built yet"})
    end
  end
end
