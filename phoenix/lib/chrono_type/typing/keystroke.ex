defmodule ChronoType.Typing.Keystroke do
  use Ecto.Schema
  import Ecto.Changeset

  schema "keystrokes" do
    field :key, :string
    field :timestamp_ms, :float
    field :duration_ms, :float
    belongs_to :session, ChronoType.Typing.Session
    timestamps()
  end

  def changeset(keystroke, attrs) do
    keystroke
    |> cast(attrs, [:key, :timestamp_ms, :duration_ms, :session_id])
    |> validate_required([:key, :timestamp_ms, :session_id])
  end
end
