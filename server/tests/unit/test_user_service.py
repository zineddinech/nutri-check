import pytest
from bson import ObjectId
from fastapi import HTTPException

from app.services.user_service import UserService


# ----------------------- Add allergens to user tests -----------------------
@pytest.mark.asyncio
async def test_add_allergies(sample_user):
    """
    Ajoute un allergène.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]
    old_allergies_amount = len(user["allergies"])

    updated_user = await UserService.add_allergies(user_id, ["Milk"])

    assert "Milk" in updated_user.allergies
    assert len(updated_user.allergies) == old_allergies_amount + 1
    assert updated_user.username == username


@pytest.mark.asyncio
async def test_add_multiple_allergies(sample_user):
    """
    Ajoute plusieurs allergènes d’un coup.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]
    old_allergies_amount = len(user["allergies"])

    updated_user = await UserService.add_allergies(user_id, ["Peanut", "Milk"])

    assert "Peanut" in updated_user.allergies
    assert "Milk" in updated_user.allergies
    assert len(updated_user.allergies) == old_allergies_amount + 2
    assert updated_user.username == username


@pytest.mark.asyncio
async def test_add_duplicated_allergies(sample_user):
    """
    Ajoute deux fois le même allergène.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]
    old_allergies_amount = len(user["allergies"])

    await UserService.add_allergies(user_id, ["Milk"])
    updated_user = await UserService.add_allergies(user_id, ["Milk"])

    assert "Milk" in updated_user.allergies
    assert len(updated_user.allergies) == old_allergies_amount + 1
    assert updated_user.username == username
    assert updated_user.allergies.count("Milk") == 1


@pytest.mark.asyncio
async def test_add_empty_allergy_list(sample_user):
    """
    Ajout d’une liste vide d’allergènes, ne change rien.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]
    old_allergies_amount = len(user["allergies"])

    updated_user = await UserService.add_allergies(user_id, [])

    assert len(updated_user.allergies) == old_allergies_amount
    assert updated_user.username == username


@pytest.mark.asyncio
async def test_add_allergy_to_nonexistent_user_raises():
    """
    Ajout à un utilisateur inexistant.
    """
    updated_user = await UserService.add_allergies(str(ObjectId()), ["Milk"])
    assert updated_user is None


# ----------------------- Remove allergens to user tests -----------------------
@pytest.mark.asyncio
async def test_remove_allergy(sample_user):
    """
    Supprime un allergène.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]

    userResponse = await UserService.add_allergies(user_id, ["Peanut", "Milk"])
    old_allergies_amount = len(userResponse.allergies)

    updated_user = await UserService.remove_allergies(user_id, ["Peanut"])

    assert "Peanut" not in updated_user.allergies
    assert "Milk" in updated_user.allergies
    assert len(updated_user.allergies) == old_allergies_amount - 1
    assert updated_user.username == username


@pytest.mark.asyncio
async def test_remove_multiple_allergies(sample_user):
    """
    Supprime plusieurs allergènes d’un coup.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]

    userResponse = await UserService.add_allergies(user_id, ["Milk", "Peanut", "Eggs"])
    old_allergies_amount = len(userResponse.allergies)

    updated_user = await UserService.remove_allergies(user_id, ["Peanut", "Eggs"])

    assert "Peanut" not in updated_user.allergies
    assert "Eggs" not in updated_user.allergies
    assert "Milk" in updated_user.allergies
    assert len(updated_user.allergies) == old_allergies_amount - 2
    assert updated_user.username == username


@pytest.mark.asyncio
async def test_remove_allergy_not_in_user(sample_user):
    """
    Supprime un allergène que l’utilisateur n’a pas, ne change rien.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]

    userResponse = await UserService.add_allergies(user_id, ["Milk"])
    old_allergies_amount = len(userResponse.allergies)

    updated_user = await UserService.remove_allergies(user_id, ["Peanut"])

    assert "Milk" in updated_user.allergies
    assert len(updated_user.allergies) == old_allergies_amount
    assert updated_user.username == username


@pytest.mark.asyncio
async def test_remove_allergies_empty_list(sample_user):
    """
    Supprime une liste vide d’allergènes, ne change rien.
    """
    user = await sample_user
    user_id = user["_id"]
    username = user["username"]

    userResponse = await UserService.add_allergies(user_id, ["Milk"])
    old_allergies_amount = len(userResponse.allergies)

    updated_user = await UserService.remove_allergies(user_id, [])

    assert "Milk" in updated_user.allergies
    assert len(updated_user.allergies) == old_allergies_amount
    assert updated_user.username == username


@pytest.mark.asyncio
async def test_remove_allergy_from_nonexistent_user():
    """
    Supprime un allergène chez un utilisateur inexistant.
    """
    updated_user = await UserService.remove_allergies(str(ObjectId()), ["Milk"])
    assert updated_user is None


@pytest.mark.asyncio
async def test_generate_reset_code():
    code = UserService.generate_reset_code()
    assert len(code) == 6
    assert code.isdigit()


@pytest.mark.asyncio
async def test_request_password_reset_success(monkeypatch):

    fake_user = {
        "_id": "123",
        "email": "test@test.com",
    }

    class FakeCollection:
        async def find_one(self, query):
            return fake_user

        async def update_one(self, *args, **kwargs):
            return True

    class FakeDB:
        def __getitem__(self, name):
            return FakeCollection()

    # Mock get_db
    monkeypatch.setattr("app.services.user_service.get_db", lambda: FakeDB())

    # Mock email sender
    monkeypatch.setattr(
        "app.services.user_service.send_reset_email", lambda email, code: True
    )

    result = await UserService.request_password_reset("test@test.com")

    assert result is True
