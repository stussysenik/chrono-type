defmodule ChronoType.Repo.Migrations.CreatePassages do
  use Ecto.Migration

  def change do
    create table(:passages) do
      add :text, :text, null: false
      add :difficulty, :string, default: "medium"
      add :category, :string
      add :word_count, :integer

      timestamps()
    end
  end
end
