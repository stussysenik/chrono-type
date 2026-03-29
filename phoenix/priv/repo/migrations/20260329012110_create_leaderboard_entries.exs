defmodule ChronoType.Repo.Migrations.CreateLeaderboardEntries do
  use Ecto.Migration

  def change do
    create table(:leaderboard_entries) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :session_id, references(:typing_sessions, on_delete: :delete_all), null: false
      add :wpm, :float, null: false
      add :accuracy, :float
      add :rank, :integer

      timestamps()
    end

    create index(:leaderboard_entries, [:wpm])
    create index(:leaderboard_entries, [:user_id])
  end
end
