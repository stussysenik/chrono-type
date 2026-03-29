defmodule ChronoTypeWeb.HealthControllerTest do
  use ChronoTypeWeb.ConnCase

  test "GET /api/health returns ok", %{conn: conn} do
    conn = get(conn, "/api/health")
    assert json_response(conn, 200)["status"] == "ok"
  end
end
