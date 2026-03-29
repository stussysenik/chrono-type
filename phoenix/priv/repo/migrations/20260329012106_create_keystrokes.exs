defmodule ChronoType.Repo.Migrations.CreateKeystrokes do
  use Ecto.Migration

  def change do
    create table(:keystrokes) do
      add :session_id, references(:typing_sessions, on_delete: :delete_all), null: false
      add :key, :string, null: false
      add :timestamp_ms, :float, null: false
      add :duration_ms, :float

      timestamps()
    end

    create index(:keystrokes, [:session_id])
  end
end
