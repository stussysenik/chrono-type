defmodule ChronoType.Accounts do
  alias ChronoType.Repo
  alias ChronoType.Accounts.User

  def register_user(attrs) do
    %User{}
    |> User.registration_changeset(attrs)
    |> Repo.insert()
  end

  def authenticate_user(email, password) do
    user = Repo.get_by(User, email: email)

    cond do
      user && Bcrypt.verify_pass(password, user.password_hash) -> {:ok, user}
      user -> {:error, :invalid_credentials}
      true -> Bcrypt.no_user_verify(); {:error, :invalid_credentials}
    end
  end

  def get_user!(id), do: Repo.get!(User, id)
end
