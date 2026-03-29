defmodule ChronoType.Repo do
  use Ecto.Repo,
    otp_app: :chrono_type,
    adapter: Ecto.Adapters.Postgres
end
