defmodule ChronoType.Analytics.PipelineTest do
  use ExUnit.Case, async: false

  alias ChronoType.Analytics.Pipeline

  setup do
    name = :"test_pipeline_#{System.unique_integer([:positive])}"
    {:ok, pid} = Pipeline.start_link(name: name)
    %{pid: pid, name: name}
  end

  test "ingest updates per-session stats", %{name: name} do
    Pipeline.ingest(name, "session_1", "user_1", [
      %{"key" => "a", "timestamp_ms" => 100.0, "duration_ms" => 50.0},
      %{"key" => "b", "timestamp_ms" => 200.0, "duration_ms" => 45.0}
    ])
    :timer.sleep(50)
    stats = Pipeline.get_session_stats(name, "session_1")
    assert stats != nil
    assert stats.count == 2
  end

  test "get_global_stats returns aggregate", %{name: name} do
    Pipeline.ingest(name, "s1", "u1", [%{"key" => "a", "timestamp_ms" => 100.0, "duration_ms" => 50.0}])
    :timer.sleep(50)
    global = Pipeline.get_global_stats(name)
    assert global.total_keystrokes >= 1
  end
end
