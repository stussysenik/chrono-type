defmodule ChronoType.Typing.Passage do
  use Ecto.Schema
  import Ecto.Changeset

  schema "passages" do
    field :text, :string
    field :difficulty, :string, default: "medium"
    field :category, :string
    field :word_count, :integer
    timestamps()
  end

  def changeset(passage, attrs) do
    passage
    |> cast(attrs, [:text, :difficulty, :category, :word_count])
    |> validate_required([:text])
  end
end
