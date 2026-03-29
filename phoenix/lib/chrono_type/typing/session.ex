defmodule ChronoType.Typing.Session do
  use Ecto.Schema
  import Ecto.Changeset

  schema "typing_sessions" do
    field :started_at, :utc_datetime_usec
    field :ended_at, :utc_datetime_usec
    field :text_prompt, :string
    field :wpm, :float
    field :accuracy, :float
    field :mean_iki, :float
    field :std_iki, :float
    field :total_keys, :integer
    field :metadata, :map, default: %{}
    field :mode, :string, default: "free"
    belongs_to :user, ChronoType.Accounts.User
    timestamps()
  end

  def create_changeset(session, user, attrs) do
    session
    |> cast(attrs, [:started_at, :mode, :text_prompt])
    |> validate_required([:started_at])
    |> put_assoc(:user, user)
  end

  def complete_changeset(session, attrs) do
    session
    |> cast(attrs, [:ended_at, :wpm, :accuracy, :mean_iki, :std_iki, :total_keys, :metadata])
  end
end
