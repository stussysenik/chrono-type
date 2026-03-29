defmodule ChronoType.Repo.Migrations.CreateTypingSessions do
  use Ecto.Migration

  def change do
    create table(:typing_sessions) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :started_at, :utc_datetime_usec, null: false
      add :ended_at, :utc_datetime_usec
      add :text_prompt, :text
      add :wpm, :float
      add :accuracy, :float
      add :mean_iki, :float
      add :std_iki, :float
      add :total_keys, :integer
      add :metadata, :map, default: %{}
      add :mode, :string, default: "free"

      timestamps()
    end

    create index(:typing_sessions, [:user_id])
    create index(:typing_sessions, [:wpm])
  end
end
