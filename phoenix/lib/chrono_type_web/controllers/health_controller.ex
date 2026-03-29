defmodule ChronoTypeWeb.HealthController do
  use ChronoTypeWeb, :controller

  @doc "Simple health-check endpoint for load balancers and monitoring."
  def index(conn, _params) do
    json(conn, %{status: "ok"})
  end
end
