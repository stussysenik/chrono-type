defmodule ChronoType.Repo.Migrations.CreateAnalyticsSnapshots do
  use Ecto.Migration

  def change do
    create table(:analytics_snapshots) do
      add :snapshot_at, :utc_datetime_usec, null: false
      add :total_sessions, :integer, default: 0
      add :avg_wpm, :float
      add :median_wpm, :float
      add :p95_wpm, :float
      add :active_users, :integer, default: 0
      add :data, :map, default: %{}

      timestamps()
    end
  end
end
