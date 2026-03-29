defmodule ChronoType.Analytics.Pipeline do
  @moduledoc """
  GenServer-backed analytics pipeline that uses ETS for high-throughput,
  concurrent reads of per-session and global typing statistics.

  ## Architecture
  - ETS table with `read_concurrency: true` enables lock-free reads from
    any process (controllers, channels) without bottlenecking the GenServer.
  - Writes are serialized through `handle_cast` to avoid race conditions
    on counter updates.
  - A periodic `:broadcast` message pushes global stats to the lobby channel
    every 2 seconds for the real-time leaderboard.
  """

  use GenServer

  # ── Public API ──────────────────────────────────────────────────────

  def start_link(opts \\ []) do
    name = Keyword.get(opts, :name, __MODULE__)
    GenServer.start_link(__MODULE__, opts, name: name)
  end

  @doc "Asynchronously ingest a batch of keystroke events for a session."
  def ingest(name \\ __MODULE__, session_id, user_id, events) do
    GenServer.cast(name, {:ingest, session_id, user_id, events})
  end

  @doc "Synchronously read per-session statistics from ETS."
  def get_session_stats(name \\ __MODULE__, session_id) do
    GenServer.call(name, {:get_session_stats, session_id})
  end

  @doc "Synchronously read global aggregate statistics from ETS."
  def get_global_stats(name \\ __MODULE__) do
    GenServer.call(name, :get_global_stats)
  end

  # ── GenServer Callbacks ─────────────────────────────────────────────

  @impl true
  def init(opts) do
    table_name = Keyword.get(opts, :name, __MODULE__)

    table =
      :ets.new(table_name, [
        :set,
        :public,
        read_concurrency: true
      ])

    # Seed the global stats row so reads never return nil
    :ets.insert(table, {:global, %{total_keystrokes: 0, total_sessions: 0}})

    schedule_broadcast()

    {:ok, %{table: table}}
  end

  @impl true
  def handle_cast({:ingest, session_id, _user_id, events}, %{table: table} = state) do
    count = length(events)

    # Compute average duration for the batch
    avg_duration =
      if count > 0 do
        events
        |> Enum.map(fn e -> e["duration_ms"] || 0.0 end)
        |> Enum.sum()
        |> Kernel./(count)
      else
        0.0
      end

    # Update (or create) per-session stats
    case :ets.lookup(table, {:session, session_id}) do
      [{_, existing}] ->
        total_count = existing.count + count
        # Running average: weighted combination of old and new averages
        new_avg =
          (existing.avg_duration_ms * existing.count + avg_duration * count) / total_count

        :ets.insert(table, {
          {:session, session_id},
          %{existing | count: total_count, avg_duration_ms: new_avg}
        })

      [] ->
        :ets.insert(table, {
          {:session, session_id},
          %{count: count, avg_duration_ms: avg_duration}
        })
    end

    # Update global stats
    case :ets.lookup(table, :global) do
      [{:global, global}] ->
        new_global = %{
          global
          | total_keystrokes: global.total_keystrokes + count
        }

        # Track unique sessions
        new_global =
          case :ets.lookup(table, {:session_seen, session_id}) do
            [] ->
              :ets.insert(table, {{:session_seen, session_id}, true})
              %{new_global | total_sessions: new_global.total_sessions + 1}

            _ ->
              new_global
          end

        :ets.insert(table, {:global, new_global})

      [] ->
        :ets.insert(table, {:global, %{total_keystrokes: count, total_sessions: 1}})
    end

    {:noreply, state}
  end

  @impl true
  def handle_call({:get_session_stats, session_id}, _from, %{table: table} = state) do
    result =
      case :ets.lookup(table, {:session, session_id}) do
        [{_, stats}] -> stats
        [] -> nil
      end

    {:reply, result, state}
  end

  @impl true
  def handle_call(:get_global_stats, _from, %{table: table} = state) do
    result =
      case :ets.lookup(table, :global) do
        [{:global, stats}] -> stats
        [] -> %{total_keystrokes: 0, total_sessions: 0}
      end

    {:reply, result, state}
  end

  @impl true
  def handle_info(:broadcast, %{table: table} = state) do
    global =
      case :ets.lookup(table, :global) do
        [{:global, stats}] -> stats
        [] -> %{total_keystrokes: 0, total_sessions: 0}
      end

    # Broadcast to the lobby channel — wrapped in try/catch because the
    # Endpoint may not be started during tests or early boot.
    try do
      ChronoTypeWeb.Endpoint.broadcast("lobby:main", "global_stats", global)
    rescue
      _ -> :ok
    catch
      _, _ -> :ok
    end

    schedule_broadcast()
    {:noreply, state}
  end

  # ── Private ─────────────────────────────────────────────────────────

  defp schedule_broadcast do
    Process.send_after(self(), :broadcast, 2_000)
  end
end
