defmodule ChronoType.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      ChronoTypeWeb.Telemetry,
      ChronoType.Repo,
      {DNSCluster, query: Application.get_env(:chrono_type, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: ChronoType.PubSub},
      # Presence must start before channels that use it
      ChronoTypeWeb.Presence,
      # DynamicSupervisor for on-demand session processes
      {DynamicSupervisor, name: ChronoType.SessionSupervisor, strategy: :one_for_one},
      # Real-time analytics pipeline backed by ETS
      ChronoType.Analytics.Pipeline,
      # Start to serve requests — typically the last entry
      ChronoTypeWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: ChronoType.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    ChronoTypeWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
