defmodule ChronoType.AccountsTest do
  use ChronoType.DataCase

  alias ChronoType.Accounts

  describe "register_user/1" do
    test "creates user with valid attrs" do
      attrs = %{username: "testuser", email: "test@example.com", password: "password123"}
      assert {:ok, user} = Accounts.register_user(attrs)
      assert user.username == "testuser"
      assert user.email == "test@example.com"
      assert user.password_hash != nil
    end

    test "rejects duplicate username" do
      attrs = %{username: "testuser", email: "a@b.com", password: "password123"}
      {:ok, _} = Accounts.register_user(attrs)
      assert {:error, changeset} = Accounts.register_user(%{attrs | email: "c@d.com"})
      assert "has already been taken" in errors_on(changeset).username
    end

    test "rejects short password" do
      attrs = %{username: "testuser", email: "test@example.com", password: "short"}
      assert {:error, changeset} = Accounts.register_user(attrs)
      assert errors_on(changeset).password != nil
    end
  end

  describe "authenticate_user/2" do
    test "returns user with correct password" do
      {:ok, _} = Accounts.register_user(%{username: "testuser", email: "test@example.com", password: "password123"})
      assert {:ok, user} = Accounts.authenticate_user("test@example.com", "password123")
      assert user.username == "testuser"
    end

    test "returns error with wrong password" do
      {:ok, _} = Accounts.register_user(%{username: "testuser", email: "test@example.com", password: "password123"})
      assert {:error, :invalid_credentials} = Accounts.authenticate_user("test@example.com", "wrong")
    end
  end
end
